# Plano de Reestruturação — Alethe

> Documento detalhado com todas as mudanças planejadas para o app Alethe.
> Status: **Em andamento** — Fase 1 parcialmente concluída.

---

## Sumário Executivo

O Alethe passará por uma reestruturação completa da interface, inspirada no VS Code, com três grandes eixos:

1. **ActivityBar + Agent Sidebar** — A sidebar vira uma barra vertical de ícones (estilo VS Code) com conteúdo dinâmico
2. **Editor de Arquivos com Abas** — A área principal vira um editor de código quando a aba Explorer está ativa
3. **Agent Terminal Panel** — O painel direito (TaskPanel) ganha funcionalidade de agent

---

## Fase 1: ActivityBar + Sidebar (Concluída ✅)

### O que foi feito

A sidebar anterior tinha 4 tabs internos (projects, files, git, workflows) controlados por `useState` local. Agora o estado `sidebarTab` foi migrado para o `uiStore` global.

### Arquivos modificados

| Arquivo                                   | Mudança                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `src/stores/uiStore.ts`                   | Adicionado `sidebarTab` + `setSidebarTab`                                     |
| `src/components/ProjectSidebar/index.tsx` | Usa `useUiStore` para `sidebarTab` em vez de `useState`                       |
| `src/App.tsx`                             | Condicional: `sidebarTab === 'files'` → `FileEditor`, senão → `WorkspaceView` |

### Comportamento

- Quando `sidebarTab === 'projects'` → Mostra a árvore de projetos/terminais (como antes)
- Quando `sidebarTab === 'files'` → Mostra o editor de arquivos com abas
- Quando `sidebarTab === 'git'` → Mostra o GitControl
- Quando `sidebarTab === 'workflows'` → Mostra o WorkflowDashboard

### Pendências

- [ ] Transformar a sidebar em ActivityBar vertical (48px, ícones verticais)
- [ ] Cada ícone abre um container diferente no sidebar (estilo VS Code)
- [ ] Indicador de aba ativa com borda animada
- [ ] Suporte a DnD para reordenar ícones
- [ ] Badges nos ícones (contadores, notificações)

---

## Fase 2: Editor de Arquivos com Abas (Concluída ✅)

### O que foi feito

Criado um editor de código completo usando Monaco Editor (o motor do VS Code), com suporte a abas, syntax highlighting, e integração com o FileExplorer.

### Arquivos criados

| Arquivo                                           | Descrição                            |
| ------------------------------------------------- | ------------------------------------ |
| `src/components/FileEditor/index.tsx`             | Container principal do editor        |
| `src/components/FileEditor/EditorTabs.tsx`        | Barra de abas com drag-and-drop      |
| `src/components/FileEditor/EditorPane.tsx`        | Wrapper do Monaco Editor             |
| `src/components/FileEditor/FileEditor.module.css` | Estilos do container                 |
| `src/components/FileEditor/EditorTabs.module.css` | Estilos das abas                     |
| `src/components/FileEditor/EditorPane.module.css` | Estilos do editor + status bar       |
| `src/stores/editorStore.ts`                       | Store Zustand para gerenciar abas    |
| `src/lib/languageDetection.ts`                    | Detecção de linguagem por extensão   |
| `src-tauri/src/filesystem.rs`                     | Adicionado comando `write_text_file` |
| `src/lib/tauri.ts`                                | Adicionado wrapper `writeTextFile`   |

### Funcionalidades

| Funcionalidade                                            | Status |
| --------------------------------------------------------- | ------ |
| Abrir arquivo (duplo-clique no FileExplorer)              | ✅     |
| Múltiplas abas                                            | ✅     |
| Preview mode (single-click = preview, duplo-clique = pin) | ✅     |
| Dirty indicator (ponto indicador de modificação)          | ✅     |
| Fechar aba (X / middle-click)                             | ✅     |
| Salvar (Ctrl+S)                                           | ✅     |
| Syntax highlighting (Monaco)                              | ✅     |
| Status bar (linguagem, linha/coluna)                      | ✅     |
| Drag-and-drop de abas                                     | ✅     |
| Fechar outras abas / fechar todas                         | ✅     |
| Detecção de 30+ linguagens                                | ✅     |
| Escrita de arquivos via Tauri backend                     | ✅     |

### Detalhes Técnicos

#### EditorTab (store)

```typescript
interface EditorTab {
  id: string;
  filePath: string;
  name: string; // basename do arquivo
  language: string; // detectada pela extensão
  isDirty: boolean; // conteúdo modificado desde último save
  isPinned: boolean; // aba fixada (não é preview)
  isPreview: boolean; // modo preview (itálico, substituído por próximo click)
}
```

#### Fluxo de abertura

```
FileExplorer.onDoubleClick(filePath)
  → editorStore.openFile(filePath)
    → Verifica se já está aberto (por path)
      → Se sim: apenas ativa a aba
      → Se não: lê o arquivo via readTextFile (Tauri)
        → Detecta linguagem pela extensão
        → Cria aba (preview ou pinned)
        → Ativa a aba
        → Monaco Editor renderiza o conteúdo
```

#### Preview Mode (estilo VS Code)

- **Single-click** no FileExplorer → Abre em modo preview (itálico, será substituído)
- **Duplo-clique** no FileExplorer → Abre como aba normal (pinned)
- Próximo single-click substitui o preview anterior

#### Monaco Editor Config

```typescript
const MONACO_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  tabSize: 2,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  bracketPairColorization: { enabled: true },
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  padding: { top: 8 },
};
```

#### Linguagens Suportadas

TypeScript, JavaScript, JSON, Markdown, CSS, HTML, Python, Rust, Ruby, Go, Java, Kotlin, Swift, C, C++, C#, PHP, Perl, R, SQL, Shell, PowerShell, Batch, TOML, YAML, XML, LaTeX, Dockerfile, Makefile, e mais.

### Pendências

- [ ] Breadcrumbs (caminho completo do arquivo)
- [ ] Atalhos de teclado adicionais (Ctrl+Tab, Ctrl+Shift+Tab)
- [ ] Persistência de abas abertas entre sessões
- [ ] Minimap (toggleável)
- [ ] Search & Replace no editor
- [ ] Multiple cursors
- [ ] Diff view (comparar arquivos)
- [ ] Image viewer (para PNG, JPG, SVG)
- [ ] Terminal embedded no editor

---

## Fase 3: Agent Terminal Panel (Em progresso 🔄)

### Conceito

O painel direito (atualmente TaskPanel) será expandido para incluir funcionalidade de agent:

```
┌─────────────────────────┐
│ 🤖 Agent — ProjectName  │
│ ● idle                  │
├─────────────────────────┤
│ Overview│Terminal│Activity│Tasks│
├─────────────────────────┤
│                         │
│ [conteúdo da aba ativa] │
│                         │
└─────────────────────────┘
```

### Abas do Painel

#### 1. Overview (Dashboard)

- Status do agent ativo (running/idle/done)
- Custo total da sessão
- Número de agents ativos
- Resumo de tasks do projeto (implementing/review/pending/blocked)

#### 2. Terminal

- XTermView dedicado ao agent ativo
- Output em tempo real
- Input habilitado

#### 3. Activity

- Timeline de tool events
- Nome da ferramenta + resumo
- Timestamp relativo

#### 4. Tasks

- Lista completa de tasks do projeto
- Filtradas por status (implementing/review/pending/blocked)
- Cards com título, descrição, agent type

### Arquivos criados

| Arquivo                                                           | Descrição           |
| ----------------------------------------------------------------- | ------------------- |
| `src/components/AgentTerminalPanel/index.tsx`                     | Container principal |
| `src/components/AgentTerminalPanel/AgentTerminalPanel.module.css` | Estilos             |

### Stores Utilizados

| Store              | Dados                                            |
| ------------------ | ------------------------------------------------ |
| `agentCanvasStore` | `nodes[]` (agentes ativos), `feed` (tool events) |
| `agentCostStore`   | `byPtyId` (custo por sessão)                     |
| `terminalsStore`   | `byPtyId` (status do PTY)                        |
| `projectsStore`    | `tasks[]` (tarefas do projeto)                   |

### Pendências

- [ ] Integrar XTermView real no tab Terminal
- [ ] Ações no Overview (restart agent, view transcript)
- [ ] Filtros no Activity (por agent, por tool)
- [ ] Criação de tasks a partir do painel
- [ ] Accept/Reject de tasks com git snapshot
- [ ] Conexão com o TaskCard existente

---

## Fase 4: FileExplorer com Abertura de Arquivos (Concluída ✅)

### O que foi feito

O FileExplorer (sidebar, aba Files) agora suporta duplo-clique para abrir arquivos no editor.

### Mudanças

| Arquivo                                          | Mudança                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `src/components/ProjectSidebar/FileExplorer.tsx` | Adicionado `onFileClick` prop + `onDoubleClick` em FileRow |
| `src/components/ProjectSidebar/index.tsx`        | Conecta `onFileClick` ao `editorStore.openFile`            |

### Fluxo

```
FileExplorer (aba Files na sidebar)
  → Usuário dá duplo-clique num arquivo
  → onFileClick(filePath)
  → editorStore.openFile(filePath)
  → FileEditor (área principal) renderiza o arquivo com Monaco
```

---

## Fase 5: Integração App.tsx (Concluída ✅)

### Layout Atual

```
┌──────┬────────────────────┬──────────┐
│      │                    │          │
│ Side │   WorkspaceView    │ TaskPanel│
│ bar  │   ou               │ (ou      │
│      │   FileEditor       │ Agent    │
│      │                    │ Panel)   │
│      │                    │          │
└──────┴────────────────────┴──────────┘
```

### Lógica de Renderização

```tsx
// App.tsx (simplificado)
{
  activeView === 'workspace' ? (
    <>
      {sidebarTab === 'files' ? <FileEditor /> : <WorkspaceView />}
      <TaskPanel /> // ou <AgentTerminalPanel />
    </>
  ) : null;
}
```

---

## Fase 6: Extensões Futuras

### 6.1 ActivityBar Vertical (estilo VS Code)

```
┌──────┐
│  📁  │ ← Explorer (abre FileEditor)
│  📂  │ ← Files (abre FileExplorer)
│  🔀  │ ← Source Control (abre GitControl)
│  🤖  │ ← Agents (abre AgentDashboard)
│  ⚙️  │ ← Workflows (abre WorkflowDashboard)
│      │
│  ──  │
│  ⚙️  │ ← Settings
└──────┘
```

**Componentes a criar:**

- `src/components/ActivityBar/index.tsx`
- `src/components/ActivityBar/ActivityBar.module.css`
- `src/components/ActivityBar/ActivityBarItem.tsx`

**Especificações:**

- Largura: 48px (normal), 36px (compact)
- Ícone: 24px (normal), 16px (compact)
- Indicador de aba ativa: borda esquerda 2px na cor accent
- Badge: contadores no canto superior direito do ícone
- DnD: reordenar ícones via drag-and-drop

### 6.2 ViewPane Container (estilo VS Code)

Cada aba da ActivityBar abre um "container" no sidebar com múltiplos ViewPanes colapsáveis.

**Estrutura:**

```
ActivityBar [📁] → Sidebar Content
  └── ViewPaneContainer
      ├── ViewPane: "Open Editors" (colapsável)
      ├── ViewPane: "Project Tree" (colapsável)
      │   ├── GroupNode (recursivo)
      │   │   ├── ProjectNode
      │   │   │   └── TerminalNode
      │   │   └── GroupNode (filho)
      │   └── UngroupedSection
      └── ViewPane: "Outline" (colapsável)
```

**Componentes a criar:**

- `src/components/ViewPane/index.tsx`
- `src/components/ViewPane/ViewPane.module.css`
- `src/components/ViewPane/ViewPaneHeader.tsx`
- `src/components/AgentSidebar/index.tsx`
- `src/components/AgentSidebar/ViewPaneContainer.tsx`

### 6.3 Editor Groups (estilo VS Code)

Suporte a múltiplos grupos de editor lado a lado.

**Estrutura:**

```
EditorArea
├── EditorGroup 1 (horizontal split)
│   ├── Tab bar
│   └── EditorPane (Monaco)
├── Sash (draggable)
└── EditorGroup 2
    ├── Tab bar
    └── EditorPane (Monaco)
```

**Componentes a criar:**

- `src/components/EditorGroup/index.tsx`
- `src/components/EditorGroup/EditorGroup.module.css`

**Store:**

```typescript
interface EditorGroupStore {
  groups: EditorGroup[];
  activeGroupId: string | null;

  splitGroup: (direction: 'horizontal' | 'vertical') => void;
  mergeGroups: (sourceId: string, targetId: string) => void;
  moveTab: (tabId: string, fromGroup: string, toGroup: string) => void;
}
```

### 6.4 Terminal como Agent Working Area

O terminal do agent ficará em um painel dedicado (similar ao VS Code Panel na parte inferior).

**Fluxo:**

```
Agent inicia sessão
  → Cria PTY via Tauri backend
  → PTY aparece no TerminalTab do AgentTerminalPanel
  → Output em tempo real via listenPtyData
  → Input habilitado (usuário pode digitar comandos)
```

---

## Referência: VS Code Architecture

### Hierarquia de Componentes

```
Workbench Layout
├── ActivityBarPart (48px vertical icon bar)
│   └── ActivityBarCompositeBar
│       └── CompositeBar
│           └── CompositeBarActionViewItem (per icon)
│
├── SidebarPart
│   ├── [optional] ActivityBarCompositeBar (top/bottom position)
│   └── Content Area
│       └── PaneComposite (swapped per ViewContainer)
│           └── ViewPaneContainer
│               └── ViewPane[] (collapsible panes)
│
├── EditorPart (center)
│   └── SerializableGrid
│       └── EditorGroupView[] (tabs + editor pane)
│           └── EditorPanes
│               └── EditorPane (text, diff, custom, etc.)
│
├── PanelPart (bottom/top/left/right)
│   └── Same pattern as SidebarPart
│
└── AuxiliaryBarPart (secondary sidebar)
    └── Same pattern as SidebarPart
```

### Padrões Importantes

1. **Registry + Descriptor**: Containers e views são registrados com descriptors
2. **ViewContainerModel**: Gerencia estado por container (visibilidade, tamanho, ordem)
3. **AbstractPaneCompositePart**: Base compartilhada entre Sidebar, Panel e AuxiliaryBar
4. **CompositeBar Model**: Ícones são gerenciados independentemente do conteúdo
5. **Preview Mode**: Single-click = preview (itálico), double-click = pin

### Dimensões

| Elemento              | Largura                   | Altura |
| --------------------- | ------------------------- | ------ |
| ActivityBar           | 48px                      | 100%   |
| ActivityBar (compact) | 36px                      | 100%   |
| Ícone                 | 24px                      | 24px   |
| Sidebar content       | clamp(280px, 22vw, 380px) | 100%   |
| ViewPane header       | 100%                      | 35px   |
| Active indicator      | 2px                       | 100%   |

---

## Checklist Geral

### Fase 1: ActivityBar + Sidebar

- [ ] Criar `ActivityBar` component
- [ ] Criar `ActivityBarItem` component
- [ ] Criar `AgentSidebar` shell
- [ ] Criar `ViewPaneContainer`
- [ ] Criar `ViewPane` (collapsible)
- [ ] Integrar com `agentViewStore`
- [ ] Adicionar i18n keys
- [ ] Testar DnD de ícones

### Fase 2: Editor de Arquivos

- [x] Instalar `@monaco-editor/react`
- [x] Criar `editorStore.ts`
- [x] Criar `languageDetection.ts`
- [x] Criar `FileEditor` components
- [x] Integrar com `FileExplorer`
- [x] Adicionar `write_text_file` no Rust backend
- [ ] Breadcrumbs
- [ ] Atalhos de teclado extras
- [ ] Persistência de abas

### Fase 3: Agent Terminal Panel

- [x] Criar `AgentTerminalPanel` component
- [x] Criar `OverviewTab`
- [x] Criar `TerminalTab` (placeholder)
- [x] Criar `ActivityTab`
- [x] Criar `TasksTab`
- [ ] Integrar XTermView real
- [ ] Ações no Overview
- [ ] Filtros no Activity
- [ ] Criação de tasks

### Fase 4: FileExplorer

- [x] Adicionar `onFileClick` prop
- [x] Adicionar `onDoubleClick` em FileRow
- [x] Conectar com `editorStore`

### Fase 5: Integração

- [x] Modificar `App.tsx`
- [x] Modificar `uiStore.ts`
- [x] Adicionar i18n keys
- [ ] Verificar todas as rotas de navegação

### Fase 6: Extensões Futuras

- [ ] ActivityBar vertical
- [ ] ViewPane container
- [ ] Editor groups
- [ ] Terminal como agent working area
- [ ] Search & Replace
- [ ] Multiple cursors
- [ ] Diff view
- [ ] Image viewer

---

## Notas Técnicas

### Dependências Instaladas

```json
{
  "@monaco-editor/react": "^4.x"
}
```

### Comandos Tauri Adicionados

```rust
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String>
```

### Stores Modificados

- `uiStore.ts` — Adicionado `sidebarTab` + `setSidebarTab`
- `editorStore.ts` — Novo store para editor de abas

### i18n Keys Adicionadas

```typescript
'editor.empty': 'No files open'
'editor.emptyHint': 'Click or double-click a file in the Explorer to open it'
```

---

_Documento gerado em 14/07/2026 — Alethe v1.2.5_
