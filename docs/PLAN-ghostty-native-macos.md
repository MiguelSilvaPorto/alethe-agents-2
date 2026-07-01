# Plano — Backend de terminal nativo (libghostty) no macOS

> Status: **spike implementado e validado rodando**. Branch: `feature/multi-shell`.
> Escopo: **macOS apenas**. Windows/Linux permanecem em xterm.js, intocados.

## STATUS DE IMPLEMENTAÇÃO (atualizado)

Decisão de arquitetura revista durante a execução: **consumimos o
`GhosttyKit.xcframework` pré-buildado** (de `libghostty-spm`, URL+checksum
pinados) em vez de compilar o Ghostty do fonte. Motivo: compilar do fonte exige
Zig 0.15.2 exato + Metal Toolchain (componente opcional ausente no Xcode 26) +
SDK ≤ 15 — uma cadeia de bloqueios frágil no macOS 26/Tahoe (diagnosticada por
completo; ver §10). O pré-buildado elimina tudo isso e é o padrão usado por
Kytos/Termini.

Entregue e **compila + linka + roda** (`tauri dev` sobe a janela sem crash):
- `src-tauri/vendor/fetch-ghostty.sh` — baixa/valida/extrai o xcframework (gitignorado).
- `src-tauri/build.rs` — linka `libghostty.a` + frameworks (Carbon/Metal/MetalKit/…), macOS-only, emite `cfg(ghostty_linked)`.
- `src-tauri/src/ghostty_bridge.rs` — comandos Tauri `ghostty_spawn/sync_frame/set_hidden/kill`; cria NSView (STUB colorido) reparentada sobre a WebView via `objc2-app-kit`; stubs em Windows/Linux.
- `src-tauri/src/ghostty_ffi.rs` — bindings FFI do libghostty (atrás de `cfg(ghostty_linked)`), prontos para o encaixe da surface real.
- Frontend: `GhosttySurface` (placeholder + sync rAF + IntersectionObserver), `lib/platform.ts`, seleção de backend no `TerminalPane`, flag `nativeTerminalMacos` em Preferences (toggle só no macOS).

**Falta (próxima fase, grande):** trocar o stub pela surface real — implementar
os 6 callbacks de `ghostty_runtime_config_s`, o tick loop (`ghostty_app_tick`),
`ghostty_surface_new` com `platform.macos.nsview`, passar command/cwd/env, e
ligar input/foco/render. Mais a paridade de features (§5).

## 1. Objetivo

Substituir, **no macOS**, o terminal "simulado" (xterm.js + PTY próprio em Rust) por um
emulador de terminal real e nativo embutido na janela do Alethe, usando **`libghostty`**
— a engine do Ghostty, projetada para ser embutível. O usuário passa a ter, dentro de cada
pane do Alethe, uma surface de terminal renderizada por GPU (Metal), idêntica à do app
Ghostty, em vez do render via WebGL do xterm.js.

Windows e Linux continuam exatamente como estão hoje. O app passa a ter **dois backends de
terminal sob uma mesma abstração de UI**.

## 2. O que foi confirmado sobre viabilidade (junho/2026)

Pesquisa feita antes de planejar — fatos materiais:

- **A API de surface embedding existe e funciona.** Uma surface do Ghostty é instanciada via
  `ghostty_surface_new` com `ghostty_surface_config_s { platform_tag = GHOSTTY_PLATFORM_MACOS,
  platform.macos.nsview = <ponteiro pra NSView> }`. **As surfaces do Ghostty são subclasses de
  `NSView` que possuem um `CAMetalLayer`** — exatamente o componente embutível desejado.
- **Há precedente real e recente.** Projetos como **Kytos**, **Termini**, **GhosttyKit** e
  **libghostty-spm** já embutem a surface GPU numa `NSView` no macOS. Crucialmente, **Kytos
  consome `libghostty` como dependência sem forkar** o Ghostty.
- **Build:** `zig build -Dapp-runtime=none -Demit-xcframework` produz `GhosttyKit.xcframework`,
  contendo `libghostty.a` (estático, compilado de Zig), o header C, e a árvore de recursos
  (terminfo `xterm-ghostty` + scripts de shell-integration). Linker precisa de
  `-framework Carbon -framework Metal -framework MetalKit`. O Ghostty localiza `resources_dir`
  sozinho subindo a partir do executável até achar o sentinela `terminfo/78/xterm-ghostty`.

### Ressalva honesta (risco principal)

A API de embedding **não é documentada nem garantida estável** pelo upstream. Os autores
tratam isso como "research" — não há contrato público. Forkar/fixar significa acompanhar o
upstream manualmente quando a API mudar.

## 3. Decisão de arquitetura: consumir vs. forkar

A pesquisa achou um ponto que **revisa a premissa inicial de "fazer um fork"**:

- O caso de uso (embutir surface GPU numa `NSView`) é atendido **consumindo `libghostty`** via
  `GhosttyKit.xcframework`, sem precisar manter um fork — é o que Kytos faz.
- **Recomendação:** começar **consumindo** `libghostty` (xcframework fixado num commit/tag
  conhecido do Ghostty). Manter um fork só se/quando precisarmos de um patch que o upstream não
  aceite. Fork desde o dia 1 adiciona custo de manutenção perpétuo sem benefício imediato.

> Decisão a confirmar com o dono do projeto antes da Fase 0 (ver §8).

## 4. O obstáculo central — e por que ele define o plano

O Tauri renderiza **toda** a UI do Alethe numa WebView (WKWebView): a sidebar, a topbar, os
panes, os layouts. Hoje cada terminal é uma `<div>` dentro dessa árvore HTML, posicionada por
`react-resizable-panels` / CSS Grid (ver `src/components/WorkspaceView/PaneArea.tsx`).

Uma surface do Ghostty é uma **`NSView` nativa, fora da WebView**. Não dá para colocá-la
"dentro" de uma `<div>`. A consequência é a parte mais difícil da feature:

> **Precisamos sincronizar a posição/tamanho/z-order/foco de N `NSView`s nativas com os
> retângulos que a WebView desenha e redimensiona dinamicamente** (resize de janela, arrastar
> separadores, trocar de layout auto/grid/spotlight/sidebar, fullscreen, collapse, suspender
> grupo, trocar de aba/projeto).

Esse é o coração do esforço. "Rodar o Ghostty" é a parte fácil; **mantê-lo alinhado à UI web é
a parte cara.**

### Modelo adotado: overlay de NSViews espelhando "placeholders" do DOM

1. No DOM (React), cada pane de terminal renderiza um **placeholder** — uma `<div>` vazia com
   um `data-surface-id` único, ocupando o espaço normalmente no layout (todos os layouts de
   `PaneArea.tsx` continuam funcionando sem mudança estrutural).
2. No lado nativo (macOS), as `NSView`s do Ghostty são adicionadas como **irmãs da WebView,
   por cima dela**, dentro da mesma `NSWindow` (a WebView fica transparente/recortada na região
   de cada placeholder).
3. Um **sincronizador** lê o `getBoundingClientRect()` de cada placeholder e reposiciona/
   redimensiona a `NSView` correspondente, convertendo coordenadas web → coordenadas AppKit
   (origem invertida, fatores de `uiZoom` da WebView e `backingScaleFactor` do display).
4. Gatilhos do reposicionamento: `ResizeObserver` em cada placeholder, evento de resize da
   janela, e mutações de layout do store. Reposicionamento roda em `requestAnimationFrame`
   coalescido para evitar "descolamento" visível durante drags.

> Alternativa avaliada e descartada por ora: child `NSWindow` separada por surface. Mais simples
> de posicionar mas pior em foco/z-order/clipping quando há sobreposição com modais e a sidebar.
> O modelo de NSViews irmãs dá clipping e ordering corretos com o resto da UI web.

## 5. Abstração de backend de terminal (a peça que mantém tudo coeso)

Hoje `TerminalPane` → `XTermView` assume xterm.js + comandos `spawn/attach/write/resize/kill`
(`src/lib/tauri.ts`, `src-tauri/src/pty.rs`). Introduzimos uma interface comum:

```
interface TerminalBackend {
  spawn(opts): SurfaceHandle      // shell/agent, cwd, env, extraArgs
  resize(handle, cols, rows | px) // px no caso nativo
  write(handle, data)             // colagem/atalhos sintéticos
  focus(handle) / blur(handle)
  kill(handle)
  onExit(cb) / onTitle(cb) / onBell(cb)
}
```

- `XtermBackend` — implementação atual (xterm.js + invoke dos comandos PTY). **Inalterada.**
- `GhosttyBackend` — macOS: aciona comandos Tauri novos que falam com a camada AppKit/libghostty.

`TerminalPane` escolhe o backend por plataforma: `platform() === 'macos' && featureFlag`
→ `GhosttyBackend`; senão `XtermBackend`. Isso mantém Windows/Linux 100% no caminho atual e
isola o risco atrás de uma flag.

### Impacto no modelo de dados

- `AgentType`/`SubTab` permanecem os mesmos. O Ghostty roda o **mesmo launcher** resolvido hoje
  (claude/codex/opencode/shell) — `libghostty` faz o spawn do processo dentro da própria surface
  via sua config de `command`, então parte da lógica de `cli_resolver.rs` é reaproveitada para
  descobrir o caminho do binário, mas o spawn em si migra para a surface.
- **Scrollback**: o Ghostty gerencia seu próprio scrollback (não usamos mais o arquivo de
  scrollback de `pty.rs` para panes nativos). Avaliar se a persistência/`attach` ainda é
  necessária no caminho nativo — provavelmente substituída por "session restore" do próprio
  Ghostty ou aceitar perda de scrollback ao fechar (decisão de produto, §8).
- **Status runtime** (`terminalsStore`, `AgentCompletionMonitor`): hoje a heurística de
  "working/waiting/done" lê o **stream de bytes** do PTY no XTermView. Com Ghostty, o stream não
  passa mais pela WebView. Precisamos de outra fonte: callbacks do libghostty (bell, title
  change, OSC) e/ou os hooks de agente já existentes (`agent_events.rs`). **Risco/escopo
  relevante** — a detecção de conclusão de agente é uma feature central do Alethe.

## 6. Fases de implementação

### Fase 0 — Spike de viabilidade isolado (gate)
Antes de tocar no Alethe: app Tauri mínimo (ou branch throwaway) que embute **uma** surface
Ghostty numa NSView por cima da WebView, com um shell real rodando, posicionada sobre um
placeholder, acompanhando resize da janela. **Critério de aprovação:** render Metal correto,
input funcionando, resize acompanha, sem flicker grosseiro. Se reprovar, reavaliar o approach
(child window) ou pausar a feature. *Recomendado mesmo tendo escolhido "feature completa" — é o
de-risk mais barato possível.*

### Fase 1 — Build & toolchain
- Integrar `GhosttyKit.xcframework` ao build do `src-tauri` (linkar libghostty.a, frameworks
  Carbon/Metal/MetalKit, empacotar os recursos terminfo/shell-integration no bundle `.app`).
- Pin de versão do Ghostty. CI macOS instala Zig e gera o xcframework (ou consome prebuilt).
- Garantir que o build cross-platform **não quebra**: todo o código novo atrás de `cfg(macos)`.

### Fase 2 — Bridge nativo (Rust ↔ AppKit ↔ libghostty)
- Comandos Tauri novos (macOS-only): `ghostty_spawn`, `ghostty_resize_px`, `ghostty_write`,
  `ghostty_focus`, `ghostty_kill`, + eventos de exit/title/bell.
- Camada Objective-C/Swift que cria as `NSView`s, as adiciona à hierarquia da janela do Tauri,
  e mantém um registro `surfaceId → NSView/ghostty_surface_t`.
- Acesso à `NSWindow`/content view do Tauri (via `tauri::Window` + APIs de plataforma).

### Fase 3 — Sincronizador DOM ↔ NSView
- Placeholder `<div data-surface-id>` no `TerminalPane` (caminho nativo).
- `ResizeObserver` + listener de resize da janela + subscrição ao store → coalescer em rAF →
  `ghostty_resize_px` com o rect convertido (zoom + backingScale).
- Tratar: troca de layout, fullscreen, collapse, suspender grupo, fechar/abrir pane, scroll.
- Tratar z-order vs. modais/Radix Dialog (esconder/abaixar surfaces quando um modal abre por
  cima — `NSView` nativa sempre fica acima de HTML; precisamos ocultá-las explicitamente).

### Fase 4 — Abstração `TerminalBackend` + integração no TerminalPane
- Extrair a interface, implementar `GhosttyBackend`, manter `XtermBackend`.
- Seleção por plataforma + feature flag em `preferences`.
- Reusar `cli_resolver` para resolver o launcher do agente; spawn vai pra surface.

### Fase 5 — Paridade de features no caminho nativo
- Status de agente / completion (nova fonte de sinal — ver §5).
- Temas (mapear os temas do Alethe para config do Ghostty).
- Copy/paste, links clicáveis, busca, fontes/ligaduras, atalhos (`useKeybindings`).
- cwd tracking (`get_pty_cwd` equivalente via libghostty), restart, "command not found".

### Fase 6 — Polimento, perf e cleanup
- Performance do sincronizador sob muitos panes + drag de separador.
- Ciclo de vida: vazamento de surfaces, kill ao fechar projeto/grupo, suspender grupo.
- Multi-display / mudança de `backingScaleFactor` ao mover janela entre monitores.
- QA manual no macOS (Apple Silicon + Intel, se suportado).

## 7. Riscos (ordenados por severidade)

1. **Sincronização DOM↔NSView frágil** (alto) — descolamento visível em drag/resize, z-order
   com modais. Mitigação: Fase 0 prova o conceito; rAF coalescido; esconder surfaces sob modais.
2. **API de embedding instável no upstream** (alto) — pode quebrar em updates do Ghostty.
   Mitigação: pin de versão; testes de fumaça; fork só se necessário.
3. **Detecção de conclusão de agente** (médio-alto) — feature central que hoje depende do stream
   de bytes na WebView, indisponível no caminho nativo. Mitigação: usar callbacks libghostty +
   `agent_events.rs`; pode exigir redesenho dessa heurística.
4. **Complexidade de build/CI** (médio) — Zig + xcframework + recursos no bundle + assinatura/
   notarização (já no roadmap). Mitigação: prebuilt xcframework pinado.
5. **Scrollback/persistência divergente entre backends** (médio) — comportamento diferente
   macOS vs. resto. Mitigação: decisão de produto explícita (§8).
6. **Tamanho do bundle e cold start** (baixo-médio) — libghostty + Metal. Mitigação: medir.

## 8. Decisões em aberto (precisam do dono do projeto)

- [ ] Confirmar **consumir** libghostty (recomendado) vs. **forkar** desde já.
- [ ] Aceitar **divergência de comportamento** macOS (Ghostty) vs. Windows/Linux (xterm.js),
      incluindo scrollback/persistência e detecção de status de agente?
- [ ] Aprovar a **Fase 0 (spike)** como gate antes do investimento na feature completa.
- [ ] Feature **opt-in via flag** ou substituir o xterm.js no macOS de imediato?

## 9. Estimativa de esforço (grosseira)

- Fase 0 (spike): pequena, mas decisiva. **Faça primeiro.**
- Fases 1–4 (build + bridge + sync + abstração): **a maior parte do trabalho.** É um projeto
  de integração nativa não-trivial, não uma feature de UI.
- Fases 5–6 (paridade + polimento): comparável às fases 1–4 somadas, porque paridade de
  features (status de agente, temas, links, busca) toca em vários subsistemas.

> Conclusão honesta: **é viável e tem precedente, mas é um esforço grande de engenharia nativa
> macOS.** O maior valor de risco está na sincronização NSView↔DOM e na detecção de status de
> agente — não em "conseguir rodar o Ghostty". Por isso a Fase 0 é inegociável.
