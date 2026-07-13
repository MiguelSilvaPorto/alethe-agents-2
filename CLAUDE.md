# Alethe — guia de trabalho (IA)

> Conteúdo idêntico ao [`AGENTS.md`](AGENTS.md) deste diretório. Mantenha os dois em sincronia.
> Status: **v1.2.3**, MVP funcional em polish. Identifier: `com.kc1t.alethe`.

## 1. O que é

**Alethe** é um app desktop **Windows-first** que organiza, opera e retoma múltiplos agentes de
código (Claude Code, Codex, OpenCode) e shells em paralelo, dentro de uma workspace persistente com
terminais reais (PTYs), layouts, temas, histórico e controle de RAM.

## 2. Comandos (de `package.json`)

```powershell
npm install
npm run app      # = tauri dev — roda o app completo com hot reload (RECOMENDADO)
npm run dev      # só o frontend Vite
npm run build    # tsc + vite build — faz typecheck e valida o i18n
npm test         # vitest run
```

## 3. Regras inegociáveis

1. **NÃO encerre nem reinicie o app nem o dev server** (`tauri dev` / Vite). Não mate o processo. Aplique mudanças via HMR.
2. **NÃO faça commit / push / tag / release sem permissão explícita.** Faça as alterações só no working tree e pare. Não adicione co-autor.
3. **Design system estrito — sem gradientes, sem "vibecoded".** Nada de UI genérica de template. Dashboards e widgets mostram dado real, nunca placeholder/mock. Estilo via CSS Modules + tokens de `src/styles/theme.css`.
4. **i18n obrigatório.** Toda string visível passa por `t()`. Adicione em `src/lib/i18n/messages/en.ts` (fonte da verdade) e em `src/lib/i18n/messages/pt-BR.ts`.

## 4. Leitura Obrigatória — Regras por Domínio

Consulte as regras locais específicas para o desenvolvimento de cada domínio:

- Frontend (React / TypeScript / Zustand / CSS): [`src/.claude.rules.md`](src/.claude.rules.md)
- Backend (Rust / Tauri / PTY / System): [`src-tauri/.claude.rules.md`](src-tauri/.claude.rules.md)
