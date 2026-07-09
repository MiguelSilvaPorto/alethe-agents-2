use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::paths::context_dir;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WorkflowMode {
    Git,
    Local,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowSession {
    pub id: String,
    pub pty_id: String,
    pub agent_type: String,
    pub task: String,
    pub mode: WorkflowMode,
    pub repo_root: Option<String>,
    pub branch: Option<String>,
    pub status: String,
    pub started_at: u64,
    pub updated_at: u64,
}

fn workflow_sessions_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(context_dir(app)?.join("workflows").join("sessions.json"))
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn load_sessions(app: &AppHandle) -> Vec<WorkflowSession> {
    let path = match workflow_sessions_path(app) {
        Ok(p) => p,
        Err(_) => return vec![],
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return vec![];
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save_sessions(app: &AppHandle, sessions: &[WorkflowSession]) -> Result<(), String> {
    let path = workflow_sessions_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(sessions).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, &raw).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workflow_start_session(
    app: AppHandle,
    pty_id: String,
    agent_type: String,
    task: String,
    mode: WorkflowMode,
    repo_root: Option<String>,
) -> Result<WorkflowSession, String> {
    let id = format!("wf-{}", &pty_id);
    let branch = if mode == WorkflowMode::Git {
        if let Some(ref root) = repo_root {
            let root_buf = PathBuf::from(root);
            let task_slug = task.to_lowercase().replace(' ', "-");
            match crate::workflow_git::create_agent_branch(&root_buf, &agent_type, &pty_id, &task_slug) {
                Ok(b) => Some(b),
                Err(e) => return Err(e),
            }
        } else {
            None
        }
    } else {
        crate::workflow_local::init_workdir(&app, &pty_id, &agent_type, &task)?;
        None
    };

    let session = WorkflowSession {
        id,
        pty_id,
        agent_type,
        task,
        mode,
        repo_root,
        branch,
        status: "in_progress".to_string(),
        started_at: now_ms(),
        updated_at: now_ms(),
    };
    let mut sessions = load_sessions(&app);
    sessions.push(session.clone());
    save_sessions(&app, &sessions)?;
    Ok(session)
}

#[tauri::command]
pub fn workflow_commit_step(app: AppHandle, pty_id: String, message: String) -> Result<String, String> {
    let sessions = load_sessions(&app);
    let session = sessions.iter().find(|s| s.pty_id == pty_id).ok_or_else(|| "workflow_not_found".to_string())?;
    match session.mode {
        WorkflowMode::Git => {
            let root = session.repo_root.as_ref().ok_or_else(|| "no_repo_root".to_string())?;
            let root_buf = PathBuf::from(root);
            crate::workflow_git::commit_step(&root_buf, &message, &session.agent_type)
        }
        WorkflowMode::Local => {
            crate::workflow_local::add_step(&app, &pty_id, &message)?;
            Ok(format!("step recorded: {}", message))
        }
    }
}

#[tauri::command]
pub fn workflow_get_status(app: AppHandle) -> Result<Vec<WorkflowSession>, String> {
    Ok(load_sessions(&app))
}

#[tauri::command]
pub fn workflow_get_branch_status(app: AppHandle, session_id: String) -> Result<Option<crate::workflow_git::GitWorkflowStatus>, String> {
    let sessions = load_sessions(&app);
    let session = sessions.iter().find(|s| s.id == session_id).ok_or_else(|| "workflow_not_found".to_string())?;
    if session.mode != WorkflowMode::Git {
        return Ok(None);
    }
    let root = session.repo_root.as_ref().ok_or_else(|| "no_repo_root".to_string())?;
    let branch = session.branch.as_ref().ok_or_else(|| "no_branch".to_string())?;
    crate::workflow_git::get_workflow_status(&PathBuf::from(root), branch).map(Some)
}

#[tauri::command]
pub fn workflow_get_local_status(app: AppHandle) -> Result<Vec<crate::workflow_local::LocalWorkflow>, String> {
    crate::workflow_local::list_active_workflows(&app)
}

#[tauri::command]
pub fn workflow_complete(app: AppHandle, pty_id: String, summary: String) -> Result<(), String> {
    let mut sessions = load_sessions(&app);
    if let Some(session) = sessions.iter_mut().find(|s| s.pty_id == pty_id) {
        session.status = "completed".to_string();
        session.updated_at = now_ms();
    }
    save_sessions(&app, &sessions)?;

    let session = sessions.iter().find(|s| s.pty_id == pty_id).ok_or_else(|| "workflow_not_found".to_string())?;
    match session.mode {
        WorkflowMode::Local => {
            crate::workflow_local::complete_workflow(&app, &pty_id, &summary)
        }
        WorkflowMode::Git => Ok(()),
    }
}
