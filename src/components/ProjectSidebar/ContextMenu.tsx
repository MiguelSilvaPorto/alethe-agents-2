import { useEffect, useRef } from 'react'

import styles from './ContextMenu.module.css'

export type MenuItem =
  | { kind: 'item'; label: string; onClick: () => void; danger?: boolean }
  | { kind: 'separator' }

type Props = {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // se vai sair da tela, cola na borda
  const maxX = window.innerWidth - 200
  const maxY = window.innerHeight - items.length * 32 - 8

  return (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: Math.min(x, maxX), top: Math.min(y, maxY) }}
      role="menu"
    >
      {items.map((item, i) =>
        item.kind === 'separator' ? (
          <div key={i} className={styles.separator} />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={`${styles.item} ${item.danger ? styles.danger : ''}`}
            onClick={() => {
              item.onClick()
              onClose()
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
