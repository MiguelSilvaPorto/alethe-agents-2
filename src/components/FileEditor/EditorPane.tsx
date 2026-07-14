import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { SettingsPanel } from '../ProjectSidebar/SettingsPanel';
import styles from './EditorPane.module.css';

const MONACO_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: 'on' as const,
  renderWhitespace: 'none' as const,
  tabSize: 2,
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  automaticLayout: true,
  bracketPairColorization: { enabled: true },
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  padding: { top: 8 },
};

export function EditorPane() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const fileStates = useEditorStore((s) => s.fileStates);
  const loading = useEditorStore((s) => s.loading);
  const updateContent = useEditorStore((s) => s.updateContent);
  const updateCursorPosition = useEditorStore((s) => s.updateCursorPosition);
  const saveFile = useEditorStore((s) => s.saveFile);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeFileState = activeTab ? fileStates[activeTab.id] : null;
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const isMonacoReady = useRef(false);

  const handleEditorDidMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      isMonacoReady.current = true;

      editor.onDidChangeCursorPosition((e) => {
        const tab = useEditorStore
          .getState()
          .tabs.find((t) => t.id === useEditorStore.getState().activeTabId);
        if (tab) {
          updateCursorPosition(
            tab.id,
            e.position.lineNumber,
            e.position.column,
          );
        }
      });

      editor.addAction({
        id: 'save-file',
        label: 'Save File',
        keybindings: [2048 | 49],
        run: () => {
          const state = useEditorStore.getState();
          if (state.activeTabId) state.saveFile(state.activeTabId);
        },
      });
    },
    [updateCursorPosition],
  );

  const handleChange: OnChange = useCallback(
    (value) => {
      if (!activeTabId || !isMonacoReady.current) return;
      updateContent(activeTabId, value ?? '');
    },
    [activeTabId, updateContent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTabId) saveFile(activeTabId);
      }
    },
    [activeTabId, saveFile],
  );

  useEffect(() => {
    if (!activeTabId) return;
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.activeTabId !== activeTabId) return;
      const tab = state.tabs.find((t) => t.id === activeTabId);
      if (!tab || !tab.isDirty) return;
    });
    return unsubscribe;
  }, [activeTabId]);

  if (!activeTab) {
    return null;
  }

  if (activeTab.filePath === 'virtual://settings') {
    return <SettingsPanel />;
  }

  if (!activeFileState) {
    return null;
  }

  const fileLoading = loading[activeTab.filePath];

  return (
    <div className={styles.pane} onKeyDown={handleKeyDown}>
      {fileLoading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <Editor
          className={styles.monaco}
          language={activeTab.language}
          value={activeFileState.content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={MONACO_OPTIONS}
          theme="vs-dark"
        />
      )}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span>{activeTab.language}</span>
        </div>
        <div className={styles.statusRight}>
          <span>
            Ln {activeFileState.cursorPosition.line}, Col{' '}
            {activeFileState.cursorPosition.column}
          </span>
          <span>
            {activeTab.isDirty
              ? 'Modified'
              : activeTab.isPreview
                ? 'Preview'
                : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
