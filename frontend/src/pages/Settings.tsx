import { useSettingsStore } from '../stores/settingsStore'
import { Moon, Sun, Bot, Key, Globe, Save } from 'lucide-react'

export default function Settings() {
  const {
    useMockMode,
    setMockMode,
    theme,
    setTheme,
    selectedModel,
    setSelectedModel,
    apiKey,
    setApiConfig
  } = useSettingsStore()

  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: 'mimo-v2.5', name: 'MiMo V2.5', provider: 'Xiaomi' }
  ]

  return (
    <div className="max-w-3xl space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">设置</h1>
        <p className="text-text-secondary mt-1">
          配置 NexusFlow 的运行参数
        </p>
      </div>

      {/* Mock Mode */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Mock 模式</h3>
              <p className="text-sm text-text-secondary mt-1">
                启用后，所有 AI 调用将返回模拟数据，无需 API Key 即可完整演示所有功能。
              </p>
            </div>
          </div>
          <button
            onClick={() => setMockMode(!useMockMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              useMockMode ? 'bg-primary' : 'bg-surface-2'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                useMockMode ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {useMockMode && (
          <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning">
              当前为 Mock 模式，AI 响应均为模拟数据。申请 MiMo Token 后可切换到真实 API。
            </p>
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-accent" />
              ) : (
                <Sun className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">主题</h3>
              <p className="text-sm text-text-secondary mt-1">
                选择界面外观主题
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              深色
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              浅色
            </button>
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">AI 模型</h3>
            <p className="text-sm text-text-secondary mt-1">
              选择默认使用的 AI 模型
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface-2 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-primary">{model.name}</span>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">{model.provider}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">API 配置</h3>
            <p className="text-sm text-text-secondary mt-1">
              配置 AI 服务的 API Key 和端点
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  API Base URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={apiKey || 'https://api.openai.com/v1'}
                    onChange={(e) => setApiConfig('apiBaseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiConfig('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {useMockMode ? 'Mock 模式已启用，API Key 不会被使用' : '请输入你的 OpenAI 或兼容 API Key'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-lg font-medium text-white hover:opacity-90 transition-opacity flex items-center gap-2">
          <Save className="w-4 h-4" />
          保存设置
        </button>
      </div>
    </div>
  )
}
