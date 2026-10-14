import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  BarChart3,
  CircleHelp,
  Home,
  Info,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  PackageOpen,
  Boxes,
  Sparkles,
  X,
} from 'lucide-react'
import { TrialBanner } from '@/components/TrialBanner'
import { WindowTitleBar } from '@/components/WindowTitleBar'
import { getPublicLicenseStatus } from '@/stores/licenseStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useThemeStore } from '@/stores/themeStore'
import { getConfig, getConfigs, readUserDataFileDataUrl, setConfig } from '@/services/dbService'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { OnboardingTour } from '@/components/OnboardingTour'
import { defaultAppLogoSrc } from '@/lib/appBrand'

const navItems = [
  { to: '/dashboard', key: 'dashboard' as const, icon: Home, doctorOnly: true, group: 'clinical' },
  { to: '/patients', key: 'patients' as const, icon: Users, doctorOnly: false, group: 'clinical' },
  { to: '/orthodontics', key: 'orthodontics' as const, icon: Sparkles, doctorOnly: false, group: 'clinical' },
  { to: '/appointments', key: 'appointments' as const, icon: Activity, doctorOnly: false, group: 'clinical' },
  { to: '/cashbox', key: 'cashbox' as const, icon: Wallet, doctorOnly: true, group: 'finance' },
  { to: '/invoices', key: 'invoices' as const, icon: Receipt, doctorOnly: false, group: 'finance' },
  { to: '/reports', key: 'reports' as const, icon: BarChart3, doctorOnly: true, group: 'finance' },
  { to: '/dental-lab', key: 'dentalLab' as const, icon: Truck, doctorOnly: false, group: 'logistics' },
  { to: '/distributors', key: 'distributors' as const, icon: PackageOpen, doctorOnly: true, group: 'logistics' },
  { to: '/inventory', key: 'inventory' as const, icon: Boxes, doctorOnly: false, group: 'logistics' },
  { to: '/settings', key: 'settings' as const, icon: Settings, doctorOnly: false, group: 'system' },
  { to: '/ask-me', key: 'askMe' as const, icon: CircleHelp, doctorOnly: false, group: 'system' },
  { to: '/about', key: 'about' as const, icon: Info, doctorOnly: false, group: 'system' },
] as const

const navGroups = [
  { id: 'clinical', labelAr: 'السريرية والمرضى', labelEn: 'Clinical & Patients' },
  { id: 'finance', labelAr: 'المالية والصندوق', labelEn: 'Financial Management' },
  { id: 'logistics', labelAr: 'المخبر والموردين والمخزون', labelEn: 'Lab, Suppliers & Inventory' },
  { id: 'system', labelAr: 'النظام والمساعدة', labelEn: 'System & Tools' },
] as const

const mobileBottomKeys = ['dashboard', 'patients', 'appointments', 'invoices'] as const

export function DashboardShell() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const user = useSessionStore((s) => s.user)
  const setUser = useSessionStore((s) => s.setUser)
  const status = getPublicLicenseStatus()
  const sidebarId = useThemeStore((s) => s.sidebarId)
  const isLight = sidebarId === 'light'

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??'

  const [clinicLogo, setClinicLogo] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const visibleNav = navItems.filter((item) => !item.doctorOnly || user?.role === 'doctor')
  const bottomNav = visibleNav.filter((item) =>
    (mobileBottomKeys as readonly string[]).includes(item.key),
  )

  useEffect(() => {
    window.scrollTo(0, 0)
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  useEffect(() => {
    getConfigs(['clinic_logo_path']).then(async (cfg) => {
      if (cfg.clinic_logo_path) {
        try {
          const raw = await readUserDataFileDataUrl(cfg.clinic_logo_path)
          if (raw) setClinicLogo(raw)
        } catch {
          /* ignore */
        }
      }
    })
  }, [])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const done = await getConfig('onboarding_tour_done')
        if (mounted && done !== '1') setTourOpen(true)
      } catch {
        if (mounted) setTourOpen(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handler = () => setTourOpen(true)
    window.addEventListener('dentassist:start-tour', handler as EventListener)
    return () => window.removeEventListener('dentassist:start-tour', handler as EventListener)
  }, [])

  const renderNavLink = (item: (typeof navItems)[number], compact = false) => {
    const { to, key, icon: Icon } = item

    return (
      <NavLink
        key={to}
        to={to}
        data-tour={`nav-${key}`}
        onClick={() => setMobileNavOpen(false)}
        className={({ isActive }) => {
          if (compact) {
            return `flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors ${
              isActive ? 'text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }

          if (isLight) {
            return `group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? 'bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }

          return `group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
            isActive
              ? 'bg-white/10 text-white font-bold border border-white/10 shadow-xs'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`
        }}
      >
        {({ isActive }) =>
          compact ? (
            <>
              <Icon
                className={`size-5 shrink-0 ${isActive ? 'text-teal-300' : 'text-slate-400'}`}
                aria-hidden
              />
              <span className="max-w-[4.5rem] truncate text-center">{t(`shell.nav.${key}`)}</span>
            </>
          ) : (
            <>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isLight
                    ? isActive
                      ? 'bg-teal-100/90 text-teal-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800'
                    : isActive
                      ? 'bg-white/15 text-teal-300'
                      : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200'
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
              </div>
              <span className="flex-1 truncate">{t(`shell.nav.${key}`)}</span>
              {isActive ? (
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    isLight
                      ? 'bg-teal-600'
                      : 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]'
                  }`}
                />
              ) : null}
            </>
          )
        }
      </NavLink>
    )
  }

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col overflow-hidden"
      style={{ background: '#f0f4f8' }}
    >
      <OnboardingTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={() => {
          setTourOpen(false)
          void setConfig('onboarding_tour_done', '1')
        }}
      />
      <WindowTitleBar />
      {status === 'trial' ? <TrialBanner /> : null}

      {/* ─── Mobile header ─── */}
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 md:hidden"
        style={{
          background: isLight ? '#ffffff' : 'linear-gradient(180deg, var(--sidebar-from, #0d1424) 0%, var(--sidebar-to, #111827) 100%)',
          borderColor: isLight ? '#e2e8f0' : 'var(--sidebar-border, rgba(255,255,255,0.05))',
        }}
      >
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl transition ${
            isLight
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-slate-300 hover:bg-white/10'
          }`}
          aria-label={t('shell.menuOpen')}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 shadow-2xs border border-slate-200/60">
            <img
              src={clinicLogo || defaultAppLogoSrc()}
              alt=""
              className="size-full object-contain"
            />
          </div>
          <motion.div className="min-w-0">
            <p className={`truncate text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              DentAssist Pro
            </p>
            {user ? (
              <p className={`truncate text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {user.username} · <span className="text-teal-600 font-semibold">{t(`roles.${user.role}`)}</span>
              </p>
            ) : null}
          </motion.div>
        </div>
        <button
          type="button"
          onClick={() => setUser(null)}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
          title={t('shell.logOut')}
          aria-label={t('shell.logOut')}
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </header>

      {/* ─── Mobile drawer ─── */}
      <AnimatePresence>
        {mobileNavOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label={t('shell.menuClose')}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              className={`fixed inset-y-0 start-0 z-[91] flex w-[min(88vw,21rem)] flex-col shadow-2xl md:hidden overflow-hidden ${
                isLight ? 'bg-white border-e border-slate-200' : ''
              }`}
              style={{
                background: isLight
                  ? '#ffffff'
                  : 'linear-gradient(180deg, var(--sidebar-from, #0d1424) 0%, var(--sidebar-to, #111827) 100%)',
              }}
              initial={reducedMotion ? { opacity: 1 } : { x: isAr ? '100%' : '-100%' }}
              animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: isAr ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              {/* Drawer Header */}
              <div
                className={`flex shrink-0 items-center justify-between px-4 py-4 border-b ${
                  isLight ? 'border-slate-100 bg-slate-50/50' : 'border-white/5 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200/80">
                    <img
                      src={clinicLogo || defaultAppLogoSrc()}
                      alt="DentAssist Logo"
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        DentAssist
                      </p>
                      <span className="text-[11px] font-bold text-teal-600">Pro</span>
                    </div>
                    <p className={`truncate text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {isAr ? 'عيادة طب الأسنان' : 'Dental EHR System'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex size-9 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                    isLight
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                  }`}
                  aria-label={t('shell.menuClose')}
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* User profile card inside drawer */}
              {user && (
                <div className="px-3 pt-3">
                  <div
                    className={`flex items-center gap-3 rounded-xl p-2.5 border ${
                      isLight
                        ? 'bg-slate-50/80 border-slate-200/70 text-slate-900'
                        : 'bg-white/5 border-white/5 text-white'
                    }`}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-2xs"
                      style={{ background: 'var(--color-primary, #0d9488)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        {user.username}
                      </p>
                      <p className="text-[10px] font-semibold text-teal-600">
                        {t(`roles.${user.role}`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Categorized Navigation Body */}
              <nav className="thin-scrollbar flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {navGroups.map((group) => {
                  const groupItems = visibleNav.filter((i) => i.group === group.id)
                  if (groupItems.length === 0) return null

                  return (
                    <div key={group.id} className="space-y-1">
                      <p
                        className={`px-3 text-[10px] font-bold uppercase tracking-wider ${
                          isLight ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {isAr ? group.labelAr : group.labelEn}
                      </p>
                      <div className="space-y-0.5">
                        {groupItems.map((item) => renderNavLink(item))}
                      </div>
                    </div>
                  )
                })}
              </nav>

              {/* Drawer Footer */}
              <div
                className={`shrink-0 border-t p-3 space-y-2 ${
                  isLight ? 'border-slate-100 bg-slate-50/60' : 'border-white/5 bg-white/5'
                }`}
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false)
                    setUser(null)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                    isLight
                      ? 'border border-rose-200/80 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
                      : 'border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                  }`}
                >
                  <LogOut className="size-4" />
                  <span>{t('shell.logOut')}</span>
                </button>

                <p
                  className={`text-center text-[10px] font-medium ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  DentAssist Pro · {isAr ? 'العيادة الذكية' : 'Clinical Offline Edition'}
                </p>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">
        {/* ─── Desktop sidebar ─── */}
        <aside
          data-tour="sidebar"
          className={`hidden shrink-0 flex-col md:flex md:w-[260px] h-full overflow-hidden ${
            isLight ? 'bg-white border-e border-slate-200/80' : ''
          }`}
          style={{
            background: isLight
              ? '#ffffff'
              : 'linear-gradient(180deg, var(--sidebar-from, #0d1424) 0%, var(--sidebar-to, #111827) 100%)',
            borderInlineEnd: isLight
              ? '1px solid #e2e8f0'
              : '1px solid var(--sidebar-border, rgba(255,255,255,0.05))',
          }}
        >
          <div
            className={`flex items-center gap-3.5 border-b px-6 py-6 ${
              isLight ? 'border-slate-100' : 'border-white/5'
            }`}
          >
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm border border-slate-200/80">
              <img
                src={clinicLogo || defaultAppLogoSrc()}
                alt="DentAssist Logo"
                className="size-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                DentAssist
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-primary, #2dd4bf)' }}>
                Pro
              </p>
            </div>
          </div>

          <nav className="dark-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
            {navGroups.map((group) => {
              const groupItems = visibleNav.filter((i) => i.group === group.id)
              if (groupItems.length === 0) return null

              return (
                <div key={group.id} className="space-y-1">
                  <p
                    className={`px-3 text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {isAr ? group.labelAr : group.labelEn}
                  </p>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => renderNavLink(item))}
                  </div>
                </div>
              )
            })}
          </nav>

          {user ? (
            <div className={`border-t px-3 py-4 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
              <motion.div
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/5 text-slate-200'
                }`}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs"
                  style={{ background: 'var(--color-primary, #0d9488)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {user.username}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-primary, #2dd4bf)' }}>
                    {t(`roles.${user.role}`)}
                  </p>
                </div>
                <button
                  type="button"
                  title={t('shell.logOut')}
                  onClick={() => setUser(null)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </motion.div>
            </div>
          ) : null}
        </aside>

        {/* ─── Main content ─── */}
        <main className="app-main-content thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-3.5 pb-28 sm:px-6 sm:pt-6 sm:pb-28 md:px-8 md:pt-8 md:pb-12">
          <div data-tour="main-content" className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: 'easeOut' }}
                className="flex min-h-0 min-w-0 flex-1 flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ─── Modern Mobile Bottom Navigation (Glassmorphic Dock) ─── */}
      <nav
        data-tour="mobile-bottom-nav"
        className={`fixed inset-x-0 bottom-0 z-30 md:hidden border-t transition-colors ${
          isLight
            ? 'border-slate-200/80 bg-white/92 backdrop-blur-xl shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.08)]'
            : 'border-white/10 bg-[#0d1424]/92 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.4)]'
        }`}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)',
        }}
        aria-label={t('shell.nav.menu')}
      >
        <div className="flex items-center justify-around px-1 pt-1.5">
          {bottomNav.map((item) => {
            const { to, key, icon: Icon } = item
            const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
            const label = key === 'appointments' && isAr ? 'المواعيد' : t(`shell.nav.${key}`)

            return (
              <NavLink
                key={to}
                to={to}
                data-tour={`nav-${key}`}
                className="group relative flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95"
              >
                {/* Active Indicator Top Glow Line */}
                {isActive && (
                  <motion.span
                    layoutId="mobileNavTopPill"
                    className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Capsule Icon Box */}
                <div
                  className={`flex h-7.5 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? isLight
                        ? 'bg-teal-100/80 text-teal-800 ring-1 ring-teal-300/70 shadow-2xs scale-105'
                        : 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30 shadow-xs scale-105'
                      : isLight
                        ? 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-100/70'
                        : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                  }`}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </div>

                {/* Label */}
                <span
                  className={`mt-0.5 max-w-[4.5rem] truncate text-center text-[10px] tracking-tight transition-colors ${
                    isActive
                      ? isLight
                        ? 'font-extrabold text-teal-800'
                        : 'font-extrabold text-teal-300'
                      : isLight
                        ? 'font-medium text-slate-500 group-hover:text-slate-700'
                        : 'font-medium text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            )
          })}

          {/* More Menu Trigger Button */}
          <button
            type="button"
            data-tour="mobile-menu-more"
            onClick={() => setMobileNavOpen(true)}
            className="group relative flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95"
          >
            {mobileNavOpen && (
              <motion.span
                layoutId="mobileNavTopPill"
                className="absolute -top-1.5 h-0.5 w-7 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <div
              className={`flex h-7.5 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                mobileNavOpen
                  ? isLight
                    ? 'bg-teal-100/80 text-teal-800 ring-1 ring-teal-300/70 shadow-2xs scale-105'
                    : 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30 shadow-xs scale-105'
                  : isLight
                    ? 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-100/70'
                    : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
              }`}
            >
              <Menu className="size-[18px]" aria-hidden />
            </div>

            <span
              className={`mt-0.5 max-w-[4.5rem] truncate text-center text-[10px] tracking-tight transition-colors ${
                mobileNavOpen
                  ? isLight
                    ? 'font-extrabold text-teal-800'
                    : 'font-extrabold text-teal-300'
                  : isLight
                    ? 'font-medium text-slate-500 group-hover:text-slate-700'
                    : 'font-medium text-slate-400 group-hover:text-slate-300'
              }`}
            >
              {t('shell.nav.more')}
            </span>
          </button>
        </div>
      </nav>
    </div>
  )
}
