# Alethe — Overview

App desktop (Windows) que transforma uma **workspace em grid de containers
redimensionáveis** em ambiente de trabalho real: cada pane é um terminal vivo
(Shell, Claude Code, Codex, OpenCode) com PTY próprio rodando em background.
Usuário organiza os agentes por grupos, projetos e containers, alternando entre
layouts flexíveis quando precisa focar num contexto específico.

## O que o sistema entrega

- **Terminal como cidadão de primeira classe na workspace.** Não é um terminal
  solto: é um pane dentro de containers de projeto, com layout, scrollback,
  cwd e estado persistidos entre sessões.
- **Agentes de IA prontos.** Shell, Claude Code, Codex e OpenCode são
  spawnable em 1 click. Auto-detect de paths em PATH/registry/`%NVM_HOME%\v*`,
  com fallback pra dialog "Configure path…" se a CLI não estiver no PATH do
  processo do MSI.
- **Organização por projeto.** Grupos, projetos e containers organizam panes de
  terminal com drag-and-drop e layouts auto, spotlight, sidebar ou grid
  customizado.
- **Persistência completa.** Projetos, grupos, containers, layouts, scrollback
  (~256 KB por PTY), preferências, paths de CLI — tudo restaurado ao reabrir o
  app.
- **Foco por layout.** Containers podem ocupar fullscreen e a workspace pode
  reorganizar projetos/terminais com split panes redimensionáveis.

## Stack

| Camada | Tecnologia |
|---|---|
| Shell | Tauri 2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Workspace | `react-resizable-panels` + `@dnd-kit/core` + grid CSS customizado |
| Terminal | xterm.js + addon-fit + addon-search |
| PTY | portable-pty (ConPTY no Windows) |
| Split panes | react-resizable-panels v4 |
| Persistência | `projects.json` + scrollback em disco |
| Bundle | MSI / NSIS standalone (Windows 10/11) |

## Features principais

### Workspace

- **Criação rápida** de terminais Shell/Claude/Codex/OpenCode escolhendo a
  pasta cwd. `Ctrl+T` cria um shell instantâneo.
- **Containers de projeto** agrupam panes de terminal e podem ser abertos,
  recolhidos, fechados ou colocados em fullscreen.
- **Layouts flexíveis**: auto, spotlight, sidebar e grid customizado para
  projetos, grupos e workspace.
- **Drag-and-drop** com `@dnd-kit/core` para reordenar containers e panes.
- **Atalhos**: `Ctrl+T` shell rápido, `Ctrl+W` fecha selecionado, `Ctrl+P`
  find/jump modal, `Delete` deleta.
- **Backup**: export/import de `.canvasagents.zip` com todo o estado +
  scrollback de cada PTY.

### Terminais embutidos

- **xterm real** com PTY rodando portable-pty no backend.
- **Copy/paste** nativo: Ctrl+C com seleção copia, Ctrl+V cola.
- **Force-kill**: Ctrl+C duplo (≤1.5s) mata o PTY, escapando do hang de
  "Terminate batch?" do `cmd /k`.
- **Restart in-place** quando o processo sai (overlay com botão Restart).
- **Search** in-terminal via `Ctrl+F` com highlights.
- **Histórico de prompts** persistido por PTY (`Ctrl+↑/↓`).
- **Session resume** pra Claude/Codex/OpenCode: reabrir o app continua a
  sessão anterior.
- **CWD tracking**: usuário `cd`'a numa pasta, desabilita, reativa, volta
  exatamente onde estava.

### Sub-terminais (lane lateral)

Cada terminal pode hospedar **múltiplas tabs** — Shell + Claude + Codex no
mesmo compartimento, sem virar pane novo:

- Lane vertical de 32px à esquerda do terminal com ícones quadradinhos das tabs.
- Cada tab tem PTY próprio rodando em background, mesmo quando outra está
  visível. `npm run dev` numa tab continua respondendo `localhost:3000`
  enquanto você usa outra tab.
- Botão `+` na lane abre modal pra criar tab nova (escolhe tipo + cwd).
- × no canto superior direito de cada tab (no hover) fecha individualmente
  com confirmação.
- Lane é **togável** via botão na esquerda da topbar — escondida por padrão
  em terminais single-tab pra não roubar espaço, forçada visível em multi-tab.
- Cor da lane casa com a topbar do pane (segue tema dark/light do terminal).

### Sidebar AgentMonitor

- Lista todos os terminais agrupados por container/projeto (ou por cwd quando
  fora).
- **Status em tempo real** por terminal: trabalhando (ciano) / aguardando
  (âmbar) / parado (cinza) / offline (vermelho).
- Click no item abre/foca o pane correspondente na workspace.
- Botão **Focus** por grupo abre o modo foco (ver abaixo).

### Disable / poupar RAM

- Ícone de olho no titlebar **desabilita** o terminal: mata o PTY, libera
  ~300–600 MB do agente, mantém o pane visualmente com placeholder
  "Reativar".
- Olho no header do grupo desabilita/reativa todos do grupo de uma vez.
- Estado `disabled` é persistido — reabrir o app mantém desabilitado até
  reativar.

### Onboarding e preferências

- Modal de primeira abertura: pills 2x2 pra escolher agentes (Shell/Claude/
  Codex/OpenCode) + cards pra escolher tema (claro/escuro) com **live
  preview** ao clicar.
- Toolbar filtra os agentes habilitados.
- Tema do terminal pode ser independente do tema da UI.

### MainMenu

Itens secundários:
- Redefinir preferências · Trocar tema
- Abrir pasta de dados · Abrir spawn.log · Rodar diagnósticos · Monitor RAM
- Exportar / Importar backup

### Diagnóstico

- Botão "Rodar diagnósticos" escreve em `spawn.log` o estado completo de
  resolução de paths (PATH herdado, registry rebuilt, `agent_search_dirs`,
  `find_windows_cli_launcher` por agente, NVM versions).
- Pill "RAM" na toolbar mostra memória total (app + filhos), atualizada a
  cada 2s.

---

## Modo foco (Focus mode)

O modo foco é o "modo trabalho concentrado" do app. Você escolhe um grupo ou
projeto na sidebar e abre seus containers/terminais em fullscreen ou em layouts
split-pane redimensionáveis.

### Quando usar

- Tem vários projetos abertos na workspace, cada um com 3 terminais. Quer focar
  num projeto específico sem distração visual dos outros.
- Quer espaço maior pra cada terminal usando fullscreen ou layouts
  redimensionáveis.
- Vai fazer pair de tabs (Claude rodando + shell rodando) e quer redimensionar
  os panes na hora pelo divisor.

### Layouts

- **Auto** — grade automática (1 / 2 lado-a-lado / 2x2 / 3+ em grid).
- **Spotlight** — um pane principal grande + stack lateral com os outros.
- **Sidebar** — lista fina de panes à esquerda + um pane grande à direita.

Layout escolhido é persistido por grupo via localStorage.

### Cada pane mostra

- **Header rico** com:
  - Grip pra arrastar (reordena posição dos panes)
  - Toggle da lane de tabs
  - Ícone do agente
  - Nome do terminal
  - Pill de cwd (com ellipsis pra paths longos)
  - Botões de ação: Explorer, VS Code, Claude history (se Claude),
    Restart, Disable, Pop out, Apagar
  - Status pill em tempo real (working/waiting/stopped/disabled) com
    "há X min" desde a última transição
- **Body do terminal** com xterm cheio + lane lateral de tabs.
- **Drag-and-drop** entre panes pra reordenar.
- **Fullscreen**: amplia um container específico na workspace.

### Tabs no focus mode

A lane lateral de tabs aparece dentro de cada pane:

- Toggle no header esquerdo (depois do grip ⋮⋮) abre/fecha.
- Multi-tab força lane visível.
- Click numa tab muda a tab ativa do terminal.
- Botão `+` cria nova tab.
- × no hover fecha tab individual.
- Cor da lane casa com a topbar rica do pane em dark e light.

### Como sair

- Botão "Sair do foco" no header do focus
- `Esc`
- Fullscreen de um pane/container específico

### Tracking de estado

Mesmo com containers fechados, recolhidos ou em fullscreen, os PTYs continuam
vivos no backend. A sidebar atualiza status em tempo real, então voltar à
workspace mostra o estado certo.

---

## Persistência

Tudo fica em `%LOCALAPPDATA%\dev.canvas.agents\`:

- `projects.json` — grupos, projetos, containers, layouts e preferências da
  workspace.
- `app_config.json` — `cli_paths` + `preferences`.
- `scrollback/{ptyId}.bin` — scrollback de cada PTY (~256 KB cap).
- `spawn.log` — log de spawns + diagnósticos.

Backup `.canvasagents.zip` empacota projetos + scrollback completo.

---

## Não-objetivos

- Cross-platform (Linux/macOS) — possível, foco é Windows ConPTY.
- Cloud sync / multi-device.
- Recuperação de chat dos agentes além do que cada CLI já oferece (Claude
  `--continue`, etc).

---

## Build

Dev:
```powershell
npm run dev:stable
```

MSI release:
```powershell
npm run build:stable
```

Saída em `src-tauri/target/release/bundle/msi/`.
