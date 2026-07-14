import { GitBranch, Layers, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/uiStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useProjectsStore } from '../../stores/projectsStore';
import { gitRevParse } from '../../lib/tauri';
import type { WorkflowMode } from '../../lib/tauri';
import { Modal } from './Modal';
import styles from './WorkflowModal.module.css';

const AGENTS = ['claude', 'codex', 'opencode', 'shell'] as const;

type GitStatus = 'checking' | 'ok' | 'no-repo' | 'no-git';

export function WorkflowModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === 'workflow');
  const closeModal = useUiStore((s) => s.closeModal);
  const startSession = useWorkflowStore((s) => s.startSession);
  const refresh = useWorkflowStore((s) => s.refresh);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const projects = useProjectsStore((s) => s.projects);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [task, setTask] = useState('');
  const [agentType, setAgentType] = useState<string>('claude');
  const [mode, setMode] = useState<WorkflowMode>('LOCAL');
  const [repoRoot, setRepoRoot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus>('checking');

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const terminals = useMemo(
    () => activeProject?.terminals ?? [],
    [activeProject],
  );
  const selectedTerminal =
    terminals.find((term: any) => term.id === selectedTerminalId) ||
    terminals[0];
  const defaultCwd = selectedTerminal?.cwd || '';

  // Sincroniza com o projeto ativo quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedProjectId(activeProjectId || (projects[0]?.id ?? ''));
    }
  }, [open, activeProjectId, projects]);

  // Sincroniza com o primeiro terminal quando muda o projeto selecionado
  useEffect(() => {
    if (terminals.length > 0) {
      setSelectedTerminalId(terminals[0].id);
    } else {
      setSelectedTerminalId('');
    }
  }, [terminals]);

  useEffect(() => {
    if (!open) return;
    setGitStatus('checking');
    setRepoRoot(defaultCwd);

    if (!defaultCwd) {
      setGitStatus('no-repo');
      setMode('LOCAL');
      return;
    }

    gitRevParse(defaultCwd)
      .then((_hash) => {
        setGitStatus('ok');
        setMode('GIT');
      })
      .catch(() => {
        setGitStatus('no-repo');
        setMode('LOCAL');
      });
  }, [open, defaultCwd]);

  // Reset state quando fecha
  useEffect(() => {
    if (!open) {
      setTask('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const handleStart = async () => {
    if (!task.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(
        `wf-${Date.now()}`,
        agentType,
        task.trim(),
        mode,
        mode === 'GIT' ? repoRoot.trim() || null : null,
      );
      closeModal();
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const gitIndicator = () => {
    switch (gitStatus) {
      case 'checking':
        return {
          icon: <Loader2 size={12} className={styles.spin} />,
          text: t('workflow.git.checking'),
          color: 'var(--fg-muted)',
        };
      case 'ok':
        return {
          icon: null,
          text: t('workflow.git.ok') + ' · main',
          color: 'var(--status-working)',
        };
      case 'no-repo':
        return {
          icon: <AlertCircle size={12} />,
          text: t('workflow.git.noRepo'),
          color: 'var(--status-waiting)',
        };
      case 'no-git':
        return {
          icon: <AlertCircle size={12} />,
          text: t('workflow.git.noGit'),
          color: '#ef4444',
        };
    }
  };

  const indicator = gitIndicator();

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t('workflow.new')}
      width={480}
    >
      <div className={styles.form}>
        <label className={styles.label}>
          {t('workflow.task')}
          <textarea
            className={styles.input}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Implement JWT authentication"
            rows={3}
          />
        </label>
        <label className={styles.label}>
          {t('ui.sidebar.projects')}
          <select
            className={styles.select}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {terminals.length > 0 && (
          <label className={styles.label}>
            Terminal
            <select
              className={styles.select}
              value={selectedTerminalId}
              onChange={(e) => setSelectedTerminalId(e.target.value)}
            >
              {terminals.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name || `Terminal (${term.cwd})`}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.label}>
          {t('workflow.agentType')}
          <select
            className={styles.select}
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          {t('workflow.mode')}
          <div className={styles.modeRow}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'GIT' ? styles.modeActive : ''} ${gitStatus === 'ok' ? styles.modeRecommended : ''}`}
              onClick={() => setMode('GIT')}
              disabled={gitStatus === 'checking'}
            >
              <GitBranch size={14} />
              {t('workflow.mode.GIT')}
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'LOCAL' ? styles.modeActive : ''} ${gitStatus === 'no-repo' || gitStatus === 'no-git' ? styles.modeRecommended : ''}`}
              onClick={() => setMode('LOCAL')}
            >
              <Layers size={14} />
              {t('workflow.mode.LOCAL')}
            </button>
          </div>
        </label>

        {/* Status do git */}
        <div className={styles.gitStatus} style={{ color: indicator.color }}>
          {indicator.icon}
          <span>{indicator.text}</span>
        </div>

        {mode === 'GIT' && (
          <label className={styles.label}>
            Repo root
            <input
              className={styles.input}
              type="text"
              value={repoRoot}
              onChange={(e) => setRepoRoot(e.target.value)}
              placeholder={defaultCwd || 'Select a project first'}
              disabled={gitStatus === 'checking'}
            />
          </label>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || !task.trim()}
            onClick={handleStart}
          >
            {busy ? <Loader2 size={14} className={styles.spin} /> : null}
            {busy ? t('workflow.starting') : t('workflow.start')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
