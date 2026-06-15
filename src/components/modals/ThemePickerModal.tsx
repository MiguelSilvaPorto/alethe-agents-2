import { Check } from 'lucide-react'

import { THEME_OPTIONS } from '../../lib/themes'
import { useProjectsStore } from '../../stores/projectsStore'
import { useUiStore } from '../../stores/uiStore'
import { Modal } from './Modal'
import controls from './controls.module.css'

export function ThemePickerModal() {
  const open = useUiStore((s) => s.openModal === 'themePicker')
  const closeModal = useUiStore((s) => s.closeModal)
  const uiTheme = useProjectsStore((s) => s.preferences.uiTheme)
  const terminalTheme = useProjectsStore((s) => s.preferences.terminalTheme)
  const setUiTheme = useProjectsStore((s) => s.setUiTheme)
  const setTerminalTheme = useProjectsStore((s) => s.setTerminalTheme)

  return (
    <Modal open={open} onClose={closeModal} title="Escolher tema" width={620}>
      <div className={controls.themeGrid}>
        {THEME_OPTIONS.map((theme) => {
          const active = uiTheme === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              className={`${controls.themeCard} ${active ? controls.themeCardActive : ''}`}
              onClick={() => setUiTheme(theme.id)}
            >
              <span className={controls.themeSwatches} aria-hidden>
                {theme.colors.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span className={controls.themeTitleRow}>
                <strong>{theme.label}</strong>
                {active ? <Check size={15} /> : null}
              </span>
              <span className={controls.themeDescription}>{theme.description}</span>
            </button>
          )
        })}
      </div>

      <div className={controls.field} style={{ marginTop: 16 }}>
        <label className={controls.label}>Tema do terminal</label>
        <div className={controls.pillRow}>
          <button
            type="button"
            className={`${controls.pill} ${terminalTheme === null ? controls.pillActive : ''}`}
            onClick={() => setTerminalTheme(null)}
          >
            Seguir UI
          </button>
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`${controls.pill} ${terminalTheme === theme.id ? controls.pillActive : ''}`}
              onClick={() => setTerminalTheme(theme.id)}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
