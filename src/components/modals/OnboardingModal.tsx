import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getProfileInitial } from '../../lib/profile'
import { THEME_OPTIONS } from '../../lib/themes'
import { useProjectsStore } from '../../stores/projectsStore'
import type { AgentType } from '../../lib/types'
import { AgentIcon } from '../icons/AgentIcons'
import { ImageInput } from './ImageInput'
import { Modal } from './Modal'
import controls from './controls.module.css'

const AGENTS: { id: AgentType; label: string; description: string }[] = [
  { id: 'shell', label: 'Shell', description: 'PowerShell · cmd' },
  { id: 'claude', label: 'Claude', description: 'Anthropic CLI' },
  { id: 'codex', label: 'Codex', description: 'OpenAI CLI' },
  { id: 'opencode', label: 'OpenCode', description: 'Open source' },
]

export function OnboardingModal() {
  const preferences = useProjectsStore((s) => s.preferences)
  const setPreferences = useProjectsStore((s) => s.setPreferences)
  const setAgentEnabled = useProjectsStore((s) => s.setAgentEnabled)
  const setUiTheme = useProjectsStore((s) => s.setUiTheme)
  const terminalTheme = preferences.terminalTheme ?? preferences.uiTheme
  const [name, setName] = useState(preferences.displayName)
  const [photoUrl, setPhotoUrl] = useState(preferences.profileImageUrl)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    if (preferences.accountCreated) return
    setName(preferences.displayName)
    setPhotoUrl(preferences.profileImageUrl)
  }, [preferences.accountCreated, preferences.displayName, preferences.profileImageUrl])

  if (preferences.accountCreated) return null

  const enabledCount = Object.values(preferences.enabledAgents).filter(Boolean).length
  const trimmedName = name.trim()
  const trimmedPhotoUrl = photoUrl.trim()
  const canCreate = trimmedName.length > 0 && enabledCount > 0
  const initial = getProfileInitial(trimmedName)

  const finish = () => {
    if (!canCreate) return
    setPreferences({
      accountCreated: true,
      onboardingDone: true,
      displayName: trimmedName,
      profileImageUrl: trimmedPhotoUrl,
    })
  }

  return (
    <Modal
      open
      onClose={() => {
        if (canCreate) finish()
      }}
      title="Criar perfil"
      width={500}
      footer={
        <>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--fg-faint)' }}>
            O cadastro é local. Projetos e terminais ficam separados da conta.
          </span>
          <button
            type="button"
            className={`${controls.btn} ${controls.btnPrimary}`}
            onClick={finish}
            disabled={!canCreate}
          >
            Começar
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: 0 }}>
        Escolha como você quer aparecer no app.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 1fr',
          gap: 14,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {trimmedPhotoUrl && !imgFailed ? (
          <img
            src={trimmedPhotoUrl}
            alt=""
            draggable={false}
            onError={() => setImgFailed(true)}
            onLoad={() => setImgFailed(false)}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid var(--border)',
              background: 'var(--bg-sunken)',
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid var(--border)',
              background: 'var(--bg-sunken)',
              color: 'var(--fg)',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
        )}
        <div>
          <div className={controls.field} style={{ marginBottom: 8 }}>
            <label className={controls.label}>Nome</label>
            <input
              className={controls.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={60}
              data-autofocus
            />
          </div>
          <ImageInput
            label="Foto"
            value={photoUrl}
            onChange={(value) => {
              setPhotoUrl(value)
              setImgFailed(false)
            }}
            placeholder="https://..."
            hint="Use uma URL ou faça upload de uma imagem local."
          />
        </div>
      </div>

      <div className={controls.field}>
        <label className={controls.label}>Quais agentes você usa?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AGENTS.map((a) => {
            const enabled = preferences.enabledAgents[a.id]
            const lockedSingle = enabled && enabledCount === 1
            return (
              <button
                key={a.id}
                type="button"
                disabled={lockedSingle}
                onClick={() => setAgentEnabled(a.id, !enabled)}
                className={`${controls.pill} ${enabled ? controls.pillActive : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AgentIcon type={a.id} size={20} theme={terminalTheme} />
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 13 }}>{a.label}</strong>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 400 }}>
                    {a.description}
                  </span>
                </span>
                {enabled ? (
                  <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className={controls.field}>
        <label className={controls.label}>Tema</label>
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
      </div>
    </Modal>
  )
}
