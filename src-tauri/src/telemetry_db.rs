use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Clone)]
pub struct SourceSummary {
    pub source: String,
    pub cost_usd: f64,
    pub tokens: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelSummary {
    pub model: String,
    pub cost_usd: f64,
    pub tokens: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DailySummary {
    pub date_str: String, // formato "YYYY-MM-DD"
    pub cost_usd: f64,
    pub tokens: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TelemetrySummary {
    pub total_cost_usd: f64,
    pub total_tokens: u64,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_write_tokens: u64,
    pub by_source: Vec<SourceSummary>,
    pub by_model: Vec<ModelSummary>,
    pub daily_history: Vec<DailySummary>,
}

pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = crate::paths::app_data_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("alethe_telemetry.db"))
}

pub fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let path = get_db_path(app)?;
    Connection::open(path).map_err(|e| e.to_string())
}

pub fn init_db(app: &AppHandle) -> Result<(), String> {
    let conn = open_connection(app)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS unified_ai_usage_ledger (
            transaction_id TEXT PRIMARY KEY,
            session_id TEXT UNIQUE NOT NULL,
            tool_source TEXT NOT NULL,
            project_dir TEXT,
            timestamp INTEGER NOT NULL,
            model_alias TEXT NOT NULL,
            resolved_model_id TEXT NOT NULL,
            provider_name TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL DEFAULT 0,
            completion_tokens INTEGER NOT NULL DEFAULT 0,
            cache_read_tokens INTEGER NOT NULL DEFAULT 0,
            cache_write_tokens INTEGER NOT NULL DEFAULT 0,
            estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
            raw_payload_backup TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON unified_ai_usage_ledger(timestamp)",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_source ON unified_ai_usage_ledger(tool_source)",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_project ON unified_ai_usage_ledger(project_dir)",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn upsert_ledger_entry(
    app: &AppHandle,
    session_id: &str,
    tool_source: &str,
    project_dir: Option<&str>,
    model: &str,
    prompt_tokens: u64,
    completion_tokens: u64,
    cache_read: u64,
    cache_write: u64,
    cost_usd: f64,
) -> Result<(), String> {
    let conn = open_connection(app)?;
    let transaction_id = format!("tx_{}", session_id);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO unified_ai_usage_ledger (
            transaction_id, session_id, tool_source, project_dir, timestamp,
            model_alias, resolved_model_id, provider_name,
            prompt_tokens, completion_tokens, cache_read_tokens, cache_write_tokens,
            estimated_cost_usd, raw_payload_backup
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        ON CONFLICT(session_id) DO UPDATE SET
            prompt_tokens = excluded.prompt_tokens,
            completion_tokens = excluded.completion_tokens,
            cache_read_tokens = excluded.cache_read_tokens,
            cache_write_tokens = excluded.cache_write_tokens,
            estimated_cost_usd = excluded.estimated_cost_usd,
            timestamp = excluded.timestamp",
        params![
            transaction_id,
            session_id,
            tool_source,
            project_dir,
            timestamp,
            model,
            model,
            tool_source,
            prompt_tokens,
            completion_tokens,
            cache_read,
            cache_write,
            cost_usd,
            ""
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_telemetry_summary(app: AppHandle) -> Result<TelemetrySummary, String> {
    let conn = open_connection(&app)?;

    // Totais globais
    let mut stmt = conn.prepare(
        "SELECT 
            COALESCE(SUM(estimated_cost_usd), 0.0),
            COALESCE(SUM(prompt_tokens + completion_tokens + cache_read_tokens + cache_write_tokens), 0),
            COALESCE(SUM(prompt_tokens), 0),
            COALESCE(SUM(completion_tokens), 0),
            COALESCE(SUM(cache_read_tokens), 0),
            COALESCE(SUM(cache_write_tokens), 0)
         FROM unified_ai_usage_ledger"
    ).map_err(|e| e.to_string())?;

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let (total_cost_usd, total_tokens, prompt_tokens, completion_tokens, cache_read_tokens, cache_write_tokens) =
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            (
                row.get::<_, f64>(0).map_err(|e| e.to_string())?,
                row.get::<_, i64>(1).map_err(|e| e.to_string())? as u64,
                row.get::<_, i64>(2).map_err(|e| e.to_string())? as u64,
                row.get::<_, i64>(3).map_err(|e| e.to_string())? as u64,
                row.get::<_, i64>(4).map_err(|e| e.to_string())? as u64,
                row.get::<_, i64>(5).map_err(|e| e.to_string())? as u64,
            )
        } else {
            (0.0, 0, 0, 0, 0, 0)
        };

    // Agrupado por Tool Source
    let mut stmt = conn.prepare(
        "SELECT tool_source, COALESCE(SUM(estimated_cost_usd), 0.0), 
                COALESCE(SUM(prompt_tokens + completion_tokens + cache_read_tokens + cache_write_tokens), 0)
         FROM unified_ai_usage_ledger
         GROUP BY tool_source"
    ).map_err(|e| e.to_string())?;
    let source_rows = stmt.query_map([], |row| {
        Ok(SourceSummary {
            source: row.get(0)?,
            cost_usd: row.get(1)?,
            tokens: row.get::<_, i64>(2)? as u64,
        })
    }).map_err(|e| e.to_string())?;
    let mut by_source = Vec::new();
    for r in source_rows {
        by_source.push(r.map_err(|e| e.to_string())?);
    }

    // Agrupado por Model
    let mut stmt = conn.prepare(
        "SELECT model_alias, COALESCE(SUM(estimated_cost_usd), 0.0), 
                COALESCE(SUM(prompt_tokens + completion_tokens + cache_read_tokens + cache_write_tokens), 0)
         FROM unified_ai_usage_ledger
         GROUP BY model_alias"
    ).map_err(|e| e.to_string())?;
    let model_rows = stmt.query_map([], |row| {
        Ok(ModelSummary {
            model: row.get(0)?,
            cost_usd: row.get(1)?,
            tokens: row.get::<_, i64>(2)? as u64,
        })
    }).map_err(|e| e.to_string())?;
    let mut by_model = Vec::new();
    for r in model_rows {
        by_model.push(r.map_err(|e| e.to_string())?);
    }

    // Histórico diário (últimos 30 dias)
    let mut stmt = conn.prepare(
        "SELECT strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch')),
                COALESCE(SUM(estimated_cost_usd), 0.0),
                COALESCE(SUM(prompt_tokens + completion_tokens + cache_read_tokens + cache_write_tokens), 0)
         FROM unified_ai_usage_ledger
         GROUP BY 1
         ORDER BY 1 ASC
         LIMIT 30"
    ).map_err(|e| e.to_string())?;
    let daily_rows = stmt.query_map([], |row| {
        Ok(DailySummary {
            date_str: row.get(0)?,
            cost_usd: row.get(1)?,
            tokens: row.get::<_, i64>(2)? as u64,
        })
    }).map_err(|e| e.to_string())?;
    let mut daily_history = Vec::new();
    for r in daily_rows {
        daily_history.push(r.map_err(|e| e.to_string())?);
    }

    Ok(TelemetrySummary {
        total_cost_usd,
        total_tokens,
        prompt_tokens,
        completion_tokens,
        cache_read_tokens,
        cache_write_tokens,
        by_source,
        by_model,
        daily_history,
    })
}

#[tauri::command]
pub fn clear_telemetry_stats(app: AppHandle) -> Result<(), String> {
    let conn = open_connection(&app)?;
    conn.execute("DELETE FROM unified_ai_usage_ledger", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_in_memory_db() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS unified_ai_usage_ledger (
                transaction_id TEXT PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                tool_source TEXT NOT NULL,
                project_dir TEXT,
                timestamp INTEGER NOT NULL,
                model_alias TEXT NOT NULL,
                resolved_model_id TEXT NOT NULL,
                provider_name TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                completion_tokens INTEGER NOT NULL DEFAULT 0,
                cache_read_tokens INTEGER NOT NULL DEFAULT 0,
                cache_write_tokens INTEGER NOT NULL DEFAULT 0,
                estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
                raw_payload_backup TEXT
            )",
            [],
        ).unwrap();

        // Insere um registro de teste
        conn.execute(
            "INSERT INTO unified_ai_usage_ledger (
                transaction_id, session_id, tool_source, project_dir, timestamp,
                model_alias, resolved_model_id, provider_name,
                prompt_tokens, completion_tokens, cache_read_tokens, cache_write_tokens,
                estimated_cost_usd, raw_payload_backup
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                "tx_123",
                "session_123",
                "claude_code",
                "/some/path",
                1625097600,
                "claude-3-5-sonnet",
                "claude-3-5-sonnet",
                "anthropic",
                1000,
                500,
                100,
                50,
                0.0525,
                ""
            ],
        ).unwrap();

        // Consulta de verificação
        let mut stmt = conn.prepare("SELECT COALESCE(SUM(estimated_cost_usd), 0.0), COALESCE(SUM(prompt_tokens), 0) FROM unified_ai_usage_ledger").unwrap();
        let mut rows = stmt.query([]).unwrap();
        let row = rows.next().unwrap().unwrap();
        let cost: f64 = row.get(0).unwrap();
        let tokens: i64 = row.get(1).unwrap();

        assert_eq!(cost, 0.0525);
        assert_eq!(tokens, 1000);
    }
}
