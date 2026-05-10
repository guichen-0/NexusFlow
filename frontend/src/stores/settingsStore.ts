import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Mock 模式
  useMockMode: boolean

  // 主题
  theme: 'dark' | 'light'

  // 模型配置
  selectedModel: string
  apiKey: string
  apiBaseUrl: string
  apiFormat: 'openai' | 'anthropic'

  // 操作
  setMockMode: (enabled: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
  setSelectedModel: (model: string) => void
  setApiConfig: (key: string, value: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useMockMode: true,
      theme: 'dark',
      selectedModel: 'deepseek-v3',
      apiKey: '',
      apiBaseUrl: 'https://api.deepseek.com/v1',
      apiFormat: 'openai',

      setMockMode: (enabled) => set({ useMockMode: enabled }),
      setTheme: (theme) => set({ theme }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiConfig: (key, value) => set({ [key]: value })
    }),
    {
      name: 'nexusflow-settings'
    }
  )
)
