# Documentação de Estado — Alethe Project

> Última atualização: 2026-07-13
> Versão: v1.2.3

---

## 1. Sistema de Tasks

### ✅ Concluído

| Funcionalidade                 | Arquivos                                       | Descrição                                                                                             |
| ------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Tipos Task**                 | `src/lib/types.ts`                             | `Task`, `TaskStatus`, `TaskGitSnapshot`, `TaskRejection`                                              |
| **Campo `tasks[]` no Project** | `src/lib/types.ts`                             | Array de tasks dentro de cada projeto                                                                 |
| **Migration v5**               | `src/stores/projectsStore.ts`                  | `projects.json` sobe de v4 → v5 com `tasks: []`                                                       |
| **Ações CRUD**                 | `src/stores/projectsStore.ts`                  | 10 ações: create, move, accept, undoAccept, reject, block, unblock, completeReview, updateGit, delete |
| **Selectors**                  | `src/stores/projectsStore.ts`                  | `selectProjectTasks`, `selectTasksByStatus`                                                           |
| **Detecção de bloqueio**       | `src/lib/agentCompletionMonitor.ts`            | `onBlocked` callback + regex de prompts de permissão                                                  |
| **TaskPanel (direito)**        | `src/components/TaskPanel/index.tsx`           | Painel direito com 5 abas + slide animation                                                           |
| **TaskCard**                   | `src/components/TaskPanel/TaskCard.tsx`        | Card com badge, Aceitar/Rejeitar, histórico                                                           |
| **RejectDialog**               | `src/components/TaskPanel/RejectDialog.tsx`    | Modal de rejeição com feedback                                                                        |
| **TaskBranchModal**            | `src/components/TaskPanel/TaskBranchModal.tsx` | 3 modos: seguro, reparo, forçado                                                                      |
| **Toggle visibilidade**        | `uiStore.taskPanelVisible`                     | Botão `>` fecha, `<` abre com animação                                                                |
| **i18n en/pt-BR**              | `src/lib/i18n/messages/`                       | ~35 chaves de tradução                                                                                |
| **Layout flex**                | `App.tsx`                                      | Container com `overflow: hidden`, `flex-shrink: 0`                                                    |

### ❌ Pendente / Melhorias

| Item                                      | Prioridade | Descrição                                                |
| ----------------------------------------- | ---------- | -------------------------------------------------------- |
| **Git diff real ao aceitar**              | Média      | Chamar `git_diff` backend para popular `TaskGitSnapshot` |
| **Agent de reparo automático**            | Baixa      | Disparar agente quando checkout quebrar o build          |
| **Notificação OS quando task em pending** | Baixa      | Usar `notifyAgentDone` existente                         |
| **Drag & drop entre colunas**             | Baixa      | Usar `@dnd-kit/core` já presente                         |

---

## 2. Workflow Dashboard (Kanban no Sidebar)

### ✅ Concluído

| Funcionalidade          | Arquivos                                              | Descrição                                   |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------- |
| **Kanban de 3 colunas** | `src/components/ProjectSidebar/WorkflowDashboard.tsx` | Implementando, Revisão, Aguardando          |
| **Seção de bloqueadas** | Idem                                                  | Cards com Aprovar/Rejeitar                  |
| **Histórico em chips**  | Idem                                                  | Últimas 5 concluídas                        |
| **Seletor de projeto**  | Idem                                                  | Dropdown "Todos os projetos"                |
| **Workflows mantidos**  | Idem                                                  | Seções ativas + concluídas abaixo do kanban |

### ❌ Pendente

| Item                               | Prioridade | Descrição                                                |
| ---------------------------------- | ---------- | -------------------------------------------------------- |
| **Detecção de git health check**   | Média      | Verificar se git está instalado e repo existe            |
| **Auto-recomendação GIT vs LOCAL** | Média      | No WorkflowModal, sugerir modo baseado no status do repo |
| **Status de conexão visual**       | Baixa      | Indicador ✅/⚠️/❌ no modal                              |

---

## 3. Telemetria e Custos

### ✅ Já Existe

| Componente                | Arquivo                       | Status                                             |
| ------------------------- | ----------------------------- | -------------------------------------------------- |
| **Proxy HTTP reverso**    | `telemetry_proxy.rs`          | Porta 4096, intercepta OpenAI/Anthropic/OpenRouter |
| **Ledger SQLite**         | `telemetry_db.rs`             | `unified_ai_usage_ledger` com índices              |
| **Parsing JSONL Claude**  | `agent_cost.rs`               | Lê `~/.claude/projects/`                           |
| **Parsing JSONL Codex**   | `agent_cost.rs`               | Lê `~/.codex/sessions/`                            |
| **Query OpenCode SQLite** | `agent_cost.rs`               | Lê `opencode.db`                                   |
| **Tabela de preços**      | `agent_cost.rs`               | 7 modelos (deepseek, qwen, glm, kimi, etc.)        |
| **Dashboard**             | `TelemetryDashboardModal.tsx` | Métricas por fonte, modelo, histórico 30 dias      |
| **TokenHud ao vivo**      | `TokenHud/index.tsx`          | Polling 10s, custo por agente                      |
| **agentCostStore**        | `stores/agentCostStore.ts`    | Custo por PTY vivo                                 |
| **Claude Usage API**      | `claude_usage.rs`             | OAuth + API Anthropic                              |
| **Codex Usage RPC**       | `codex_usage.rs`              | JSON-RPC via `codex app-server`                    |

### ❌ Bugs / Gaps

| Bug                                       | Gravidade | Descrição                                                       |
| ----------------------------------------- | --------- | --------------------------------------------------------------- |
| **Leak agentCostStore**                   | 🔴 ALTA   | `void liveIds` (linha 97) é no-op — PTYs mortos nunca removidos |
| **Custo 0.0 no ledger do proxy**          | 🔴 ALTA   | `upsert_ledger_entry` sempre passa `cost_usd = 0.0`             |
| **Sem preços GPT/Codex**                  | 🔴 ALTA   | `pricing_for("codex")` retorna None — custo fica null           |
| **Sem fallback p/ modelos desconhecidos** | 🟡 MÉDIA  | Custo fica null silenciosamente                                 |
| **opencode_db_path pode estar errado**    | 🟡 MÉDIA  | Usa `data_dir()` vs `data_local_dir()` no Windows               |
| **Sem auto-refresh no dashboard**         | 🟡 MÉDIA  | Só carrega ao abrir o modal                                     |
| **Proxy sem fallback de porta**           | 🟡 MÉDIA  | Porta 4096 fixa — conflito se ocupada                           |
| **Threading excessivo**                   | 🟡 MÉDIA  | Cada request cria threads sem pool                              |

---

## 4. Performance

### ✅ Já Otimizado

| Otimização                               | Local                         |
| ---------------------------------------- | ----------------------------- |
| **MiMalloc** allocator                   | `lib.rs` global_allocator     |
| **WebGL renderer** + Canvas fallback     | `XTermView/index.tsx`         |
| **requestAnimationFrame** write batching | `XTermView/index.tsx:613-629` |
| **RAF resize debounce**                  | `XTermView/index.tsx:829-840` |
| **Scrollback 4MB cap + bulk drain**      | `pty.rs`                      |
| **Delta disk flushing** (2s)             | `pty.rs`                      |
| **Paste chunking** (1KB)                 | `XTermView/index.tsx`         |
| **React.memo + Zustand selectors**       | `TerminalPane/index.tsx`      |
| **manualChunks** (xterm, react)          | `vite.config.ts`              |
| **Terser minification**                  | `vite.config.ts`              |
| **backgroundThrottling: disabled**       | `tauri.conf.json`             |
| **Thread-per-PTY** com 32KB buffer       | `pty.rs`                      |

### ❌ Gaps de Performance

| Gap                                                      | Complexidade | Impacto               |
| -------------------------------------------------------- | ------------ | --------------------- |
| **`opt-level = "s"`** prioriza tamanho sobre velocidade  | Baixa        | 🟡 Médio              |
| **Sem canal de batching Rust-side** para IPC events      | Média        | 🟡 Médio              |
| **`useEffect` em vez de `useLayoutEffect`** no XTermView | Baixa        | 🟢 Baixo              |
| **Thread-per-PTY não escala** para 50+ terminais         | Alta         | 🔴 Alto               |
| **Sem backpressure do frontend**                         | Média        | 🟡 Médio              |
| **Sem compositor layer** no CSS do terminal              | Baixa        | 🟢 Baixo              |
| **WorkspaceView sempre carregado** (display:none)        | Média        | 🟡 Médio              |
| **16+ modais importados eager**                          | Baixa        | 🟢 Baixo              |
| **`lucide-react` no bundle principal**                   | Baixa        | 🟢 Baixo              |
| **Sem sccache configurado**                              | Baixa        | 🟢 Baixo (build time) |
| **Sem bundle analyzer**                                  | Baixa        | 🟢 Baixo              |

---

## 5. Governança e Orquestração de Agentes

### ✅ Já Existe

| Item                              | Onde                                                        |
| --------------------------------- | ----------------------------------------------------------- |
| **PreToolUse hooks** (file-guard) | `.claude/hooks/file-guard.cjs`                              |
| **Stop hooks** (verify-build)     | `.claude/hooks/verify-build.cjs`                            |
| **`defaultMode: "plan"`**         | `.claude/settings.json`                                     |
| **Hook lifecycle**                | `agent_events.rs` + `agentCanvasStore.ts`                   |
| **Git control completo**          | `git_control.rs` (655 linhas)                               |
| **Branch-per-task**               | `workflow_git.rs`                                           |
| **Domain rules (path-scoped)**    | `src/.claude.rules.md` + `src-tauri/.claude.rules.md`       |
| **Economy agents**                | `economy_agents.rs` (haiku subagents)                       |
| **Protected paths**               | file-guard bloqueia `.env`, CLAUDE.md, AGENTS.md, workflows |

### ❌ Gaps de Governança

| Gap                                           | Fase      | Complexidade |
| --------------------------------------------- | --------- | ------------ |
| **Sem `.cargo/config.toml`** (sccache)        | 🔴 Fase 1 | 🟢 Baixa     |
| **Sem sanitização CLAUDE.md** (Context Bloat) | 🔴 Fase 1 | 🟢 Baixa     |
| **Sem CI/CD** (`.github/` não existe)         | 🟡 Fase 2 | 🟡 Média     |
| **Sem CODEOWNERS**                            | 🟡 Fase 2 | 🟢 Baixa     |
| **Sem Husky**                                 | 🟡 Fase 2 | 🟢 Baixa     |
| **Sem git worktree**                          | 🟡 Fase 2 | 🟡 Média     |
| **Sem merge queue**                           | 🟢 Fase 3 | 🔴 Alta      |
| **PostToolUse não implementado**              | 🟢 Fase 3 | 🟢 Baixa     |
| **npm em vez de pnpm** (cache worktree)       | 🟢 Fase 3 | 🟡 Média     |

---

## 6. Correções de Layout/UI

### ✅ Concluído

| Correção                    | Descrição                                    |
| --------------------------- | -------------------------------------------- |
| **Bug @xterm/addon-canvas** | Pacote instalado — resolve erro de import    |
| **Overflow workspace**      | `overflow: hidden` no container flex         |
| **TaskPanel flex-shrink**   | `flex-shrink: 0` para não comprimir          |
| **Slide animation**         | `max-width` transition + `> / <` buttons     |
| **TaskPanel sem projeto**   | Mostra "Selecione um projeto" em vez de null |
| **Aba Workflows com tasks** | Kanban integrado + seletor de projeto        |
| **Toggle no TitleBar**      | `PanelRightClose`/`PanelRightOpen` icons     |

---

## 7. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐  │
│  │TitleBar   │  │  Sidebar  │  Workspace  │  TaskPanel (flex)  │  │
│  │(toggle)   │  │  (240px)  │  (flex:1)   │  (shrink:0)       │  │
│  └──────────┘  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Modals (20+) — lazy + eager imports                        ││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌──────────────┐ ┌──────────┐ ┌────────────┐                   │
│  │FocusOverlay  │ │MainMenu  │ │TokenHud    │                   │
│  └──────────────┘ └──────────┘ └────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```
