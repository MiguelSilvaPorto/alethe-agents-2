import { X } from 'lucide-react'
import { useEffect } from 'react'

import { useAgentCanvasStore } from '../../stores/agentCanvasStore'
import styles from './AgentCanvasPOC.module.css'

/** Modal central com o feed completo do subagent selecionado no canvas. */
export function AgentModal() {
  const node = useAgentCanvasStore((s) =>
    s.selectedId ? s.nodes.find((n) => n.id === s.selectedId) ?? null : null,
  )
  const select = useAgentCanvasStore((s) => s.select)

  useEffect(() => {
    if (!node) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [node, select])

  if (!node) return null

  return (
    <div className={styles.modalBackdrop} onClick={() => select(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <span className={styles.cardType}>{node.agentType}</span>
          <span
            className={
              node.status === 'running'
                ? styles.statusRunning
                : node.status === 'idle'
                  ? styles.statusIdle
                  : styles.statusDone
            }
          >
            {node.status}
          </span>
          {node.kind === 'teammate' ? (
            <span className={styles.teammateMeta}>
              {node.team} · {node.turns} turno{node.turns === 1 ? '' : 's'}
            </span>
          ) : null}
          <span className={styles.modalId}>{node.id}</span>
          <button type="button" className={styles.clearButton} onClick={() => select(null)}>
            <X size={14} />
          </button>
        </header>

        {node.prompt ? (
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>tarefa</div>
            <div className={styles.modalPrompt}>{node.prompt}</div>
          </div>
        ) : null}

        <div className={`${styles.modalSection} ${styles.modalFeedSection}`}>
          <div className={styles.modalSectionTitle}>
            feed · {node.feed.length} tool call{node.feed.length === 1 ? '' : 's'}
          </div>
          <div className={styles.modalFeed}>
            {node.feed.length === 0 ? (
              <div className={styles.empty}>nenhuma tool call ainda</div>
            ) : (
              node.feed.map((ev) => (
                <div key={ev.toolUseId} className={styles.feedRow}>
                  <span className={styles.feedTime}>
                    {new Date(ev.ts).toLocaleTimeString('pt-BR')}
                  </span>
                  <span className={styles.feedTool}>{ev.toolName}</span>
                  <span className={styles.feedSummary}>{ev.summary}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {node.result ? (
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>resultado</div>
            <div className={styles.modalResult}>{node.result}</div>
          </div>
        ) : null}

        {node.transcriptPath ? (
          <div className={styles.modalTranscript}>{node.transcriptPath}</div>
        ) : null}
      </div>
    </div>
  )
}
