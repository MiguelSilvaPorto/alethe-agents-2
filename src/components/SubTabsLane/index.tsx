import { Plus, X } from 'lucide-react'

import { useProjectsStore } from '../../stores/projectsStore'
import type { SubTab } from '../../lib/types'
import { AgentIcon } from '../icons/AgentIcons'
import styles from './SubTabsLane.module.css'

export type SubTabsLaneProps = {
  tabs: SubTab[]
  activeTabId: string
  onActivate: (tabId: string) => void
  onClose: (tabId: string) => void
  onAdd: () => void
}

export function SubTabsLane({ tabs, activeTabId, onActivate, onClose, onAdd }: SubTabsLaneProps) {
  const terminalTheme = useProjectsStore(
    (s) => s.preferences.terminalTheme ?? s.preferences.uiTheme,
  )

  return (
    <div className={styles.lane}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={`${styles.itemWrap} ${isActive ? styles.active : ''}`}
          >
            <button
              type="button"
              className={styles.item}
              onClick={() => onActivate(tab.id)}
              title={tab.name || tab.type}
              aria-label={tab.name || tab.type}
            >
              <AgentIcon type={tab.type} size={14} theme={terminalTheme} />
              {tab.completionUnread ? (
                <span className={styles.doneBadge} aria-label="Resposta pronta">
                  !
                </span>
              ) : null}
            </button>
            {tabs.length > 1 ? (
              <button
                type="button"
                className={styles.close}
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`Fechar tab "${tab.name || tab.type}"?`)) onClose(tab.id)
                }}
                title="Fechar tab"
                aria-label="Fechar tab"
              >
                <X size={8} />
              </button>
            ) : null}
          </div>
        )
      })}
      <button
        type="button"
        className={styles.add}
        onClick={onAdd}
        title="Nova tab"
        aria-label="Nova tab"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
