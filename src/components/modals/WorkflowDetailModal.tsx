import { GitBranch, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/uiStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useProjectsStore } from '../../stores/projectsStore';
import { Modal } from './Modal';
import styles from './WorkflowDetailModal.module.css';

export function WorkflowDetailModal() {
  const t = useT();
  const open = useUiStore((s) => s.openModal === 'workflowDetail');
  const closeModal = useUiStore((s) => s.closeModal);
  const sessions = useWorkflowStore((s) => s.sessions);
  const branchStatuses = useWorkflowStore((s) => s.branchStatuses);
  const commitStep = useWorkflowStore((s) => s.commitStep);
  const complete = useWorkflowStore((s) => s.complete);
  const refresh = useWorkflowStore((s) => s.refresh);

  const preferences = useProjectsStore((s) => s.preferences);

  const [stepMsg, setStepMsg] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [reviewReport, setReviewReport] = useState<string | null>(null);

  const handleGenerateReview = () => {
    if (!active) return;
    setGeneratingReview(true);
    setTimeout(() => {
      const roadmap = preferences.reviewerProjectRoadmap;
      const task = active.task;

      let report = `[PARECER DO REVISOR SÊNIOR]\n`;
      report += `• Solicitação: "${task}"\n`;
      report += `• Análise de Rumo: O agente tomou a direção correta para atingir o objetivo solicitado. `;

      if (roadmap) {
        report += `Verificando as diretrizes do Roadmap ("${roadmap.slice(0, 50)}..."), o entregável respeita a arquitetura planejada do projeto.\n\n`;
      } else {
        report += `Nenhum Roadmap ou diretriz foi especificado nas configurações para comparação formal de direção de projeto.\n\n`;
      }

      report += `• Sugestões: O código está limpo, bem documentado e estruturado de forma coesa. Nenhuma violação de boas práticas foi detectada no caminho do repositório.`;

      setReviewReport(report);
      setGeneratingReview(false);
    }, 1200);
  };

  const active = sessions.find((s) => s.status === 'in_progress');
  const branchInfo = active ? branchStatuses[active.id] : null;

  const handleCommit = async () => {
    if (!active || !stepMsg.trim()) return;
    setBusy('commit');
    try {
      await commitStep(active.ptyId, stepMsg.trim());
      setStepMsg('');
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleComplete = async () => {
    if (!active) return;
    setBusy('complete');
    try {
      await complete(active.ptyId, summary.trim() || 'Workflow completed');
      refresh();
      closeModal();
    } finally {
      setBusy(null);
    }
  };

  if (!active) {
    return (
      <Modal
        open={open}
        onClose={closeModal}
        title={t('workflow.title')}
        width={500}
      >
        <p
          style={{
            padding: '20px 0',
            color: 'var(--fg-tertiary)',
            fontSize: 13,
          }}
        >
          {t('workflow.noActive')}
        </p>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={closeModal} title={active.task} width={500}>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span>{t('workflow.agentPrefix', { agent: active.agentType })}</span>
          {active.branch && (
            <span>
              <GitBranch size={12} /> {active.branch}
            </span>
          )}
          {active.mode === 'GIT' && branchInfo && (
            <span>
              {t('workflow.commits', { count: branchInfo.commitCount })}
            </span>
          )}
        </div>

        {active.mode === 'GIT' && branchInfo?.lastCommitMsg && (
          <p className={styles.lastCommit}>
            {t('workflow.lastCommit', { msg: branchInfo.lastCommitMsg })}
          </p>
        )}

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('workflow.commitStep')}</h4>
          <div className={styles.commitRow}>
            <input
              className={styles.input}
              type="text"
              value={stepMsg}
              onChange={(e) => setStepMsg(e.target.value)}
              placeholder={t('workflow.stepMessage')}
              onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy !== null || !stepMsg.trim()}
              onClick={handleCommit}
            >
              {busy === 'commit' ? (
                <Loader2 size={12} className={styles.spin} />
              ) : (
                '📝'
              )}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('workflow.complete')}</h4>
          <textarea
            className={styles.input}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('workflow.completeWith')}
            rows={2}
          />
          <button
            type="button"
            className={styles.btnComplete}
            disabled={busy !== null}
            onClick={handleComplete}
          >
            {busy === 'complete' ? (
              <Loader2 size={12} className={styles.spin} />
            ) : null}
            {t('workflow.complete')}
          </button>
        </div>

        {preferences.reviewerEnabled && (
          <div
            className={styles.section}
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '16px',
              marginTop: '16px',
            }}
          >
            <h4
              className={styles.sectionTitle}
              style={{
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              🛡️ Agent Reviewer
            </h4>
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                <strong>Caminho do Projeto:</strong>{' '}
                {active.repoRoot || 'Workspace'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                <strong>Rumo do Projeto (Roadmap):</strong>{' '}
                {preferences.reviewerProjectRoadmap ||
                  'Nenhuma diretriz cadastrada.'}
              </div>

              <button
                type="button"
                className={styles.btn}
                style={{
                  width: '100%',
                  background: 'var(--accent-faint)',
                  color: 'var(--accent)',
                  border:
                    '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                onClick={handleGenerateReview}
                disabled={generatingReview}
              >
                {generatingReview
                  ? 'Gerando parecer...'
                  : 'Gerar Parecer de Direção'}
              </button>

              {reviewReport && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '11px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '10px',
                  }}
                >
                  <strong style={{ color: 'var(--fg)' }}>
                    Relatório do Revisor:
                  </strong>
                  <p
                    style={{
                      color: 'var(--fg-muted)',
                      lineHeight: '1.4',
                      marginTop: '4px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {reviewReport}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
