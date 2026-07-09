use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::paths::context_dir;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub id: String,
    pub summary: String,
    pub reason: String,
    pub agent: Option<String>,
    pub made_at: u64,
}

fn decisions_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(context_dir(app)?.join("decisions").join("decisions.json"))
}

pub fn load_decisions(app: &AppHandle) -> Vec<Decision> {
    let path = match decisions_file(app) {
        Ok(p) => p,
        Err(_) => return vec![],
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return vec![];
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_decisions(app: &AppHandle, decisions: &[Decision]) -> Result<(), String> {
    let path = decisions_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(decisions).map_err(|e| e.to_string())?;
    fs::write(&path.with_extension("json.tmp"), &raw).map_err(|e| e.to_string())?;
    fs::rename(path.with_extension("json.tmp"), &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn context_get_decisions(app: AppHandle) -> Result<Vec<Decision>, String> {
    Ok(load_decisions(&app))
}

#[tauri::command]
pub fn context_add_decision(app: AppHandle, decision: Decision) -> Result<Vec<Decision>, String> {
    let mut decisions = load_decisions(&app);
    decisions.push(decision);
    save_decisions(&app, &decisions)?;
    Ok(decisions)
}
