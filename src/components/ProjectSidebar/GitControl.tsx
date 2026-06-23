import {
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useT, type MessageKey } from '../../lib/i18n'
import {
  getPtyCwd,
  gitCommit,
  gitDiscard,
  gitStage,
  gitStatus,
  gitUnstage,
  type GitFileChange,
  type GitRepositoryStatus,
} from '../../lib/tauri'
import { useUiStore } from '../../stores/uiStore'
import styles from './GitControl.module.css'

type GitControlProps = {
  cwd: string
  ptyId: string | null
  terminalName: string
}

type GroupKind = 'staged' | 'changes' | 'untracked' | 'conflicts'

const ERROR_KEYS: Record<string, MessageKey> = {
  git_not_found: 'git.error.notFound',
  not_a_git_repository: 'git.error.notRepository',
  directory_not_found: 'git.error.directory',
}

export function GitControl({ cwd, ptyId, terminalName }: GitControlProps) {
  const t = useT()
  const pushToast = useUiStore((state) => state.pushToast)
  const [liveCwd, setLiveCwd] = useState(cwd)
  const [status, setStatus] = useState<GitRepositoryStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const requestId = useRef(0)

  useEffect(() => {
    setLiveCwd(cwd)
    if (cwd || !ptyId) return
    let cancelled = false
    getPtyCwd(ptyId)
      .then((value) => {
        if (!cancelled && value) setLiveCwd(value)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [cwd, ptyId])

  const refresh = useCallback(async (quiet = false) => {
    if (!liveCwd) {
      setStatus(null)
      setError('directory_not_found')
      setLoading(false)
      return
    }
    const id = ++requestId.current
    if (!quiet) setLoading(true)
    try {
      const next = await gitStatus(liveCwd)
      if (requestId.current !== id) return
      setStatus(next)
      setError(null)
    } catch (cause) {
      if (requestId.current !== id) return
      setStatus(null)
      setError(errorCode(cause))
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [liveCwd])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true)
    }, 3000)
    const onFocus = () => void refresh(true)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      requestId.current += 1
    }
  }, [refresh])

  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
      if (success) pushToast({ title: success, body: '' })
      await refresh(true)
    } catch (cause) {
      pushToast({ title: t('git.error.action'), body: readableError(cause) })
    } finally {
      setBusy(false)
    }
  }

  const allStageable = useMemo(
    () => status ? uniquePaths([...status.changes, ...status.untracked, ...status.conflicts]) : [],
    [status],
  )

  const commit = async () => {
    if (!status || !message.trim() || busy) return
    if (status.conflicts.length > 0) {
      pushToast({ title: t('git.error.conflicts'), body: '' })
      return
    }
    if (status.staged.length === 0) {
      if (allStageable.length === 0) return
      if (!window.confirm(t('git.confirm.stageAllCommit'))) return
    }
    await run(async () => {
      if (status.staged.length === 0) await gitStage(status.repoRoot, allStageable)
      await gitCommit(status.repoRoot, message.trim())
      setMessage('')
    }, t('git.commit.done'))
  }

  if (!liveCwd) {
    return <GitMessage title={t('git.empty.noFolder')} description={t('git.empty.noFolderDesc')} />
  }

  if (loading && !status) {
    return <GitMessage title={t('git.loading')} />
  }

  if (error && !status) {
    return (
      <GitMessage
        title={t(ERROR_KEYS[error] ?? 'git.error.generic')}
        description={error.startsWith('git_command_failed:') ? error.slice(error.indexOf(':') + 1) : undefined}
        action={<button type="button" className={styles.retry} onClick={() => void refresh()}><RefreshCw size={13} />{t('git.refresh')}</button>}
      />
    )
  }

  if (!status) return null
  const total = status.staged.length + status.changes.length + status.untracked.length + status.conflicts.length

  return (
    <div className={styles.panel} aria-busy={busy}>
      <div className={styles.repoHeader} title={status.repoRoot}>
        <div className={styles.repoContext}>
          <strong>{terminalName}</strong>
          <span>{status.repoRoot}</span>
        </div>
        <button type="button" className={styles.iconButton} onClick={() => void refresh()} disabled={loading || busy} title={t('git.refresh')} aria-label={t('git.refresh')}>
          <RefreshCw size={13} className={loading ? styles.spinning : undefined} />
        </button>
      </div>

      <div className={styles.branchRow}>
        <GitBranch size={13} />
        <span>{status.branch}</span>
        {status.detached ? <small>{t('git.detached')}</small> : null}
        <div className={styles.divergence}>
          {status.ahead > 0 ? <span title={t('git.ahead', { count: status.ahead })}>↑{status.ahead}</span> : null}
          {status.behind > 0 ? <span title={t('git.behind', { count: status.behind })}>↓{status.behind}</span> : null}
        </div>
      </div>

      <div className={styles.commitBox}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void commit()
          }}
          placeholder={t('git.commit.placeholder')}
          aria-label={t('git.commit.placeholder')}
          rows={2}
        />
        <button type="button" className={styles.commitButton} disabled={!message.trim() || busy || total === 0} onClick={() => void commit()}>
          <Check size={14} />{busy ? t('git.commit.busy') : t('git.commit.action')}
        </button>
      </div>

      <div className={styles.groups}>
        <ChangeGroup kind="staged" label={t('git.group.staged')} items={status.staged} disabled={busy} onPrimary={(paths) => run(() => gitUnstage(status.repoRoot, paths))} />
        <ChangeGroup kind="changes" label={t('git.group.changes')} items={status.changes} disabled={busy} onPrimary={(paths) => run(() => gitStage(status.repoRoot, paths))} onDiscard={(paths) => run(() => gitDiscard(status.repoRoot, paths, false))} />
        <ChangeGroup kind="untracked" label={t('git.group.untracked')} items={status.untracked} disabled={busy} onPrimary={(paths) => run(() => gitStage(status.repoRoot, paths))} onDiscard={(paths) => run(() => gitDiscard(status.repoRoot, paths, true))} />
        <ChangeGroup kind="conflicts" label={t('git.group.conflicts')} items={status.conflicts} disabled={busy} onPrimary={(paths) => run(() => gitStage(status.repoRoot, paths))} />
        {total === 0 ? <div className={styles.clean}><Check size={18} /><strong>{t('git.clean')}</strong><span>{t('git.cleanDesc')}</span></div> : null}
      </div>
    </div>
  )
}

function ChangeGroup({ kind, label, items, disabled, onPrimary, onDiscard }: {
  kind: GroupKind
  label: string
  items: GitFileChange[]
  disabled: boolean
  onPrimary: (paths: string[]) => void
  onDiscard?: (paths: string[]) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(true)
  if (items.length === 0) return null
  const paths = uniquePaths(items)
  const primaryTitle = kind === 'staged' ? t('git.unstageAll') : t('git.stageAll')
  const confirmDiscard = (selected: string[]) => {
    if (onDiscard && window.confirm(t('git.confirm.discard', { count: selected.length }))) onDiscard(selected)
  }
  return (
    <section className={styles.group}>
      <div className={styles.groupHeader}>
        <button type="button" className={styles.groupToggle} onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <strong>{label}</strong><span>{items.length}</span>
        </button>
        <div className={styles.groupActions}>
          {onDiscard ? <button type="button" disabled={disabled} title={t('git.discardAll')} aria-label={t('git.discardAll')} onClick={() => confirmDiscard(paths)}><RotateCcw size={13} /></button> : null}
          <button type="button" disabled={disabled} title={primaryTitle} aria-label={primaryTitle} onClick={() => onPrimary(paths)}>{kind === 'staged' ? <Minus size={14} /> : <Plus size={14} />}</button>
        </div>
      </div>
      {open ? <div className={styles.files}>{items.map((item) => (
        <div className={styles.file} key={`${kind}:${item.path}`} title={item.originalPath ? `${item.originalPath} → ${item.path}` : item.path}>
          <div className={styles.fileCopy}>
            <span className={styles.fileName}>{baseName(item.path)}</span>
            <span className={styles.filePath}>{parentPath(item.path)}</span>
          </div>
          <span className={styles.status}>{item.status}</span>
          <div className={styles.fileActions}>
            {onDiscard ? <button type="button" disabled={disabled} title={t('git.discard')} aria-label={t('git.discard')} onClick={() => confirmDiscard([item.path])}><RotateCcw size={12} /></button> : null}
            <button type="button" disabled={disabled} title={kind === 'staged' ? t('git.unstage') : t('git.stage')} aria-label={kind === 'staged' ? t('git.unstage') : t('git.stage')} onClick={() => onPrimary([item.path])}>{kind === 'staged' ? <Minus size={13} /> : <Plus size={13} />}</button>
          </div>
        </div>
      ))}</div> : null}
    </section>
  )
}

function GitMessage({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className={styles.message}><GitBranch size={22} /><strong>{title}</strong>{description ? <span>{description}</span> : null}{action}</div>
}

function uniquePaths(items: GitFileChange[]): string[] {
  return [...new Set(items.map((item) => item.path))]
}

function baseName(path: string): string {
  return path.split('/').pop() || path
}

function parentPath(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}

function errorCode(error: unknown): string {
  const value = String(error)
  return Object.keys(ERROR_KEYS).find((key) => value.includes(key)) ?? value
}

function readableError(error: unknown): string {
  const value = String(error)
  const separator = value.indexOf(':')
  return separator >= 0 ? value.slice(separator + 1).trim() : value
}
