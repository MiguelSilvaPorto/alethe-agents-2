import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Plus,
  Clock,
  Paperclip,
  Mic,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
  Search,
  Edit2,
  Trash2,
  Play,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useProjectsStore } from '../../stores/projectsStore';
import { getOpenCodeModels } from '../../lib/tauri';
import {
  IconText,
  IconImage,
  IconContext,
  IconCode,
} from '../icons/ModelIcons';
import styles from './ChatTab.module.css';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  filesReferenced?: string[];
  mode?: 'plan' | 'build';
  todos?: {
    id: string;
    text: string;
    completed: boolean;
    commands?: string[];
  }[];
  codeBlock?: {
    language: string;
    code: string;
    filePath?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  activeModel: string;
  activeMode: 'plan' | 'build';
  timeAgo: string;
}

interface PendingMessage {
  id: string;
  text: string;
  filesReferenced?: string[];
  mode: 'plan' | 'build';
  queuedAt: number;
}

export function ChatTab() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const projects = useProjectsStore((s) => s.projects);
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId],
  );

  // Histórico e Sessões de Chat (Cursor Style)
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-1',
      title: 'Projeto Lovabel e PRD',
      timeAgo: '3m',
      activeModel: 'Opus 4.5',
      activeMode: 'build',
      messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'Acabei de trazer este projeto lá do Lovabel, ele está em React Vite, que é o padrão que vem do Lovable. Lá ele foi feito apenas a parte visual/layout. Agora, quero que você implemente o PRD.',
          timestamp: Date.now() - 180000,
        },
        {
          id: 'msg-2',
          sender: 'ai',
          text: 'Vou prosseguir com as definições do PRD (tipos de widget e autenticação via Magic Link/Google). Aqui está o plano completo de implementação.',
          timestamp: Date.now() - 120000,
          todos: [
            {
              id: 'todo-1',
              text: 'Criar tabelas perfis, blocos e leads no Supabase com migrations',
              completed: true,
              commands: ['Ran apply_migration:bento-blocks-dba6f080...'],
            },
            {
              id: 'todo-2',
              text: 'Configurar politicas RLS para todas as tabelas',
              completed: true,
              commands: [
                'Ran apply_migration:bento-blocks-dba6f080-s1...',
                'Ran apply_migration:bento-blocks-dba6f080-s2...',
              ],
            },
            {
              id: 'todo-3',
              text: 'Criar bucket de storage para avatares com politicas',
              completed: false,
            },
            {
              id: 'todo-4',
              text: 'Configurar fluxos de autenticação no frontend',
              completed: false,
            },
            {
              id: 'todo-5',
              text: 'Implementar CRUD de blocos',
              completed: false,
            },
          ],
        },
      ],
    },
    {
      id: 'session-2',
      title: 'New Chat',
      timeAgo: '2h',
      activeModel: 'Opus 4.5',
      activeMode: 'plan',
      messages: [
        {
          id: 'init-new',
          sender: 'ai',
          text: 'Olá! Sou o assistente Alethe. Como posso ajudar você no seu projeto hoje? Digite `@` para referenciar arquivos como contexto.',
          timestamp: Date.now(),
        },
      ],
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');

  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const isProcessingRef = useRef(false);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const models = useUiStore.getState().opencodeModels;
    if (models.length === 0) {
      getOpenCodeModels()
        .then((list) => useUiStore.getState().setOpenCodeModels(list))
        .catch(() => {});
    }
  }, []);

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  const preferences = useProjectsStore((s) => s.preferences);
  const opencodeModels = useUiStore((s) => s.opencodeModels);

  const AVAILABLE_MODELS = useMemo(() => {
    const list: Array<{
      name: string;
      provider: string;
      id?: string;
      isFree?: boolean;
    }> = [];

    // Modelos nativos (com chave direta - Anthropic, OpenAI, Google, DeepSeek)
    const direct = [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'Anthropic',
      },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI' },
      { id: 'o1-mini', name: 'o1-mini', provider: 'OpenAI' },
      { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
      { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'Google' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
    ];

    direct.forEach((m) => {
      const isVerified = preferences.verifiedProviders?.[m.provider] === true;
      const isEnabled = preferences.enabledModels?.[m.id] !== false;
      if (isVerified && isEnabled) {
        list.push({ name: m.name, provider: m.provider, id: m.id });
      }
    });

    // Modelos do OpenCode CLI
    opencodeModels.forEach((m) => {
      const id = m.full_id || m.id;
      const isEnabled = preferences.enabledModels?.[id] !== false;
      if (isEnabled) {
        list.push({
          name: m.name,
          provider: m.provider,
          id,
          isFree: id.includes('free'),
        });
      }
    });

    // Modelos customizados
    (preferences.customModels ?? []).forEach((m) => {
      const isEnabled = preferences.enabledModels?.[m.id] !== false;
      if (isEnabled) {
        list.push({ name: m.name, provider: m.provider, id: m.id });
      }
    });

    return list;
  }, [
    preferences.verifiedProviders,
    preferences.enabledModels,
    preferences.customModels,
    opencodeModels,
  ]);

  const [inputValue, setInputValue] = useState('');
  const [model, setModel] = useState(currentSession.activeModel);
  const [selectedMode, setSelectedMode] = useState<'plan' | 'build'>(
    currentSession.activeMode,
  );

  const [referencedFiles, setReferencedFiles] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState(0);

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({});

  // Lista curada de modelos recomendados para codar — só esses aparecem por padrão
  const RECOMMENDED_MODELS = useMemo(
    () =>
      new Set([
        'claude-3-5-sonnet',
        'claude-3-5-haiku',
        'claude-3-opus',
        'claude-sonnet-4',
        'claude-sonnet-4-5',
        'claude-sonnet-4-6',
        'claude-sonnet-5',
        'claude-opus-4',
        'claude-opus-4-1',
        'claude-opus-4-5',
        'claude-opus-4-6',
        'claude-opus-4-7',
        'claude-opus-4-8',
        'claude-haiku-4-5',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-5',
        'gpt-5-codex',
        'gpt-5-nano',
        'gpt-5-1',
        'gpt-5-1-codex',
        'gpt-5-2',
        'gpt-5-2-codex',
        'gpt-5-3-codex',
        'gpt-5-4',
        'gpt-5-4-mini',
        'gpt-5-4-pro',
        'gpt-5-5',
        'gpt-5-5-pro',
        'gpt-5-6-sol',
        'gpt-5-6-terra',
        'gpt-5-6-luna',
        'o1-mini',
        'o1-preview',
        'o3-mini',
        'gemini-1-5-pro',
        'gemini-1-5-flash',
        'gemini-2-0-flash',
        'gemini-2-0-pro',
        'gemini-3-flash',
        'gemini-3-1-pro',
        'deepseek-v3',
        'deepseek-r1',
        'deepseek-v4-flash',
        'deepseek-v4-pro',
        'kimi-k2-7-code',
        'kimi-k2-6',
        'claude-fable-5',
        'claude-opus-4-5',
        'claude-opus-4-7',
        'claude-sonnet-latest',
      ]),
    [],
  );

  const filteredModels = useMemo(() => {
    const query = modelSearchQuery.toLowerCase();
    if (!query) {
      // Modo padrão: só recomendados + explicitamente ativados + free
      return AVAILABLE_MODELS.filter(
        (m) =>
          RECOMMENDED_MODELS.has(m.id ?? '') ||
          m.isFree ||
          preferences.enabledModels?.[m.id ?? ''] === true,
      );
    }
    return AVAILABLE_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query),
    );
  }, [
    AVAILABLE_MODELS,
    modelSearchQuery,
    RECOMMENDED_MODELS,
    preferences.enabledModels,
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de modelos se clicar fora
  useEffect(() => {
    if (!showModelDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showModelDropdown]);

  // Cleanup do timer ao desmontar
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    };
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Atualiza as preferências da sessão ativa ao mudar
  useEffect(() => {
    setModel(currentSession.activeModel);
    setSelectedMode(currentSession.activeMode);
  }, [activeSessionId]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages]);

  // Cria um novo Chat
  const handleCreateNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Chat',
      timeAgo: 'Now',
      activeModel: 'Opus 4.5',
      activeMode: 'plan',
      messages: [
        {
          id: `init-${Date.now()}`,
          sender: 'ai',
          text: 'Olá! Sou o assistente Alethe. Como posso ajudar você no seu projeto hoje? Digite `@` para referenciar arquivos como contexto.',
          timestamp: Date.now(),
        },
      ],
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSessionId);
  };

  // Fecha um chat aba
  const handleCloseChatTab = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) return;
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Lista de arquivos disponíveis no projeto para autocompletar com @
  const allProjectFiles = useMemo(() => {
    if (!activeProject) return [];
    return [
      'src/App.tsx',
      'src/components/ProjectSidebar/index.tsx',
      'src/components/ProjectSidebar/ProjectSidebar.module.css',
      'src/stores/projectsStore.ts',
      'src/stores/uiStore.ts',
      'src/stores/editorStore.ts',
      'src-tauri/src/main.rs',
      'src-tauri/src/filesystem.rs',
      'src-tauri/src/pty.rs',
      'package.json',
      'tsconfig.json',
    ];
  }, [activeProject]);

  const filteredFiles = useMemo(() => {
    if (!autocompleteQuery) return allProjectFiles;
    return allProjectFiles.filter((f) =>
      f.toLowerCase().includes(autocompleteQuery.toLowerCase()),
    );
  }, [allProjectFiles, autocompleteQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Detectar @ para autocomplete
    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx !== -1 && lastAtIdx >= val.length - 20) {
      const query = val.slice(lastAtIdx + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setAutocompleteQuery(query);
        setShowAutocomplete(true);
        setActiveAutocompleteIndex(0);
        return;
      }
    }
    setShowAutocomplete(false);
  };

  const handleAddFilePill = (filePath: string) => {
    if (!referencedFiles.includes(filePath)) {
      setReferencedFiles((prev) => [...prev, filePath]);
    }
    // Remove o caractere @ digitado
    const lastAtIdx = inputValue.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      setInputValue(inputValue.slice(0, lastAtIdx));
    }
    setShowAutocomplete(false);
    textareaRef.current?.focus();
  };

  const handleRemoveFilePill = (filePath: string) => {
    setReferencedFiles((prev) => prev.filter((f) => f !== filePath));
  };

  const sendMessageToAgent = (
    text: string,
    files?: string[],
    mode?: 'plan' | 'build',
  ) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
      filesReferenced: files,
      mode,
    };

    const updatedMessages = [...currentSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const title =
            s.title === 'New Chat'
              ? userMsg.text.slice(0, 24) + '...'
              : s.title;
          return { ...s, title, messages: updatedMessages };
        }
        return s;
      }),
    );

    isProcessingRef.current = true;

    // Simula o processamento do agent
    queueTimerRef.current = setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'ai',
        text: 'Certo, analisei o pedido e criei as etapas para execução dos To-dos.',
        timestamp: Date.now(),
        todos: [
          {
            id: `todo-${Date.now()}-1`,
            text: `Estruturar requisitos para: ${userMsg.text.slice(0, 25)}...`,
            completed: false,
          },
        ],
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return { ...s, messages: [...s.messages, aiResponse] };
          }
          return s;
        }),
      );

      isProcessingRef.current = false;

      // Processa próxima mensagem da fila
      setPendingMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = prev[0];
        const rest = prev.slice(1);
        sendMessageToAgent(next.text, next.filesReferenced, next.mode);
        return rest;
      });
    }, 1000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    const files = [...referencedFiles];
    const mode = selectedMode;

    setInputValue('');
    setReferencedFiles([]);

    if (isProcessingRef.current) {
      // Agent ocupado — vai pra fila
      const pending: PendingMessage = {
        id: `pending-${Date.now()}`,
        text,
        filesReferenced: files,
        mode,
        queuedAt: Date.now(),
      };
      setPendingMessages((prev) => [...prev, pending]);
    } else {
      // Agent livre — envia direto
      sendMessageToAgent(text, files, mode);
    }
  };

  const handleEditPending = (pending: PendingMessage) => {
    setInputValue(pending.text);
    if (pending.filesReferenced) setReferencedFiles(pending.filesReferenced);
    setPendingMessages((prev) => prev.filter((p) => p.id !== pending.id));
    textareaRef.current?.focus();
  };

  const handleDeletePending = (id: string) => {
    setPendingMessages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSendNow = (pending: PendingMessage) => {
    setPendingMessages((prev) => prev.filter((p) => p.id !== pending.id));
    if (isProcessingRef.current) {
      // Se tiver processando, espera o timer limpar e depois envia
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
      isProcessingRef.current = false;
      sendMessageToAgent(pending.text, pending.filesReferenced, pending.mode);
    } else {
      sendMessageToAgent(pending.text, pending.filesReferenced, pending.mode);
    }
  };

  return (
    <div className={styles.chatContainer}>
      {/* Abas Superiores de Chats */}
      <div className={styles.tabsHeader}>
        <div className={styles.tabsList}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`${styles.tabItem} ${s.id === activeSessionId ? styles.tabActive : ''}`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <span className={styles.tabTitle}>{s.title}</span>
              <button
                type="button"
                className={styles.tabCloseBtn}
                onClick={(e) => handleCloseChatTab(s.id, e)}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.newChatBtn}
          onClick={handleCreateNewChat}
          title="New Chat"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Corpo de Mensagens */}
      <div className={styles.messagesContainer}>
        {currentSession.messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`${styles.messageWrapper} ${isUser ? styles.userWrapper : styles.aiWrapper}`}
            >
              <div className={styles.messageBubble}>
                {/* Referência a arquivos Contextuais */}
                {msg.filesReferenced && msg.filesReferenced.length > 0 && (
                  <div className={styles.messageFiles}>
                    {msg.filesReferenced.map((f) => (
                      <span key={f} className={styles.fileBadge}>
                        📄 {f.split('/').pop()}
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.messageText}>{msg.text}</div>

                {/* To-dos / Checklist de progresso do Agent */}
                {msg.todos && msg.todos.length > 0 && (
                  <div className={styles.todosBlock}>
                    <div className={styles.todosHeader}>
                      <div className={styles.todosProgress}>
                        <CheckSquare
                          size={13}
                          style={{ color: 'var(--accent)' }}
                        />
                        <span className={styles.progressText}>
                          {msg.todos.filter((t) => t.completed).length}/
                          {msg.todos.length} To-dos
                        </span>
                      </div>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${(msg.todos.filter((t) => t.completed).length / msg.todos.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className={styles.todosList}>
                      {msg.todos.map((todo) => (
                        <div key={todo.id} className={styles.todoItem}>
                          <div className={styles.todoContent}>
                            <input
                              type="checkbox"
                              checked={todo.completed}
                              readOnly
                              className={styles.todoCheckbox}
                            />
                            <span
                              className={`${styles.todoText} ${todo.completed ? styles.todoCompletedText : ''}`}
                            >
                              {todo.text}
                            </span>
                          </div>
                          {todo.commands && todo.commands.length > 0 && (
                            <div className={styles.todoCommands}>
                              {todo.commands.map((cmd, cIdx) => (
                                <div key={cIdx} className={styles.commandLog}>
                                  <span className={styles.commandChecked}>
                                    ✓
                                  </span>
                                  <code>{cmd}</code>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.messageMeta}>
                {isUser ? 'User' : 'Agent'} ·{' '}
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          );
        })}
        <div ref={listEndRef} />
      </div>

      {/* Autocomplete de @ */}
      {showAutocomplete && filteredFiles.length > 0 && (
        <div className={styles.autocomplete}>
          <div className={styles.autocompleteTitle}>Reference File</div>
          {filteredFiles.map((file, idx) => (
            <div
              key={file}
              className={`${styles.autocompleteItem} ${idx === activeAutocompleteIndex ? styles.autocompleteActive : ''}`}
              onClick={() => handleAddFilePill(file)}
            >
              📄 {file}
            </div>
          ))}
        </div>
      )}

      {/* Mensagens Pendentes — substitui Past Chats */}
      {pendingMessages.length > 0 && (
        <div className={styles.pastChatsBlock}>
          <div className={styles.pastChatsHeader}>
            <Clock size={12} />
            <span>
              Pending ({pendingMessages.length})
              {isProcessingRef.current && ' · Processing...'}
            </span>
          </div>
          <div className={styles.pastChatsList}>
            {pendingMessages.map((pending) => (
              <div key={pending.id} className={styles.pendingCard}>
                <div className={styles.pendingCardContent}>
                  <span className={styles.pendingText}>
                    {pending.text.slice(0, 60)}
                    {pending.text.length > 60 ? '...' : ''}
                  </span>
                  {pending.filesReferenced &&
                    pending.filesReferenced.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          flexWrap: 'wrap',
                          marginTop: 2,
                        }}
                      >
                        {pending.filesReferenced.map((f) => (
                          <span
                            key={f}
                            className={styles.fileBadge}
                            style={{ fontSize: 9 }}
                          >
                            📄 {f.split('/').pop()}
                          </span>
                        ))}
                      </div>
                    )}
                  <span className={styles.pastChatTime}>
                    {Math.floor((Date.now() - pending.queuedAt) / 60000)}m ago
                  </span>
                </div>
                <div className={styles.pendingActions}>
                  <button
                    type="button"
                    className={styles.pendingActionBtn}
                    onClick={() => handleEditPending(pending)}
                    title="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.pendingActionBtn}
                    onClick={() => handleDeletePending(pending.id)}
                    title="Excluir"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.pendingActionBtn}
                    onClick={() => handleSendNow(pending)}
                    title="Enviar agora"
                    style={{ color: '#22c55e' }}
                  >
                    <Play size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé e Área de Input */}
      <div className={styles.inputArea}>
        {/* Pills de arquivos referenciados ativos */}
        {referencedFiles.length > 0 && (
          <div className={styles.inputFilesRow}>
            {referencedFiles.map((f) => (
              <span key={f} className={styles.filePill}>
                📄 {f.split('/').pop()}
                <button
                  type="button"
                  className={styles.removePillBtn}
                  onClick={() => handleRemoveFilePill(f)}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Plan, @ for context, / for commands..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
          />
        </div>

        {/* Rodapé do Input com seletores do Cursor */}
        <div className={styles.inputFooter}>
          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeBtn} ${selectedMode === 'plan' ? styles.modeActive : ''}`}
              onClick={() => setSelectedMode('plan')}
            >
              Plan
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${selectedMode === 'build' ? styles.modeActive : ''}`}
              onClick={() => setSelectedMode('build')}
            >
              Build
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Seletor de Modelo Customizado com Provedores e Pesquisa */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              className={styles.modelSelect}
              onClick={() => {
                setShowModelDropdown((v) => !v);
                setModelSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                color: 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              {model}
              <ChevronDown size={11} />
            </button>

            {showModelDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                  width: 'max(260px, calc(100% + 20px))',
                  maxWidth: 'min(380px, calc(100vw - 48px))',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '320px',
                  overflow: 'hidden',
                }}
              >
                {/* Busca */}
                <div
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Search size={13} style={{ color: 'var(--fg-faint)' }} />
                  <input
                    type="text"
                    placeholder="Buscar modelo..."
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '12px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--fg)',
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      useUiStore.getState().setActiveView('workspace');
                      useUiStore.getState().setSidebarTab('settings');
                      setShowModelDropdown(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--fg-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title="Abrir Preferências"
                  >
                    <Settings size={13} />
                  </button>
                </div>

                {/* Lista de Modelos por Provedor */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {filteredModels.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--fg-faint)',
                      }}
                    >
                      Nenhum modelo encontrado.
                    </div>
                  ) : (
                    (() => {
                      const providers = [
                        ...new Set(filteredModels.map((m) => m.provider)),
                      ];
                      return providers.map((provider) => {
                        const providerModels = filteredModels.filter(
                          (m) => m.provider === provider,
                        );
                        return (
                          <div key={provider} style={{ marginBottom: '2px' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedProviders((prev) => ({
                                  ...prev,
                                  [provider]: prev[provider] !== true,
                                }))
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                width: '100%',
                                padding: '6px 8px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'var(--fg-muted)',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.3px',
                              }}
                            >
                              {expandedProviders[provider] === true ? (
                                <ChevronDown size={11} />
                              ) : (
                                <ChevronRight size={11} />
                              )}
                              <span style={{ flex: 1, textAlign: 'left' }}>
                                {provider}
                              </span>
                              <span
                                style={{
                                  fontSize: '9px',
                                  color: 'var(--fg-faint)',
                                  background: 'var(--border)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                }}
                              >
                                {providerModels.length}
                              </span>
                            </button>
                            {expandedProviders[provider] === true && (
                              <div>
                                {providerModels.map((m) => {
                                  const isActive = model === m.name;
                                  const isFree =
                                    m.isFree || m.id?.includes('free');
                                  const hasVision =
                                    m.id?.includes('vision') ||
                                    m.id?.includes('vl') ||
                                    m.provider === 'Anthropic' ||
                                    m.provider === 'OpenAI' ||
                                    m.provider === 'Google';
                                  const hasCodex =
                                    m.id?.includes('codex') ||
                                    m.id?.includes('coder');
                                  const ctxHint =
                                    m.id?.includes('deepseek') ||
                                    m.id?.includes('kimi')
                                      ? '1M ctx'
                                      : '200K ctx';

                                  return (
                                    <button
                                      key={m.id || m.name}
                                      type="button"
                                      onClick={() => {
                                        setModel(m.name);
                                        setShowModelDropdown(false);
                                      }}
                                      style={{
                                        textAlign: 'left',
                                        padding: '6px 8px 6px 16px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        background: isActive
                                          ? 'var(--accent-faint)'
                                          : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isActive)
                                          e.currentTarget.style.background =
                                            'var(--panel-hover)';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isActive)
                                          e.currentTarget.style.background =
                                            'transparent';
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            fontWeight: isActive ? 600 : 500,
                                            color: isActive
                                              ? 'var(--accent)'
                                              : 'var(--fg)',
                                          }}
                                        >
                                          {m.name}
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          fontSize: '10px',
                                          color: 'var(--fg-muted)',
                                        }}
                                      >
                                        <span
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                          }}
                                        >
                                          <IconText size={10} /> Tx
                                        </span>
                                        {hasVision && (
                                          <span
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '2px',
                                            }}
                                          >
                                            <IconImage size={10} /> Img
                                          </span>
                                        )}
                                        <span
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                          }}
                                        >
                                          <IconContext size={10} /> {ctxHint}
                                        </span>
                                        {hasCodex && (
                                          <span
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '2px',
                                            }}
                                          >
                                            <IconCode size={10} /> Codex
                                          </span>
                                        )}
                                        {isFree && (
                                          <span
                                            style={{
                                              color: '#16a34a',
                                              fontWeight: 600,
                                              fontSize: '9px',
                                            }}
                                          >
                                            · Free
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.iconActionBtn}
            title="Attach Image"
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            className={styles.iconActionBtn}
            title="Voice Input"
          >
            <Mic size={14} />
          </button>

          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
