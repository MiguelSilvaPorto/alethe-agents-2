use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::context_objectives::{load_objectives, ObjectiveStatus};
use crate::context_decisions::load_decisions;
use crate::paths::context_dir;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextReport {
    pub context_md: String,
    pub updated_at: u64,
    pub objective_count: usize,
    pub completed_count: usize,
    pub decision_count: usize,
    pub active_agents: usize,
    pub branch: String,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn context_md_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(context_dir(app)?.join("context.md"))
}

fn context_json_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(context_dir(app)?.join("context.json"))
}

fn format_ts(ms: u64) -> String {
    let secs = ms / 1000;
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let mins = (secs % 3600) / 60;
    if days > 0 {
        format!("{days}d {hours}h ago")
    } else if hours > 0 {
        format!("{hours}h {mins}m ago")
    } else {
        format!("{mins}m ago")
    }
}

fn build_markdown_report(app: &AppHandle) -> String {
    let objectives = load_objectives(app);
    let decisions = load_decisions(app);
    let now = now_ms();

    let in_progress = objectives.iter().filter(|o| o.status == ObjectiveStatus::InProgress).count();
    let pending = objectives.iter().filter(|o| o.status == ObjectiveStatus::Pending).count();
    let completed = objectives.iter().filter(|o| o.status == ObjectiveStatus::Completed).count();
    let cancelled = objectives.iter().filter(|o| o.status == ObjectiveStatus::Cancelled).count();

    let mut md = String::new();
    md.push_str("# Context — Alethe Project State\n\n");
    md.push_str(&format!("> Generated: {} ({} ms)\n\n", format_ts(now), now));

    md.push_str("## Objectives\n\n");
    md.push_str(&format!("- **In progress:** {}\n", in_progress));
    md.push_str(&format!("- **Pending:** {}\n", pending));
    md.push_str(&format!("- **Completed:** {}\n", completed));
    md.push_str(&format!("- **Cancelled:** {}\n\n", cancelled));

    if !objectives.is_empty() {
        for obj in &objectives {
            let status_icon = match obj.status {
                ObjectiveStatus::InProgress => "*",
                ObjectiveStatus::Pending => "-",
                ObjectiveStatus::Completed => "x",
                ObjectiveStatus::Cancelled => "~",
            };
            md.push_str(&format!("### [{}] {}\n", status_icon, obj.title));
            md.push_str(&format!("- Status: {:?}\n", obj.status));
            if let Some(agent) = &obj.agent {
                md.push_str(&format!("- Agent: {}\n", agent));
            }
            if let Some(ref branch) = obj.branch {
                md.push_str(&format!("- Branch: {}\n", branch));
            }
            if let Some(ref sha) = obj.commit_sha {
                md.push_str(&format!("- Last commit: {}\n", sha));
            }
            if !obj.notes.is_empty() {
                md.push_str(&format!("- Notes: {}\n", obj.notes));
            }
            md.push('\n');
        }
    }

    if !decisions.is_empty() {
        md.push_str("## Decisions Log\n\n");
        for dec in decisions.iter().rev().take(10) {
            md.push_str(&format!("- {} — {} *({})*\n", format_ts(dec.made_at), dec.summary, dec.reason));
        }
        md.push('\n');
    }

    md.push_str("## Instructions for AI Agents\n\n");
    md.push_str("1. Read this entire file before making any changes.\n");
    md.push_str("2. Check the Objectives section — know what's in progress before starting work.\n");
    md.push_str("3. Check the Decisions Log — know why past decisions were made.\n");
    md.push_str("4. When you start a task, create an objective or update its status to IN_PROGRESS.\n");
    md.push_str("5. When you finish, mark it COMPLETED and note what was done.\n");
    md.push_str("6. When you make a design decision, log it in decisions.\n");

    md
}

fn build_json_report(app: &AppHandle) -> serde_json::Value {
    let objectives = load_objectives(app);
    let decisions = load_decisions(app);
    let in_progress = objectives.iter().filter(|o| o.status == ObjectiveStatus::InProgress).count();
    let completed = objectives.iter().filter(|o| o.status == ObjectiveStatus::Completed).count();

    serde_json::json!({
        "updatedAt": now_ms(),
        "objectiveCount": objectives.len(),
        "inProgressCount": in_progress,
        "completedCount": completed,
        "decisionCount": decisions.len(),
        "objectives": objectives,
        "decisions": decisions.iter().rev().take(10).collect::<Vec<_>>(),
    })
}

fn write_context_files(app: &AppHandle) -> Result<(), String> {
    let dir = context_dir(app)?;
    fs::create_dir_all(dir.join("objectives")).map_err(|e| e.to_string())?;
    fs::create_dir_all(dir.join("decisions")).map_err(|e| e.to_string())?;

    let md = build_markdown_report(app);
    let md_path = context_md_path(app)?;
    fs::write(&md_path, &md).map_err(|e| e.to_string())?;

    let json = build_json_report(app);
    let json_path = context_json_path(app)?;
    let json_str = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;
    fs::write(&json_path, &json_str).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn context_refresh(app: AppHandle) -> Result<ContextReport, String> {
    write_context_files(&app)?;
    let objectives = load_objectives(&app);
    let decisions = load_decisions(&app);
    let md = fs::read_to_string(context_md_path(&app)?).unwrap_or_default();

    Ok(ContextReport {
        context_md: md,
        updated_at: now_ms(),
        objective_count: objectives.len(),
        completed_count: objectives.iter().filter(|o| o.status == ObjectiveStatus::Completed).count(),
        decision_count: decisions.len(),
        active_agents: 0,
        branch: String::new(),
    })
}

#[tauri::command]
pub fn context_get_report(app: AppHandle) -> Result<ContextReport, String> {
    let md = fs::read_to_string(context_md_path(&app)?);
    let json = fs::read_to_string(context_json_path(&app)?);
    if md.is_err() || json.is_err() {
        return context_refresh(app);
    }
    let objectives = load_objectives(&app);
    let decisions = load_decisions(&app);

    Ok(ContextReport {
        context_md: md.unwrap_or_default(),
        updated_at: now_ms(),
        objective_count: objectives.len(),
        completed_count: objectives.iter().filter(|o| o.status == ObjectiveStatus::Completed).count(),
        decision_count: decisions.len(),
        active_agents: 0,
        branch: String::new(),
    })
}
