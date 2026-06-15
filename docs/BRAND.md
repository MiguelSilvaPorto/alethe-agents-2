# Alethe — Brand & Design Tokens

## Logo

- **Master PNG**: [logo.png](../logo.png) (1000×1000, 817 KB)
- **SVG wrapper**: [logo.svg](../logo.svg) (com PNG embedded base64)
- **App icons gerados**: [src-tauri/icons/](../src-tauri/icons/)
  - `icon.ico` — Windows multi-resolution (Start Menu, taskbar, .msi)
  - `icon.icns` — macOS bundle
  - `icon.png` — fallback Linux/general
  - `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png` — Linux variants
  - `Square*Logo.png`, `StoreLogo.png` — Windows tiles / Microsoft Store
  - `ios/`, `android/` — preparados pra futura porta mobile

**Pra regenerar todos os ícones a partir de uma nova `logo.png`:**

```bash
npx tauri icon ./logo.png
```

## Avatar de perfil

- [src/assets/default-profile.svg](../src/assets/default-profile.svg) — avatar padrão do app. Usado no botão de perfil na titlebar.

## Ícones de agentes

| Agente | Asset | Cor |
|---|---|---|
| Shell | inline SVG (chevron `>`) | `#10b981` |
| Claude | [src/assets/claude-code.png](../src/assets/claude-code.png) | `#ec9333` |
| Codex | [src/assets/codex.png](../src/assets/codex.png) | `#06b6d4` |
| OpenCode (light) | [src/assets/open-black.png](../src/assets/open-black.png) | `#8b8b95` |
| OpenCode (dark) | [src/assets/open-white.png](../src/assets/open-white.png) | `#8b8b95` |
| VS Code (botão "abrir") | [src/assets/vscode.svg](../src/assets/vscode.svg) | `#007ACC` |

## Tipografia

| Token | Valor |
|---|---|
| `--font-sans` | `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--font-mono` | `"Cascadia Mono", Consolas, "Courier New", monospace` |

Tipografia base do app é Inter. Mono usado em `cwd`, badges (`5h`/`7d`), código.

## Paleta — tokens globais (`:root`)

### Surfaces & borders

| Token | Hex | Uso |
|---|---|---|
| `--surface-modal` | `#1f2125` | Background de modais (focus pane chrome, modal de histórico) |
| `--surface-card-default` | `#2a2d33` | Cards de listas (history, projects, metrics) |
| `--surface-card-selected` | `rgba(243,244,246,0.06)` | Card highlighted/active |
| `--border-subtle` | `#2a2d33` | Borda padrão entre cards/sections |
| `--border-accent` | `rgba(243,244,246,0.22)` | Borda accent (focus rings, active states) |

### Texto

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#f3f4f6` | Texto principal |
| `--text-secondary` | `#c8c8d0` | Subtítulos, body secundário |
| `--text-tertiary` | `#8b8b95` | Hints, meta, timestamps |
| `--text-quaternary` | `#6b6b75` | Disabled, placeholders |

### Accent (highlight neutro)

| Token | Hex/RGBA | Uso |
|---|---|---|
| `--accent-bg-soft` | `rgba(243,244,246,0.06)` | Highlight sutil em hover/selected |
| `--accent-border-soft` | `rgba(243,244,246,0.22)` | Borda accent para hover |
| `--accent-on-text` | `#101114` | Texto sobre fundo accent (dark) |

### Agentes (cores de identidade)

| Token | Hex | Soft variant |
|---|---|---|
| `--agent-shell` | `#10b981` (verde) | `rgba(16,185,129,0.14)` |
| `--agent-claude` | `#ec9333` (laranja) | `rgba(236,147,51,0.15)` |
| `--agent-codex` | `#06b6d4` (ciano) | `rgba(6,182,212,0.15)` |
| `--agent-opencode` | `#8b8b95` (cinza) | `rgba(139,139,149,0.15)` |

### Status (estado do agente/PTY)

| Token | Hex | Significado | Soft |
|---|---|---|---|
| `--status-active` | `#10b981` | working, tool-running, thinking | `rgba(16,185,129,0.16)` |
| `--status-waiting` | `#f59e0b` | waiting, waiting-approval | `rgba(245,158,11,0.16)` |
| `--status-idle` | `#8b8b95` | stopped, idle, ended, disabled | `rgba(139,139,149,0.14)` |

### Canvas

| Token | Light | Dark |
|---|---|---|
| `--canvas-bg-*` | `#f6f7fb` | `#101114` |
| `--canvas-grid-*` | `#d9dee8` | `#2a2d33` |

### Terminal shape (BoxShape)

| Tema | Background | Border |
|---|---|---|
| Dark | `#1c1c1e` | `#3a3a3c` |
| Light | `#fafafa` | `#d9dee8` |

Titlebar do terminal:

| Tema | Background | Border |
|---|---|---|
| Dark | `#2c2c2e` | `#1a1a1c` |
| Light | `#ececef` | `#dcdfe5` |

xterm theme:

| Tema | Background | Foreground | Cursor | Selection |
|---|---|---|---|---|
| Dark | `#101114` | `#f3f4f6` | `#f3f4f6` | `#3b82f666` |
| Light | `#fafafa` | `#18181b` | `#18181b` | `#3b82f655` |

## Paleta — tema do sistema

Aplicado via `.canvas-host.theme-{light|dark}` em `App.tsx`.

### Light (`canvas-host.theme-light`)

| Token | Hex |
|---|---|
| `--toolbar-bg` | `#ffffff` |
| `--toolbar-border` | `#e6eaf0` |
| `--toolbar-text` | `#18181b` |
| `--toolbar-hover` | `#f1f5f9` |
| `--accent` | `#18181b` |
| `--accent-hover` | `#000000` |
| `--accent-on` | `#ffffff` |
| `--accent-soft` | `rgba(24,24,27,0.05)` |
| `--accent-border` | `rgba(24,24,27,0.18)` |
| `--accent-ring` | `rgba(24,24,27,0.08)` |
| `--surface-card-default` | `#f8fafc` |
| `--text-primary` | `#18181b` |
| `--text-secondary` | `#3f3f46` |
| `--text-tertiary` | `#71717a` |
| `--grid-bg` | `#f6f7fb` |
| `--grid-dot` | `#d9dee8` |

### Dark (`canvas-host.theme-dark`)

| Token | Hex |
|---|---|
| `--toolbar-bg` | `#1f2125` |
| `--toolbar-border` | `#2a2d33` |
| `--toolbar-text` | `#f3f4f6` |
| `--toolbar-hover` | `#2a2d33` |
| `--accent` | `#f3f4f6` |
| `--accent-hover` | `#ffffff` |
| `--accent-on` | `#101114` |
| `--accent-soft` | `rgba(243,244,246,0.06)` |
| `--accent-border` | `rgba(243,244,246,0.22)` |
| `--accent-ring` | `rgba(243,244,246,0.10)` |
| `--grid-bg` | `#101114` |
| `--grid-dot` | `#2a2d33` |

## Paleta de cores de projeto (FrameEditModal)

Presets disponíveis pra customizar cor de fundo do ícone do frame ([src/components/FrameEditModal.tsx](../src/components/FrameEditModal.tsx)):

| Nome | Hex |
|---|---|
| laranja | `#f97316` |
| rosa | `#ec4899` |
| roxo | `#8b5cf6` |
| azul | `#0ea5e9` |
| turquesa | `#14b8a6` |
| verde | `#84cc16` |
| amarelo | `#eab308` |
| vermelho | `#ef4444` |
| cinza | `#64748b` |
| preto | `#0a0a0a` |
| auto | (inherit, padrão) |

Plus: color-picker nativo para hex arbitrário, e URL de imagem opcional como background do ícone.

## Cores especiais

| Contexto | Hex | Uso |
|---|---|---|
| Drag target highlight | `#38bdf8` | Borda azul + glow ao arrastar shape sobre destino |
| Danger / delete | `#ef4444` / `#f87171` | Botões destrutivos, status offline |
| VS Code blue | `#007ACC` | Logo do botão "Abrir no VS Code" |

## Radius e espaçamento

| Token | Valor |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `14px` |

Border-radius comuns:
- Botões pequenos: `5-6px`
- Cards: `8-10px`
- Modais: `12-14px`
- Pills (badges, traffic lights): `999px`
