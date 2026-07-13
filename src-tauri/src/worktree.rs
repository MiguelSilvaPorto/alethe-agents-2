use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[cfg(windows)]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console(_command: &mut Command) {}

fn git_cmd(repo_root: &str, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("git");
    command.current_dir(repo_root).args(args);
    hide_console(&mut command);
    let output = command.output().map_err(|e| format!("git_exec_failed:{e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() { "git_command_failed".to_string() } else { format!("git_command_failed:{stderr}") });
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
    pub is_main: bool,
}

/// Cria uma git worktree a partir do repositório principal.
/// Ex: `git worktree add ../workspaces/agent-auth feat/auth main`
#[tauri::command]
pub fn worktree_create(
    repo_root: String,
    branch: String,
    name: String,
    base_ref: Option<String>,
) -> Result<String, String> {
    let root = PathBuf::from(&repo_root);
    if !root.join(".git").exists() && !root.join(".git").is_file() {
        return Err("not_a_git_repository".to_string());
    }

    // Cria o diretório de workspaces se não existir
    let parent = root.parent().unwrap_or(&root);
    let workspaces_dir = parent.join("workspaces");
    let worktree_path = workspaces_dir.join(&name);

    if worktree_path.exists() {
        return Err(format!("worktree already exists: {}", name));
    }

    let base = base_ref.as_deref().unwrap_or("HEAD");
    git_cmd(
        &repo_root,
        &["worktree", "add", &worktree_path.to_string_lossy(), "-b", &branch, base],
    )?;

    Ok(worktree_path.to_string_lossy().to_string())
}

/// Lista todas as worktrees do repositório.
#[tauri::command]
pub fn worktree_list(repo_root: String) -> Result<Vec<WorktreeInfo>, String> {
    let output = git_cmd(&repo_root, &["worktree", "list", "--porcelain"])?;
    let mut worktrees = Vec::new();
    let mut current: Option<WorktreeInfo> = None;

    for line in output.lines() {
        if let Some(path) = line.strip_prefix("worktree ") {
            if let Some(c) = current.take() {
                worktrees.push(c);
            }
            current = Some(WorktreeInfo {
                path: path.to_string(),
                branch: String::new(),
                is_main: false,
            });
        } else if let Some(branch) = line.strip_prefix("branch ") {
            if let Some(ref mut c) = current {
                c.branch = branch.trim_start_matches("refs/heads/").to_string();
            }
        } else if line.contains("bare") {
            if let Some(ref mut c) = current {
                c.is_main = true;
            }
        }
    }
    if let Some(c) = current.take() {
        worktrees.push(c);
    }

    Ok(worktrees)
}

/// Remove uma git worktree.
#[tauri::command]
pub fn worktree_delete(repo_root: String, name: String) -> Result<String, String> {
    let root = PathBuf::from(&repo_root);
    let parent = root.parent().unwrap_or(&root);
    let worktree_path = parent.join("workspaces").join(&name);

    if !worktree_path.exists() {
        return Err(format!("worktree not found: {}", name));
    }

    git_cmd(&repo_root, &["worktree", "remove", &worktree_path.to_string_lossy()])?;
    // Limpa também a branch local se existir
    let _ = git_cmd(&repo_root, &["branch", "-D", &name]);

    Ok(format!("worktree {} removed", name))
}
