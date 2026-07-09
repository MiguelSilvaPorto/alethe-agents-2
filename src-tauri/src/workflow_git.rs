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

fn git_cmd(repo_root: &PathBuf, args: &[&str]) -> Result<String, String> {
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

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitWorkflowStatus {
    pub branch: String,
    pub exists: bool,
    pub ahead: u32,
    pub behind: u32,
    pub commit_count: u32,
    pub last_commit_msg: Option<String>,
}

pub fn create_agent_branch(repo_root: &PathBuf, _agent_type: &str, pty_id: &str, task_slug: &str) -> Result<String, String> {
    let branch_name = format!("agent/{}/{}", pty_id, task_slug);
    match git_cmd(repo_root, &["rev-parse", "--verify", "--quiet", &branch_name]) {
        Ok(_) => Err(format!("branch already exists: {branch_name}")),
        Err(_) => {
            git_cmd(repo_root, &["checkout", "-b", &branch_name])?;
            Ok(branch_name)
        }
    }
}

pub fn commit_step(repo_root: &PathBuf, message: &str, _agent_type: &str) -> Result<String, String> {
    let full_msg = format!("[alethe:workflow] agent={} {}", agent_type, message);
    git_cmd(repo_root, &["add", "-A"])?;
    let status = git_cmd(repo_root, &["status", "--porcelain"])?;
    if status.is_empty() {
        return Err("nothing_to_commit".to_string());
    }
    git_cmd(repo_root, &["commit", "-m", &full_msg])?;
    git_cmd(repo_root, &["rev-parse", "--short", "HEAD"])
}

pub fn get_agent_history(repo_root: &PathBuf, branch: &str, max_count: u32) -> Result<Vec<String>, String> {
    let count = max_count.to_string();
    let raw = git_cmd(repo_root, &["log", &branch, &format!("--max-count={}", count), "--oneline", "--format=%h %s"])?;
    Ok(raw.lines().map(|l| l.to_string()).collect())
}

pub fn get_workflow_status(repo_root: &PathBuf, branch: &str) -> Result<GitWorkflowStatus, String> {
    let exists = git_cmd(repo_root, &["rev-parse", "--verify", "--quiet", branch])
        .map(|_| true)
        .unwrap_or(false);
    if !exists {
        return Ok(GitWorkflowStatus {
            branch: branch.to_string(),
            exists: false,
            ahead: 0,
            behind: 0,
            commit_count: 0,
            last_commit_msg: None,
        });
    }
    let commit_count = git_cmd(repo_root, &["rev-list", "--count", branch, "--not", "--remotes"])
        .unwrap_or_default()
        .parse::<u32>()
        .unwrap_or(0);
    let divergence = git_cmd(repo_root, &["rev-list", "--left-right", "--count", &format!("{}...@{{upstream}}", branch)])
        .ok();
    let (ahead, behind) = divergence
        .and_then(|v| {
            let parts: Vec<&str> = v.split_whitespace().collect();
            Some((parts.first()?.parse::<u32>().ok()?, parts.get(1)?.parse::<u32>().ok()?))
        })
        .unwrap_or((0, 0));
    let last_msg = git_cmd(repo_root, &["log", "-1", branch, "--format=%s"]).ok();
    Ok(GitWorkflowStatus {
        branch: branch.to_string(),
        exists: true,
        ahead,
        behind,
        commit_count,
        last_commit_msg: last_msg,
    })
}

pub fn merge_workflow(repo_root: &PathBuf, branch: &str, delete_branch: bool) -> Result<String, String> {
    git_cmd(repo_root, &["checkout", branch])?;
    git_cmd(repo_root, &["checkout", "main"])?;
    git_cmd(repo_root, &["merge", branch, "--no-edit"])?;
    if delete_branch {
        git_cmd(repo_root, &["branch", "-d", branch])?;
    }
    Ok(format!("merged {branch} into main"))
}

pub fn switch_to_branch(repo_root: &PathBuf, branch: &str) -> Result<String, String> {
    git_cmd(repo_root, &["checkout", branch])
}

pub fn current_branch(repo_root: &PathBuf) -> Result<String, String> {
    let symbolic = git_cmd(repo_root, &["symbolic-ref", "--short", "-q", "HEAD"]);
    if let Ok(branch) = symbolic {
        return Ok(branch);
    }
    git_cmd(repo_root, &["rev-parse", "--short", "HEAD"])
}
