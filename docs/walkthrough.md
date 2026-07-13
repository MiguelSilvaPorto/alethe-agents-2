# Walkthrough de Implementações e Correções do Alethe

## 1. Porta Dinâmica do Telemetry Proxy no Frontend

- **O que foi feito**:
  - Integramos a chamada ao comando Tauri `get_proxy_port` no hook principal de inicialização (`useEffect` de boot) no `src/App.tsx`.
  - Salvamos o valor dinâmico lido no Zustand via `useUiStore.getState().setProxyPort(port)`.
  - Atualizamos as URLs de telemetria estáticas do `TerminalPane/index.tsx` de `4096` para a porta atômica dinâmica lida do store (`${proxyPort}`), permitindo o fallback automático de portas consecutivas em caso de conflitos.

## 2. Otimização do PTY Rust-Side (Tokio Worker Pool & IPC Batching)

- **O que foi feito**:
  - Eliminamos o spawner de threads dedicadas do SO (`thread::spawn`) por PTY no backend `pty.rs`.
  - Implementamos leitura assíncrona usando a thread pool nativa do Tokio via `tokio::task::spawn_blocking`.
  - Adicionamos um canal assíncrono MPSC (`tokio::sync::mpsc::channel`) para o tráfego de dados de leitura.
  - Implementamos um compositor de loteamento (IPC Batching) com frequência de 16ms (60 FPS) e limite de 64KB por ciclo para agrupar as emissões de eventos Tauri (`event_app.emit`) e inserções de scrollback, eliminando micro-stutters no frontend causados por sobrecarga de render do barramento IPC.
  - Adicionamos um pequeno delay de backpressure de 2ms quando há fluxo massivo para dar vazão à fila de eventos do Chromium.

## 3. Notificações OS para Tarefas em Status de Aguardando Revisão

- **O que foi feito**:
  - Centralizamos o envio de notificações no helper global `updateStateByTask` no `src/stores/projectsStore.ts`.
  - Quando qualquer alteração ou transição do ciclo de vida de uma tarefa muda o status para `"pending"` (Aguardando aprovação), disparamos uma notificação OS nativa do sistema em background através do helper `notifyAgentDone`.
  - O conteúdo da notificação do sistema é localizado automaticamente entre Português e Inglês conforme a preferência de idioma (`preferences.language`) do usuário.

---

### Verificações Efetuadas:

- **TypeScript**: `npx tsc --noEmit` validado e 100% verde.
- **Rust Compiler**: `cargo check` compilado com sucesso em perfil dev.
