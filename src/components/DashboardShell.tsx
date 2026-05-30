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
  X,
} from 'lucide-react'
import { TrialBanner } from '@/components/TrialBanner'
import { WindowTitleBar } from '@/components/WindowTitleBar'
import { getPublicLicenseStatus } from '@/stores/licenseStore'
import { useSessionStore } from '@/stores/sessionStore'
import { getConfig, getConfigs, readUserDataFileDataUrl, setConfig } from '@/services/dbService'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { OnboardingTour } from '@/components/OnboardingTour'
import { defaultAppLogoSrc } from '@/lib/appBrand'

const navItems = [
  { to: '/dashboard', key: 'dashboard' as const, icon: Home, doctorOnly: true },
  { to: '/patients', key: 'patients' as const, icon: Users, doctorOnly: false },
  { to: '/appointments', key: 'appointments' as const, icon: Activity, doctorOnly: false },
  { to: '/cashbox', key: 'cashbox' as const, icon: Wallet, doctorOnly: true },
  { to: '/invoices', key: 'invoices' as const, icon: Receipt, doctorOnly: false },
  { to: '/reports', key: 'reports' as const, icon: BarChart3, doctorOnly: true },
  { to: '/dental-lab', key: 'dentalLab' as const, icon: Truck, doctorOnly: false },
  { to: '/distributors', key: 'distributors' as const, icon: PackageOpen, doctorOnly: true },
  { to: '/settings', key: 'settings' as const, icon: Settings, doctorOnly: false },
  { to: '/ask-me', key: 'askMe' as const, icon: CircleHelp, doctorOnly: false },
  { to: '/about', key: 'about' as const, icon: Info, doctorOnly: false },
] as const

const mobileBottomKeys = ['dashboard', 'patients', 'appointments', 'invoices'] as const

function navLinkClass(isActive: boolean, compact = false): string {
  return [
    compact
      ? 'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-tight'
      : 'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
    isActive
      ? compact
        ? 'text-teal-300'
        : 'bg-teal-500/15 text-teal-300 shadow-sm'
      : compact
        ? 'text-slate-400'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  ].join(' ')
}

export function DashboardShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const user = useSessionStore((s) => s.user)
  const setUser = useSessionStore((s) => s.setUser)
  const status = getPublicLicenseStatus()

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '??'

  const [clinicLogo, setClinicLogo] = useState<string | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const visibleNav = navItems.filter((item) => !item.doctorOnly || user?.role === 'doctor')
  const bottomNav = visibleNav.filter((item) =>
    (mobileBottomKeys as readonly string[]).includes(item.key),
  )

  useEffect(() => {
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
        className={({ isActive }) => navLinkClass(isActive, compact)}
      >
        {({ isActive }) =>
          compact ? (
            <>
              <Icon className={`size-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} aria-hidden />
              <span className="max-w-[4.5rem] truncate text-center">{t(`shell.nav.${key}`)}</span>
            </>
          ) : (
            <>
              <motion.div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? 'bg-teal-500/20' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`size-[17px] ${isActive ? 'text-teal-400' : 'text-slate-500'}`}
                  aria-hidden
                />
              </motion.div>
              <span className="flex-1 truncate">{t(`shell.nav.${key}`)}</span>
              {isActive ? (
                <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_6px_2px_rgba(20,184,166,0.5)]" />
              ) : null}
            </>
          )
        }
      </NavLink>
    )
  }

  return (
    <motion.div
      className="flex h-full min-h-0 flex-col overflow-x-hidden"
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
        className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2.5 md:hidden"
        style={{ background: 'linear-gradient(180deg, #0d1424 0%, #111827 100%)' }}
      >
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10"
          aria-label={t('shell.menuOpen')}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
            <img
              src={clinicLogo || defaultAppLogoSrc()}
              alt=""
              className="size-7 object-contain"
            />
          </div>
          <motion.div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">DentAssist Pro</p>
            {user ? (
              <p className="truncate text-[11px] text-slate-400">
                {user.username} · <span className="text-teal-400">{t(`roles.${user.role}`)}</span>
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
            <motion.button
              type="button"
              className="fixed inset-0 z-[60] bg-slate-900/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label={t('shell.menuClose')}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 end-0 z-[61] flex w-[min(100vw-2.5rem,20rem)] flex-col shadow-2xl md:hidden"
              style={{ background: 'linear-gradient(180deg, #0d1424 0%, #111827 100%)' }}
              initial={reducedMotion ? { opacity: 1 } : { x: '100%' }}
              animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <p className="text-sm font-bold text-white">{t('shell.nav.menu')}</p>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                  aria-label={t('shell.menuClose')}
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="dark-scrollbar flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-0.5">{visibleNav.map((item) => renderNavLink(item))}</div>
              </nav>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ─── Desktop sidebar ─── */}
        <aside
          data-tour="sidebar"
          className="hidden shrink-0 flex-col md:flex md:w-[260px]"
          style={{ background: 'linear-gradient(180deg, #0d1424 0%, #111827 100%)' }}
        >
          <div className="flex items-center gap-3.5 border-b border-white/5 px-6 py-6">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 shadow-lg">
              <img
                src={clinicLogo || defaultAppLogoSrc()}
                alt="DentAssist Logo"
                className="size-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-wide text-white">DentAssist</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-400">Pro</p>
            </div>
          </div>

          <nav className="dark-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {t('shell.nav.menu')}
            </p>
            {visibleNav.map((item) => renderNavLink(item))}
          </nav>

          {user ? (
            <div className="border-t border-white/5 px-3 py-4">
              <motion.div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">{user.username}</p>
                  <p className="text-[11px] text-teal-400">{t(`roles.${user.role}`)}</p>
                </div>
                <button
                  type="button"
                  title={t('shell.logOut')}
                  onClick={() => setUser(null)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </motion.div>
            </div>
          ) : null}
        </aside>

        {/* ─── Main content ─── */}
        <main className="thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:p-5 md:pb-5 md:p-8">
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

      {/* ─── Mobile bottom navigation ─── */}
      <nav
        data-tour="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 md:hidden"
        style={{
          background: 'linear-gradient(180deg, #111827 0%, #0d1424 100%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label={t('shell.nav.menu')}
      >
        <div
          className="grid gap-0 px-1 pt-1"
          style={{ gridTemplateColumns: `repeat(${bottomNav.length + 1}, minmax(0, 1fr))` }}
        >
          {bottomNav.map((item) => renderNavLink(item, true))}
          <button
            type="button"
            data-tour="mobile-menu-more"
            onClick={() => setMobileNavOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium ${
              mobileNavOpen ? 'text-teal-300' : 'text-slate-400'
            }`}
          >
            <Menu className="size-5 shrink-0" aria-hidden />
            <span>{t('shell.nav.more')}</span>
          </button>
        </div>
      </nav>
    </motion.div>
  )
}
