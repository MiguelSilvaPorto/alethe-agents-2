use std::fs;
use tauri::AppHandle;

use crate::paths::projects_file_path;

/// Lê `projects.json` cru. Retorna None se o arquivo não existir (primeira
/// abertura). Erros de leitura/parse ficam no front pra decidir se reseta ou
/// mostra erro. Mantemos opaque (String) pra schema poder evoluir só no TS
/// durante o MVP, sem recompilar Rust.
#[tauri::command]
pub fn load_projects(app: AppHandle) -> Result<Option<String>, String> {
    let path = projects_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|error| error.to_string())
}

/// Persiste o JSON cru em `projects.json`. Frontend faz debounce 500ms
/// antes de chamar. Escrita atômica via tmp + rename pra não corromper o
/// arquivo se o app crashar no meio (perde no máx. a última escrita).
#[tauri::command]
pub fn save_projects(app: AppHandle, content: String) -> Result<(), String> {
    let path = projects_file_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, content).map_err(|error| error.to_string())?;
    fs::rename(&tmp, &path).map_err(|error| error.to_string())
}
