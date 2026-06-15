import {
  Download,
  FileText,
  FolderOpen,
  Layers,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { useEffect, useRef } from 'react'

import { pickFile, saveFile } from '../../lib/dialog'
import {
  exportBackup,
  importBackup,
  openDataFolder,
  openSpawnLog,
  resetAppData,
} from '../../lib/tauri'
import { useProjectsStore } from '../../stores/projectsStore'
import { useUiStore } from '../../stores/uiStore'
import styles from './MainMenu.module.css'

export function MainMenu() {
  const open = useUiStore((s) => s.showMainMenu)
  const toggle = useUiStore((s) => s.toggleMainMenu)
  const openModal = useUiStore((s) => s.openModal_)
  const flat = useProjectsStore((s) => s.preferences.workspaceFlat)
  const setFlat = useProjectsStore((s) => s.setWorkspaceFlat)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) toggle()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, toggle])

  if (!open) return null

  const action = async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (err) {
      console.error(err)
      window.alert(`Erro: ${String(err)}`)
    }
    toggle()
  }

  const reset = async () => {
    if (
      !window.confirm(
        'Apagar TODO o estado do app (projetos, scrollback, configs)? Não dá pra desfazer.',
      )
    )
      return
    await resetAppData()
    window.location.reload()
  }

  return (
    <div ref={ref} className={styles.menu} role="menu">
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          openModal('preferences')
          toggle()
        }}
      >
        <Settings size={14} /> <span>Preferências</span>
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          openModal('welcome')
          toggle()
        }}
      >
        <Sparkles size={14} /> <span>Boas-vindas</span>
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          openModal('themePicker')
          toggle()
        }}
      >
        <Sun size={14} />
        <span>Escolher tema</span>
      </button>
      <button type="button" className={styles.item} onClick={() => setFlat(!flat)}>
        <Layers size={14} />
        <span>{flat ? 'Agrupar por projeto' : 'Modo flat (sem containers)'}</span>
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.item}
        onClick={() => void action(openDataFolder)}
      >
        <FolderOpen size={14} /> <span>Abrir pasta de dados</span>
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() => void action(openSpawnLog)}
      >
        <FileText size={14} /> <span>Abrir spawn.log</span>
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.item}
        onClick={() =>
          void action(async () => {
            const target = await saveFile({
              title: 'Exportar backup',
              defaultPath: `alethe-backup-${new Date().toISOString().slice(0, 10)}.alethe.zip`,
              filters: [{ name: 'Alethe backup', extensions: ['zip'] }],
            })
            if (target) await exportBackup(target)
          })
        }
      >
        <Download size={14} /> <span>Exportar backup…</span>
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() =>
          void action(async () => {
            const source = await pickFile({
              title: 'Importar backup',
              filters: [{ name: 'Alethe backup', extensions: ['zip'] }],
            })
            if (!source) return
            if (
              !window.confirm(
                'Importar vai substituir o estado atual (projetos, scrollback). Continuar?',
              )
            )
              return
            await importBackup(source)
            window.location.reload()
          })
        }
      >
        <Upload size={14} /> <span>Importar backup…</span>
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          useProjectsStore.getState().setOnboardingDone(false)
          toggle()
        }}
      >
        <RefreshCw size={14} /> <span>Refazer onboarding</span>
      </button>
      <button
        type="button"
        className={`${styles.item} ${styles.danger}`}
        onClick={() => void reset()}
      >
        <Trash2 size={14} /> <span>Resetar app data…</span>
      </button>
    </div>
  )
}
