use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct OpenCodeModel {
    pub id: String,
    pub full_id: String,
    pub name: String,
    pub provider: String,
    pub provider_id: String,
    pub cost_input: f64,
    pub cost_output: f64,
    pub context_length: Option<u64>,
    pub status: String,
}

#[derive(Serialize, Clone)]
pub struct OpenCodeProvider {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub active: bool,
}

/// Executa `opencode models --verbose` e parseia a saída.
/// Retorna todos os modelos disponíveis do OpenCode (Zen, Go, OpenRouter, Nvidia).
#[tauri::command]
pub fn get_opencode_models() -> Result<Vec<OpenCodeModel>, String> {
    let output = Command::new("opencode")
        .args(["models", "--verbose"])
        .output()
        .map_err(|e| format!("falha ao executar opencode models: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("opencode models falhou: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    let mut models = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();
        // Cada modelo começa com "provider/model-id" seguido de JSON
        if !line.is_empty() && !line.starts_with('{') && !line.starts_with('}') {
            let full_id = line.to_string();
            // Coleta o JSON que segue até a próxima linha de modelo ou fim
            i += 1;
            let mut json_str = String::new();
            while i < lines.len() {
                let json_line = lines[i].trim();
                if json_line.is_empty() {
                    i += 1;
                    continue;
                }
                if !json_line.starts_with('{')
                    && !json_line.starts_with('}')
                    && !json_line.starts_with('"')
                {
                    break;
                }
                json_str.push_str(json_line);
                i += 1;
            }

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let id = val.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let name = val.get("name").and_then(|v| v.as_str()).unwrap_or(&id).to_string();
                let provider_id = val.get("providerID").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let status = val.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();

                let cost_input = val.get("cost").and_then(|c| c.get("input")).and_then(|v| v.as_f64()).unwrap_or(0.0);
                let cost_output = val.get("cost").and_then(|c| c.get("output")).and_then(|v| v.as_f64()).unwrap_or(0.0);
                let context_length = val.get("limit").and_then(|l| l.get("context")).and_then(|v| v.as_u64());

                // Deriva o provedor amigável do provider_id
                let provider = match provider_id.as_str() {
                    "opencode" => "OpenCode Zen".to_string(),
                    "opencode-go" => "OpenCode Go".to_string(),
                    "nvidia" => "Nvidia".to_string(),
                    "openrouter" => "OpenRouter".to_string(),
                    other => other.to_string(),
                };

                models.push(OpenCodeModel {
                    id,
                    full_id,
                    name,
                    provider,
                    provider_id,
                    cost_input,
                    cost_output,
                    context_length,
                    status,
                });
            }
        } else {
            i += 1;
        }
    }

    Ok(models)
}

/// Executa `opencode providers list` e parseia a saída.
/// Retorna a lista de provedores configurados no OpenCode.
#[tauri::command]
pub fn get_opencode_providers() -> Result<Vec<OpenCodeProvider>, String> {
    let output = Command::new("opencode")
        .args(["providers", "list"])
        .output()
        .map_err(|e| format!("falha ao executar opencode providers: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("opencode providers list falhou: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut providers = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        // Formato: "●  Nvidia api" ou "○  ProviderName api"
        if line.starts_with('●') || line.starts_with('○') {
            let active = line.starts_with('●');
            let rest = line.strip_prefix('●').or_else(|| line.strip_prefix('○')).unwrap_or(line).trim();
            let parts: Vec<&str> = rest.split_whitespace().collect();
            if parts.len() >= 2 {
                let name = parts[0..parts.len() - 1].join(" ");
                let kind = parts.last().unwrap_or(&"").to_string();
                let id = name.to_lowercase().replace(' ', "-");
                providers.push(OpenCodeProvider {
                    id,
                    name,
                    kind,
                    active,
                });
            } else if !parts.is_empty() {
                let name = parts[0].to_string();
                let id = name.to_lowercase().replace(' ', "-");
                providers.push(OpenCodeProvider {
                    id,
                    name,
                    kind: "api".to_string(),
                    active,
                });
            }
        }
    }

    Ok(providers)
}
