/**
 * Detecção de plataforma para a WebView. Usado para decidir o backend de
 * terminal: macOS pode usar o backend nativo (Ghostty); Windows/Linux seguem
 * sempre no xterm.js.
 *
 * Evitamos o @tauri-apps/plugin-os (dependência extra + chamada async) — o
 * user-agent da WKWebView no macOS é estável e suficiente para essa decisão.
 */
export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // WKWebView no macOS sempre traz "Macintosh" / "Mac OS X" no UA.
  return /Macintosh|Mac OS X/i.test(ua);
}

/**
 * Decide se um terminal deve usar o backend nativo (Ghostty) em vez do
 * xterm.js. Regra única, testável: só no macOS E com a flag opt-in ligada.
 * `macOverride` permite testar a lógica sem depender do user-agent real.
 */
export function shouldUseNativeBackend(
  nativeTerminalMacos: boolean | undefined,
  macOverride: boolean = isMacOS(),
): boolean {
  return Boolean(nativeTerminalMacos) && macOverride;
}
