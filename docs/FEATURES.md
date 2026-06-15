# Alethe — Features e diferenciais

Este documento resume o que o projeto entrega hoje a partir da analise do codigo, da estrutura Tauri/React e do glossario do dominio.

## Visao geral

O Alethe e um desktop app para organizar e operar multiplos terminais e agentes de desenvolvimento em uma workspace em grid de containers redimensionaveis. Ele combina projetos, grupos, containers, splits, tabs internas e PTYs persistentes para permitir que o usuario trabalhe com Shell, Claude Code, Codex e OpenCode em paralelo, mantendo contexto, layout e scrollback entre sessoes.

## Publico e caso de uso

- Desenvolvedores que trabalham em varios repositorios ao mesmo tempo.
- Usuarios de agentes de codigo que precisam alternar entre Claude, Codex, OpenCode e shell sem perder contexto.
- Workflows com multiplos terminais por projeto, separados por tarefa, agente, diretorio ou repositorio.
- Ambientes em que memoria e organizacao visual importam, com necessidade de suspender grupos/projetos e restaurar depois.

## Arquitetura do produto

- Aplicacao desktop com Tauri 2, backend Rust e frontend React + TypeScript.
- Renderizacao de terminais com `xterm.js`, `@xterm/addon-fit` e `@xterm/addon-search`.
- Gerenciamento de estado com Zustand.
- Layouts redimensionaveis com `react-resizable-panels`.
- Drag and drop com `@dnd-kit/core`.
- Grid customizado via helpers em `src/lib/gridLayout.ts`.
- Persistencia local em `projects.json`, com escrita atomica e debounce.
- PTYs reais via `portable-pty`, com eventos Tauri para dados e encerramento de processos.

## Modelo de organizacao

- **Grupo**: container logico de projetos, com nome, cor, icone opcional, colapso, suspensao e subgrupos.
- **Subgrupo**: grupo aninhado em outro grupo, com protecao contra ciclos.
- **Projeto**: unidade de trabalho com cor, terminais, layout e estado de container.
- **Terminal**: pane operavel que guarda cwd, tabs internas, estado disabled e ultimo uso.
- **Sub-tab**: tab interna dentro de um terminal, cada uma com tipo de agente, cwd e PTY proprio.
- **Container**: representacao de um projeto aberto na workspace, com panes visiveis, layout interno, colapso e fullscreen.

## Features principais

### Workspace multi-container

- Abre um ou varios projetos ao mesmo tempo na workspace.
- Cada projeto aberto vira um container com borda/acento visual.
- Containers podem ser fechados sem matar PTYs.
- Containers podem ser recolhidos para uma barra compacta.
- Container pode entrar em fullscreen e sair via controle visual.
- Workspace suporta modo flat, juntando panes de projetos diferentes em um grid unico.
- Drag and drop para reordenar containers.
- Reabertura de container restaura os panes do projeto.

### Layouts por projeto, grupo e workspace

- Layout automatico:
  - 1 pane em tela cheia.
  - 2 panes lado a lado.
  - 3 ou mais panes em grid de duas colunas.
- Layout spotlight:
  - pane principal maior a esquerda.
  - demais panes empilhados a direita.
- Layout sidebar:
  - lista fina a esquerda.
  - pane principal maior a direita.
- Layout grid custom:
  - editor visual para desenhar colunas, linhas e spans.
  - suporte a `colSpan` e `rowSpan`.
  - redimensionamento de proporcoes por coluna e linha.
  - swap visual por drag and drop.
- Layout custom pode existir em tres niveis:
  - projeto, para organizar terminais.
  - grupo, para organizar projetos abertos do grupo.
  - workspace, para organizar containers abertos de varios projetos.

### Terminais e PTYs

- Shell padrao via PowerShell/pwsh.
- Suporte a agentes:
  - Shell.
  - Claude Code.
  - Codex.
  - OpenCode.
- Cada terminal usa PTY real no backend Rust.
- Spawn, attach, write, resize, restart e kill de PTY via comandos Tauri.
- Scrollback persistido em disco por PTY, com limite de tamanho.
- Reattach reexibe scrollback existente.
- Resize automatico usando `ResizeObserver` e `xterm-fit`.
- Detecta encerramento de processo e exibe overlay com opcao de reiniciar.
- `Ctrl+C` copia selecao quando houver texto selecionado.
- Duplo `Ctrl+C` em curto intervalo forca kill do PTY.
- `Ctrl+V` cola texto normalizado no PTY.
- Historico local de prompts por terminal, navegavel por seta para cima/baixo.

### Tabs internas por terminal

- Um terminal pode ter varias sub-tabs.
- Cada sub-tab pode usar agente e cwd diferentes.
- Lane de tabs pode ser mostrada ou escondida.
- Lane aparece automaticamente quando existe mais de uma tab.
- Cada sub-tab guarda seu proprio `ptyId`.
- E possivel criar novas tabs com Shell, Claude, Codex ou OpenCode.

### Agentes e launchers

- Pre-checagem de CLI antes de spawnar agente.
- Resolucao de launchers no Windows procurando em:
  - PATH reconstruido do registro e ambiente atual.
  - npm global.
  - pnpm.
  - Volta.
  - fnm.
  - nvm-windows.
  - Bun.
  - Cargo.
  - Scoop.
  - Chocolatey.
  - Node.js em paths comuns.
- Permite configurar manualmente o path do launcher quando o agente nao e encontrado.
- Ambiente do PTY remove variaveis de editor/VS Code que poderiam interferir em agentes.
- Suporte a modo irrestrito por agente:
  - Claude: `--dangerously-skip-permissions`.
  - Codex: `--dangerously-bypass-approvals-and-sandbox`.
  - OpenCode: `--dangerously-skip-permissions`.

### Resume e historico de agentes

- Sessao ativa de Claude/Codex/OpenCode pode ser salva para retomar apos fechamento abrupto.
- Ao respawnar agente resumivel, injeta flags de continue/resume.
- Lista sessoes locais do Claude Code em `~/.claude/projects`.
- Parseia arquivos `.jsonl` do Claude para extrair:
  - id da sessao.
  - titulo.
  - primeiro prompt do usuario.
  - contagem de mensagens.
  - tamanho do arquivo.
  - data de modificacao.
- Modal de historico disponivel em panes de Claude, Codex e OpenCode.

### Sidebar de projetos

- Sidebar com Home, Projetos, grupos, subgrupos, projetos e terminais.
- Grupos com cor, icone opcional, colapso e estado suspenso.
- Projetos com cor, contagem de terminais e estado disabled.
- Terminais com icones de agentes e contador de tabs.
- Clique em grupo abre todos os projetos do grupo na workspace.
- Clique em projeto abre visao exclusiva com todos os panes do projeto.
- Clique em terminal foca o pane correspondente na workspace.
- Context menu para grupos, projetos e terminais.
- Drag and drop para:
  - reordenar grupos.
  - mover grupo para outro grupo.
  - mover projeto entre grupos ou para Solto.
  - reordenar projetos no mesmo grupo.
  - mover terminal entre projetos.

### Gestao de memoria

- Terminal pode ser desabilitado para liberar recursos.
- Projeto pode ser desabilitado inteiro.
- Grupo pode ser suspenso, desabilitando terminais dos projetos do grupo e fechando containers.
- Grupo suspenso pode ser reativado.
- Indicador de RAM no title bar com polling periodico.
- Backend calcula memoria do app, WebView e processos filhos/PTYs.

### Home e continuidade

- Home com saudacao personalizada e data.
- Lista de terminais recentes, ordenada por ultimo uso.
- Acoes rapidas para criar terminal, projeto e grupo.
- Atalhos visuais para busca, comando e ajuda.
- Preferencia para sempre iniciar na Home.

### Busca e navegacao

- Modal de busca/jump por terminal.
- Filtra por nome do projeto, nome do terminal e cwd.
- Navegacao por teclado com setas e Enter.
- Ao selecionar, ativa o projeto e abre o pane correspondente.
- Atalhos globais:
  - `Ctrl+T`: cria shell rapido no projeto ativo.
  - `Ctrl+Shift+T`: abre modal de novo terminal.
  - `Ctrl+W`: oculta o primeiro pane do container ativo.
  - `Ctrl+P`: busca/jump.
  - `Ctrl+Shift+P`: novo projeto.
  - `Ctrl+Shift+G`: novo grupo.
  - `Ctrl+Shift+H`: alterna Home/workspace.
  - `Ctrl+1..9`: pula para projeto por ordem.
  - `Ctrl+Tab`: cicla panes no container ativo.
  - `Esc`: fecha modal aberto.

### Integracao com sistema operacional

- Title bar custom com minimizar, maximizar e fechar.
- Abre cwd do terminal no File Explorer.
- Abre cwd do terminal no VS Code, com resolucao de `code.cmd`, `code.exe` e variantes Insiders.
- Se cwd nao estiver configurado, tenta obter cwd vivo do processo PTY.
- Abre pasta de dados local do app.
- Abre `spawn.log` no Notepad.
- Reset de dados do app.

### Backup e portabilidade

- Exporta backup em `.zip` contendo:
  - `projects.json`.
  - arquivos de scrollback.
- Importa backup substituindo estado local.
- Importacao limpa scrollback antigo antes de restaurar.
- Protecao contra zip-slip ao importar.
- Persistencia de projetos usa escrita atomica para reduzir risco de corrupcao.

### Spotify / Now Playing

- Integracao com Spotify via OAuth Authorization Code.
- Callback local em `127.0.0.1:8888/callback`.
- Tokens persistidos localmente.
- Refresh automatico de access token.
- Consulta musica atual via Spotify Web API.
- Now Playing aparece na Home e na sidebar.
- Exibe dados como faixa, artista, album, capa, duracao, progresso e link.

### Preferencias

- Tema da UI: escuro ou claro.
- Tema do terminal:
  - seguir UI.
  - escuro.
  - claro.
- Habilitacao/desabilitacao de agentes disponiveis.
- Nome de exibicao.
- Estado de onboarding.
- Modo flat da workspace.
- Layout custom da workspace.
- Paths customizados de CLIs.

### Onboarding e boas-vindas

- Modal de onboarding.
- Modal de boas-vindas.
- Registro de primeira abertura (`firstLaunchAt`).
- Preferencia para refazer onboarding pelo menu.

## Diferenciais do projeto

### 1. Workspace orientada a agentes, nao apenas a terminais

O Alethe trata Claude, Codex, OpenCode e Shell como tipos de agentes dentro de uma estrutura comum. Isso permite misturar agentes no mesmo projeto, no mesmo terminal via sub-tabs ou em varios panes simultaneos.

### 2. Separacao clara entre vida visual e vida do processo

Fechar container ou ocultar pane nao implica matar PTY. O processo pode continuar vivo, e a workspace pode ser reorganizada sem perder contexto.

### 3. Organizacao hierarquica para trabalhos reais

Grupos, subgrupos, projetos, terminais e sub-tabs permitem modelar workspaces grandes, como suites de repositorios, clientes, squads, produtos ou contextos de trabalho.

### 4. Layout custom em multiplos niveis

O mesmo conceito de grid custom funciona para panes de um projeto, projetos dentro de um grupo e containers da workspace inteira. Isso diferencia o app de um terminal tradicional com splits fixos.

### 5. Controle explicito de memoria

Suspender grupos, desabilitar projetos/terminais e medir RAM torna o app adequado para muitas sessoes de agentes, que podem consumir bastante memoria.

### 6. Persistencia robusta de contexto

Projetos, layouts, containers, preferencias, paths de CLI e scrollback sao persistidos localmente. A escrita atomica e o backup zip reduzem risco operacional.

### 7. Experiencia desktop integrada ao Windows

O app resolve launchers em paths comuns do ecossistema Windows/Node, abre Explorer/VS Code, usa title bar custom e integra com processos reais via ConPTY.

### 8. Recuperacao e continuidade

Home com recentes, scrollback persistido, resume de sessoes de agentes e historico do Claude ajudam a voltar rapidamente ao ponto anterior.

### 9. UX pensada para operacao diaria

Atalhos globais, busca por terminal, drag and drop, context menus, botoes compactos e status visual dos panes reduzem atrito em rotinas com muitos terminais.

### 10. Extensibilidade natural

O modelo `AgentType`, a camada de resolver de CLI e os comandos Tauri tornam simples adicionar novos agentes ou novos launchers no futuro.

## Features tecnicas relevantes

- Frontend modular por componentes: `HomeView`, `ProjectSidebar`, `WorkspaceView`, `TerminalPane`, `XTermView`, modais e menus.
- Estado persistente separado de estado runtime.
- Migração de schema v1 para v2 no frontend.
- `projects.json` versionado.
- Backfill de campos novos como `parentGroupId`.
- Scrollback com limite de 256 KB por PTY.
- Flush de scrollback com intervalo para reduzir IO.
- Eventos por PTY com nomes isolados (`pty://data/{id}` e `pty://exit/{id}`).
- Locking cuidadoso no backend para evitar bloquear operacoes globais durante escrita em PTY.
- Logs de spawn com tempos de resolucao e criacao.
- Sanitizacao de paths de backup importado.

## Estado atual inferido

- O projeto esta em versao `0.1.0`.
- A aplicacao e privada no `package.json`.
- O foco atual e Windows, embora Tauri permita evolucao multiplataforma.
- Ha funcionalidades recentes em andamento relacionadas a historico de sessoes Claude e resume de agentes.
- O repositorio contem alteracoes locais nao commitadas no momento desta analise.

## O que o Alethe entrega em uma frase

O Alethe e uma central desktop para operar varios agentes de codigo e shells em paralelo, com organizacao por projetos/grupos, layouts visuais persistentes, PTYs reais, controle de memoria, continuidade de sessao e integracoes nativas do ambiente de desenvolvimento.
