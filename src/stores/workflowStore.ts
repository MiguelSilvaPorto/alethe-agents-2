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
import { useProjectsStore } from './projectsStore';

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

      // Sincroniza workflows com as tarefas dos projetos correspondentes
      const { projects } = useProjectsStore.getState();
      sessions.forEach((session) => {
        let title = session.task;
        let description = session.task;
        try {
          const parsed = JSON.parse(session.task);
          title = parsed.title || title;
          description = parsed.description || description;
        } catch {}

        // Encontra o projeto correspondente por meio de cwd ou repoRoot
        const targetProj =
          projects.find((p) =>
            p.terminals?.some((t) => t.cwd === session.repoRoot),
          ) || projects[0];

        if (targetProj) {
          // Mapeia status do workflow para status de tarefa
          let status: any = 'implementing';
          if (
            session.status === 'waiting_permission' ||
            session.status === 'blocked'
          )
            status = 'blocked';
          if (session.status === 'review') status = 'review';
          if (session.status === 'completed' || session.status === 'accepted')
            status = 'accepted';

          const existingTask = targetProj.tasks.find(
            (t) => t.id === session.id || t.title === title,
          );
          if (!existingTask) {
            // Cria a tarefa local usando createTask de projectsStore
            const created = useProjectsStore
              .getState()
              .createTask(targetProj.id, {
                title,
                description: description || '',
                agentType: session.agentType as any,
              });
            // Sobrescreve o ID gerado com o ID da sessão para termos mapeamento 1:1
            if (created) {
              useProjectsStore.setState((s) => ({
                projects: s.projects.map((p) =>
                  p.id === targetProj.id
                    ? {
                        ...p,
                        tasks: p.tasks.map((t) =>
                          t.id === created.id
                            ? { ...t, id: session.id, status }
                            : t,
                        ),
                      }
                    : p,
                ),
              }));
            }
          } else {
            // Atualiza status e data de modificação da tarefa existente se mudou
            if (existingTask.status !== status) {
              if (status === 'accepted') {
                useProjectsStore.getState().acceptTask(existingTask.id);
              } else {
                useProjectsStore.getState().moveTask(existingTask.id, status);
              }
            }
          }
        }
      });
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
