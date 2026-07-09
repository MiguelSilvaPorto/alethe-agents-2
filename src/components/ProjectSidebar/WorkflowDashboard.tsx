import { GitBranch, Layers, Loader2, Plus, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

import { useT } from '../../lib/i18n'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useUiStore } from '../../stores/uiStore'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from './WorkflowDashboard.module.css'

export function WorkflowDashboard() {
  const t = useT()
  const sessions = useWorkflowStore((s) => s.sessions)
  const localWorkflows = useWorkflowStore((s) => s.localWorkflows)
  const loading = useWorkflowStore((s) => s.loading)
  const refresh = useWorkflowStore((s) => s.refresh)
  const openModal = useUiStore((s) => s.openModal_)

  const activeSessions = sessions.filter((s) => s.status === 'in_progress')
  const completedSessions = sessions.filter((s) => s.status === 'completed')

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <span className={styles.title}>{t('workflow.title')}</span>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconBtn} onClick={refresh} title={t('context.refresh')}>
            {loading ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
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

      {activeSessions.length === 0 && localWorkflows.length === 0 ? (
        <EmptyState icon={<Layers size={24} />} title={t('workflow.noActive')} />
      ) : (
        <>
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
                    <span className={`${styles.badge} ${styles[s.mode === 'GIT' ? 'badgeGit' : 'badgeLocal']}`}>
                      {s.mode === 'GIT' ? <GitBranch size={10} /> : <Layers size={10} />}
                      {s.mode}
                    </span>
                    <span className={styles.cardStatus}>{s.status}</span>
                  </div>
                  <p className={styles.cardTask}>{s.task}</p>
                  <p className={styles.cardMeta}>
                    {t('workflow.agentPrefix', { agent: s.agentType })}
                    {s.branch ? ` · ${t('workflow.branch', { branch: s.branch })}` : ''}
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
                <div key={s.id} className={`${styles.workflowCard} ${styles.cardDone}`}>
                  <p className={styles.cardTask}>✅ {s.task}</p>
                  <p className={styles.cardMeta}>{s.agentType}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
