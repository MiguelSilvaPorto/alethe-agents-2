import { useState, useMemo } from 'react';
import {
  Plus,
  ListChecks,
  GitBranch,
  Clock,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProjectsStore } from '../../stores/projectsStore';
import { useUiStore } from '../../stores/uiStore';
import { useT } from '../../lib/i18n';
import { TaskCard } from './TaskCard';
import styles from './TaskPanel.module.css';

type TabId = 'implementing' | 'review' | 'pending' | 'blocked' | 'history';

const TABS: { id: TabId; labelKey: string; icon: typeof Plus }[] = [
  { id: 'implementing', labelKey: 'task.tab.implementing', icon: Clock },
  { id: 'review', labelKey: 'task.tab.review', icon: ListChecks },
  { id: 'pending', labelKey: 'task.tab.pending', icon: GitBranch },
  { id: 'blocked', labelKey: 'task.tab.blocked', icon: AlertTriangle },
  { id: 'history', labelKey: 'task.tab.history', icon: History },
];

export function TaskPanel() {
  const t = useT();
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const projects = useProjectsStore((s) => s.projects);
  const createTask = useProjectsStore((s) => s.createTask);
  const toggleTaskPanel = useUiStore((s) => s.toggleTaskPanel);
  const taskPanelVisible = useUiStore((s) => s.taskPanelVisible);
  const activeView = useUiStore((s) => s.activeView);
  const [activeTab, setActiveTab] = useState<TabId>('implementing');

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );

  const tasks = useMemo(() => activeProject?.tasks ?? [], [activeProject]);

  const filteredTasks = useMemo(() => {
    if (activeTab === 'history') {
      return tasks.filter(
        (t) => t.status === 'accepted' || t.rejectionCycle > 0,
      );
    }
    if (activeTab === 'blocked') {
      return tasks.filter((t) => t.status === 'blocked');
    }
    return tasks.filter((t) => t.status === activeTab);
  }, [tasks, activeTab]);

  return (
    <>
      {!taskPanelVisible && activeView === 'workspace' && (
        <button
          type="button"
          className={styles.toggleEdge}
          onClick={toggleTaskPanel}
          title={t('ui.titlebar.openTaskPanel')}
          aria-label={t('ui.titlebar.openTaskPanel')}
        >
          <ChevronLeft size={14} />
        </button>
      )}
      <aside
        className={`${styles.panel} ${!taskPanelVisible ? styles.panelHidden : ''}`}
      >
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            {activeProject
              ? `${t('task.title')} — ${activeProject.name}`
              : t('task.title')}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {activeProject ? (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => {
                  const title = prompt(t('task.newTitle'));
                  if (title?.trim()) {
                    createTask(activeProject.id, { title: title.trim() });
                  }
                }}
                title={t('task.new')}
                aria-label={t('task.new')}
              >
                <Plus size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className={styles.addBtn}
              onClick={toggleTaskPanel}
              title={t('ui.titlebar.closeTaskPanel')}
              aria-label={t('ui.titlebar.closeTaskPanel')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {!activeProject ? (
          <div className={styles.emptyState}>
            <p style={{ marginBottom: 8 }}>{t('task.selectProject')}</p>
            <p style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
              {t('task.selectProjectHint')}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              {TABS.map((tab) => {
                const count =
                  tab.id === 'history'
                    ? tasks.filter(
                        (t) => t.status === 'accepted' || t.rejectionCycle > 0,
                      ).length
                    : tab.id === 'blocked'
                      ? tasks.filter((t) => t.status === 'blocked').length
                      : tasks.filter((t) => t.status === tab.id).length;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={12} />
                    {t(tab.labelKey as any)}
                    {count > 0 ? (
                      <span className={styles.tabBadge}>{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className={styles.content}>
              {activeTab === 'history' ? (
                <>
                  {filteredTasks.length === 0 ? (
                    <div className={styles.emptyState}>
                      {t('task.history.empty')}
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <TaskCard key={task.id} task={task} variant="history" />
                    ))
                  )}
                </>
              ) : (
                <>
                  {filteredTasks.length === 0 ? (
                    <div className={styles.emptyState}>
                      {t('task.empty' as any, { status: activeTab })}
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
