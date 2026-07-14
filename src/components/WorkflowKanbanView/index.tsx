import { useMemo, useState } from 'react';
import { useProjectsStore } from '../../stores/projectsStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useUiStore } from '../../stores/uiStore';
import styles from './WorkflowKanbanView.module.css';

interface KanbanTask {
  id: string; // Sequencial RPG-001, RPG-002
  projectName: string; // Nome do projeto real
  title: string; // Título amigável da tarefa
  description: string; // Descrição longa
  status: string;
  executor: string; // Nome do terminal real
  executorInitials: string; // Iniciais do terminal
  projectId: string;
  terminalId: string;
}

export function WorkflowKanbanView() {
  const projects = useProjectsStore((s) => s.projects);
  const sessions = useWorkflowStore((s) => s.sessions);
  const localWorkflows = useWorkflowStore((s) => s.localWorkflows);

  const setActiveView = useUiStore((s) => s.setActiveView);
  const setActiveTerminal = useUiStore((s) => s.setActiveTerminal);

  const [selectedFilterProjectId, setSelectedFilterProjectId] =
    useState<string>('__all__');

  // Mapeia todas as tarefas e sessões ativas para o formato do Kanban
  const allTasks = useMemo(() => {
    const list: KanbanTask[] = [];
    let rpgCounter = 1;

    // Função para formatar o ID com 3 dígitos (ex: RPG-001)
    const formatRpgId = (num: number) => `RPG-${String(num).padStart(3, '0')}`;

    // 1. Mapeia sessões ativas do backend (WorkflowStore)
    sessions.forEach((s) => {
      let title = s.task;
      let description = s.task;
      let terminalName = s.agentType;
      let terminalId = s.ptyId;

      try {
        const parsed = JSON.parse(s.task);
        title = parsed.title || title;
        description = parsed.description || description;
        terminalId = parsed.terminalId || terminalId;
        terminalName = parsed.terminalName || terminalName;
      } catch {
        // Não é JSON, usa fallback
      }

      // Encontra o nome do projeto
      const project = projects.find((p) =>
        p.terminals?.some((t) => t.id === terminalId || t.cwd === s.repoRoot),
      );
      const projectName = project
        ? project.name
        : s.repoRoot?.split(/[/\\]/).pop() || 'Workspace';
      const projectId = project ? project.id : '';

      const initials = terminalName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      list.push({
        id: formatRpgId(rpgCounter++),
        projectName,
        title,
        description,
        status: s.status,
        executor: terminalName,
        executorInitials: initials || 'T',
        projectId,
        terminalId,
      });
    });

    // 2. Mapeia workflows locais ativos
    localWorkflows.forEach((w) => {
      list.push({
        id: formatRpgId(rpgCounter++),
        projectName: 'Local',
        title: w.task,
        description: w.task,
        status: 'in_progress',
        executor: 'Local Terminal',
        executorInitials: 'LT',
        projectId: '',
        terminalId: '',
      });
    });

    // 3. Adiciona tarefas estáticas cadastradas nos projetos
    projects.forEach((proj) => {
      proj.tasks.forEach((task) => {
        // Evita duplicar se a sessão com o mesmo título já foi adicionada
        if (list.some((item) => item.title === task.title)) return;

        const terminal = proj.terminals?.[0];
        const terminalName = terminal ? terminal.name : 'Geral';
        const terminalId = terminal ? terminal.id : '';

        const initials = terminalName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        // Mapeia status das tarefas para os status das colunas do Kanban
        let status = 'in_progress';
        if (task.status === 'review' || task.status === 'pending')
          status = 'review';
        if (task.status === 'blocked') status = 'waiting_permission';
        if (task.status === 'accepted') status = 'completed';

        list.push({
          id: formatRpgId(rpgCounter++),
          projectName: proj.name,
          title: task.title,
          description: task.title,
          status,
          executor: terminalName,
          executorInitials: initials || 'T',
          projectId: proj.id,
          terminalId,
        });
      });
    });

    return list;
  }, [projects, sessions, localWorkflows]);

  // Filtra pelo projeto selecionado
  const filteredTasks = useMemo(() => {
    if (selectedFilterProjectId === '__all__') return allTasks;
    return allTasks.filter((t) => t.projectId === selectedFilterProjectId);
  }, [allTasks, selectedFilterProjectId]);

  // Filtra as tarefas pelas 6 colunas de status solicitado
  const columns = useMemo(() => {
    return [
      {
        id: 'in-progress',
        title: 'IN PROGRESS',
        color: '#0284c7', // Azul Claro
        tasks: filteredTasks.filter(
          (t) => t.status === 'in_progress' || t.status === 'implementing',
        ),
      },
      {
        id: 'esperando-permissao',
        title: 'ESPERANDO PERMISSÃO',
        color: '#f59e0b', // Laranja
        tasks: filteredTasks.filter(
          (t) => t.status === 'waiting_permission' || t.status === 'blocked',
        ),
      },
      {
        id: 'em-analise',
        title: 'EM ANÁLISE',
        color: '#8b5cf6', // Roxo
        tasks: filteredTasks.filter(
          (t) => t.status === 'review' || t.status === 'pending',
        ),
      },
      {
        id: 'feito',
        title: 'FEITO',
        color: '#10b981', // Verde
        tasks: filteredTasks.filter(
          (t) => t.status === 'completed' || t.status === 'accepted',
        ),
      },
      {
        id: 'cancelado',
        title: 'CANCELADO',
        color: '#6b7280', // Cinza
        tasks: filteredTasks.filter(
          (t) => t.status === 'cancelled' || t.status === 'cancelled_by_user',
        ),
      },
      {
        id: 'deu-erro',
        title: 'DEU ERRO',
        color: '#ef4444', // Vermelho
        tasks: filteredTasks.filter(
          (t) => t.status === 'failed' || t.status === 'error',
        ),
      },
    ];
  }, [filteredTasks]);

  // Redireciona o usuário para o terminal em tela cheia na workspace
  const handleNavigateToTerminal = (projectId: string, terminalId: string) => {
    if (!projectId || !terminalId) return;
    setActiveTerminal(projectId, terminalId);
    setActiveView('workspace');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Workflows</h1>

        <div
          className={styles.filterArea}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
            Filtrar Projeto:
          </span>
          <select
            value={selectedFilterProjectId}
            onChange={(e) => setSelectedFilterProjectId(e.target.value)}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-sunken)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="__all__">Todos os Projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={styles.kanbanBoard}>
        {columns.map((col) => (
          <div key={col.id} className={styles.column}>
            <div className={styles.columnHeader}>
              <span
                className={styles.statusDot}
                style={{ backgroundColor: col.color }}
              />
              <span className={styles.columnTitle} style={{ color: col.color }}>
                {col.title}
              </span>
              <span className={styles.columnCount}>{col.tasks.length}</span>
            </div>

            <div className={styles.cardsList}>
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  className={styles.card}
                  style={{ borderLeft: `3px solid ${col.color}` }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <div className={styles.cardId}>{task.id}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}
                    >
                      {task.projectName}
                    </div>
                  </div>

                  <div
                    className={styles.cardTitle}
                    onClick={() =>
                      handleNavigateToTerminal(task.projectId, task.terminalId)
                    }
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: 'var(--fg)',
                      fontWeight: 600,
                    }}
                    title="Clique para ir ao terminal correspondente em tela cheia"
                  >
                    {task.title}
                  </div>

                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-muted)',
                      margin: '4px 0 8px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.description}
                  </p>

                  <div className={styles.cardExecutor}>
                    <div
                      className={styles.executorBadge}
                      style={{
                        color: col.color,
                        borderColor: `${col.color}40`,
                        background: `${col.color}15`,
                      }}
                    >
                      {task.executorInitials}
                    </div>
                    <span className={styles.executorRole}>{task.executor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
