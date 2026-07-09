use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::paths::context_dir;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ObjectiveStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Objective {
    pub id: String,
    pub title: String,
    pub status: ObjectiveStatus,
    pub agent: Option<String>,
    pub pty_id: Option<String>,
    pub started_at: Option<u64>,
    pub completed_at: Option<u64>,
    pub created_at: u64,
    pub updated_at: u64,
    pub notes: String,
    pub commit_sha: Option<String>,
    pub branch: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextState {
    pub objectives: Vec<Objective>,
    pub objectives_dir: String,
}

fn objectives_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(context_dir(app)?.join("objectives").join("objectives.json"))
}

pub fn load_objectives(app: &AppHandle) -> Vec<Objective> {
    let path = match objectives_file(app) {
        Ok(p) => p,
        Err(_) => return vec![],
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return vec![];
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_objectives(app: &AppHandle, objectives: &[Objective]) -> Result<(), String> {
    let path = objectives_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(objectives).map_err(|e| e.to_string())?;
    fs::write(
        &path.with_extension("json.tmp"),
        &raw,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(path.with_extension("json.tmp"), &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn context_get_state(app: AppHandle) -> Result<ContextState, String> {
    let objectives = load_objectives(&app);
    let dir = context_dir(&app)?
        .join("objectives")
        .to_string_lossy()
        .to_string();
    Ok(ContextState { objectives, objectives_dir: dir })
}

#[tauri::command]
pub fn context_set_objective(app: AppHandle, objective: Objective) -> Result<Vec<Objective>, String> {
    let mut objectives = load_objectives(&app);
    if let Some(pos) = objectives.iter().position(|o| o.id == objective.id) {
        objectives[pos] = objective;
    } else {
        objectives.push(objective);
    }
    save_objectives(&app, &objectives)?;
    Ok(objectives)
}

#[tauri::command]
pub fn context_delete_objective(app: AppHandle, id: String) -> Result<Vec<Objective>, String> {
    let mut objectives = load_objectives(&app);
    objectives.retain(|o| o.id != id);
    save_objectives(&app, &objectives)?;
    Ok(objectives)
}

#[tauri::command]
pub fn context_update_objective_status(
    app: AppHandle,
    id: String,
    status: ObjectiveStatus,
) -> Result<Vec<Objective>, String> {
    let mut objectives = load_objectives(&app);
    if let Some(obj) = objectives.iter_mut().find(|o| o.id == id) {
        let is_completed = status == ObjectiveStatus::Completed;
        let is_in_progress = status == ObjectiveStatus::InProgress;
        obj.status = status;
        obj.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        if is_completed {
            obj.completed_at = Some(obj.updated_at);
        }
        if is_in_progress && obj.started_at.is_none() {
            obj.started_at = Some(obj.updated_at);
        }
    }
    save_objectives(&app, &objectives)?;
    Ok(objectives)
}
