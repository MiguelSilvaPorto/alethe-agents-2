/**
 * Session Resume — persiste sessions ativas no localStorage para
 * retomar agentes automaticamente ao reabrir o app.
 */

const STORAGE_KEY = 'alethe:active-sessions'
const LEGACY_STORAGE_KEY = 'ensemble:active-sessions'

export type SavedSession = {
  sessionId: string
  /** Claude conversation ID (nome do JSONL, ex: "abc123-def456"). */
  claudeSessionId?: string
  /** Codex conversation ID (payload.id do session_meta em ~/.codex/sessions). */
  codexSessionId?: string
  cwd: string
  agent: string
  timestamp: number
}

export type ActiveSessions = Record<string, SavedSession>

export function getActiveSessions(): ActiveSessions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return {}
    const sessions = JSON.parse(raw) as ActiveSessions
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
    return sessions
  } catch {
    return {}
  }
}

export function saveSession(ptyId: string, session: SavedSession): void {
  const current = getActiveSessions()
  current[ptyId] = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function removeSession(ptyId: string): void {
  const current = getActiveSessions()
  delete current[ptyId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function consumeSession(ptyId: string): SavedSession | null {
  const current = getActiveSessions()
  const session = current[ptyId] ?? null
  if (session) {
    delete current[ptyId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  }
  return session
}
