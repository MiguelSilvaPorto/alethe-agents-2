/**
 * Saudação dinâmica baseada na hora local.
 * 5:00–11:59 → "bom dia"
 * 12:00–17:59 → "boa tarde"
 * 18:00–4:59 → "boa noite"
 */
export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

/** Formato: "qua, 8 mai · 09:32" */
export function formatHomeDate(date: Date = new Date()): string {
  const wd = WEEKDAYS[date.getDay()]
  const day = date.getDate()
  const mo = MONTHS[date.getMonth()]
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${wd}, ${day} ${mo} · ${h}:${m}`
}

/** "23:14", "ontem 18:42", "3 dias", "agora" */
export function formatRelativeTimestamp(ts: number, now: number = Date.now()): string {
  if (!ts) return '—'
  const diffMs = now - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const date = new Date(ts)
  const today = new Date(now)
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (sameDay) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `ontem ${h}:${m}`
  }
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays < 30) return `${diffDays} dias`
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}
