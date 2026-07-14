import { FileCode } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { EditorTabs } from './EditorTabs';
import { EditorPane } from './EditorPane';
import { useEditorStore } from '../../stores/editorStore';
import styles from './FileEditor.module.css';

export function FileEditor() {
  const t = useT();
  const tabs = useEditorStore((s) => s.tabs);

  return (
    <div className={styles.editorArea}>
      <EditorTabs />
      {tabs.length === 0 ? (
        <div className={styles.emptyState}>
          <FileCode size={48} className={styles.emptyIcon} />
          <span>{t('editor.empty')}</span>
          <span className={styles.emptyHint}>{t('editor.emptyHint')}</span>
        </div>
      ) : (
        <EditorPane />
      )}
    </div>
  );
}
