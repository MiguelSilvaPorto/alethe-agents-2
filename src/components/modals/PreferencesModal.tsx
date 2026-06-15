import { Minus, Plus, RotateCcw } from 'lucide-react'

import { getProfileImageUrl, getProfileInitial } from '../../lib/profile'
import { THEME_OPTIONS } from '../../lib/themes'
import { UI_ZOOM_LIMITS, useProjectsStore } from '../../stores/projectsStore'
import { useUiStore } from '../../stores/uiStore'
import type { AgentType } from '../../lib/types'
import { ImageInput } from './ImageInput'
import { Modal } from './Modal'
import controls from './controls.module.css'

const AGENTS: { id: AgentType; label: string; description: string }[] = [
  { id: 'shell', label: 'Shell', description: 'PowerShell · cmd' },
  { id: 'claude', label: 'Claude Code', description: 'Anthropic CLI' },
  { id: 'codex', label: 'Codex', description: 'OpenAI CLI' },
  { id: 'opencode', label: 'OpenCode', description: 'Open source' },
]

export function PreferencesModal() {
  const open = useUiStore((s) => s.openModal === 'preferences')
  const closeModal = useUiStore((s) => s.closeModal)
  const preferences = useProjectsStore((s) => s.preferences)
  const setUiTheme = useProjectsStore((s) => s.setUiTheme)
  const setUiZoom = useProjectsStore((s) => s.setUiZoom)
  const setTerminalTheme = useProjectsStore((s) => s.setTerminalTheme)
  const setAgentEnabled = useProjectsStore((s) => s.setAgentEnabled)
  const setPreferences = useProjectsStore((s) => s.setPreferences)

  const enabledCount = Object.values(preferences.enabledAgents).filter(Boolean).length
  const avatarUrl = getProfileImageUrl(preferences)
  const initial = getProfileInitial(preferences.displayName)

  return (
    <Modal open={open} onClose={closeModal} title="Preferências" width={520}>
      <Section title="Perfil">
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 12, alignItems: 'center' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              draggable={false}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--border)',
                background: 'var(--bg-sunken)',
                color: 'var(--fg)',
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className={controls.input}
              value={preferences.displayName}
              onChange={(e) => setPreferences({ displayName: e.target.value })}
              placeholder="Nome"
              maxLength={60}
            />
            <ImageInput
              label="Foto"
              value={preferences.profileImageUrl}
              onChange={(profileImageUrl) => setPreferences({ profileImageUrl })}
              placeholder="Link da foto"
              hint="Use uma URL ou faça upload de uma imagem local."
            />
          </div>
        </div>
      </Section>

      <Section title="Tema da UI">
        <div className={controls.pillRow}>
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${controls.pill} ${preferences.uiTheme === t.id ? controls.pillActive : ''}`}
              onClick={() => setUiTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Zoom da interface">
        <div className={controls.stepperRow}>
          <button
            type="button"
            className={controls.iconBtn}
            onClick={() => setUiZoom(preferences.uiZoom - UI_ZOOM_LIMITS.step)}
            disabled={preferences.uiZoom <= UI_ZOOM_LIMITS.min}
            title="Diminuir zoom (Ctrl+-)"
            aria-label="Diminuir zoom"
          >
            <Minus size={14} />
          </button>
          <div className={controls.stepperValue}>
            {Math.round(preferences.uiZoom * 100)}%
          </div>
          <button
            type="button"
            className={controls.iconBtn}
            onClick={() => setUiZoom(preferences.uiZoom + UI_ZOOM_LIMITS.step)}
            disabled={preferences.uiZoom >= UI_ZOOM_LIMITS.max}
            title="Aumentar zoom (Ctrl+=)"
            aria-label="Aumentar zoom"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className={controls.iconBtn}
            onClick={() => setUiZoom(1)}
            disabled={preferences.uiZoom === 1}
            title="Resetar zoom (Ctrl+0)"
            aria-label="Resetar zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </Section>

      <Section title="Tema do terminal">
        <div className={controls.pillRow}>
          <button
            type="button"
            className={`${controls.pill} ${preferences.terminalTheme === null ? controls.pillActive : ''}`}
            onClick={() => setTerminalTheme(null)}
          >
            Seguir UI
          </button>
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${controls.pill} ${preferences.terminalTheme === t.id ? controls.pillActive : ''}`}
              onClick={() => setTerminalTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={`Agentes habilitados (${enabledCount}/4)`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AGENTS.map((a) => {
            const checked = preferences.enabledAgents[a.id]
            const disabled = checked && enabledCount === 1
            return (
              <label
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-sunken)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => setAgentEnabled(a.id, e.target.checked)}
                />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{a.description}</div>
                </span>
              </label>
            )
          })}
        </div>
      </Section>

      <Section title="Spotify">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className={controls.input}
            value={preferences.spotifyClientId}
            onChange={(e) => setPreferences({ spotifyClientId: e.target.value })}
            placeholder="Client ID"
            spellCheck={false}
          />
          <input
            className={controls.input}
            type="password"
            value={preferences.spotifyClientSecret}
            onChange={(e) => setPreferences({ spotifyClientSecret: e.target.value })}
            placeholder="Client Secret"
            spellCheck={false}
          />
          <div style={{ fontSize: 11, color: 'var(--fg-faint)', lineHeight: 1.45 }}>
            Cadastre <code>http://127.0.0.1:8888/callback</code> como Redirect URI no Spotify Developer Dashboard.
            Em dev, <code>SPOTIFY_CLIENT_ID</code> e <code>SPOTIFY_CLIENT_SECRET</code> ainda funcionam como fallback.
          </div>
        </div>
      </Section>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={controls.field}>
      <label className={controls.label}>{title}</label>
      {children}
    </div>
  )
}
