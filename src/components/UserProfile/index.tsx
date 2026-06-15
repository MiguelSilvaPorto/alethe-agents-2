import { LogOut, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getProfileImageUrl, getProfileInitial } from '../../lib/profile'
import { useProjectsStore } from '../../stores/projectsStore'
import { useUiStore } from '../../stores/uiStore'
import styles from './UserProfile.module.css'

export function UserProfile() {
  const openModal = useUiStore((s) => s.openModal_)
  const preferences = useProjectsStore((s) => s.preferences)
  const setPreferences = useProjectsStore((s) => s.setPreferences)
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const displayName = preferences.displayName || 'Perfil'
  const avatarUrl = getProfileImageUrl(preferences)
  const initial = getProfileInitial(displayName)

  useEffect(() => {
    setImgFailed(false)
  }, [avatarUrl])

  const logout = () => {
    setPreferences({
      accountCreated: false,
      displayName: '',
      profileImageUrl: '',
    })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        aria-label="Perfil"
        title={displayName}
      >
        {avatarUrl && !imgFailed ? (
          <img
            src={avatarUrl}
            alt=""
            className={styles.avatar}
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={styles.avatar}>{initial}</span>
        )}
        <span className={styles.identity}>
          <span className={styles.name}>{displayName}</span>
          <span className={styles.email}>conta local</span>
        </span>
        <Settings size={13} className={styles.gear} />
      </button>

      {open ? (
        <div className={styles.popover} role="menu">
          <div className={styles.popHeader}>
            {avatarUrl && !imgFailed ? (
              <img
                src={avatarUrl}
                alt=""
                className={styles.popAvatar}
                draggable={false}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span className={styles.popAvatar}>{initial}</span>
            )}
            <div className={styles.popIdentity}>
              <strong className={styles.popName}>{displayName}</strong>
              <span className={styles.popEmail}>conta local</span>
            </div>
          </div>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              openModal('preferences')
              setOpen(false)
            }}
          >
            Preferências
          </button>
          <button
            type="button"
            className={`${styles.item} ${styles.dangerItem}`}
            onClick={logout}
          >
            <LogOut size={13} />
            <span>Sair da conta</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
