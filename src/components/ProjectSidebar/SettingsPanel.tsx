import { useState } from 'react';
import { useT, LOCALES } from '../../lib/i18n';
import { THEME_OPTIONS, themeLabel } from '../../lib/themes';
import { useProjectsStore } from '../../stores/projectsStore';
import {
  Settings,
  ShieldAlert,
  Palette,
  Languages,
  ZoomIn,
  Plus,
  Minus,
  Key,
  Eye,
  EyeOff,
  Check,
  Cpu,
} from 'lucide-react';

type SettingsTab = 'general' | 'Anthropic' | 'OpenAI' | 'Google' | 'DeepSeek';

export function SettingsPanel() {
  const t = useT();
  const preferences = useProjectsStore((s) => s.preferences);
  const setPreferences = useProjectsStore((s) => s.setPreferences);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const zoomPercent = Math.round(preferences.uiZoom * 100);

  const handleZoomIn = () => {
    const next = Math.min(1.4, preferences.uiZoom + 0.1);
    setPreferences({ uiZoom: parseFloat(next.toFixed(1)) });
  };

  const handleZoomOut = () => {
    const next = Math.max(0.8, preferences.uiZoom - 0.1);
    setPreferences({ uiZoom: parseFloat(next.toFixed(1)) });
  };

  const toggleShowKey = (provider: string) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  // Modelos associados por Provedor
  const PROVIDER_MODELS: Record<string, string[]> = {
    Anthropic: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'],
    OpenAI: ['GPT-4o', 'GPT-4o mini', 'o1-mini', 'o1-preview'],
    Google: [
      'Gemini 1.5 Pro',
      'Gemini 1.5 Flash',
      'Gemini 2.0 Flash',
      'Gemini 2.0 Pro',
    ],
    DeepSeek: ['DeepSeek V3', 'DeepSeek R1'],
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-sunken)',
        color: 'var(--fg)',
        fontFamily: 'inherit',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}
      >
        <Settings size={14} style={{ color: 'var(--accent)' }} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Configurações do Alethe
        </span>
      </header>

      {/* Grid Principal: Menu Lateral e Área de Inputs */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Menu Lateral de Abas Verticais */}
        <aside
          style={{
            width: '180px',
            background: 'var(--bg)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 4px',
            gap: '2px',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {(
            [
              'general',
              'Anthropic',
              'OpenAI',
              'Google',
              'DeepSeek',
            ] as SettingsTab[]
          ).map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background:
                  activeTab === tabId ? 'var(--panel-hover)' : 'transparent',
                border: 'none',
                borderLeft:
                  activeTab === tabId
                    ? '3px solid var(--accent)'
                    : '3px solid transparent',
                borderRadius: 'var(--radius-sm)',
                color: activeTab === tabId ? 'var(--fg)' : 'var(--fg-faint)',
                fontSize: '12px',
                fontWeight: activeTab === tabId ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tabId === 'general' ? 'Geral' : tabId}
            </button>
          ))}
        </aside>

        {/* Área de Conteúdo (Inputs do Provedor) */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: 'var(--bg-sunken)',
          }}
        >
          {activeTab === 'general' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                maxWidth: '600px',
              }}
            >
              {/* Aparência / Tema */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Palette size={12} />
                  {t('prefs.uiTheme')}
                </label>
                <select
                  value={preferences.uiTheme}
                  onChange={(e) =>
                    setPreferences({ uiTheme: e.target.value as any })
                  }
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {THEME_OPTIONS.map((theme) => (
                    <option key={theme as any} value={theme as any}>
                      {themeLabel(t, theme as any)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Idioma */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Languages size={12} />
                  {t('prefs.language')}
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ language: e.target.value as any })
                  }
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {LOCALES.map((loc) => (
                    <option key={loc as any} value={loc as any}>
                      {(loc as any) === 'pt-BR'
                        ? 'Português (Brasil)'
                        : 'English'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ZoomIn size={12} />
                  {t('prefs.uiZoom')}
                </label>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={preferences.uiZoom <= 0.8}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: preferences.uiZoom <= 0.8 ? 0.5 : 1,
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      width: '45px',
                      textAlign: 'center',
                    }}
                  >
                    {zoomPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={preferences.uiZoom >= 1.4}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--fg)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: preferences.uiZoom >= 1.4 ? 0.5 : 1,
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <hr
                style={{
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  margin: '4px 0',
                }}
              />

              {/* Revisor de Agente */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--fg-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ShieldAlert size={12} />
                    Revisor de Agente
                  </span>
                  <label
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '32px',
                      height: '18px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.reviewerEnabled ?? false}
                      onChange={(e) =>
                        setPreferences({ reviewerEnabled: e.target.checked })
                      }
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: preferences.reviewerEnabled
                          ? 'var(--accent)'
                          : 'var(--border)',
                        transition: '0.2s',
                        borderRadius: '9px',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '""',
                          height: '14px',
                          width: '14px',
                          left: preferences.reviewerEnabled ? '16px' : '2px',
                          bottom: '2px',
                          backgroundColor: '#fff',
                          transition: '0.2s',
                          borderRadius: '50%',
                        }}
                      />
                    </span>
                  </label>
                </div>

                {preferences.reviewerEnabled && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--fg-muted)',
                          fontWeight: 500,
                        }}
                      >
                        System Prompt:
                      </span>
                      <textarea
                        value={preferences.reviewerSystemPrompt || ''}
                        onChange={(e) =>
                          setPreferences({
                            reviewerSystemPrompt: e.target.value,
                          })
                        }
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--fg)',
                          outline: 'none',
                          resize: 'vertical',
                          lineHeight: '1.4',
                        }}
                        placeholder="Instruções para o revisor..."
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--fg-muted)',
                          fontWeight: 500,
                        }}
                      >
                        Project Roadmap:
                      </span>
                      <textarea
                        value={preferences.reviewerProjectRoadmap || ''}
                        onChange={(e) =>
                          setPreferences({
                            reviewerProjectRoadmap: e.target.value,
                          })
                        }
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--fg)',
                          outline: 'none',
                          resize: 'vertical',
                          lineHeight: '1.4',
                        }}
                        placeholder="Roteiro e metas do projeto..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abas de Provedores com Chaves */}
          {activeTab !== 'general' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                maxWidth: '600px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Cpu size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Status do Provedor
                  </span>
                </div>
                {(activeTab === 'Anthropic' && preferences.anthropicApiKey) ||
                (activeTab === 'OpenAI' && preferences.openaiApiKey) ||
                (activeTab === 'Google' && preferences.googleApiKey) ||
                (activeTab === 'DeepSeek' && preferences.deepseekApiKey) ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--status-working)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={12} /> Configurado
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-faint)',
                      fontWeight: 500,
                    }}
                  >
                    Chave não configurada
                  </span>
                )}
              </div>

              {/* Input da Chave da API */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Key size={12} />
                  Chave da API ({activeTab})
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type={showKey[activeTab] ? 'text' : 'password'}
                    value={
                      (activeTab === 'Anthropic'
                        ? preferences.anthropicApiKey
                        : activeTab === 'OpenAI'
                          ? preferences.openaiApiKey
                          : activeTab === 'Google'
                            ? preferences.googleApiKey
                            : preferences.deepseekApiKey) || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeTab === 'Anthropic')
                        setPreferences({ anthropicApiKey: val });
                      if (activeTab === 'OpenAI')
                        setPreferences({ openaiApiKey: val });
                      if (activeTab === 'Google')
                        setPreferences({ googleApiKey: val });
                      if (activeTab === 'DeepSeek')
                        setPreferences({ deepseekApiKey: val });
                    }}
                    placeholder={`Cole sua chave de API da ${activeTab}...`}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: 'var(--bg-elevated)',
                      color: 'var(--fg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(activeTab)}
                    style={{
                      padding: '8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--fg-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showKey[activeTab] ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Modelos Disponíveis no Seletor */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                  }}
                >
                  Modelos inclusos no seletor:
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {PROVIDER_MODELS[activeTab]?.map((modelName) => (
                    <div
                      key={modelName}
                      style={{
                        fontSize: '11.5px',
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '2px solid var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{modelName}</span>
                      <span
                        style={{ fontSize: '10px', color: 'var(--fg-faint)' }}
                      >
                        Ativo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
