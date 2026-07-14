import { create } from 'zustand';
import type {
  ContextReport,
  ContextState,
  Decision,
  Objective,
  ObjectiveStatus,
} from '../lib/tauri';
import {
  contextAddDecision as apiAddDecision,
  contextDeleteObjective as apiDeleteObjective,
  contextGetDecisions as apiGetDecisions,
  contextGetState as apiGetState,
  contextRefresh as apiRefresh,
  contextSetObjective as apiSetObjective,
  contextUpdateObjectiveStatus as apiUpdateStatus,
} from '../lib/tauri';

type ContextStore = {
  report: ContextReport | null;
  state: ContextState | null;
  decisions: Decision[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setObjective: (o: Objective) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  updateStatus: (id: string, status: ObjectiveStatus) => Promise<void>;
  addDecision: (d: Decision) => Promise<void>;
};

export const useContextStore = create<ContextStore>((set, get) => ({
  report: null,
  state: null,
  decisions: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [report, state, decisions] = await Promise.all([
        apiRefresh(),
        apiGetState(),
        apiGetDecisions(),
      ]);
      set({ report, state, decisions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setObjective: async (o) => {
    try {
      const objectives = await apiSetObjective(o);
      set((s) => (s.state ? { state: { ...s.state, objectives } } : {}));
      get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteObjective: async (id) => {
    try {
      const objectives = await apiDeleteObjective(id);
      set((s) => (s.state ? { state: { ...s.state, objectives } } : {}));
      get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  updateStatus: async (id, status) => {
    try {
      const objectives = await apiUpdateStatus(id, status);
      set((s) => (s.state ? { state: { ...s.state, objectives } } : {}));
      get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addDecision: async (d) => {
    try {
      const decisions = await apiAddDecision(d);
      set({ decisions });
      get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
