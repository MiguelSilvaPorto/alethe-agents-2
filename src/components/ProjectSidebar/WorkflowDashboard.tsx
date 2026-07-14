import {
  GitBranch,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useT } from '../../lib/i18n';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useUiStore } from '../../stores/uiStore';
import { useProjectsStore } from '../../stores/projectsStore';
import { gitDiff, gitRevParse } from '../../lib/tauri';
import { EmptyState } from '../EmptyState/EmptyState';
import styles from './WorkflowDashboard.module.css';

export function WorkflowDashboard() {
  const t = useT();
  const sessions = useWorkflowStore((s) => s.sessions);
  const localWorkflows = useWorkflowStore((s) => s.localWorkflows);
  const loading = useWorkflowStore((s) => s.loading);
  const refresh = useWorkflowStore((s) => s.refresh);
  const openModal = useUiStore((s) => s.openModal_);
  const pushToast = useUiStore((s) => s.pushToast);

  const projects = useProjectsStore((s) => s.projects);
  const acceptTask = useProjectsStore((s) => s.acceptTask);
  const moveTask = useProjectsStore((s) => s.moveTask);
  const unblockTask = useProjectsStore((s) => s.unblockTask);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('__all__');

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const activeSessions = sessions.filter((s) => s.status === 'in_progress');
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  // Tasks: do projeto selecionado ou de todos
  const tasks = useMemo(() => {
    if (selectedProjectId === '__all__') {
      return projects.flatMap((p) =>
        p.tasks.map((t) => ({ ...t, _projectName: p.name })),
      );
    }
    return (selectedProject?.tasks ?? []).map((t) => ({
      ...t,
      _projectName: selectedProject?.name ?? '',
    }));
  }, [projects, selectedProjectId, selectedProject]);

  const implementingTasks = tasks.filter((t) => t.status === 'implementing');
  const reviewTasks = tasks.filter((t) => t.status === 'review');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const hasActiveTasks = tasks.some((t) => t.status !== 'accepted');
  const historyTasks = tasks
    .filter((t) => t.status === 'accepted')
    .slice(-5)
    .reverse();

  const projectsWithTasks = useMemo(
    () => projects.filter((p) => p.tasks.length > 0),
    [projects],
  );

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    // Auto-select se há apenas 1 projeto com tasks
    if (projectsWithTasks.length === 1 && selectedProjectId === '__all__') {
      setSelectedProjectId(projectsWithTasks[0].id);
    }
  }, [projectsWithTasks]);

  function ageLabel(createdAt: number): string {
    const age = Date.now() - createdAt;
    if (age < 60000) return 'agora';
    if (age < 3600000) return `${Math.floor(age / 60000)}m`;
    return `${Math.floor(age / 3600000)}h`;
  }

  type TaskWithType = (typeof tasks)[number];

  function TaskCard({ task }: { task: TaskWithType }) {
    const statusLabel = {
      implementing: t('task.status.implementing'),
      review: t('task.status.review'),
      pending: t('task.status.pending'),
      blocked: t('task.status.blocked'),
      accepted: t('task.status.accepted'),
    }[task.status];

    const badgeClass = {
      implementing: styles.badgeImpl,
      review: styles.badgeReview,
      pending: styles.badgePending,
      blocked: styles.badgeBlocked,
      accepted: styles.badgePending,
    }[task.status];

    if (task.status === 'blocked') {
      return (
        <div className={`${styles.taskCard} ${styles.taskBlocked}`}>
          <div className={styles.taskHead}>
            <span className={`${styles.taskBadge} ${badgeClass}`}>
              ⚠ {statusLabel}
            </span>
          </div>
          <p className={styles.taskTitle}>{task.title}</p>
          {task.blockedCommand && (
            <code className={styles.taskCommand}>{task.blockedCommand}</code>
          )}
          <p className={styles.taskMeta}>
            {task.assignedTo ?? task.agentType ?? '—'} ·{' '}
            {ageLabel(task.createdAt)}
          </p>
          <div className={styles.taskActions}>
            <button
              type="button"
              className={styles.taskApproveBtn}
              onClick={() => {
                unblockTask(task.id, true);
                moveTask(task.id, 'implementing');
              }}
            >
              {t('task.approve')}
            </button>
            <button
              type="button"
              className={styles.taskRejectBtn}
              onClick={() => {
                unblockTask(task.id, false);
                moveTask(task.id, 'implementing');
              }}
            >
              {t('task.reject')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.taskCard}>
        <div className={styles.taskHead}>
          <span className={`${styles.taskBadge} ${badgeClass}`}>
            {statusLabel}
          </span>
          {task.rejectionCycle > 0 && (
            <span className={styles.rejectionIcon}>↺{task.rejectionCycle}</span>
          )}
        </div>
        <p className={styles.taskTitle}>{task.title}</p>
        {selectedProjectId === '__all__' && (task as any)._projectName && (
          <p className={styles.taskProject}>{(task as any)._projectName}</p>
        )}
        <p className={styles.taskMeta}>
          {task.assignedTo ?? task.agentType ?? '—'} ·{' '}
          {ageLabel(task.createdAt)}
        </p>
        {task.status === 'pending' && (
          <div className={styles.taskActions}>
            <button
              type="button"
              className={styles.taskApproveBtn}
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
                pushToast({
                  title: t('task.accepted'),
                  body: task.title,
                  action: {
                    label: t('common.undo'),
                    onClick: () =>
                      useProjectsStore.getState().undoAcceptTask(task.id),
                  },
                });
                setTimeout(() => {
                  const state = useProjectsStore.getState();
                  for (const p of state.projects) {
                    const tsk = p.tasks.find((t) => t.id === task.id);
                    if (tsk?.status === 'accepted') break;
                  }
                }, 30000);
              }}
            >
              {t('task.accept')}
            </button>
            <button
              type="button"
              className={styles.taskRejectBtn}
              onClick={() => openModal('taskReject', { taskId: task.id })}
            >
              {t('task.reject')}
            </button>
          </div>
        )}
      </div>
    );
  }

  function Column({
    label,
    count,
    tasks,
  }: {
    label: string;
    count: number;
    tasks: TaskWithType[];
  }) {
    return (
      <div className={styles.column}>
        <div className={styles.columnHeader}>
          <span className={styles.columnLabel}>{label}</span>
          <span className={styles.columnCount}>{count}</span>
        </div>
        <div className={styles.columnBody}>
          {tasks.length === 0 ? (
            <div className={styles.columnEmpty}>—</div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    );
  }

  const showKanban = hasActiveTasks;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <span className={styles.title}>{t('workflow.title')}</span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={refresh}
            title={t('context.refresh')}
          >
            {loading ? (
              <Loader2 size={14} className={styles.spin} />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => openModal('workflow')}
            title={t('workflow.new')}
          >
            <Plus size={14} />
          </button>
        </div>
      </header>

      {/* Seletor de projeto */}
      {projects.length > 0 && (
        <div className={styles.projectSelector}>
          <select
            className={styles.projectSelect}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="__all__">
              {t('task.allProjects')} ({projects.length})
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.tasks.length})
              </option>
            ))}
          </select>
          <ChevronDown size={12} className={styles.selectChevron} />
        </div>
      )}

      {showKanban && (
        <div className={styles.kanban}>
          <Column
            label={t('task.tab.implementing')}
            count={implementingTasks.length}
            tasks={implementingTasks}
          />
          <Column
            label={t('task.tab.review')}
            count={reviewTasks.length}
            tasks={reviewTasks}
          />
          <Column
            label={t('task.tab.pending')}
            count={pendingTasks.length}
            tasks={pendingTasks}
          />
        </div>
      )}

      {blockedTasks.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            ⚠ {t('task.tab.blocked')} ({blockedTasks.length})
          </h4>
          {blockedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      )}

      {historyTasks.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            {t('task.tab.history')} ({historyTasks.length})
          </h4>
          <div className={styles.historyRow}>
            {historyTasks.map((task) => (
              <div key={task.id} className={styles.historyChip}>
                ✓ {task.title}
              </div>
            ))}
          </div>
        </section>
      )}

      {!showKanban &&
        activeSessions.length === 0 &&
        localWorkflows.length === 0 && (
          <EmptyState
            icon={<Layers size={24} />}
            title={t('workflow.noActive')}
          />
        )}

      {activeSessions.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            {t('workflow.active')} ({activeSessions.length})
          </h4>
          {activeSessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.workflowCard}
              onClick={() => openModal('workflowDetail')}
            >
              <div className={styles.cardHead}>
                <span
                  className={`${styles.badge} ${s.mode === 'GIT' ? styles.badgeGit : styles.badgeLocal}`}
                >
                  {s.mode === 'GIT' ? (
                    <GitBranch size={10} />
                  ) : (
                    <Layers size={10} />
                  )}
                  {s.mode}
                </span>
                <span className={styles.cardStatus}>{s.status}</span>
              </div>
              <p className={styles.cardTask}>{s.task}</p>
              <p className={styles.cardMeta}>
                {t('workflow.agentPrefix', { agent: s.agentType })}
                {s.branch
                  ? ` · ${t('workflow.branch', { branch: s.branch })}`
                  : ''}
              </p>
            </button>
          ))}
        </section>
      )}

      {localWorkflows.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            Local ({localWorkflows.length})
          </h4>
          {localWorkflows.map((w) => (
            <div key={w.ptyId} className={styles.workflowCard}>
              <div className={styles.cardHead}>
                <span className={`${styles.badge} ${styles.badgeLocal}`}>
                  <Layers size={10} /> LOCAL
                </span>
              </div>
              <p className={styles.cardTask}>{w.task}</p>
              <p className={styles.cardMeta}>
                {t('workflow.steps', { count: w.steps.length })}
              </p>
            </div>
          ))}
        </section>
      )}

      {completedSessions.length > 0 && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            {t('workflow.completed')} ({completedSessions.length})
          </h4>
          {completedSessions.slice(0, 5).map((s) => (
            <div
              key={s.id}
              className={`${styles.workflowCard} ${styles.cardDone}`}
            >
              <p className={styles.cardTask}>✅ {s.task}</p>
              <p className={styles.cardMeta}>{s.agentType}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
