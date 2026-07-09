use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::paths::context_dir;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStep {
    pub id: String,
    pub description: String,
    pub status: String,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalWorkflow {
    pub pty_id: String,
    pub agent_type: String,
    pub task: String,
    pub steps: Vec<WorkflowStep>,
    pub status: String,
    pub started_at: u64,
    pub updated_at: u64,
    pub completed_at: Option<u64>,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn init_workdir(app: &AppHandle, pty_id: &str, agent_type: &str, task: &str) -> Result<PathBuf, String> {
    let dir = context_dir(app)?
        .join("workflows")
        .join("active")
        .join(format!("agent-{}", pty_id));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let workflow = LocalWorkflow {
        pty_id: pty_id.to_string(),
        agent_type: agent_type.to_string(),
        task: task.to_string(),
        steps: vec![],
        status: "in_progress".to_string(),
        started_at: now_ms(),
        updated_at: now_ms(),
        completed_at: None,
    };
    let json = serde_json::to_string_pretty(&workflow).map_err(|e| e.to_string())?;
    fs::write(dir.join("workflow.json"), &json).map_err(|e| e.to_string())?;
    let intent = format!("# Intent: {}\n\nAgent: {}\nStarted: {}\n", task, agent_type, now_ms());
    fs::write(dir.join("intent.md"), &intent).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn add_step(app: &AppHandle, pty_id: &str, description: &str) -> Result<WorkflowStep, String> {
    let dir = context_dir(app)?
        .join("workflows")
        .join("active")
        .join(format!("agent-{}", pty_id));
    let path = dir.join("workflow.json");
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut workflow: LocalWorkflow = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let step = WorkflowStep {
        id: format!("step-{}", workflow.steps.len() + 1),
        description: description.to_string(),
        status: "completed".to_string(),
        timestamp: now_ms(),
    };
    workflow.steps.push(step.clone());
    workflow.updated_at = now_ms();
    let json = serde_json::to_string_pretty(&workflow).map_err(|e| e.to_string())?;
    fs::write(dir.join("workflow.json"), &json).map_err(|e| e.to_string())?;
    let progress = format!("- [{}] {} — {}\n", step.id, description, now_ms());
    fs::write(dir.join("progress.md"), &progress).map_err(|e| e.to_string())?;
    Ok(step)
}

pub fn complete_workflow(app: &AppHandle, pty_id: &str, summary: &str) -> Result<(), String> {
    let active_dir = context_dir(app)?
        .join("workflows")
        .join("active")
        .join(format!("agent-{}", pty_id));
    let completed_dir = context_dir(app)?
        .join("workflows")
        .join("completed")
        .join(format!("agent-{}", pty_id));

    let path = active_dir.join("workflow.json");
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut workflow: LocalWorkflow = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    workflow.status = "completed".to_string();
    workflow.completed_at = Some(now_ms());
    workflow.updated_at = now_ms();

    fs::create_dir_all(&completed_dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&workflow).map_err(|e| e.to_string())?;
    fs::write(completed_dir.join("workflow.json"), &json).map_err(|e| e.to_string())?;
    fs::write(completed_dir.join("done.md"), summary).map_err(|e| e.to_string())?;
    fs::remove_dir_all(&active_dir).ok();
    Ok(())
}

pub fn list_active_workflows(app: &AppHandle) -> Result<Vec<LocalWorkflow>, String> {
    let dir = context_dir(app)?.join("workflows").join("active");
    if !dir.is_dir() {
        return Ok(vec![]);
    }
    let mut workflows = vec![];
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let workflow_path = entry.path().join("workflow.json");
        if workflow_path.is_file() {
            if let Ok(raw) = fs::read_to_string(&workflow_path) {
                if let Ok(wf) = serde_json::from_str::<LocalWorkflow>(&raw) {
                    workflows.push(wf);
                }
            }
        }
    }
    Ok(workflows)
}
