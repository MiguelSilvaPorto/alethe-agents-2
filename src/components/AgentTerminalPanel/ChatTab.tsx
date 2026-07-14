import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Plus,
  Clock,
  Paperclip,
  Mic,
  CheckSquare,
  ChevronDown,
  X,
} from 'lucide-react';
import { useProjectsStore } from '../../stores/projectsStore';
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

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  const PROVIDERS = useMemo(
    () => [
      { id: 'all', name: 'All Providers' },
      { id: 'Anthropic', name: 'Anthropic' },
      { id: 'OpenAI', name: 'OpenAI' },
      { id: 'Google', name: 'Google' },
      { id: 'DeepSeek', name: 'DeepSeek' },
    ],
    [],
  );

  const AVAILABLE_MODELS = useMemo(
    () => [
      { name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
      { name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
      { name: 'Claude 3 Opus', provider: 'Anthropic' },
      { name: 'GPT-4o', provider: 'OpenAI' },
      { name: 'GPT-4o mini', provider: 'OpenAI' },
      { name: 'o1-mini', provider: 'OpenAI' },
      { name: 'o1-preview', provider: 'OpenAI' },
      { name: 'Gemini 1.5 Pro', provider: 'Google' },
      { name: 'Gemini 1.5 Flash', provider: 'Google' },
      { name: 'Gemini 2.0 Flash', provider: 'Google' },
      { name: 'Gemini 2.0 Pro', provider: 'Google' },
      { name: 'DeepSeek V3', provider: 'DeepSeek' },
      { name: 'DeepSeek R1', provider: 'DeepSeek' },
    ],
    [],
  );

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
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  const filteredModels = useMemo(() => {
    return AVAILABLE_MODELS.filter((m) => {
      const matchesProvider =
        selectedProvider === 'all' || m.provider === selectedProvider;
      const matchesQuery = m.name
        .toLowerCase()
        .includes(modelSearchQuery.toLowerCase());
      return matchesProvider && matchesQuery;
    });
  }, [AVAILABLE_MODELS, selectedProvider, modelSearchQuery]);

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

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputValue.trim(),
      timestamp: Date.now(),
      filesReferenced: [...referencedFiles],
      mode: selectedMode,
    };

    // Resposta simulada para demonstrar o checklist e To-dos
    const updatedMessages = [...currentSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          // Atualiza título com a primeira mensagem do usuário se for "New Chat"
          const title =
            s.title === 'New Chat'
              ? userMsg.text.slice(0, 24) + '...'
              : s.title;
          return {
            ...s,
            title,
            messages: updatedMessages,
          };
        }
        return s;
      }),
    );

    setInputValue('');
    setReferencedFiles([]);

    // Simula a IA gerando os To-dos ou planejando o progresso
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
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
            return {
              ...s,
              messages: [...s.messages, aiResponse],
            };
          }
          return s;
        }),
      );
    }, 1000);
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

      {/* Histórico Inferior (Past Chats) */}
      <div className={styles.pastChatsBlock}>
        <div className={styles.pastChatsHeader}>
          <Clock size={12} />
          <span>Past Chats</span>
        </div>
        <div className={styles.pastChatsList}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`${styles.pastChatItem} ${s.id === activeSessionId ? styles.pastChatActive : ''}`}
              onClick={() => setActiveSessionId(s.id)}
            >
              <span className={styles.pastChatTitle}>{s.title}</span>
              <span className={styles.pastChatTime}>{s.timeAgo}</span>
            </div>
          ))}
        </div>
      </div>

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
                  width: '290px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  zIndex: 2000,
                  height: '240px',
                  overflow: 'hidden',
                }}
              >
                {/* Lateral Esquerda: Lista de Provedores */}
                <div
                  style={{
                    width: '95px',
                    borderRight: '1px solid var(--border)',
                    background: 'var(--bg-sunken)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: 'var(--fg-faint)',
                      padding: '4px 6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Provedor
                  </div>
                  {PROVIDERS.map((prov) => (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(prov.id);
                        setModelSearchQuery('');
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        background:
                          selectedProvider === prov.id
                            ? 'var(--panel-hover)'
                            : 'transparent',
                        color:
                          selectedProvider === prov.id
                            ? 'var(--accent)'
                            : 'var(--fg-muted)',
                        border: 'none',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: selectedProvider === prov.id ? 600 : 400,
                      }}
                    >
                      {prov.name}
                    </button>
                  ))}
                </div>

                {/* Lateral Direira: Pesquisa e Modelos */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      padding: '6px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <input
                      type="text"
                      className={styles.textarea}
                      placeholder="Pesquisar modelos..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: 'var(--bg-sunken)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        outline: 'none',
                        color: 'var(--fg)',
                        minHeight: '24px',
                      }}
                      autoFocus
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                    }}
                  >
                    {filteredModels.length === 0 ? (
                      <div
                        style={{
                          padding: '20px',
                          textAlign: 'center',
                          fontSize: '11px',
                          color: 'var(--fg-faint)',
                        }}
                      >
                        Nenhum modelo encontrado.
                      </div>
                    ) : (
                      filteredModels.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => {
                            setModel(m.name);
                            setShowModelDropdown(false);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            background:
                              model === m.name
                                ? 'var(--accent-faint)'
                                : 'transparent',
                            color:
                              model === m.name ? 'var(--accent)' : 'var(--fg)',
                            border: 'none',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{m.name}</span>
                          <span
                            style={{
                              fontSize: '9px',
                              color: 'var(--fg-faint)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {m.provider}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
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
