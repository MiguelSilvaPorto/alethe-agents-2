use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const LEGACY_IDENTIFIER_DIR: &str = "dev.ensemble";

fn copy_dir_missing(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.is_dir() {
        return Ok(());
    }
    fs::create_dir_all(dst).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(src).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_missing(&src_path, &dst_path)?;
        } else if !dst_path.exists() {
            fs::copy(&src_path, &dst_path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

pub fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let current = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?;
    let current_projects = current.join("projects.json");
    if current_projects.exists() {
        return Ok(current);
    }

    let Some(parent) = current.parent() else {
        return Ok(current);
    };
    let legacy = parent.join(LEGACY_IDENTIFIER_DIR);
    if legacy.join("projects.json").exists() {
        copy_dir_missing(&legacy, &current)?;
    }

    Ok(current)
}

pub fn scrollback_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("scrollback"))
}

pub fn scrollback_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    Ok(scrollback_dir(app)?.join(format!("{id}.bin")))
}

pub fn projects_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("projects.json"))
}

pub fn spawn_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("spawn.log"))
}
