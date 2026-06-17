import { afterEach, describe, expect, it, vi } from 'vitest'

import { isMacOS, shouldUseNativeBackend } from './platform'

function setUserAgent(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
}

describe('isMacOS', () => {
  afterEach(() => vi.restoreAllMocks())

  it('detecta macOS pelo user-agent da WKWebView', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    )
    expect(isMacOS()).toBe(true)
  })

  it('é false no Windows', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    expect(isMacOS()).toBe(false)
  })

  it('é false no Linux', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
    expect(isMacOS()).toBe(false)
  })
})

describe('shouldUseNativeBackend', () => {
  it('usa nativo só com flag ligada E no macOS', () => {
    expect(shouldUseNativeBackend(true, true)).toBe(true)
  })

  it('não usa nativo sem a flag, mesmo no macOS', () => {
    expect(shouldUseNativeBackend(false, true)).toBe(false)
    expect(shouldUseNativeBackend(undefined, true)).toBe(false)
  })

  it('nunca usa nativo fora do macOS, mesmo com flag ligada', () => {
    // Garante que Windows/Linux NUNCA caem no caminho nativo — requisito central.
    expect(shouldUseNativeBackend(true, false)).toBe(false)
  })
})
