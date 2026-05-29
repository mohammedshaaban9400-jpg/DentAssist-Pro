import { create } from 'zustand'
import type { DbUser } from '@/types/user'

type SessionState = {
  user: DbUser | null
  setUser: (user: DbUser | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
