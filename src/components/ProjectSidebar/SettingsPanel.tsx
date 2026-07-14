import { useState, useMemo } from 'react';
import { useProjectsStore } from '../../stores/projectsStore';
import {
  Settings,
  Search,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCw,
  Server,
  Palette,
  Languages,
  ZoomIn,
  Plus,
  Minus,
  ShieldAlert,
} from 'lucide-react';

const NATIVE_MODELS = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI' },
  { id: 'o1-mini', name: 'o1-mini', provider: 'OpenAI' },
  { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', provider: 'Google' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  // Modelos do OpenCode Go
  {
    id: 'opencode-go/glm-5.2',
    name: 'GLM 5.2 (OpenCode Go)',
    provider: 'OpenCode Go',
  },
  {
    id: 'opencode-go/kimi-k2.7-code',
    name: 'Kimi K2.7 Code (OpenCode Go)',
    provider: 'OpenCode Go',
  },
  {
    id: 'opencode-go/mimo-v2.5-pro',
    name: 'Mimo v2.5 Pro (OpenCode Go)',
    provider: 'OpenCode Go',
  },
  {
    id: 'opencode-go/qwen3.7-max',
    name: 'Qwen 3.7 Max (OpenCode Go)',
    provider: 'OpenCode Go',
  },
  {
    id: 'opencode-go/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash (OpenCode Go)',
    provider: 'OpenCode Go',
  },
];

export function SettingsPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'models'>(
    'models',
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-sunken)',
        color: 'var(--fg)',
        fontFamily: 'inherit',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          flexShrink: 0,
        }}
      >
        <Settings size={16} style={{ color: 'var(--accent)' }} />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Configurações do Alethe
        </span>
      </header>

      {/* Grid Principal: Barra Lateral e Conteúdo */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside
          style={{
            width: '180px',
            background: 'var(--bg)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 6px',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('general')}
            style={{
              padding: '8px 12px',
              background:
                activeSubTab === 'general'
                  ? 'var(--panel-hover)'
                  : 'transparent',
              border: 'none',
              borderLeft:
                activeSubTab === 'general'
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color:
                activeSubTab === 'general' ? 'var(--fg)' : 'var(--fg-faint)',
              fontSize: '12px',
              fontWeight: activeSubTab === 'general' ? 600 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('models')}
            style={{
              padding: '8px 12px',
              background:
                activeSubTab === 'models'
                  ? 'var(--panel-hover)'
                  : 'transparent',
              border: 'none',
              borderLeft:
                activeSubTab === 'models'
                  ? '3px solid var(--accent)'
                  : '3px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color:
                activeSubTab === 'models' ? 'var(--fg)' : 'var(--fg-faint)',
              fontSize: '12px',
              fontWeight: activeSubTab === 'models' ? 600 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Modelos e Chaves
          </button>
        </aside>

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--bg-sunken)',
          }}
        >
          <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
            {activeSubTab === 'general' ? (
              <GeneralSettingsView />
            ) : (
              <ModelsAndKeysSettingsView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ==================== ABAS INDIVIDUAIS RENDERIZADAS ==================== */

function GeneralSettingsView() {
  const preferences = useProjectsStore((s) => s.preferences);
  const setPreferences = useProjectsStore((s) => s.setPreferences);
  const zoomPercent = Math.round(preferences.uiZoom * 100);

  const handleZoomIn = () => {
    const next = Math.min(1.4, preferences.uiZoom + 0.1);
    setPreferences({ uiZoom: parseFloat(next.toFixed(1)) });
  };

  const handleZoomOut = () => {
    const next = Math.max(0.8, preferences.uiZoom - 0.1);
    setPreferences({ uiZoom: parseFloat(next.toFixed(1)) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2
        style={{
          fontSize: '14px',
          fontWeight: 600,
          borderBottom: '1px solid var(--border)',
          paddingBottom: '8px',
          margin: 0,
        }}
      >
        Configurações Gerais
      </h2>

      {/* Idioma */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
          Idioma
        </label>
        <select
          value={preferences.language}
          onChange={(e) => setPreferences({ language: e.target.value as any })}
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
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </div>

      {/* Tema */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
          Tema da Interface
        </label>
        <select
          value={preferences.uiTheme}
          onChange={(e) => setPreferences({ uiTheme: e.target.value as any })}
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
          <option value="dark">Dark Theme</option>
          <option value="light">Light Theme</option>
        </select>
      </div>

      {/* Zoom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
          Zoom Global
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Revisor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} />
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
              style={{ opacity: 0, width: 0, height: 0, cursor: 'pointer' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
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
                  setPreferences({ reviewerSystemPrompt: e.target.value })
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModelsAndKeysSettingsView() {
  const preferences = useProjectsStore((s) => s.preferences);
  const setPreferences = useProjectsStore((s) => s.setPreferences);

  const [apiKeysExpanded, setApiKeysExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Toggles de provedores complexos e override de URL
  const [overrideOpenaiUrl, setOverrideOpenaiUrl] = useState(false);
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [azureEnabled, setAzureEnabled] = useState(false);
  const [azureBaseUrl, setAzureBaseUrl] = useState('');
  const [azureDeploymentName, setAzureDeploymentName] = useState('');
  const [azureApiKey, setAzureApiKey] = useState('');

  const [bedrockEnabled, setBedrockEnabled] = useState(false);
  const [bedrockAccessKey, setBedrockAccessKey] = useState('');
  const [bedrockSecretKey, setBedrockSecretKey] = useState('');
  const [bedrockRegion, setBedrockRegion] = useState('');
  const [bedrockTestModel, setBedrockTestModel] = useState('');

  // Estados locais para verificação de chaves
  const [verifyStatus, setVerifyStatus] = useState<
    Record<string, { loading: boolean; success: boolean; error: string | null }>
  >({});
  const [syncingOpenCode, setSyncingOpenCode] = useState(false);

  // Formulário inline para adicionar modelo customizado
  const [inlineModelName, setInlineModelName] = useState('');
  const [inlineModelId, setInlineModelId] = useState('');
  const [inlineModelBaseUrl, setInlineModelBaseUrl] = useState('');
  const [inlineModelProvider, setInlineModelProvider] = useState('OpenAI');

  const isSearchModelInList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      NATIVE_MODELS.some((m) => m.name.toLowerCase().includes(query)) ||
      (preferences.customModels ?? []).some((m) =>
        m.name.toLowerCase().includes(query),
      )
    );
  }, [searchQuery, preferences.customModels]);

  const filteredModelsList = useMemo(() => {
    const list = [...NATIVE_MODELS, ...(preferences.customModels ?? [])];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query),
    );
  }, [searchQuery, preferences.customModels]);

  const handleToggleModel = (modelId: string, enabled: boolean) => {
    const currentToggles = preferences.enabledModels ?? {};
    setPreferences({
      enabledModels: {
        ...currentToggles,
        [modelId]: enabled,
      },
    });
  };

  const handleAddCustomModelInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineModelName || !inlineModelId) return;

    const newModel = {
      id: inlineModelId,
      name: inlineModelName,
      provider: inlineModelProvider,
      baseUrl: inlineModelBaseUrl,
      enabled: true,
    };

    const updatedList = [...(preferences.customModels ?? []), newModel];
    setPreferences({
      customModels: updatedList,
      enabledModels: {
        ...(preferences.enabledModels ?? {}),
        [inlineModelId]: true,
      },
    });

    setInlineModelName('');
    setInlineModelId('');
    setInlineModelBaseUrl('');
    setSearchQuery('');
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

  const handleSyncOpenCodeProviders = async () => {
    setSyncingOpenCode(true);
    try {
      const response = await fetch(
        `http://${preferences.opencodeHostname}:${preferences.opencodePort}/provider`,
      );
      if (response.ok) {
        const data = await response.json();
        const connectedProviders = data.connected || [];

        const nextVerified = { ...(preferences.verifiedProviders ?? {}) };
        nextVerified['OpenAI'] = connectedProviders.includes('openai');
        nextVerified['Anthropic'] = connectedProviders.includes('anthropic');
        nextVerified['Google'] = connectedProviders.includes('google');
        nextVerified['DeepSeek'] = connectedProviders.includes('deepseek');
        nextVerified['OpenCode Go'] = true;

        setPreferences({ verifiedProviders: nextVerified });
        alert('Sincronização com o OpenCode realizada com sucesso!');
      } else {
        alert(`Erro ao sincronizar com o OpenCode: Status ${response.status}`);
      }
    } catch (e: any) {
      alert(
        `Falha ao conectar no servidor OpenCode: ${e.message || 'Verifique se ele está ativo e rodando.'}`,
      );
    } finally {
      setSyncingOpenCode(false);
    }
  };

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
        setPreferences({
          verifiedProviders: {
            ...(preferences.verifiedProviders ?? {}),
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

  const activeModelsList = useMemo(() => {
    return [...NATIVE_MODELS, ...(preferences.customModels ?? [])].filter(
      (m) => preferences.enabledModels?.[m.id] !== false,
    );
  }, [preferences.customModels, preferences.enabledModels]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* SEÇÃO MODELS */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
            margin: 0,
          }}
        >
          Models
        </h2>

        <div
          style={{
            padding: '16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--fg-muted)',
            }}
          >
            Task Models
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                flex: 1,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                Explore Subagent Model
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                Choose the model used by the Explore subagent for initial
                research
              </span>
            </div>
            <select
              value={
                preferences.taskModels?.exploreSubagent || 'Claude 3.5 Sonnet'
              }
              onChange={(e) =>
                setPreferences({
                  taskModels: {
                    ...(preferences.taskModels ?? {}),
                    exploreSubagent: e.target.value,
                  },
                })
              }
              style={{
                padding: '6px 10px',
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                outline: 'none',
                cursor: 'pointer',
                width: '200px',
              }}
            >
              {activeModelsList.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                flex: 1,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                Chat Default Model
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                Choose the default model used for main workspace chats
              </span>
            </div>
            <select
              value={preferences.taskModels?.chatDefault || 'Claude 3.5 Sonnet'}
              onChange={(e) =>
                setPreferences({
                  taskModels: {
                    ...(preferences.taskModels ?? {}),
                    chatDefault: e.target.value,
                  },
                })
              }
              style={{
                padding: '6px 10px',
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                outline: 'none',
                cursor: 'pointer',
                width: '200px',
              }}
            >
              {activeModelsList.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Search size={14} style={{ color: 'var(--fg-faint)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Add or search model"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--fg)',
                fontSize: '12px',
              }}
            />
          </div>
          <button
            type="button"
            title="Refresh models status"
            onClick={handleSyncOpenCodeProviders}
            style={{
              padding: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {!isSearchModelInList && searchQuery.trim().length > 0 && (
          <form
            onSubmit={handleAddCustomModelInline}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '14px',
              background: 'var(--bg)',
              border: '1px dashed var(--accent)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
              }}
            >
              Adicionar Modelo Customizado Inline
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                required
                value={inlineModelName}
                onChange={(e) => setInlineModelName(e.target.value)}
                placeholder="Enter model name"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                required
                value={inlineModelId}
                onChange={(e) => setInlineModelId(e.target.value)}
                placeholder="Model ID (ex: custom-gpt4)"
                style={{
                  flex: 1,
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

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={inlineModelProvider}
                onChange={(e) => setInlineModelProvider(e.target.value)}
                style={{
                  width: '120px',
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
                <option value="Custom">Custom</option>
              </select>

              <input
                type="text"
                value={inlineModelBaseUrl}
                onChange={(e) => setInlineModelBaseUrl(e.target.value)}
                placeholder="Base URL / Custom Endpoint"
                style={{
                  flex: 1,
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

            <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
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
                Add
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg)',
          }}
        >
          {filteredModelsList.map((m) => {
            const isEnabled = preferences.enabledModels?.[m.id] !== false;
            const isCustom = !NATIVE_MODELS.some((n) => n.id === m.id);

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>
                    {m.name}
                  </span>
                  <span
                    style={{ fontSize: '10.5px', color: 'var(--fg-faint)' }}
                  >
                    {m.provider} {isCustom && '· Customizado'}
                  </span>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
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
                      checked={isEnabled}
                      onChange={(e) =>
                        handleToggleModel(m.id, e.target.checked)
                      }
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isEnabled
                          ? 'var(--status-working, #4caf50)'
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
                          left: isEnabled ? '16px' : '2px',
                          bottom: '2px',
                          backgroundColor: '#fff',
                          transition: '0.2s',
                          borderRadius: '50%',
                        }}
                      />
                    </span>
                  </label>

                  {isCustom && (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO API KEYS (COLAPSÁVEL) */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <button
          type="button"
          onClick={() => setApiKeysExpanded(!apiKeysExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
            color: 'var(--fg)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            textAlign: 'left',
            outline: 'none',
          }}
        >
          <span>API Keys</span>
          {apiKeysExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {apiKeysExpanded && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* OpenAI */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                OpenAI API Key
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                You can put in your OpenAI key to use OpenAI models at cost.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={preferences.openaiApiKey || ''}
                  onChange={(e) => {
                    setPreferences({ openaiApiKey: e.target.value });
                    setVerifyStatus((prev) => ({
                      ...prev,
                      OpenAI: { loading: false, success: false, error: null },
                    }));
                  }}
                  placeholder="Enter your OpenAI API Key"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={verifyStatus['OpenAI']?.loading}
                  onClick={() =>
                    handleVerifyKey('OpenAI', preferences.openaiApiKey)
                  }
                  style={{
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-on)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {verifyStatus['OpenAI']?.loading && (
                    <RotateCw
                      size={12}
                      className="spin-animation"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  )}
                  Verify
                </button>
              </div>
              {verifyStatus['OpenAI']?.error && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#ff4d4f',
                    fontWeight: 500,
                  }}
                >
                  {verifyStatus['OpenAI']?.error}
                </span>
              )}
              {preferences.verifiedProviders?.['OpenAI'] === true && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: 'var(--status-working, #4caf50)',
                    fontWeight: 600,
                  }}
                >
                  Chave verificada com sucesso!
                </span>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={overrideOpenaiUrl}
                    onChange={(e) => setOverrideOpenaiUrl(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Override OpenAI Base URL
                </label>
              </div>
              {overrideOpenaiUrl && (
                <input
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="Change the base URL for OpenAI API requests."
                  style={{
                    padding: '6px 10px',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    outline: 'none',
                    marginTop: '4px',
                  }}
                />
              )}
            </div>

            {/* Anthropic */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                Anthropic API Key
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                You can put in your Anthropic key to use Claude at cost. When
                enabled, this key will be used for all models beginning with
                'claude-'.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={preferences.anthropicApiKey || ''}
                  onChange={(e) => {
                    setPreferences({ anthropicApiKey: e.target.value });
                    setVerifyStatus((prev) => ({
                      ...prev,
                      Anthropic: {
                        loading: false,
                        success: false,
                        error: null,
                      },
                    }));
                  }}
                  placeholder="Enter your Anthropic API Key"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={verifyStatus['Anthropic']?.loading}
                  onClick={() =>
                    handleVerifyKey('Anthropic', preferences.anthropicApiKey)
                  }
                  style={{
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-on)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {verifyStatus['Anthropic']?.loading && (
                    <RotateCw
                      size={12}
                      className="spin-animation"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  )}
                  Verify
                </button>
              </div>
              {verifyStatus['Anthropic']?.error && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#ff4d4f',
                    fontWeight: 500,
                  }}
                >
                  {verifyStatus['Anthropic']?.error}
                </span>
              )}
              {preferences.verifiedProviders?.['Anthropic'] === true && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: 'var(--status-working, #4caf50)',
                    fontWeight: 600,
                  }}
                >
                  Chave verificada com sucesso!
                </span>
              )}
            </div>

            {/* Google Gemini */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                Google Gemini API Key
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                Enter your Google AI Studio key to use Gemini models.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={preferences.googleApiKey || ''}
                  onChange={(e) => {
                    setPreferences({ googleApiKey: e.target.value });
                    setVerifyStatus((prev) => ({
                      ...prev,
                      Google: { loading: false, success: false, error: null },
                    }));
                  }}
                  placeholder="Enter your Google Gemini API Key"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={verifyStatus['Google']?.loading}
                  onClick={() =>
                    handleVerifyKey('Google', preferences.googleApiKey)
                  }
                  style={{
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-on)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {verifyStatus['Google']?.loading && (
                    <RotateCw
                      size={12}
                      className="spin-animation"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  )}
                  Verify
                </button>
              </div>
              {verifyStatus['Google']?.error && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#ff4d4f',
                    fontWeight: 500,
                  }}
                >
                  {verifyStatus['Google']?.error}
                </span>
              )}
              {preferences.verifiedProviders?.['Google'] === true && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: 'var(--status-working, #4caf50)',
                    fontWeight: 600,
                  }}
                >
                  Chave verificada com sucesso!
                </span>
              )}
            </div>

            {/* DeepSeek */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                DeepSeek API Key
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                Put in your DeepSeek key to use DeepSeek V3 and DeepSeek R1.
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={preferences.deepseekApiKey || ''}
                  onChange={(e) => {
                    setPreferences({ deepseekApiKey: e.target.value });
                    setVerifyStatus((prev) => ({
                      ...prev,
                      DeepSeek: { loading: false, success: false, error: null },
                    }));
                  }}
                  placeholder="Enter your DeepSeek API Key"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={verifyStatus['DeepSeek']?.loading}
                  onClick={() =>
                    handleVerifyKey('DeepSeek', preferences.deepseekApiKey)
                  }
                  style={{
                    padding: '6px 14px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-on)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {verifyStatus['DeepSeek']?.loading && (
                    <RotateCw
                      size={12}
                      className="spin-animation"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  )}
                  Verify
                </button>
              </div>
              {verifyStatus['DeepSeek']?.error && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#ff4d4f',
                    fontWeight: 500,
                  }}
                >
                  {verifyStatus['DeepSeek']?.error}
                </span>
              )}
              {preferences.verifiedProviders?.['DeepSeek'] === true && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: 'var(--status-working, #4caf50)',
                    fontWeight: 600,
                  }}
                >
                  Chave verificada com sucesso!
                </span>
              )}
            </div>

            {/* OpenCode Headless Server */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Server size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  OpenCode Local Headless Server
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fg-faint)',
                  lineHeight: 1.4,
                }}
              >
                Configurações do servidor autônomo do OpenCode para
                sincronização bidirecional de chaves e status de modelos.
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--fg-muted)' }}>
                    Port
                  </span>
                  <input
                    type="number"
                    value={preferences.opencodePort}
                    onChange={(e) =>
                      setPreferences({
                        opencodePort: parseInt(e.target.value) || 4096,
                      })
                    }
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
                    flex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--fg-muted)' }}>
                    Hostname
                  </span>
                  <input
                    type="text"
                    value={preferences.opencodeHostname}
                    onChange={(e) =>
                      setPreferences({ opencodeHostname: e.target.value })
                    }
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
                    flex: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--fg-muted)' }}>
                    Server Password
                  </span>
                  <input
                    type="password"
                    value={preferences.opencodePassword || ''}
                    onChange={(e) =>
                      setPreferences({ opencodePassword: e.target.value })
                    }
                    placeholder="OPENCODE_SERVER_PASSWORD"
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
                type="button"
                disabled={syncingOpenCode}
                onClick={handleSyncOpenCodeProviders}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  padding: '6px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {syncingOpenCode ? (
                  <RotateCw
                    size={12}
                    className="spin-animation"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                ) : (
                  'Sincronizar com OpenCode'
                )}
              </button>
            </div>

            {/* Azure OpenAI */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                    Azure OpenAI
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-faint)',
                      lineHeight: 1.4,
                    }}
                  >
                    Use Azure OpenAI deployments for secure corporate instances.
                  </span>
                </div>

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
                    checked={azureEnabled}
                    onChange={(e) => setAzureEnabled(e.target.checked)}
                    style={{
                      opacity: 0,
                      width: 0,
                      height: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: azureEnabled
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
                        left: azureEnabled ? '16px' : '2px',
                        bottom: '2px',
                        backgroundColor: '#fff',
                        transition: '0.2s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>

              {azureEnabled && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '6px',
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
                      style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                    >
                      Base URL
                    </span>
                    <input
                      type="text"
                      value={azureBaseUrl}
                      onChange={(e) => setAzureBaseUrl(e.target.value)}
                      placeholder="e.g. my-resource.openai.azure.com"
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
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                        Deployment Name
                      </span>
                      <input
                        type="text"
                        value={azureDeploymentName}
                        onChange={(e) => setAzureDeploymentName(e.target.value)}
                        placeholder="e.g. gpt-35-turbo"
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
                        flex: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                      >
                        API Key
                      </span>
                      <input
                        type="password"
                        value={azureApiKey}
                        onChange={(e) => setAzureApiKey(e.target.value)}
                        placeholder="Azure API Key"
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
                </div>
              )}
            </div>

            {/* AWS Bedrock */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    AWS Bedrock
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--fg-faint)',
                      lineHeight: 1.4,
                    }}
                  >
                    Use models from AWS Bedrock directly at cost.
                  </span>
                </div>

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
                    checked={bedrockEnabled}
                    onChange={(e) => setBedrockEnabled(e.target.checked)}
                    style={{
                      opacity: 0,
                      width: 0,
                      height: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: bedrockEnabled
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
                        left: bedrockEnabled ? '16px' : '2px',
                        bottom: '2px',
                        backgroundColor: '#fff',
                        transition: '0.2s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>

              {bedrockEnabled && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '6px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                        Access Key ID
                      </span>
                      <input
                        type="text"
                        value={bedrockAccessKey}
                        onChange={(e) => setBedrockAccessKey(e.target.value)}
                        placeholder="e.g. AKIA..."
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
                        Secret Access Key
                      </span>
                      <input
                        type="password"
                        value={bedrockSecretKey}
                        onChange={(e) => setBedrockSecretKey(e.target.value)}
                        placeholder="Secret Key"
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

                  <div style={{ display: 'flex', gap: '8px' }}>
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
                        Region
                      </span>
                      <input
                        type="text"
                        value={bedrockRegion}
                        onChange={(e) => setBedrockRegion(e.target.value)}
                        placeholder="e.g. us-east-1"
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
                        flex: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{ fontSize: '10.5px', color: 'var(--fg-muted)' }}
                      >
                        Test Model
                      </span>
                      <input
                        type="text"
                        value={bedrockTestModel}
                        onChange={(e) => setBedrockTestModel(e.target.value)}
                        placeholder="e.g. us.anthropic.claude-3-5-sonnet-v1:0"
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
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
