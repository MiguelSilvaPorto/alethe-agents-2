import type { WebRect } from './tauri'

/**
 * Igualdade de retângulos da WebView. Usado pelo GhosttySurface para coalescer
 * sincronizações: se o rect não mudou, não disparamos um IPC redundante pro
 * backend (importante durante drags de separador, que disparam muitos eventos).
 */
export function webRectsEqual(a: WebRect | null, b: WebRect | null): boolean {
  if (a === null || b === null) return a === b
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
