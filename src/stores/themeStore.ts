import { create } from 'zustand'

export type FontOption = {
  id: string
  nameAr: string
  nameEn: string
  family: string
  sampleText: string
}

export type ColorOption = {
  id: string
  nameAr: string
  nameEn: string
  primary: string
  hover: string
  light: string
  glow: string
}

export type SidebarOption = {
  id: string
  nameAr: string
  nameEn: string
  from: string
  to: string
  border: string
  isLight?: boolean
}

export const FONTS: FontOption[] = [
  {
    id: 'tajawal',
    nameAr: 'تجوّل (افتراضي)',
    nameEn: 'Tajawal (Default)',
    family: "'Tajawal', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'cairo',
    nameAr: 'القاهرة (Cairo)',
    nameEn: 'Cairo',
    family: "'Cairo', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'alexandria',
    nameAr: 'الإسكندرية (Alexandria)',
    nameEn: 'Alexandria',
    family: "'Alexandria', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'almarai',
    nameAr: 'المراعي (Almarai)',
    nameEn: 'Almarai',
    family: "'Almarai', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'readex',
    nameAr: 'ريدكس برو (Readex Pro)',
    nameEn: 'Readex Pro',
    family: "'Readex Pro', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'ibm',
    nameAr: 'آي بي إم بليكس (IBM Plex)',
    nameEn: 'IBM Plex Sans Arabic',
    family: "'IBM Plex Sans Arabic', sans-serif",
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
  {
    id: 'system',
    nameAr: 'خط النظام الافتراضي',
    nameEn: 'System Default',
    family: 'system-ui, -apple-system, sans-serif',
    sampleText: 'دنت أسيست برو — عيادة الأسنان الحديثة',
  },
]

export const COLORS: ColorOption[] = [
  {
    id: 'teal',
    nameAr: 'التركواز السريري (الافتراضي)',
    nameEn: 'Clinical Teal (Default)',
    primary: '#0d9488',
    hover: '#0f766e',
    light: '#ccfbf1',
    glow: 'rgba(13, 148, 136, 0.25)',
  },
  {
    id: 'blue',
    nameAr: 'الأزرق الملكي',
    nameEn: 'Royal Blue',
    primary: '#2563eb',
    hover: '#1d4ed8',
    light: '#dbeafe',
    glow: 'rgba(37, 99, 235, 0.25)',
  },
  {
    id: 'emerald',
    nameAr: 'الزمردي الطبيعي',
    nameEn: 'Emerald Green',
    primary: '#059669',
    hover: '#047857',
    light: '#d1fae5',
    glow: 'rgba(5, 150, 105, 0.25)',
  },
  {
    id: 'indigo',
    nameAr: 'البنفسجي الراقي',
    nameEn: 'Indigo Luxury',
    primary: '#6366f1',
    hover: '#4f46e5',
    light: '#e0e7ff',
    glow: 'rgba(99, 102, 241, 0.25)',
  },
  {
    id: 'sky',
    nameAr: 'السماوي الهادئ',
    nameEn: 'Calm Sky',
    primary: '#0284c7',
    hover: '#0369a1',
    light: '#e0f2fe',
    glow: 'rgba(2, 132, 199, 0.25)',
  },
  {
    id: 'rose',
    nameAr: 'المرجاني الأنيق',
    nameEn: 'Coral Rose',
    primary: '#e11d48',
    hover: '#be123c',
    light: '#ffe4e6',
    glow: 'rgba(225, 29, 72, 0.25)',
  },
  {
    id: 'amber',
    nameAr: 'الذهبي الفاخر',
    nameEn: 'Golden Amber',
    primary: '#d97706',
    hover: '#b45309',
    light: '#fef3c7',
    glow: 'rgba(217, 119, 6, 0.25)',
  },
  {
    id: 'slate',
    nameAr: 'التيتانيوم العصري',
    nameEn: 'Modern Titanium',
    primary: '#475569',
    hover: '#334155',
    light: '#f1f5f9',
    glow: 'rgba(71, 85, 105, 0.25)',
  },
]

export const SIDEBAR_THEMES: SidebarOption[] = [
  {
    id: 'midnight',
    nameAr: 'الكحلي الليلي (الافتراضي)',
    nameEn: 'Midnight Navy (Default)',
    from: '#0d1424',
    to: '#111827',
    border: 'rgba(255, 255, 255, 0.05)',
  },
  {
    id: 'onyx',
    nameAr: 'الأسود الفاحم (Onyx)',
    nameEn: 'Deep Onyx',
    from: '#09090b',
    to: '#18181b',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'sapphire',
    nameAr: 'الأزرق الطبي الداكن',
    nameEn: 'Sapphire Medical',
    from: '#0b192c',
    to: '#1e3a5f',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  {
    id: 'steel',
    nameAr: 'الفولاذي الرمادي',
    nameEn: 'Slate Steel',
    from: '#1e293b',
    to: '#334155',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'light',
    nameAr: 'الأبيض النقي الفاتح',
    nameEn: 'Pure Clean Light',
    from: '#ffffff',
    to: '#f8fafc',
    border: '#e2e8f0',
    isLight: true,
  },
]

function applyThemeVariables(fontId: string, colorId: string, sidebarId: string) {
  if (typeof document === 'undefined') return

  const font = FONTS.find((f) => f.id === fontId) || FONTS[0]
  const color = COLORS.find((c) => c.id === colorId) || COLORS[0]
  const sidebar = SIDEBAR_THEMES.find((s) => s.id === sidebarId) || SIDEBAR_THEMES[0]

  const root = document.documentElement
  root.style.setProperty('--app-font-family', font.family)
  root.style.setProperty('--color-primary', color.primary)
  root.style.setProperty('--color-primary-hover', color.hover)
  root.style.setProperty('--color-primary-light', color.light)
  root.style.setProperty('--color-primary-glow', color.glow)
  root.style.setProperty('--sidebar-from', sidebar.from)
  root.style.setProperty('--sidebar-to', sidebar.to)
  root.style.setProperty('--sidebar-border', sidebar.border)
  root.setAttribute('data-sidebar-light', sidebar.isLight ? 'true' : 'false')
}

type ThemeState = {
  fontId: string
  colorId: string
  sidebarId: string
  setFont: (id: string) => void
  setColor: (id: string) => void
  setSidebar: (id: string) => void
  initTheme: () => void
}

const STORAGE_KEY = 'dentassist_theme_prefs'

export const useThemeStore = create<ThemeState>((set, get) => ({
  fontId: 'tajawal',
  colorId: 'teal',
  sidebarId: 'midnight',

  setFont: (fontId) => {
    set({ fontId })
    const { colorId, sidebarId } = get()
    applyThemeVariables(fontId, colorId, sidebarId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontId, colorId, sidebarId }))
    } catch { /* ignore */ }
  },

  setColor: (colorId) => {
    set({ colorId })
    const { fontId, sidebarId } = get()
    applyThemeVariables(fontId, colorId, sidebarId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontId, colorId, sidebarId }))
    } catch { /* ignore */ }
  },

  setSidebar: (sidebarId) => {
    set({ sidebarId })
    const { fontId, colorId } = get()
    applyThemeVariables(fontId, colorId, sidebarId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontId, colorId, sidebarId }))
    } catch { /* ignore */ }
  },

  initTheme: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { fontId?: string; colorId?: string; sidebarId?: string }
        const f = parsed.fontId || 'tajawal'
        const c = parsed.colorId || 'teal'
        const s = parsed.sidebarId || 'midnight'
        set({ fontId: f, colorId: c, sidebarId: s })
        applyThemeVariables(f, c, s)
        return
      }
    } catch { /* ignore */ }
    applyThemeVariables('tajawal', 'teal', 'midnight')
  },
}))
