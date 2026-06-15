import { getClaudeUsage, type ClaudeUsage } from './tauri'

const TTL_MS = 60_000

let cached: { value: ClaudeUsage; at: number } | null = null
let inFlight: Promise<ClaudeUsage> | null = null

export function getCachedClaudeUsage(force = false): Promise<ClaudeUsage> {
  const now = Date.now()
  if (!force && cached && now - cached.at < TTL_MS) {
    return Promise.resolve(cached.value)
  }
  if (!force && inFlight) return inFlight

  inFlight = getClaudeUsage()
    .then((value) => {
      cached = { value, at: Date.now() }
      return value
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
