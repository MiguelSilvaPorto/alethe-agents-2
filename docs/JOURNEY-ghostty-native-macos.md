# Jornada — Terminal nativo Ghostty no macOS (Alethe)

> Documento-história: o que construímos, por que, os bugs que enfrentamos e suas
> causas raiz. Branch: `feature/multi-shell`. Plataforma: **macOS apenas** —
> Windows/Linux seguem no xterm.js, intocados.
>
> Documentos irmãos: `PLAN-ghostty-native-macos.md` (plano/arquitetura) e
> `TESTING-ghostty.md` (como testar). Este aqui é a narrativa do percurso.

---

## 1. O objetivo

Substituir, **no macOS**, o terminal "simulado" (xterm.js renderizando dentro da
WebView + um PTY próprio em Rust) por um **emulador de terminal real embutido** —
a engine do **Ghostty** (`libghostty`), com render GPU (Metal), dentro da janela
do Alethe. O usuário pediu: *"ter a opção de usar o Ghostty/iTerm2 dentro do
projeto, em vez de simular um terminal novo."*

O que NÃO era possível (e foi descartado cedo, com explicação honesta):
- Embutir o Terminal.app/iTerm2 existentes: PTYs pertencem a quem os cria; não há
  API de SO para "anexar-se" ao terminal de outro processo (só tmux/screen fazem
  isso, via daemon próprio).
- Forkar e embutir o iTerm2: monolítico AppKit, sem view de terminal isolável.
- **Ghostty foi a escolha certa**: a engine (`libghostty`) é projetada para ser
  embutível — surfaces são `NSView`s com `CAMetalLayer`.

---

## 2. Decisões de arquitetura

### 2.1 Consumir o `libghostty` pré-buildado (não compilar do fonte)

Tentamos compilar o Ghostty do source (`ghostty-org/ghostty` v1.3.1, Zig 0.15.2).
Bateu numa **cadeia de bloqueios** do macOS 26 / Xcode 26:
- Zig 0.15.2 não linka o build runner com o SDK 26.5 (símbolos de availability).
  Contornado movendo para o SDK 15.4 das Command Line Tools.
- O `-Demit-xcframework` crashava no slice iOS (sem iOS SDK). Contornado com um
  patch em `GhosttyXCFramework.zig`.
- A engine compilou, mas o **Metal Toolchain** (compilador de shaders) está
  ausente no Xcode 26 (virou componente opcional de ~GBs).

**Decisão:** usar o **`GhosttyKit.xcframework` pré-buildado** do projeto
`Lakr233/libghostty-spm` (que empacota o `libghostty` oficial do Ghostty, MIT).
Pinado por URL + checksum em `src-tauri/vendor/fetch-ghostty.sh` (gitignorado;
reconstruído por script — mesma garantia do SPM). É o padrão usado por
Kytos/Termini, e elimina toda a cadeia de toolchain frágil.

### 2.2 Shim em C — a peça que torna o FFI seguro

A API do `libghostty` tem structs grandes passadas **por valor** (`ghostty_action_s`
etc.). Reproduzir essa ABI à mão em Rust é frágil. Escrevemos um **shim
Objective-C** (`src-tauri/ghostty_shim/ghostty_shim.m`) que inclui o `ghostty.h`
real (ABI resolvida pelo compilador C) e expõe uma API mínima e estável
(`alethe_ghostty_*`) para o Rust. O Rust só vê ponteiros opacos e primitivos.

### 2.3 Dois backends de terminal sob uma abstração

- `XtermBackend` (atual) — Windows/Linux/macOS sem a flag. **Intocado.**
- `GhosttyBackend` (novo) — macOS + flag `nativeTerminalMacos` (opt-in).
- A seleção é por plataforma + flag em `shouldUseNativeBackend()` (testada: garante
  que Windows/Linux **nunca** caem no nativo).

### 2.4 O obstáculo central: NSView nativa sobre a WebView

Toda a UI do Alethe é uma WKWebView (Tauri). A surface do Ghostty é uma `NSView`
nativa **fora** da WebView. A parte mais difícil é **sincronizar a posição/tamanho
de N NSViews com os retângulos que a WebView desenha** (`GhosttySurface` no
frontend manda o `getBoundingClientRect` via `ghostty_sync_frame`, coalescido em
rAF). Esse acoplamento foi a fonte de vários bugs (ver §4).

---

## 3. O que foi construído (por issue)

Todas as issues do épico **#7** foram fechadas. Ordem cronológica dos commits:

| Commit | O quê |
|--------|-------|
| `b3b6529` | Spike: backend nativo Ghostty + shim + reparenting + flag |
| `0b78333` | #5 — cwd e command/agente por sub-tab (surface abre no dir do projeto e lança o agente) |
| `248a15f` | Ctrl+C: `unshifted_codepoint` (o Ghostty precisa saber a tecla física) |
| `def6128` | #2 — render contínuo (timer ~60Hz na run loop) |
| `847a14d` | #4 — reserva atômica do spawn (mata over-spawn do StrictMode) |
| `42bcbe3` | #3 — IME/dead-keys via NSTextInputClient ⚠️ (introduziu uma regressão; ver §4) |
| `7592b42` | #6 — captura só da janela do Alethe (CGWindowID) |
| `555e811` | **Correção final de input** — digitação, Enter, Ctrl+C, dead-keys ABNT2 |

Issues no GitHub: #2, #3, #4, #5, #6, #8 fechadas; épico #7 fechado.

---

## 4. A saga do input — os 3 bugs combinados (e como achamos a raiz)

A parte mais difícil e instrutiva. Depois que tudo "compilava e os testes
passavam", **digitar no app real não escrevia nada** — sem erro, sem nada. Os
testes headless passavam (falso positivo). Levou duas investigações multi-agente
e captura de dados reais de teclado para achar as **três** causas:

### Bug 1 — Digitação não renderizava (a regressão do IME, commit `42bcbe3`)
Para suportar acentos, adicionamos `interpretKeyEvents` + `NSTextInputClient`.
**Causa raiz (provada lendo o código):** numa `NSView` hospedada na WKWebView do
Tauri, o `interpretKeyEvents` despacha o `insertText:` para o **input context da
WebView**, não para a nossa view. O texto digitado ia para a WebView e sumia.
- Por que os testes não pegaram: o teste chamava `[v keyDown:e]` direto, com a
  view como único first responder — não reproduzia o roteamento do app. **Falso
  positivo.**
- **Correção:** remover o `interpretKeyEvents` do `keyDown` por completo.

### Bug 2 — Acentos/dead-keys não compunham (ABNT2)
No teclado ABNT2, as teclas `´ \` ~ ^ " '` são **acentos mortos** (keycode 39) e
reportam `event.characters` **vazio** até compor. A versão simples (sem IME)
ignorava-as.
- **Dado concreto capturado pelo usuário:** `keycode=39 chars='' len=0`.
- **Correção:** composição **manual** via `UCKeyTranslate` (Carbon) + um
  `deadKeyState` por-view. A tecla de acento mantém o estado; a vogal seguinte
  compõe (`´ + a => "á"`). Sem `interpretKeyEvents` — self-contained.
- **Caveat crítico:** Enter/setas também produzem 0 caracteres. NÃO basta tratar
  "0 chars" como dead-key (isso travaria o Enter). Detectamos dead-key real pelo
  `deadKeyState` ter **mudado** após a chamada.

### Bug 3 — Surfaces órfãs roubando o foco
A cada reload da WebView (HMR/troca de projeto), o React é recriado mas as
`NSView`s nativas + o mapa `views` no Rust **sobrevivem**. O único `ghosttyKill`
era o do unmount do React, que não roda no reload. Pior: cada surface nova
**roubava o first-responder** na criação. Resultado: você digitava na surface
visível, mas o teclado ia para uma **surface órfã invisível** empilhada.
- **Correção:** `ghostty_kill_all()` no boot do frontend (limpa órfãs antes de
  qualquer `GhosttySurface` montar) + **não** roubar foco na criação (o foco vem
  do clique → `mouseDown` faz `makeFirstResponder`).

### Por que desta vez funcionou (a lição de teste)
O teste anterior era um falso positivo. Criamos um teste que dirige o **keyDown
real** e **captura o que de fato chega à surface** (`g_last_key_text` /
`g_last_key_composing`), provando:
- `a` → `"a"`, não composing
- Enter → `"\r"` (executa), não composing
- `´ + a` → 'a' acentuado (composição real)
- Ctrl+C / setas → tecla crua, sem travar

A prova veio **antes** de pedir validação ao usuário — e ele confirmou na tela
(`echo "teste"`, `á`, `ã`).

---

## 5. Estrutura do código

**Backend (`src-tauri/`):**
- `vendor/fetch-ghostty.sh` — baixa/valida/extrai o xcframework (gitignorado).
- `build.rs` — linka `libghostty.a` + frameworks (Carbon/Metal/MetalKit/CoreVideo/
  …) e compila o shim `.m` via `cc`; macOS-only, emite `cfg(ghostty_linked)`.
- `ghostty_shim/ghostty_shim.{h,m}` — shim Objective-C: cria a `AletheGhosttyView`
  (input via UCKeyTranslate, mouse, scroll, foco), a surface, render loop (NSTimer
  ~60Hz com `ghostty_app_tick`+draw), clipboard, e `kill_all`.
- `src/ghostty_ffi.rs` — bindings do shim (atrás de `cfg(ghostty_linked)`).
- `src/ghostty_bridge.rs` — comandos Tauri (`ghostty_spawn/sync_frame/set_hidden/
  kill/kill_all`), reparenting, reserva atômica do spawn, e a suíte de testes.

**Frontend (`src/`):**
- `components/GhosttySurface/` — placeholder + sync rAF + ocultar sob modais.
- `lib/platform.ts` — `isMacOS` + `shouldUseNativeBackend`.
- `lib/ghosttyCommand.ts` — monta a linha de comando do agente.
- `components/TerminalPane/` — escolhe XtermBackend vs GhosttyBackend.
- `App.tsx` — chama `ghosttyKillAll()` no boot (limpa órfãs).
- Toggle em Preferences (macOS only).

---

## 6. Testes (ver `TESTING-ghostty.md` para os comandos)

- **Unit Rust** (rápido, sem GUI): conversão de coordenadas, idempotência do spawn.
- **Funcional headless** (libghostty real, `#[ignore]`): `echo/cd/ls`, cwd, render
  contínuo, digitação real (keyDown sintético), **dead-key composição**.
- **Smoke** (`npm run smoke:ghostty`): app real, prova input→shell→render.
- **Frontend (vitest)**: seleção de backend, coalescing.
- **Captura de janela** (`npm run capture:window`): screenshot só do Alethe.

Lição transversal: **um teste que não reproduz o roteamento real é um falso
positivo.** Os testes de input agora dirigem o `keyDown` de verdade e checam o que
chega à surface.

---

## 7. O que funciona hoje

- ✅ Surface Ghostty real embutida, render GPU contínuo
- ✅ Shell de login real rodando dentro
- ✅ Digitação (letras, números, símbolos, Shift)
- ✅ Enter executa, Ctrl+C interrompe
- ✅ **Acentos/dead-keys ABNT2** (`á`, `ã`, `ç`, aspas) via UCKeyTranslate
- ✅ Mouse (clique/foco), scroll
- ✅ cwd e agente por sub-tab
- ✅ Surfaces órfãs limpas no boot; sem roubo de foco
- ✅ Windows/Linux 100% intocados (xterm.js)

## 8. O que ainda fica de follow-up

- IME de composição completa (CJK) — hoje cobrimos dead-keys latinos via
  UCKeyTranslate; IME asiático precisaria de mais.
- `NSTextInputClient` no shim virou código morto (keyDown não usa mais) — pode ser
  removido numa limpeza.
- Preedit visual do acento morto (cosmético — o acento não "aparece flutuando"
  antes de compor, mas compõe certo).
- Multi-display / mudança de `backingScaleFactor` ao mover a janela.
- Assinatura/notarização do build pra distribuição.

---

## 9. Notas de processo (honestas)

- A maior dificuldade não foi "rodar o Ghostty" — foi **o input no contexto da
  WKWebView** e **o ciclo de vida das surfaces**. Ambos só apareceram no app real,
  não nos testes.
- Erramos ao confiar em testes headless que não reproduziam o app (3 tentativas de
  IME quebraram a digitação antes de acharmos a raiz). A correção foi **capturar
  dados reais de teclado** e **escrever um teste que dirige o keyDown de verdade**.
- A troca de autoria dos commits da feature para `HayatoG <guilherme.ryders@gmail.com>`
  foi feita só na branch da feature; a `main` (compartilhada com outro autor) não
  foi tocada de propósito.
