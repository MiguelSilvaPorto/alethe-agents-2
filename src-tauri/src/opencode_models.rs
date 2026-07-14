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

/// Executa `opencode models` (sem --verbose) e parseia a saída — IDs apenas.
/// Muito mais rápido que --verbose que traz JSON completo de centenas de modelos.
#[tauri::command]
pub fn get_opencode_models() -> Result<Vec<OpenCodeModel>, String> {
    let output = Command::new("opencode")
        .args(["models"])
        .output()
        .map_err(|e| format!("falha ao executar opencode models: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("opencode models falhou: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut models = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let full_id = line.to_string();
        // Formato: "provedor/nome-modelo"
        let slash_pos = full_id.find('/');
        let (provider_prefix, model_name) = match slash_pos {
            Some(pos) => (full_id[..pos].to_string(), full_id[pos + 1..].to_string()),
            None => ("unknown".to_string(), full_id.clone()),
        };

        let provider = match provider_prefix.as_str() {
            "opencode" => "OpenCode Zen",
            "opencode-go" => "OpenCode Go",
            "nvidia" => "Nvidia",
            "openrouter" => "OpenRouter",
            _ => &provider_prefix,
        };

        // Deriva um nome legível
        let name = model_name
            .split(|c: char| c == '-' || c == '_')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join(" ");

        // Nome capitalizado (primeira letra maiúscula de cada palavra)
        let display_name = name
            .split_whitespace()
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            })
            .collect::<Vec<String>>()
            .join(" ");

        models.push(OpenCodeModel {
            id: model_name.to_string(),
            full_id,
            name: display_name,
            provider: provider.to_string(),
            provider_id: provider_prefix.to_string(),
            cost_input: 0.0,
            cost_output: 0.0,
            context_length: None,
            status: "active".to_string(),
        });
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
