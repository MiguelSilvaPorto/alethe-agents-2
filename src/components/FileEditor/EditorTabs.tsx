import { useCallback, useRef, type DragEvent } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import styles from './EditorTabs.module.css';

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const pinTab = useEditorStore((s) => s.pinTab);
  const moveTab = useEditorStore((s) => s.moveTab);
  const barsRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.button === 0) setActiveTab(id);
      if (e.button === 1) closeTab(id);
    },
    [setActiveTab, closeTab],
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      pinTab(id);
    },
    [pinTab],
  );

  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabsBar} ref={barsRef} role="tablist">
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onClose={() => closeTab(tab.id)}
          onMove={(toIndex) => moveTab(index, toIndex)}
          index={index}
        />
      ))}
    </div>
  );
}

interface TabProps {
  tab: {
    id: string;
    name: string;
    filePath: string;
    isDirty: boolean;
    isPinned: boolean;
    isPreview: boolean;
    language: string;
  };
  isActive: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  onClose: () => void;
  onMove: (toIndex: number) => void;
  index: number;
}

function Tab({
  tab,
  isActive,
  onMouseDown,
  onDoubleClick,
  onClose,
  onMove,
  index,
}: TabProps) {
  const dragRef = useRef<{ index: number }>({ index });

  const handleDragStart = (e: DragEvent) => {
    dragRef.current.index = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const fromIndex = dragRef.current.index;
    if (fromIndex !== index) onMove(index);
  };

  const parentPath = tab.filePath.split(/[/\\]/).slice(-2, -1)[0];

  return (
    <div
      className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${tab.isPreview ? styles.tabPreview : ''} ${tab.isDirty ? styles.tabDirty : ''}`}
      role="tab"
      aria-selected={isActive}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={(e) => onMouseDown(e, tab.id)}
      onDoubleClick={() => onDoubleClick(tab.id)}
      title={tab.filePath}
    >
      {tab.isDirty ? <span className={styles.dirtyDot} /> : null}
      <span className={styles.tabLabel}>{tab.name}</span>
      {parentPath ? (
        <span className={styles.tabPath}>— {parentPath}</span>
      ) : null}
      <button
        type="button"
        className={styles.closeBtn}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close"
        aria-label={`Close ${tab.name}`}
      >
        <X size={11} />
      </button>
    </div>
  );
}
