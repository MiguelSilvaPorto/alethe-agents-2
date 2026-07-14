import { create } from 'zustand';
import type {
  GitWorkflowStatus,
  LocalWorkflow,
  WorkflowMode,
  WorkflowSession,
} from '../lib/tauri';
import {
  workflowCommitStep as apiCommitStep,
  workflowComplete as apiComplete,
  workflowGetBranchStatus as apiGetBranchStatus,
  workflowGetLocalStatus as apiGetLocalStatus,
  workflowGetStatus as apiGetStatus,
  workflowStartSession as apiStartSession,
} from '../lib/tauri';

type WorkflowStore = {
  sessions: WorkflowSession[];
  localWorkflows: LocalWorkflow[];
  branchStatuses: Record<string, GitWorkflowStatus | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startSession: (
    ptyId: string,
    agentType: string,
    task: string,
    mode: WorkflowMode,
    repoRoot: string | null,
  ) => Promise<WorkflowSession>;
  commitStep: (ptyId: string, message: string) => Promise<string>;
  complete: (ptyId: string, summary: string) => Promise<void>;
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  sessions: [],
  localWorkflows: [],
  branchStatuses: {},
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [sessions, localWorkflows] = await Promise.all([
        apiGetStatus(),
        apiGetLocalStatus(),
      ]);
      const branchStatuses: Record<string, GitWorkflowStatus | null> = {};
      for (const s of sessions) {
        if (s.mode === 'GIT') {
          try {
            branchStatuses[s.id] = await apiGetBranchStatus(s.id);
          } catch {
            branchStatuses[s.id] = null;
          }
        }
      }
      set({ sessions, localWorkflows, branchStatuses, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  startSession: async (ptyId, agentType, task, mode, repoRoot) => {
    const session = await apiStartSession(
      ptyId,
      agentType,
      task,
      mode,
      repoRoot,
    );
    set((s) => ({ sessions: [...s.sessions, session] }));
    return session;
  },

  commitStep: async (ptyId, message) => {
    const result = await apiCommitStep(ptyId, message);
    get().refresh();
    return result;
  },

  complete: async (ptyId, summary) => {
    await apiComplete(ptyId, summary);
    get().refresh();
  },
}));
