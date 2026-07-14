# Alethe — Transferência de Contexto do Agente (Sessão Atual)

## 📌 Status Geral

Sessão focada na reestruturação da interface do Alethe, inspirada no VS Code. Editor de arquivos com Monaco implementado, Agent Terminal Panel criado, e TaskPanel restaurado. App compilando sem erros.

---

## 🛠️ O que foi feito nesta sessão

### 1. Transição Suave entre Abas de Tarefas (TaskPanel)

- **CSS Animation**: Adicionado `@keyframes tabContentIn` com fade + slide up (6px) e duração de 240ms usando o easing `cubic-bezier(0.22, 1, 0.36, 1)` (padrão "decelerate" do projeto).
- **Container animado**: Novo `contentWrapper` com `overflow: hidden` e `tabContent` com `position: absolute; inset: 0`.
- **Re-render forçado**: `key={activeTab}` no container garante que o React remonte o elemento a cada troca de aba, triggerando a animação CSS.
- **Acessibilidade**: `@media (prefers-reduced-motion: reduce)` desabilita a animação.

### 2. Editor de Arquivos com Monaco (FileEditor)

- **Dependência**: `@monaco-editor/react` instalado — motor do VS Code para syntax highlighting, autocompletion, etc.
- **Store**: `src/stores/editorStore.ts` — Zustand store para gerenciar abas, content, dirty state, cursor position, save/load.
- **Language Detection**: `src/lib/languageDetection.ts` — Mapeia 30+ extensões para linguagens Monaco.
- **Components**:
  - `FileEditor/index.tsx` — Container principal com empty state
  - `FileEditor/EditorTabs.tsx` — Barra de abas com DnD, preview mode, dirty indicator
  - `FileEditor/EditorPane.tsx` — Monaco wrapper com Ctrl+S, status bar
- **Rust Backend**: Adicionado comando `write_text_file` em `filesystem.rs` + wrapper em `tauri.ts`.
- **i18n**: Chaves `editor.empty` e `editor.emptyHint` em en.ts e pt-BR.ts.

### 3. Agent Terminal Panel (Substitui TaskPanel — parcial)

- **Componentes criados**:
  - `AgentTerminalPanel/index.tsx` — Container com 4 abas (Overview, Terminal, Activity, Tasks)
  - `AgentTerminalPanel/AgentTerminalPanel.module.css` — Estilos com animações de tab
- **OverviewTab**: Dashboard com agentes ativos, custo total, status, resumo de tasks
- **TerminalTab**: Placeholder para XTermView dedicado ao agent
- **ActivityTab**: Timeline de tool events (integrado com `agentCanvasStore`)
- **TasksTab**: Lista completa de tasks do projeto com cards por status
- **Stores utilizados**: `agentCanvasStore`, `agentCostStore`, `terminalsStore`, `projectsStore`

### 4. FileExplorer com Abertura de Arquivos

- **`FileExplorer.tsx`**: Adicionado `onFileClick` prop + `onDoubleClick` em `FileRow` e `VirtualFileList`.
- **`ProjectSidebar/index.tsx`**: Conecta `onFileClick` ao `editorStore.openFile()`.
- **Fluxo**: Duplo-clique no FileExplorer → `editorStore.openFile()` → Monaco renderiza o arquivo.

### 5. Integração no App.tsx

- **`sidebarTab`** movido de `useState` local (ProjectSidebar) para `uiStore` global.
- **Renderização condicional**: `sidebarTab === 'files'` → `FileEditor`, senão → `WorkspaceView`.
- **TaskPanel restaurado** no lugar do AgentTerminalPanel no App.tsx.
- **FileEditor** integrado como lazy import.

### 6. Modificações no Backend Rust

- **`filesystem.rs`**: Adicionado `write_text_file(path, content)` — cria diretórios pai se necessário, escreve UTF-8.
- **`lib.rs`**: `filesystem::write_text_file` adicionado ao `invoke_handler`.
- **`tauri.ts`**: Wrapper `writeTextFile(path, content)` adicionado.

---

## ⚠️ Regras e Detalhes Técnicos Críticos

1. **Compilação Estrita**: Verificação contra variáveis não utilizadas (`TS6133`) e imports obsoletos (`TS6192`). Sempre rode `npx tsc --noEmit`.
2. **Tauri FS**: O projeto usa wrappers customizados em `src/lib/tauri.ts` em vez de `@tauri-apps/plugin-fs`. O plugin não está instalado — use `invoke('read_text_file')` e `invoke('write_text_file')`.
3. **AgentTerminalPanel NÃO substituiu o TaskPanel**: O TaskPanel foi restaurado no App.tsx. O AgentTerminalPanel está criado mas não está sendo renderizado.
4. **sidebarTab no uiStore**: O estado da aba da sidebar agora é global (`useUiStore`), não mais local (`useState`).

---

## 🚀 Próximos Passos Recomendados

- **Restaurar TaskPanel completamente**: Verificar por que `activeProjectId` está null quando o usuário tem projetos na sidebar.
- **AgentTerminalPanel**: Decidir se substitui o TaskPanel ou fica como painel adicional.
- **ActivityBar vertical**: Transformar a sidebar em barra vertical de ícones estilo VS Code.
- **Editor Groups**: Suporte a múltiplos grupos de editor lado a lado.
- **Persistência de abas**: Salvar abas abertas entre sessões.
- **Integrar XTermView real** no TerminalTab do AgentTerminalPanel.
- **Testes de Rede**: Validar comunicação OpenCode com servidor CLI ativo na porta 4096.
