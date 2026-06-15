/**
 * Fila global pra serializar spawns de PTY. Sem isso, abrir um grupo com N
 * projetos × M terminais dispara N*M `spawn_pty` em paralelo, sobrecarregando
 * o ConPTY do Windows e causando freeze do app no nível do SO.
 *
 * Uso:
 *   await acquireSpawnSlot()
 *   try { await spawnPty(...) } finally { releaseSpawnSlot() }
 */

const MAX_CONCURRENT_SPAWNS = 3

let active = 0
const waiters: Array<() => void> = []

type Listener = (snapshot: { active: number; queued: number }) => void
const listeners = new Set<Listener>()

function notify(): void {
  const snapshot = { active, queued: waiters.length }
  for (const l of listeners) l(snapshot)
}

export function subscribeSpawnQueue(l: Listener): () => void {
  listeners.add(l)
  l({ active, queued: waiters.length })
  return () => listeners.delete(l)
}

export function getSpawnQueueSnapshot(): { active: number; queued: number } {
  return { active, queued: waiters.length }
}

export function acquireSpawnSlot(): Promise<void> {
  if (active < MAX_CONCURRENT_SPAWNS) {
    active++
    notify()
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    waiters.push(() => {
      active++
      notify()
      resolve()
    })
    notify()
  })
}

export function releaseSpawnSlot(): void {
  active = Math.max(0, active - 1)
  const next = waiters.shift()
  if (next) next()
  else notify()
}
