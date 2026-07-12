import { GitBranch, Layers, Loader2 } from "lucide-react";
import { useState } from "react";

import { useT } from "../../lib/i18n";
import { useUiStore } from "../../stores/uiStore";
import { useWorkflowStore } from "../../stores/workflowStore";
import type { WorkflowMode } from "../../lib/tauri";
import { Modal } from "./Modal";
import styles from "./WorkflowModal.module.css";

const AGENTS = ["claude", "codex", "opencode", "shell"] as const;

export function WorkflowModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === "workflow");
  const closeModal = useUiStore((s) => s.closeModal);
  const startSession = useWorkflowStore((s) => s.startSession);
  const refresh = useWorkflowStore((s) => s.refresh);

  const [task, setTask] = useState("");
  const [agentType, setAgentType] = useState<string>("claude");
  const [mode, setMode] = useState<WorkflowMode>("GIT");
  const [repoRoot, setRepoRoot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!task.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(
        `wf-${Date.now()}`,
        agentType,
        task.trim(),
        mode,
        mode === "GIT" ? repoRoot.trim() || null : null,
      );
      closeModal();
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t("workflow.new")}
      width={480}
    >
      <div className={styles.form}>
        <label className={styles.label}>
          {t("workflow.task")}
          <textarea
            className={styles.input}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Implement JWT authentication"
            rows={3}
          />
        </label>

        <label className={styles.label}>
          {t("workflow.agentType")}
          <select
            className={styles.select}
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          {t("workflow.mode")}
          <div className={styles.modeRow}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === "GIT" ? styles.modeActive : ""}`}
              onClick={() => setMode("GIT")}
            >
              <GitBranch size={14} />
              {t("workflow.mode.GIT")}
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === "LOCAL" ? styles.modeActive : ""}`}
              onClick={() => setMode("LOCAL")}
            >
              <Layers size={14} />
              {t("workflow.mode.LOCAL")}
            </button>
          </div>
        </label>

        {mode === "GIT" && (
          <label className={styles.label}>
            Repo root (optional)
            <input
              className={styles.input}
              type="text"
              value={repoRoot}
              onChange={(e) => setRepoRoot(e.target.value)}
              placeholder="Leave empty to use current project root"
            />
          </label>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || !task.trim()}
            onClick={handleStart}
          >
            {busy ? <Loader2 size={14} className={styles.spin} /> : null}
            {busy ? t("workflow.starting") : t("workflow.start")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
