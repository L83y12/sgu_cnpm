import { createContext, useContext } from 'react'
import type { SharedState } from './AppState'

export const AppContext = createContext<SharedState | null>(null)

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('AppStateProvider missing')
  return value
}

export const languageLabels: Record<string, string> = { en: 'English', vi: 'Tiếng Việt', ja: '日本語', ko: '한국어', zh: '中文' }
