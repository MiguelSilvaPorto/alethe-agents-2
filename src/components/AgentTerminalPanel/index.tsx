import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/uiStore';
import { ChatTab } from './ChatTab';
import styles from './AgentTerminalPanel.module.css';

export function AgentTerminalPanel({ style }: { style?: React.CSSProperties }) {
  const t = useT();
  const toggleTaskPanel = useUiStore((s) => s.toggleTaskPanel);
  const taskPanelVisible = useUiStore((s) => s.taskPanelVisible);
  const activeView = useUiStore((s) => s.activeView);

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
        style={style}
      >
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            <MessageSquare size={14} />
            Chat
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={toggleTaskPanel}
              title={t('ui.titlebar.closeTaskPanel')}
              aria-label={t('ui.titlebar.closeTaskPanel')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          className={styles.contentWrapper}
          style={{ flex: 1, minHeight: 0 }}
        >
          <ChatTab />
        </div>
      </aside>
    </>
  );
}
