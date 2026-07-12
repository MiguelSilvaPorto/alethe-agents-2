use std::io::Read;
use std::str::FromStr;
use std::thread;
use std::time::Duration;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde_json::Value;
use tauri::AppHandle;
use tiny_http::{Header, Response, Server};

/// Inicia o proxy HTTP reverso em uma thread dedicada.
pub fn start_proxy(app: AppHandle) {
    thread::spawn(move || {
        let addr = "127.0.0.1:4096";
        let server = match Server::http(addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[telemetry_proxy] falha ao iniciar servidor HTTP na porta 4096: {e}");
                return;
            }
        };
        eprintln!("[telemetry_proxy] ouvindo em http://{}", addr);

        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .unwrap_or_default();

        for mut request in server.incoming_requests() {
            let url_path = request.url().to_string();
            let method = request.method().to_string();

            // Mapeia o caminho e extrai a sessão e destino
            // Formatos esperados:
            // /openai/<session_id>/v1/chat/completions
            // /anthropic/<session_id>/v1/messages
            // /openrouter/<session_id>/v1/...
            let parts: Vec<&str> = url_path.split('/').filter(|s| !s.is_empty()).collect();
            if parts.len() < 2 {
                let _ = request.respond(
                    Response::from_string(
                        "Alethe Proxy: Caminho malformado. Use /<provider>/<session_id>/v1/..."
                    )
                    .with_status_code(400)
                );
                continue;
            }

            let provider = parts[0];
            let session_id = parts[1].to_string();

            // Reconstrói o caminho limpo
            // Ex: de ["openai", "session_123", "v1", "chat", "completions"] para "/v1/chat/completions"
            let clean_path = format!("/{}", parts[2..].join("/"));

            let target_base = match provider {
                "openai" => "https://api.openai.com",
                "anthropic" => "https://api.anthropic.com",
                "openrouter" => "https://openrouter.ai",
                other => {
                    let _ = request.respond(
                        Response::from_string(format!(
                            "Alethe Proxy: Provedor desconhecido '{other}'."
                        ))
                        .with_status_code(400)
                    );
                    continue;
                }
            };

            let target_url = format!("{}{}", target_base, clean_path);

            // Ler corpo da requisição
            let mut req_body = Vec::new();
            if let Err(e) = request.as_reader().read_to_end(&mut req_body) {
                eprintln!("[telemetry_proxy] erro lendo corpo do cliente: {e}");
                let _ = request.respond(Response::empty(400));
                continue;
            }

            // Mapear headers
            let mut headers = HeaderMap::new();
            for h in request.headers() {
                let name_str = h.field.as_str().to_string();
                if name_str.to_ascii_lowercase() == "host" {
                    continue;
                }
                if let Ok(name) = HeaderName::from_str(&name_str) {
                    if let Ok(val) = HeaderValue::from_bytes(h.value.as_bytes()) {
                        headers.insert(name, val);
                    }
                }
            }

            let client = client.clone();
            let target_url = target_url.clone();
            let method = method.clone();
            let app = app.clone();
            let provider = provider.to_string();

            // Executa em outra thread para não congelar o loop principal de requisições
            thread::spawn(move || {
                let req_method = match reqwest::Method::from_str(&method) {
                    Ok(m) => m,
                    Err(_) => {
                        let _ = request.respond(Response::empty(400));
                        return;
                    }
                };

                let res_result = client
                    .request(req_method, &target_url)
                    .headers(headers)
                    .body(req_body)
                    .send();

                let res = match res_result {
                    Ok(r) => r,
                    Err(e) => {
                        eprintln!("[telemetry_proxy] erro conectando ao upstream {target_url}: {e}");
                        let _ = request.respond(
                            Response::from_string(format!("Erro de Conexão Upstream: {e}"))
                                .with_status_code(502)
                        );
                        return;
                    }
                };

                let status = res.status().as_u16();

                // Cabeçalhos de resposta
                let mut response_headers = Vec::new();
                let mut is_streaming = false;

                for (name, val) in res.headers().iter() {
                    let name_str = name.as_str();
                    // Ignora cabeçalhos de transferência que o tiny_http reescreve
                    if name_str.to_ascii_lowercase() == "transfer-encoding"
                        || name_str.to_ascii_lowercase() == "content-length"
                    {
                        continue;
                    }
                    if name_str.to_ascii_lowercase() == "content-type" {
                        if let Ok(v) = val.to_str() {
                            if v.contains("text/event-stream") {
                                is_streaming = true;
                            }
                        }
                    }
                    if let Ok(ascii_val) = ascii::AsciiString::from_ascii(val.as_bytes()) {
                        if let Ok(field) = tiny_http::HeaderField::from_str(name_str) {
                            response_headers.push(Header {
                                field,
                                value: ascii_val,
                            });
                        }
                    }
                }

                if is_streaming {
                    let (tx, rx) = std::sync::mpsc::channel::<Vec<u8>>();

                    // Reader customizado que consome do receiver
                    struct ChannelReader {
                        rx: std::sync::mpsc::Receiver<Vec<u8>>,
                        current_chunk: Vec<u8>,
                        cursor: usize,
                    }

                    impl Read for ChannelReader {
                        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
                            if self.cursor >= self.current_chunk.len() {
                                match self.rx.recv() {
                                    Ok(chunk) => {
                                        self.current_chunk = chunk;
                                        self.cursor = 0;
                                    }
                                    Err(_) => return Ok(0), // Fim do canal
                                }
                            }
                            let remaining = self.current_chunk.len() - self.cursor;
                            let to_write = std::cmp::min(buf.len(), remaining);
                            buf[..to_write].copy_from_slice(
                                &self.current_chunk[self.cursor..self.cursor + to_write]
                            );
                            self.cursor += to_write;
                            Ok(to_write)
                        }
                    }

                    let response = tiny_http::Response::new(
                        tiny_http::StatusCode(status),
                        response_headers,
                        ChannelReader {
                            rx,
                            current_chunk: Vec::new(),
                            cursor: 0,
                        },
                        None,
                        None,
                    );

                    // Executa a leitura do streaming em uma thread dedicada e envia os chunks
                    let mut reader = res;
                    let app = app.clone();
                    let session_id = session_id.clone();
                    let provider = provider.clone();

                    thread::spawn(move || {
                        let mut buffer = [0u8; 2048];
                        let mut stream_data = String::new();

                        while let Ok(n) = reader.read(&mut buffer) {
                            if n == 0 {
                                break;
                            }
                            let chunk = buffer[..n].to_vec();
                            if let Ok(s) = std::str::from_utf8(&chunk) {
                                stream_data.push_str(s);
                            }
                            if tx.send(chunk).is_err() {
                                break;
                            }
                        }

                        // Parse de telemetria no fim do stream
                        let mut prompt_tokens = 0;
                        let mut completion_tokens = 0;
                        let mut cache_read_tokens = 0;
                        let mut cache_write_tokens = 0;
                        let mut model_name = "unknown".to_string();

                        // Parse de linhas SSE
                        for line in stream_data.lines() {
                            let line = line.trim();
                            if line.starts_with("data:") {
                                let data_str = line.trim_start_matches("data:").trim();
                                if data_str == "[DONE]" {
                                    continue;
                                }
                                if let Ok(json_val) = serde_json::from_str::<Value>(data_str) {
                                    // OpenAI Stream Options / OpenRouter usage object
                                    if let Some(usage) = json_val.get("usage") {
                                        if let Some(pt) =
                                            usage.get("prompt_tokens").and_then(|v| v.as_u64())
                                        {
                                            prompt_tokens = pt;
                                        }
                                        if let Some(ct) =
                                            usage.get("completion_tokens").and_then(|v| v.as_u64())
                                        {
                                            completion_tokens = ct;
                                        }
                                        if let Some(details) = usage.get("prompt_tokens_details") {
                                            if let Some(crt) =
                                                details.get("cached_tokens").and_then(|v| v.as_u64())
                                            {
                                                cache_read_tokens = crt;
                                            }
                                        }
                                    }
                                    // Anthropic Streaming events
                                    let type_str = json_val
                                        .get("type")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");
                                    if type_str == "message_start" {
                                        if let Some(msg) = json_val.get("message") {
                                            if let Some(model) =
                                                msg.get("model").and_then(|v| v.as_str())
                                            {
                                                model_name = model.to_string();
                                            }
                                            if let Some(usage) = msg.get("usage") {
                                                if let Some(it) = usage
                                                    .get("input_tokens")
                                                    .and_then(|v| v.as_u64())
                                                {
                                                    prompt_tokens = it;
                                                }
                                                if let Some(crt) = usage
                                                    .get("cache_read_input_tokens")
                                                    .and_then(|v| v.as_u64())
                                                {
                                                    cache_read_tokens = crt;
                                                }
                                                if let Some(cwt) = usage
                                                    .get("cache_creation_input_tokens")
                                                    .and_then(|v| v.as_u64())
                                                {
                                                    cache_write_tokens = cwt;
                                                }
                                            }
                                        }
                                    } else if type_str == "message_delta" {
                                        if let Some(usage) = json_val.get("usage") {
                                            if let Some(ot) =
                                                usage.get("output_tokens").and_then(|v| v.as_u64())
                                            {
                                                completion_tokens = ot;
                                            }
                                        }
                                    }

                                    // Coleta nome do modelo se for OpenAI compatible
                                    if model_name == "unknown" {
                                        if let Some(model) =
                                            json_val.get("model").and_then(|v| v.as_str())
                                        {
                                            model_name = model.to_string();
                                        }
                                    }
                                }
                            }
                        }

                        // Se encontrou dados de telemetria válidos, salvar no DB
                        if prompt_tokens > 0 || completion_tokens > 0 {
                            let _ = crate::telemetry_db::upsert_ledger_entry(
                                &app,
                                &session_id,
                                &provider,
                                None,
                                &model_name,
                                prompt_tokens,
                                completion_tokens,
                                cache_read_tokens,
                                cache_write_tokens,
                                0.0,
                            );
                        }
                    });

                    let _ = request.respond(response);
                } else {
                    // Resposta Não-Streaming normal
                    let mut body_bytes = Vec::new();
                    let mut reader = res;
                    if let Err(e) = reader.read_to_end(&mut body_bytes) {
                        eprintln!("[telemetry_proxy] erro lendo corpo upstream: {e}");
                        let _ = request.respond(Response::empty(502));
                        return;
                    }

                    // Fazer parse do JSON para telemetria
                    if let Ok(json_val) = serde_json::from_slice::<Value>(&body_bytes) {
                        let mut prompt_tokens = 0;
                        let mut completion_tokens = 0;
                        let mut cache_read_tokens = 0;
                        let mut cache_write_tokens = 0;
                        let mut model_name = "unknown".to_string();

                        if let Some(model) = json_val.get("model").and_then(|v| v.as_str()) {
                            model_name = model.to_string();
                        }

                        if let Some(usage) = json_val.get("usage") {
                            if let Some(pt) = usage.get("prompt_tokens").and_then(|v| v.as_u64()) {
                                prompt_tokens = pt;
                            } else if let Some(it) = usage.get("input_tokens").and_then(|v| v.as_u64()) {
                                prompt_tokens = it; // Anthropic
                            }

                            if let Some(ct) = usage.get("completion_tokens").and_then(|v| v.as_u64())
                            {
                                completion_tokens = ct;
                            } else if let Some(ot) =
                                usage.get("output_tokens").and_then(|v| v.as_u64())
                            {
                                completion_tokens = ot; // Anthropic
                            }

                            if let Some(crt) =
                                usage.get("cache_read_input_tokens").and_then(|v| v.as_u64())
                            {
                                cache_read_tokens = crt; // Anthropic
                            }
                            if let Some(cwt) = usage
                                .get("cache_creation_input_tokens")
                                .and_then(|v| v.as_u64())
                            {
                                cache_write_tokens = cwt; // Anthropic
                            }

                            if let Some(details) = usage.get("prompt_tokens_details") {
                                if let Some(crt) = details.get("cached_tokens").and_then(|v| v.as_u64())
                                {
                                    cache_read_tokens = crt; // OpenAI
                                }
                            }
                        }

                        if prompt_tokens > 0 || completion_tokens > 0 {
                            let _ = crate::telemetry_db::upsert_ledger_entry(
                                &app,
                                &session_id,
                                &provider,
                                None,
                                &model_name,
                                prompt_tokens,
                                completion_tokens,
                                cache_read_tokens,
                                cache_write_tokens,
                                0.0,
                            );
                        }
                    }

                    let response = tiny_http::Response::new(
                        tiny_http::StatusCode(status),
                        response_headers,
                        body_bytes.as_slice(),
                        Some(body_bytes.len()),
                        None,
                    );
                    let _ = request.respond(response);
                }
            });
        }
    });
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_proxy_routing_parsing() {
        let url_path = "/openai/session_12345/v1/chat/completions";
        let parts: Vec<&str> = url_path.split('/').filter(|s| !s.is_empty()).collect();
        assert_eq!(parts.len(), 5);

        let provider = parts[0];
        let session_id = parts[1];
        let clean_path = format!("/{}", parts[2..].join("/"));

        assert_eq!(provider, "openai");
        assert_eq!(session_id, "session_12345");
        assert_eq!(clean_path, "/v1/chat/completions");

        let target_base = match provider {
            "openai" => "https://api.openai.com",
            _ => "unknown",
        };
        let target_url = format!("{}{}", target_base, clean_path);
        assert_eq!(target_url, "https://api.openai.com/v1/chat/completions");
    }
}
