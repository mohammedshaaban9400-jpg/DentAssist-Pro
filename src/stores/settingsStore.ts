import { create } from 'zustand'

type SettingsState = {
  currency: string
  exchangeRate: number
  setSettings: (currency: string, exchangeRate: number) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'SYP',
  exchangeRate: 1,
  setSettings: (currency, exchangeRate) => set({ currency, exchangeRate }),
}))
