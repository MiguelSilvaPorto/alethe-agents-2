use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Serialize)]
pub struct DirectoryEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    let directory = PathBuf::from(path.trim());
    if !directory.is_dir() {
        return Err("directory not found".to_string());
    }

    tokio::task::spawn_blocking(move || {
        let mut entries = fs::read_dir(&directory)
            .map_err(|error| error.to_string())?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let file_type = entry.file_type().ok()?;
                Some(DirectoryEntry {
                    name: entry.file_name().to_string_lossy().into_owned(),
                    path: entry.path().to_string_lossy().into_owned(),
                    is_dir: file_type.is_dir(),
                })
            })
            .collect::<Vec<_>>();

        entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        Ok(entries)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
pub struct ReadFileResult {
    pub content: String,
    pub is_truncated: bool,
    pub total_lines: usize,
}

/// Lê um arquivo de texto (UTF-8) do disco com otimização para arquivos gigantes.
#[tauri::command]
pub fn read_text_file(path: String) -> Result<ReadFileResult, String> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    let file = PathBuf::from(path.trim());
    if !file.is_file() {
        return Err("file not found".to_string());
    }

    let file_handle = File::open(&file).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file_handle);

    let mut content = String::new();
    let mut total_lines = 0;
    let mut is_truncated = false;
    let limit = 10000;

    for line in reader.lines() {
        let line_str = line.map_err(|e| e.to_string())?;
        total_lines += 1;
        if total_lines <= limit {
            content.push_str(&line_str);
            content.push('\n');
        } else {
            is_truncated = true;
        }
    }

    // Se não foi truncado, limpa qualquer quebra de linha extra gerada pelo loop final
    if !is_truncated && content.ends_with('\n') {
        content.pop();
    }

    Ok(ReadFileResult {
        content,
        is_truncated,
        total_lines,
    })
}

/// Lê o conteúdo completo de um arquivo gigante caso o usuário force o carregamento.
#[tauri::command]
pub fn read_full_text_file(path: String) -> Result<String, String> {
    let file = PathBuf::from(path.trim());
    if !file.is_file() {
        return Err("file not found".to_string());
    }
    fs::read_to_string(&file).map_err(|error| error.to_string())
}

/// Escreve um arquivo de texto (UTF-8) no disco. Usado pelo File Editor.
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let file = PathBuf::from(path.trim());
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&file, &content).map_err(|e| e.to_string())
}

/// Registro global de watchers de arquivo, chaveado pelo caminho absoluto.
/// Cada `RecommendedWatcher` precisa ficar vivo enquanto o pane estiver aberto.
#[derive(Default)]
pub struct FileWatchers(pub Arc<Mutex<HashMap<String, RecommendedWatcher>>>);

/// Normaliza o caminho pra usar como chave/comparação (mesma forma que vem do front).
fn normalize(path: &str) -> String {
    path.trim().to_string()
}

/// Observa um arquivo .md e emite `md://changed { path }` quando ele muda no disco.
/// Observa o diretório-pai (não-recursivo) e filtra pelo arquivo — robusto contra
/// saves atômicos (editor regrava o arquivo) que quebram um watch direto.
#[tauri::command]
pub fn watch_file(
    app: AppHandle,
    state: tauri::State<'_, FileWatchers>,
    path: String,
) -> Result<(), String> {
    let key = normalize(&path);
    let target = PathBuf::from(&key);
    let parent = target
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "invalid path".to_string())?;

    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if map.contains_key(&key) {
        return Ok(()); // já observando
    }

    let emit_path = key.clone();
    let watched = target.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<notify::Event>| {
            let Ok(event) = res else { return };
            if !matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                return;
            }
            if event.paths.iter().any(|p| p == &watched) {
                let _ = app.emit("md://changed", serde_json::json!({ "path": emit_path }));
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&parent, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;
    map.insert(key, watcher);
    Ok(())
}

/// Para de observar um arquivo (chamado quando o pane é fechado/desmontado).
#[tauri::command]
pub fn unwatch_file(state: tauri::State<'_, FileWatchers>, path: String) -> Result<(), String> {
    let key = normalize(&path);
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.remove(&key); // drop do watcher para o watch
    Ok(())
}
