import { create } from 'zustand'
import type { DbUser } from '@/types/user'

type SessionState = {
  user: DbUser | null
  setUser: (user: DbUser | null) => void
}

const STORAGE_KEY = 'dentassist_auth_session'

function getInitialUser(): DbUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DbUser
  } catch {
    return null
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  user: getInitialUser(),
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
    set({ user })
  },
}))
