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
  Trash2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

type SettingsTab =
  'general' | 'Anthropic' | 'OpenAI' | 'Google' | 'DeepSeek' | 'Custom';

export function SettingsPanel() {
  const t = useT();
  const preferences = useProjectsStore((s) => s.preferences);
  const setPreferences = useProjectsStore((s) => s.setPreferences);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Estados locais para verificação de chaves de API
  const [verifyStatus, setVerifyStatus] = useState<
    Record<string, { loading: boolean; success: boolean; error: string | null }>
  >({});

  // Estados locais para formulário de modelo customizado
  const [customName, setCustomName] = useState('');
  const [customId, setCustomId] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customProvider, setCustomProvider] = useState('OpenAI');

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

  // Modelos nativos por Provedor
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

  // Função para verificar chave de API com chamadas reais contra CORS/Autenticação
  const handleVerifyKey = async (provider: string, apiKey?: string) => {
    if (!apiKey) {
      setVerifyStatus((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: false,
          error: 'Por favor, insira uma chave antes de verificar.',
        },
      }));
      return;
    }

    setVerifyStatus((prev) => ({
      ...prev,
      [provider]: { loading: true, success: false, error: null },
    }));

    try {
      let url = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let method = 'GET';
      let body: string | undefined = undefined;

      if (provider === 'OpenAI') {
        url = 'https://api.openai.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'Anthropic') {
        // endpoint de mensagens da Anthropic
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        method = 'POST';
        body = JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }],
        });
      } else if (provider === 'Google') {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      } else if (provider === 'DeepSeek') {
        url = 'https://api.deepseek.com/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, { method, headers, body });

      if (response.ok) {
        setVerifyStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, success: true, error: null },
        }));
        // Salva nas preferências que a chave foi verificada
        const currentVerified = preferences.verifiedProviders ?? {};
        setPreferences({
          verifiedProviders: {
            ...currentVerified,
            [provider]: true,
          },
        });
      } else {
        const errJson = await response.json().catch(() => ({}));
        const errMsg =
          errJson?.error?.message ||
          errJson?.error ||
          `Erro HTTP ${response.status}`;
        setVerifyStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, success: false, error: errMsg },
        }));
        // Remove dos verificados se falhar
        const currentVerified = preferences.verifiedProviders ?? {};
        setPreferences({
          verifiedProviders: {
            ...currentVerified,
            [provider]: false,
          },
        });
      }
    } catch (e: any) {
      setVerifyStatus((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: false,
          error:
            e.message ||
            'Falha de rede/DNS. Verifique sua conexão com a internet.',
        },
      }));
    }
  };

  const handleToggleModel = (modelId: string, enabled: boolean) => {
    const currentToggles = preferences.enabledModels ?? {};
    setPreferences({
      enabledModels: {
        ...currentToggles,
        [modelId]: enabled,
      },
    });
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customId) return;

    const newModel = {
      id: customId,
      name: customName,
      provider: customProvider,
      baseUrl: customBaseUrl,
      enabled: true,
    };

    const updatedList = [...(preferences.customModels ?? []), newModel];
    setPreferences({ customModels: updatedList });

    // Habilita por padrão nas preferências
    handleToggleModel(customId, true);

    // Limpa os campos
    setCustomName('');
    setCustomId('');
    setCustomBaseUrl('');
  };

  const handleRemoveCustomModel = (modelId: string) => {
    const updatedList = (preferences.customModels ?? []).filter(
      (m) => m.id !== modelId,
    );
    setPreferences({ customModels: updatedList });

    const currentToggles = { ...(preferences.enabledModels ?? {}) };
    delete currentToggles[modelId];
    setPreferences({ enabledModels: currentToggles });
  };

  // Helper para verificar se um provedor tem uma chave configurada
  const hasKey = (provider: string): boolean => {
    if (provider === 'Anthropic') return !!preferences.anthropicApiKey;
    if (provider === 'OpenAI') return !!preferences.openaiApiKey;
    if (provider === 'Google') return !!preferences.googleApiKey;
    if (provider === 'DeepSeek') return !!preferences.deepseekApiKey;
    return false;
  };

  // Helper para obter a chave correspondente
  const getKeyValue = (provider: string): string => {
    if (provider === 'Anthropic') return preferences.anthropicApiKey || '';
    if (provider === 'OpenAI') return preferences.openaiApiKey || '';
    if (provider === 'Google') return preferences.googleApiKey || '';
    if (provider === 'DeepSeek') return preferences.deepseekApiKey || '';
    return '';
  };

  // Helper para atualizar a chave correspondente
  const handleUpdateKey = (provider: string, val: string) => {
    // Ao alterar a chave, removemos o status de verificado
    const currentVerified = preferences.verifiedProviders ?? {};
    setPreferences({
      verifiedProviders: {
        ...currentVerified,
        [provider]: false,
      },
    });

    // Limpa também o status de erro de verificação anterior
    setVerifyStatus((prev) => ({
      ...prev,
      [provider]: { loading: false, success: false, error: null },
    }));

    if (provider === 'Anthropic') setPreferences({ anthropicApiKey: val });
    if (provider === 'OpenAI') setPreferences({ openaiApiKey: val });
    if (provider === 'Google') setPreferences({ googleApiKey: val });
    if (provider === 'DeepSeek') setPreferences({ deepseekApiKey: val });
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
            width: '190px',
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
              'Custom',
            ] as SettingsTab[]
          ).map((tabId) => {
            const isVerified = preferences.verifiedProviders?.[tabId] === true;
            const keyConfigured = hasKey(tabId);

            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                <span>
                  {tabId === 'general'
                    ? 'Geral'
                    : tabId === 'Custom'
                      ? 'Modelos Custom'
                      : tabId}
                </span>

                {/* Pontinho sutil de status ao lado de cada provider */}
                {tabId !== 'general' && tabId !== 'Custom' && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isVerified
                        ? 'var(--status-working, #4caf50)'
                        : keyConfigured
                          ? 'var(--warning, #ff9800)'
                          : 'var(--border, #555)',
                    }}
                    title={
                      isVerified
                        ? 'Chave verificada e conectada'
                        : keyConfigured
                          ? 'Chave configurada, pendente de verificação'
                          : 'Chave não configurada'
                    }
                  />
                )}
              </button>
            );
          })}
        </aside>

        {/* Área de Conteúdo */}
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

          {/* Abas de Provedores com Chaves e Toggles */}
          {activeTab !== 'general' && activeTab !== 'Custom' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                maxWidth: '600px',
              }}
            >
              {/* Card de Status do Provedor */}
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
                {preferences.verifiedProviders?.[activeTab] === true ? (
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
                    <Check size={12} /> Conectado e Verificado
                  </span>
                ) : hasKey(activeTab) ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--warning, #ff9800)',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangle size={12} /> Pendente de Verificação
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

              {/* Input de Chave da API com Botão "Verify" */}
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
                    value={getKeyValue(activeTab)}
                    onChange={(e) => handleUpdateKey(activeTab, e.target.value)}
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

                  {/* Botão de Verificação Ativa (Verify) */}
                  <button
                    type="button"
                    disabled={
                      !getKeyValue(activeTab) ||
                      verifyStatus[activeTab]?.loading
                    }
                    onClick={() =>
                      handleVerifyKey(activeTab, getKeyValue(activeTab))
                    }
                    style={{
                      padding: '8px 14px',
                      background: 'var(--accent)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-on, #fff)',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity:
                        !getKeyValue(activeTab) ||
                        verifyStatus[activeTab]?.loading
                          ? 0.6
                          : 1,
                    }}
                  >
                    {verifyStatus[activeTab]?.loading ? (
                      <RotateCw
                        size={12}
                        className="spin-animation"
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>

                {/* Exibição de mensagens de sucesso ou erro específicos de verificação */}
                {verifyStatus[activeTab]?.error && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#ff4d4f',
                      marginTop: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {verifyStatus[activeTab]?.error}
                  </span>
                )}
                {verifyStatus[activeTab]?.success && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--status-working, #4caf50)',
                      marginTop: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Chave verificada e conectada com sucesso!
                  </span>
                )}
              </div>

              {/* Toggles individuais para os Modelos */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                  }}
                >
                  Modelos do Provedor
                </span>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {PROVIDER_MODELS[activeTab]?.map((modelName) => {
                    const isModelEnabled =
                      preferences.enabledModels?.[modelName] !== false; // ativo por default
                    const providerConnected =
                      preferences.verifiedProviders?.[activeTab] === true;

                    return (
                      <div
                        key={modelName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          opacity: providerConnected ? 1 : 0.5,
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>
                          {modelName}
                        </span>

                        <label
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '32px',
                            height: '18px',
                            cursor: providerConnected
                              ? 'pointer'
                              : 'not-allowed',
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!providerConnected}
                            checked={providerConnected && isModelEnabled}
                            onChange={(e) =>
                              handleToggleModel(modelName, e.target.checked)
                            }
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor:
                                providerConnected && isModelEnabled
                                  ? 'var(--accent)'
                                  : 'var(--border)',
                              transition: '0.2s',
                              borderRadius: '9px',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                height: '14px',
                                width: '14px',
                                left:
                                  providerConnected && isModelEnabled
                                    ? '16px'
                                    : '2px',
                                bottom: '2px',
                                backgroundColor: '#fff',
                                transition: '0.2s',
                                borderRadius: '50%',
                              }}
                            />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Aba de Modelos Customizados (Add Custom Model) */}
          {activeTab === 'Custom' && (
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
                  padding: '12px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Modelos Customizados e Endpoints Locais
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--fg-faint)',
                    lineHeight: 1.4,
                    display: 'block',
                  }}
                >
                  Adicione e conecte endpoints locais (ex: Ollama, LM Studio) ou
                  proxies compatíveis com a API do OpenAI (ex: OpenRouter,
                  Together AI).
                </span>
              </div>

              {/* Lista de Modelos Customizados Cadastrados */}
              {(preferences.customModels ?? []).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--fg-muted)',
                    }}
                  >
                    Modelos cadastrados
                  </span>
                  {(preferences.customModels ?? []).map((m) => {
                    const isModelEnabled =
                      preferences.enabledModels?.[m.id] !== false;

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {m.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--fg-faint)',
                            }}
                          >
                            ID: {m.id} &middot; Endpoint: {m.baseUrl}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          {/* Toggle */}
                          <label
                            style={{
                              position: 'relative',
                              display: 'inline-block',
                              width: '32px',
                              height: '18px',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isModelEnabled}
                              onChange={(e) =>
                                handleToggleModel(m.id, e.target.checked)
                              }
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: isModelEnabled
                                  ? 'var(--accent)'
                                  : 'var(--border)',
                                transition: '0.2s',
                                borderRadius: '9px',
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  height: '14px',
                                  width: '14px',
                                  left: isModelEnabled ? '16px' : '2px',
                                  bottom: '2px',
                                  backgroundColor: '#fff',
                                  transition: '0.2s',
                                  borderRadius: '50%',
                                }}
                              />
                            </span>
                          </label>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomModel(m.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--fg-faint)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = '#ff4d4f')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = 'var(--fg-faint)')
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Formulário para Adicionar Novo Modelo Customizado */}
              <form
                onSubmit={handleAddCustomModel}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Novo Modelo Customizado
                </span>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                    >
                      Nome de Exibição
                    </span>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: My local Qwen"
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                    >
                      Model ID
                    </span>
                    <input
                      type="text"
                      required
                      value={customId}
                      onChange={(e) => setCustomId(e.target.value)}
                      placeholder="Ex: qwen2.5-coder:7b"
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                    >
                      Provedor base
                    </span>
                    <select
                      value={customProvider}
                      onChange={(e) => setCustomProvider(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11.5px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="OpenAI">OpenAI</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="Google">Google</option>
                      <option value="DeepSeek">DeepSeek</option>
                      <option value="Custom">Custom / Outro</option>
                    </select>
                  </div>

                  <div
                    style={{
                      flex: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                    >
                      Custom Base URL / Endpoint
                    </span>
                    <input
                      type="url"
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      placeholder="Ex: http://127.0.0.1:11434/v1"
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    alignSelf: 'flex-end',
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-on)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                >
                  Adicionar Modelo
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
