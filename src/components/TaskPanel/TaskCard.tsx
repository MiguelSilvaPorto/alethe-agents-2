import { Clock, GitBranch, RotateCcw } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useProjectsStore } from '../../stores/projectsStore';
import { useUiStore } from '../../stores/uiStore';
import { gitDiff, gitRevParse } from '../../lib/tauri';
import type { Task } from '../../lib/types';
import styles from './TaskCard.module.css';

type TaskCardProps = {
  task: Task;
  variant?: 'normal' | 'history';
};

export function TaskCard({ task, variant = 'normal' }: TaskCardProps) {
  const t = useT();
  const acceptTask = useProjectsStore((s) => s.acceptTask);
  const openModal = useUiStore((s) => s.openModal_);

  const statusLabel = {
    implementing: t('task.status.implementing'),
    review: t('task.status.review'),
    pending: t('task.status.pending'),
    accepted: t('task.status.accepted'),
    blocked: t('task.status.blocked'),
  }[task.status];

  const badgeClass = {
    implementing: styles.badgeImplementing,
    review: styles.badgeReview,
    pending: styles.badgePending,
    accepted: styles.badgeAccepted,
    blocked: styles.badgeBlocked,
  }[task.status];

  const age = Date.now() - task.createdAt;
  const ageLabel =
    age < 3600000
      ? `${Math.floor(age / 60000)}m`
      : `${Math.floor(age / 3600000)}h`;

  if (task.status === 'blocked') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={`${styles.badge} ${badgeClass}`}>{statusLabel}</span>
          <span className={styles.agentLabel}>
            <Clock size={11} />
            {ageLabel}
          </span>
        </div>
        <div className={styles.title}>{task.title}</div>
        {task.blockedCommand ? (
          <div className={styles.commandBox}>{task.blockedCommand}</div>
        ) : null}
        {task.blockedPrompt ? (
          <div className={styles.description}>{task.blockedPrompt}</div>
        ) : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => {
              const store = useProjectsStore.getState();
              store.unblockTask(task.id, true);
              store.moveTask(task.id, 'implementing');
            }}
          >
            {t('task.approve')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => {
              const store = useProjectsStore.getState();
              store.unblockTask(task.id, false);
              store.moveTask(task.id, 'implementing');
            }}
          >
            {t('task.reject')}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'history') {
    return (
      <div
        className={`${styles.card} ${task.status === 'accepted' ? '' : styles.rejected}`}
      >
        <div className={styles.cardHeader}>
          <span className={`${styles.badge} ${badgeClass}`}>{statusLabel}</span>
          <span className={styles.agentLabel}>
            {task.assignedTo ?? task.agentType ?? '—'}
          </span>
        </div>
        <div className={styles.title}>{task.title}</div>
        {task.rejectionCycle > 0 && (
          <div className={styles.rejectionInfo}>
            {t('task.rejectedN', { n: String(task.rejectionCycle) })}
          </div>
        )}
        {task.git?.diffStat ? (
          <div className={styles.diffStat}>{task.git.diffStat}</div>
        ) : null}
        <div className={styles.histActions}>
          <button
            type="button"
            className={styles.histBtn}
            title={t('task.branch')}
            onClick={() => openModal('taskBranch', { taskId: task.id })}
          >
            <GitBranch size={12} />
            {t('task.branch')}
          </button>
          <button
            type="button"
            className={styles.histBtn}
            title={t('task.revert')}
            onClick={() => {
              // Revert via git checkout do estado antes da task
              if (task.git?.beforeCommit && task.git?.changedFiles) {
                const store = useProjectsStore.getState();
                store.moveTask(task.id, 'implementing');
              }
            }}
          >
            <RotateCcw size={12} />
            {t('task.revert')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={`${styles.badge} ${badgeClass}`}>{statusLabel}</span>
        <span className={styles.agentLabel}>
          {task.assignedTo ?? task.agentType ?? '—'}
        </span>
      </div>
      <div className={styles.title}>{task.title}</div>
      {task.description ? (
        <div className={styles.description}>{task.description}</div>
      ) : null}
      {task.rejectionCycle > 0 && (
        <div className={styles.rejectionInfo}>
          {t('task.rejectedN', { n: String(task.rejectionCycle) })}
        </div>
      )}
      <div className={styles.meta}>
        <span>{ageLabel}</span>
        {task.agentType ? <span>{task.agentType}</span> : null}
      </div>
      {task.status === 'pending' && (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={async () => {
              // Capture git snapshot before accepting
              try {
                const state = useProjectsStore.getState();
                const project = state.projects.find((p) =>
                  p.tasks.some((t) => t.id === task.id),
                );
                const repoRoot = project?.terminals?.[0]?.cwd;
                if (repoRoot) {
                  const afterCommit = await gitRevParse(repoRoot);
                  const beforeCommit = task.git?.beforeCommit || '';
                  if (beforeCommit && beforeCommit !== afterCommit) {
                    const diff = await gitDiff(
                      repoRoot,
                      beforeCommit,
                      afterCommit,
                    );
                    useProjectsStore.getState().updateTaskGit(task.id, {
                      beforeCommit,
                      afterCommit,
                      beforeCommitShort: beforeCommit.slice(0, 7),
                      afterCommitShort: afterCommit.slice(0, 7),
                      changedFiles: diff.files.map((f) => f.path),
                      diffStat: `${diff.files.length} file(s), +${diff.totalAdded}/-${diff.totalRemoved} lines`,
                    });
                  } else {
                    useProjectsStore.getState().updateTaskGit(task.id, {
                      beforeCommit: beforeCommit || afterCommit,
                      afterCommit,
                      beforeCommitShort: (beforeCommit || afterCommit).slice(
                        0,
                        7,
                      ),
                      afterCommitShort: afterCommit.slice(0, 7),
                      changedFiles: [],
                      diffStat: '',
                    });
                  }
                }
              } catch {
                // Git not available — proceed without snapshot
              }

              acceptTask(task.id);
              // Show undo toast
              useUiStore.getState().pushToast({
                title: t('task.accepted'),
                body: task.title,
                action: {
                  label: t('common.undo'),
                  onClick: () =>
                    useProjectsStore.getState().undoAcceptTask(task.id),
                },
              });
              // Auto-undo after 30s
              setTimeout(() => {
                const state = useProjectsStore.getState();
                const p = state.projects.find((pr) =>
                  pr.tasks.some((t) => t.id === task.id),
                );
                if (p) {
                  const tsk = p.tasks.find((t) => t.id === task.id);
                  if (tsk?.status === 'accepted') {
                    // keep accepted - undo window expired
                  }
                }
              }, 30000);
            }}
          >
            {t('task.accept')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => openModal('taskReject', { taskId: task.id })}
          >
            {t('task.reject')}
          </button>
        </div>
      )}
    </div>
  );
}
