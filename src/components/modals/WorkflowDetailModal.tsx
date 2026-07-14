import { GitBranch, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/uiStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Modal } from './Modal';
import styles from './WorkflowDetailModal.module.css';

export function WorkflowDetailModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === 'workflowDetail');
  const closeModal = useUiStore((s) => s.closeModal);
  const sessions = useWorkflowStore((s) => s.sessions);
  const branchStatuses = useWorkflowStore((s) => s.branchStatuses);
  const commitStep = useWorkflowStore((s) => s.commitStep);
  const complete = useWorkflowStore((s) => s.complete);
  const refresh = useWorkflowStore((s) => s.refresh);

  const [stepMsg, setStepMsg] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const active = sessions.find((s) => s.status === 'in_progress');
  const branchInfo = active ? branchStatuses[active.id] : null;

  const handleCommit = async () => {
    if (!active || !stepMsg.trim()) return;
    setBusy('commit');
    try {
      await commitStep(active.ptyId, stepMsg.trim());
      setStepMsg('');
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleComplete = async () => {
    if (!active) return;
    setBusy('complete');
    try {
      await complete(active.ptyId, summary.trim() || 'Workflow completed');
      refresh();
      closeModal();
    } finally {
      setBusy(null);
    }
  };

  if (!active) {
    return (
      <Modal
        open={open}
        onClose={closeModal}
        title={t('workflow.title')}
        width={500}
      >
        <p
          style={{
            padding: '20px 0',
            color: 'var(--fg-tertiary)',
            fontSize: 13,
          }}
        >
          {t('workflow.noActive')}
        </p>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={closeModal} title={active.task} width={500}>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{t('workflow.agentPrefix', { agent: active.agentType })}</span>
          {active.branch && (
            <span>
              <GitBranch size={12} /> {active.branch}
            </span>
          )}
          {active.mode === 'GIT' && branchInfo && (
            <span>
              {t('workflow.commits', { count: branchInfo.commitCount })}
            </span>
          )}
        </div>

        {active.mode === 'GIT' && branchInfo?.lastCommitMsg && (
          <p className={styles.lastCommit}>
            {t('workflow.lastCommit', { msg: branchInfo.lastCommitMsg })}
          </p>
        )}

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('workflow.commitStep')}</h4>
          <div className={styles.commitRow}>
            <input
              className={styles.input}
              type="text"
              value={stepMsg}
              onChange={(e) => setStepMsg(e.target.value)}
              placeholder={t('workflow.stepMessage')}
              onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy !== null || !stepMsg.trim()}
              onClick={handleCommit}
            >
              {busy === 'commit' ? (
                <Loader2 size={12} className={styles.spin} />
              ) : (
                '📝'
              )}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('workflow.complete')}</h4>
          <textarea
            className={styles.input}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('workflow.completeWith')}
            rows={2}
          />
          <button
            type="button"
            className={styles.btnComplete}
            disabled={busy !== null}
            onClick={handleComplete}
          >
            {busy === 'complete' ? (
              <Loader2 size={12} className={styles.spin} />
            ) : null}
            {t('workflow.complete')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
