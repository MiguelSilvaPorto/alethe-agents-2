import { create } from 'zustand';

import type { PtyStatus } from '../lib/types';

/**
 * Runtime PTY state — não persistido. Mapeia ptyId → status atual,
 * timestamp da última transição (pra mostrar "há X min" no AgentMonitor)
 * e flag de "tem PTY vivo no backend?".
 *
 * O `status` é derivado por heurística do output (ANSI clear screens,
 * spinners típicos de Claude/Codex etc). Por enquanto só armazena, a
 * inferência vem quando portarmos `agentMonitor.ts`.
 */

export type PtyRuntime = {
  ptyId: string;
  status: PtyStatus;
  /** ms desde última transição de status. Atualizado quando setStatus muda o valor. */
  lastTransitionAt: number;
  /** true entre spawn_pty bem-sucedido e pty://exit. */
  alive: boolean;
  /**
   * Contador de exit events pendentes de PTYs antigos (após restarts). Cada
   * `beginRestart` incrementa; cada exit event recebido decrementa antes de
   * marcar como exited. Sem isso, o exit do PTY antigo (que chega async após
   * o restart resolver) marca o novo PTY como morto e o overlay "Reiniciar"
   * fica grudado.
   */
  expectedOldExits: number;
};

type TerminalsState = {
  byPtyId: Record<string, PtyRuntime>;

  registerPty: (ptyId: string) => void;
  /** Sinaliza que um restart foi iniciado — o próximo exit event será ignorado. */
  beginRestart: (ptyId: string) => void;
  setStatus: (ptyId: string, status: PtyStatus) => void;
  markExited: (ptyId: string) => void;
  unregister: (ptyId: string) => void;
};

function emptyRuntime(ptyId: string): PtyRuntime {
  return {
    ptyId,
    status: 'waiting',
    lastTransitionAt: Date.now(),
    alive: true,
    expectedOldExits: 0,
  };
}

export const useTerminalsStore = create<TerminalsState>((set) => ({
  byPtyId: {},

  registerPty: (ptyId) =>
    set((state) => {
      if (state.byPtyId[ptyId]?.alive) return state;
      return { byPtyId: { ...state.byPtyId, [ptyId]: emptyRuntime(ptyId) } };
    }),

  beginRestart: (ptyId) =>
    set((state) => {
      const current = state.byPtyId[ptyId];
      const base = current ?? emptyRuntime(ptyId);
      return {
        byPtyId: {
          ...state.byPtyId,
          [ptyId]: {
            ...base,
            alive: true,
            status: 'waiting',
            lastTransitionAt: Date.now(),
            expectedOldExits: base.expectedOldExits + 1,
          },
        },
      };
    }),

  setStatus: (ptyId, status) =>
    set((state) => {
      const current = state.byPtyId[ptyId];
      if (!current || current.status === status) return state;
      return {
        byPtyId: {
          ...state.byPtyId,
          [ptyId]: { ...current, status, lastTransitionAt: Date.now() },
        },
      };
    }),

  markExited: (ptyId) =>
    set((state) => {
      const current = state.byPtyId[ptyId];
      if (!current) return state;
      // Exit pendente de restart anterior — só consome o contador, não marca exited.
      if (current.expectedOldExits > 0) {
        return {
          byPtyId: {
            ...state.byPtyId,
            [ptyId]: {
              ...current,
              expectedOldExits: current.expectedOldExits - 1,
            },
          },
        };
      }
      return {
        byPtyId: {
          ...state.byPtyId,
          [ptyId]: {
            ...current,
            alive: false,
            status: 'stopped',
            lastTransitionAt: Date.now(),
          },
        },
      };
    }),

  unregister: (ptyId) =>
    set((state) => {
      if (!(ptyId in state.byPtyId)) return state;
      const next = { ...state.byPtyId };
      delete next[ptyId];
      return { byPtyId: next };
    }),
}));
