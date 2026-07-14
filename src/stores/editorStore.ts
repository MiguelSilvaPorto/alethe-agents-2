import { create } from 'zustand';
import { readTextFile, writeTextFile } from '../lib/tauri';
import { detectLanguage } from '../lib/languageDetection';
import { useUiStore } from './uiStore';

export interface EditorTab {
  id: string;
  filePath: string;
  name: string;
  language: string;
  isDirty: boolean;
  isPinned: boolean;
  isPreview: boolean;
}

export interface EditorFileState {
  content: string;
  savedContent: string;
  cursorPosition: { line: number; column: number };
  scrollPosition: number;
}

export interface EditorStore {
  tabs: EditorTab[];
  activeTabId: string | null;
  fileStates: Record<string, EditorFileState>;
  loading: Record<string, boolean>;

  openFile: (
    filePath: string,
    options?: { preview?: boolean; pinned?: boolean },
  ) => Promise<void>;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (tabId: string) => void;
  setDirty: (tabId: string, dirty: boolean) => void;
  updateContent: (tabId: string, content: string) => void;
  updateCursorPosition: (tabId: string, line: number, column: number) => void;
  updateScrollPosition: (tabId: string, position: number) => void;
  saveFile: (tabId: string) => Promise<void>;
  pinTab: (tabId: string) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
}

let tabCounter = 0;

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  fileStates: {},
  loading: {},

  openFile: async (filePath, options = {}) => {
    const state = get();

    if (filePath === 'virtual://settings') {
      const id = 'virtual-settings';
      const existingSettings = state.tabs.find((t) => t.id === id);
      if (existingSettings) {
        set({ activeTabId: id });
        return;
      }
      const tab: EditorTab = {
        id,
        filePath,
        name: 'Configurações',
        language: 'json',
        isDirty: false,
        isPinned: true,
        isPreview: false,
      };
      set((s) => ({
        tabs: [...s.tabs, tab],
        fileStates: {
          ...s.fileStates,
          [id]: {
            content: '{}',
            savedContent: '{}',
            cursorPosition: { line: 1, column: 1 },
            scrollPosition: 0,
          },
        },
        activeTabId: id,
      }));
      return;
    }

    const existing = state.tabs.find((t) => t.filePath === filePath);

    if (existing) {
      const { pinned, preview } = options;
      if (pinned) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === existing.id
              ? { ...t, isPinned: true, isPreview: false }
              : t,
          ),
          activeTabId: existing.id,
        }));
      } else if (preview === false) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === existing.id
              ? { ...t, isPinned: true, isPreview: false }
              : t,
          ),
          activeTabId: existing.id,
        }));
      } else {
        set({ activeTabId: existing.id });
      }
      return;
    }

    if (options.preview) {
      const previewTab = state.tabs.find((t) => t.isPreview);
      if (previewTab) {
        set((s) => ({
          tabs: s.tabs.filter((t) => t.id !== previewTab.id),
          fileStates: { ...s.fileStates },
          activeTabId: null,
        }));
        delete get().fileStates[previewTab.id];
      }
    }

    set((s) => ({ loading: { ...s.loading, [filePath]: true } }));

    try {
      const result = (await readTextFile(filePath)) as any;

      // Suporta tanto o novo objeto quanto retorno em formato string legado
      const content = typeof result === 'string' ? result : result.content;
      const isTruncated =
        typeof result === 'object' && result ? result.is_truncated : false;
      const totalLines =
        typeof result === 'object' && result ? result.total_lines : 0;

      if (isTruncated) {
        useUiStore.getState().pushToast({
          title: 'Arquivo Gigante Otimizado',
          body: `Exibindo as primeiras 10.000 linhas de um total de ${totalLines.toLocaleString()} linhas.`,
        });
      }

      const name = filePath.split(/[/\\]/).pop() || filePath;
      const language = detectLanguage(filePath);
      const id = `tab_${++tabCounter}`;

      const tab: EditorTab = {
        id,
        filePath,
        name,
        language,
        isDirty: false,
        isPinned: options.pinned ?? false,
        isPreview: options.preview ?? !options.pinned,
      };

      const fileState: EditorFileState = {
        content,
        savedContent: content,
        cursorPosition: { line: 1, column: 1 },
        scrollPosition: 0,
      };

      set((s) => ({
        tabs: [...s.tabs, tab],
        activeTabId: id,
        fileStates: { ...s.fileStates, [id]: fileState },
        loading: { ...s.loading, [filePath]: false },
      }));
    } catch (err) {
      set((s) => ({ loading: { ...s.loading, [filePath]: false } }));
    }
  },

  closeTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (
      !tab ||
      (tab.isDirty &&
        !window.confirm(`"${tab.name}" has unsaved changes. Close anyway?`))
    )
      return;

    const newTabs = state.tabs.filter((t) => t.id !== tabId);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === tabId) {
      const idx = state.tabs.findIndex((t) => t.id === tabId);
      newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
    }

    const newFileStates = { ...state.fileStates };
    delete newFileStates[tabId];

    set({ tabs: newTabs, activeTabId: newActiveId, fileStates: newFileStates });
  },

  closeOtherTabs: (tabId) => {
    const state = get();
    const keep = state.tabs.filter((t) => t.id === tabId);
    set({ tabs: keep, activeTabId: tabId });
  },

  closeAllTabs: () => {
    const state = get();
    const dirty = state.tabs.find((t) => t.isDirty);
    if (
      dirty &&
      !window.confirm('You have unsaved changes. Close all tabs anyway?')
    )
      return;
    set({ tabs: [], activeTabId: null, fileStates: {} });
  },

  setActiveTab: (tabId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.isPreview) {
      set((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === tabId ? { ...t, isPreview: false, isPinned: true } : t,
        ),
        activeTabId: tabId,
      }));
    } else {
      set({ activeTabId: tabId });
    }
  },

  setDirty: (tabId, dirty) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t)),
    }));
  },

  updateContent: (tabId, content) => {
    set((s) => {
      const fileState = s.fileStates[tabId];
      if (!fileState) return s;
      return {
        fileStates: {
          ...s.fileStates,
          [tabId]: { ...fileState, content },
        },
        tabs: s.tabs.map((t) =>
          t.id === tabId
            ? { ...t, isDirty: content !== fileState.savedContent }
            : t,
        ),
      };
    });
  },

  updateCursorPosition: (tabId, line, column) => {
    set((s) => {
      const fileState = s.fileStates[tabId];
      if (!fileState) return s;
      return {
        fileStates: {
          ...s.fileStates,
          [tabId]: { ...fileState, cursorPosition: { line, column } },
        },
      };
    });
  },

  updateScrollPosition: (tabId, position) => {
    set((s) => {
      const fileState = s.fileStates[tabId];
      if (!fileState) return s;
      return {
        fileStates: {
          ...s.fileStates,
          [tabId]: { ...fileState, scrollPosition: position },
        },
      };
    });
  },

  saveFile: async (tabId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    const fileState = state.fileStates[tabId];
    if (!tab || !fileState) return;

    try {
      await writeTextFile(tab.filePath, fileState.content);
      set((s) => ({
        fileStates: {
          ...s.fileStates,
          [tabId]: { ...fileState, savedContent: fileState.content },
        },
        tabs: s.tabs.map((t) =>
          t.id === tabId ? { ...t, isDirty: false } : t,
        ),
      }));
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  },

  pinTab: (tabId) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? { ...t, isPinned: true, isPreview: false } : t,
      ),
    }));
  },

  moveTab: (fromIndex, toIndex) => {
    set((s) => {
      const newTabs = [...s.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    });
  },
}));
