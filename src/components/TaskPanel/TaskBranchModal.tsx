import { useState } from "react";
import { AlertTriangle, GitBranch, Shield, Zap } from "lucide-react";
import { useT } from "../../lib/i18n";
import { useUiStore } from "../../stores/uiStore";
import { useProjectsStore } from "../../stores/projectsStore";
import { Modal } from "../modals/Modal";

type BranchMode = "safe" | "repair" | "force";

export function TaskBranchModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === "taskBranch");
  const context = useUiStore((s) => s.modalContext) as {
    taskId: string;
  } | null;
  const closeModal = useUiStore((s) => s.closeModal);
  const projects = useProjectsStore((s) => s.projects);
  const [mode, setMode] = useState<BranchMode>("safe");

  const task = context
    ? projects.flatMap((p) => p.tasks).find((t) => t.id === context.taskId)
    : null;

  const handleBranch = () => {
    if (!task?.git) return;

    if (mode === "safe") {
      // git branch task/xxx {commit} — só cria ponteiro
      closeModal();
      return;
    }

    if (mode === "repair") {
      // git checkout -b task/xxx {commit} + dispara agent de reparo
      closeModal();
      return;
    }

    // mode === "force"
    closeModal();
  };

  if (!task) return null;

  const conflictFiles = task.git?.changedFiles ?? [];

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t("task.branchTitle")}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
          <strong>{task.title}</strong>
          {" — "}
          {task.assignedTo ?? task.agentType ?? ""}
          {task.git?.afterCommitShort ? ` · ${task.git.afterCommitShort}` : ""}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            background: "var(--bg-sunken)",
            padding: 8,
            borderRadius: 6,
          }}
        >
          <strong>{t("task.branchFiles")}</strong>
          {conflictFiles.length > 0 ? (
            <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px" }}>
              {conflictFiles.map((f, i) => (
                <li
                  key={i}
                  style={{ color: "var(--fg-faint)", marginBottom: 2 }}
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: "4px 0 0", color: "var(--fg-faint)" }}>
              {t("task.noFiles")}
            </p>
          )}
        </div>

        {task.git?.diffStat ? (
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-muted)",
              background: "var(--bg)",
              padding: "6px 8px",
              borderRadius: 4,
              whiteSpace: "pre",
              overflowX: "auto",
            }}
          >
            {task.git.diffStat}
          </div>
        ) : null}

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--fg)",
              marginBottom: 8,
            }}
          >
            {t("task.branchMode")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${mode === "safe" ? "var(--accent)" : "var(--border)"}`,
                background:
                  mode === "safe" ? "var(--accent-faint)" : "var(--panel)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="branchMode"
                checked={mode === "safe"}
                onChange={() => setMode("safe")}
                style={{ marginTop: 2 }}
              />
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 500,
                    fontSize: 13,
                    color: "var(--fg)",
                  }}
                >
                  <Shield size={14} style={{ color: "var(--accent)" }} />
                  {t("task.mode.safe")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-faint)",
                    marginTop: 2,
                  }}
                >
                  <code
                    style={{ fontSize: 11 }}
                  >{`git branch task/${task.id}/... ${task.git?.afterCommitShort ?? ""}`}</code>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    marginTop: 4,
                  }}
                >
                  {t("task.mode.safeDesc")}
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${mode === "repair" ? "var(--accent)" : "var(--border)"}`,
                background:
                  mode === "repair" ? "var(--accent-faint)" : "var(--panel)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="branchMode"
                checked={mode === "repair"}
                onChange={() => setMode("repair")}
                style={{ marginTop: 2 }}
              />
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 500,
                    fontSize: 13,
                    color: "var(--fg)",
                  }}
                >
                  <Zap size={14} style={{ color: "#f59e0b" }} />
                  {t("task.mode.repair")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-faint)",
                    marginTop: 2,
                  }}
                >
                  <code
                    style={{ fontSize: 11 }}
                  >{`git checkout -b task/${task.id}/... ${task.git?.afterCommitShort ?? ""}`}</code>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    marginTop: 4,
                  }}
                >
                  {t("task.mode.repairDesc")}
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${mode === "force" ? "#ef4444" : "var(--border)"}`,
                background: mode === "force" ? "#ef444410" : "var(--panel)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="branchMode"
                checked={mode === "force"}
                onChange={() => setMode("force")}
                style={{ marginTop: 2 }}
              />
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 500,
                    fontSize: 13,
                    color: mode === "force" ? "#ef4444" : "var(--fg)",
                  }}
                >
                  <AlertTriangle size={14} />
                  {t("task.mode.force")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-faint)",
                    marginTop: 2,
                  }}
                >
                  <code
                    style={{ fontSize: 11 }}
                  >{`git checkout -b task/${task.id}/... ${task.git?.afterCommitShort ?? ""}`}</code>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    marginTop: 4,
                  }}
                >
                  {t("task.mode.forceDesc")}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
          }}
        >
          <button
            type="button"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--fg)",
              cursor: "pointer",
              fontSize: 13,
            }}
            onClick={closeModal}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-on)",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={handleBranch}
          >
            <GitBranch size={14} />
            {mode === "safe"
              ? t("task.branchCreate")
              : mode === "repair"
                ? t("task.branchRepair")
                : t("task.branchForce")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
