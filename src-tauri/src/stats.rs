use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use sysinfo::System;

#[derive(Serialize)]
pub struct MemoryStats {
    pub total_mb: f64,
    pub app_mb: f64,
    pub webview_mb: f64,
    pub ptys_mb: f64,
    pub process_count: usize,
}

fn shared_system() -> &'static Mutex<System> {
    static SYS: OnceLock<Mutex<System>> = OnceLock::new();
    SYS.get_or_init(|| Mutex::new(System::new()))
}

pub fn collect_memory_stats() -> MemoryStats {
    use sysinfo::Pid;
    let sys_lock = shared_system();
    let mut sys = sys_lock
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    // BFS no subtree de processos a partir do PID atual.
    let root_pid = std::process::id() as usize;
    let mut visited = std::collections::HashSet::<usize>::new();
    let mut frontier = vec![root_pid];
    while let Some(pid) = frontier.pop() {
        if !visited.insert(pid) {
            continue;
        }
        for (other_pid, process) in sys.processes() {
            if let Some(parent) = process.parent() {
                if parent.as_u32() as usize == pid {
                    frontier.push(other_pid.as_u32() as usize);
                }
            }
        }
    }

    let mut app_bytes: u64 = 0;
    let mut webview_bytes: u64 = 0;
    let mut pty_bytes: u64 = 0;
    for pid in &visited {
        let Some(process) = sys.process(Pid::from(*pid)) else {
            continue;
        };
        let mem = process.memory();
        let name = process.name().to_string_lossy().to_ascii_lowercase();
        if *pid == root_pid || name.contains("alethe") || name.contains("ensemble") {
            app_bytes += mem;
        } else if name.contains("msedgewebview2") {
            webview_bytes += mem;
        } else {
            pty_bytes += mem;
        }
    }

    let total = app_bytes + webview_bytes + pty_bytes;
    let to_mb = |bytes: u64| (bytes as f64) / 1024.0 / 1024.0;
    MemoryStats {
        total_mb: to_mb(total),
        app_mb: to_mb(app_bytes),
        webview_mb: to_mb(webview_bytes),
        ptys_mb: to_mb(pty_bytes),
        process_count: visited.len(),
    }
}

#[tauri::command]
pub fn get_memory_stats() -> MemoryStats {
    collect_memory_stats()
}
