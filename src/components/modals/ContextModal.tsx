import { Loader2, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

import { useT } from '../../lib/i18n'
import { useContextStore } from '../../stores/contextStore'
import { useUiStore } from '../../stores/uiStore'
import { Modal } from './Modal'
import styles from './ContextModal.module.css'

export function ContextModal() {
  const t = useT()
  const open = useUiStore((s) => s.openModal === 'context')
  const closeModal = useUiStore((s) => s.closeModal)
  const report = useContextStore((s) => s.report)
  const state = useContextStore((s) => s.state)
  const loading = useContextStore((s) => s.loading)
  const refresh = useContextStore((s) => s.refresh)

  useEffect(() => {
    if (open) refresh()
  }, [open])

  return (
    <Modal open={open} onClose={closeModal} title={t('context.title')} width={620}>
      <div className={styles.header}>
        <button type="button" className={styles.refreshBtn} onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
          {loading ? t('context.refreshing') : t('context.refresh')}
        </button>
        {report && (
          <span className={styles.updated}>{t('context.reportUpdated', { when: new Date(report.updatedAt).toLocaleTimeString() })}</span>
        )}
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t('context.objectives')}</h3>
          {report && (
            <p className={styles.statRow}>
              <span className={styles.stat}>{t('context.objectiveCount', { count: report.objectiveCount })}</span>
              <span className={styles.stat}>{t('context.completedCount', { count: report.completedCount })}</span>
            </p>
          )}
          {state && state.objectives.length > 0 ? (
            <ul className={styles.list}>
              {state.objectives.map((o: { id: string; title: string; status: string }) => (
                <li key={o.id} className={styles.listItem}>
                  <span className={`${styles.statusDot} ${styles[`status_${o.status}`]}`} />
                  <span className={styles.listText}>{o.title}</span>
                  <span className={styles.listMeta}>{t(`context.status.${o.status}` as any)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{t('context.noObjectives')}</p>
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t('context.decisions')}</h3>
          <p className={styles.empty}>{t('context.noDecisions')}</p>
        </section>
      </div>

      {report?.contextMd && (
        <details className={styles.markdown}>
          <summary className={styles.markdownSummary}>{t('context.markdown')}</summary>
          <pre className={styles.markdownPre}>{report.contextMd}</pre>
        </details>
      )}
    </Modal>
  )
}
