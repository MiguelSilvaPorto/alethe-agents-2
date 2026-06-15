import claudeLogo from '../../assets/claude-code.png'
import codexLogo from '../../assets/codex.png'
import { iconMap } from '../../assets/icons'
import type { AgentType, Theme } from '../../lib/types'

export function ShellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h5" strokeLinecap="round" />
    </svg>
  )
}

export function ClaudeIcon({ size = 16 }: { size?: number }) {
  return <img src={claudeLogo} alt="" width={size} height={size} draggable={false} />
}

export function CodexIcon({ size = 16 }: { size?: number }) {
  return <img src={codexLogo} alt="" width={size} height={size} draggable={false} />
}

export function OpenCodeIcon({ size = 16, theme }: { size?: number; theme: Theme }) {
  const lightIcon = theme === 'light' || theme === 'min-light'
  return (
    <img
      src={lightIcon ? iconMap.open : iconMap.openDark}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  )
}

export function VSCodeIcon({ size = 14 }: { size?: number }) {
  return <img src={iconMap.vscode} alt="" width={size} height={size} draggable={false} />
}

export function AgentIcon({
  type,
  size = 16,
  theme,
}: {
  type: AgentType
  size?: number
  theme: Theme
}) {
  if (type === 'shell') return <ShellIcon size={size} />
  if (type === 'claude') return <ClaudeIcon size={size} />
  if (type === 'codex') return <CodexIcon size={size} />
  return <OpenCodeIcon size={size} theme={theme} />
}
