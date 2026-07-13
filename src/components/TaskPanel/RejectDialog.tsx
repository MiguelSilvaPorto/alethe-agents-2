import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "../../lib/i18n";
import { useUiStore } from "../../stores/uiStore";
import { useProjectsStore } from "../../stores/projectsStore";
import { Modal } from "../modals/Modal";

export function RejectDialog() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === "taskReject");
  const context = useUiStore((s) => s.modalContext) as {
    taskId: string;
  } | null;
  const closeModal = useUiStore((s) => s.closeModal);
  const rejectTask = useProjectsStore((s) => s.rejectTask);
  const projects = useProjectsStore((s) => s.projects);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const task = context
    ? projects.flatMap((p) => p.tasks).find((t) => t.id === context.taskId)
    : null;

  const handleReject = async () => {
    if (!context || !feedback.trim()) return;
    setBusy(true);
    try {
      rejectTask(context.taskId, feedback.trim());
      closeModal();
      setFeedback("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        closeModal();
        setFeedback("");
      }}
      title={t("task.rejectTitle")}
      width={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {task ? (
          <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
            <strong>{task.title}</strong>
            {task.rejectionCycle > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  color: "var(--fg-faint)",
                  fontSize: 12,
                }}
              >
                {t("task.rejectedN", { n: String(task.rejectionCycle) })}
              </span>
            )}
          </p>
        ) : null}

        <label style={{ fontSize: 12, color: "var(--fg)", fontWeight: 500 }}>
          {t("task.rejectPrompt")}
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t("task.rejectPlaceholder")}
          rows={4}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--fg)",
            fontSize: 13,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        {task && task.rejections.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>
            <strong>{t("task.rejectHistory")}</strong>
            {task.rejections.map((r, i) => (
              <p
                key={i}
                style={{
                  margin: "4px 0",
                  padding: "4px 6px",
                  background: "var(--bg-sunken)",
                  borderRadius: 4,
                }}
              >
                #{i + 1}: {r.feedback}
              </p>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 8,
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
            onClick={() => {
              closeModal();
              setFeedback("");
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy || !feedback.trim()}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #ef4444",
              background: "#ef4444",
              color: "#fff",
              cursor: busy || !feedback.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
              opacity: busy || !feedback.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={handleReject}
          >
            {busy ? <Loader2 size={14} /> : null}
            {busy ? t("task.rejecting") : t("task.rejectAndSend")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
