import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  Lock,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react'

import {
  createUser,
  getConfigs,
  isDentAssistBridgeAvailable,
  listUsers,
  readUserDataFileDataUrl,
  updateUserPin,
  verifyCredentials,
} from '@/services/dbService'
import type { DbUser } from '@/types/user'
import { useSessionStore } from '@/stores/sessionStore'
import { WindowTitleBar } from '@/components/WindowTitleBar'
import { BrowserWrongLaunchScreen } from '@/components/BrowserWrongLaunchScreen'
import { APP_BUILD_TIME } from '@/lib/buildTime'
import { applyAppLogoFallback, defaultAppLogoSrc } from '@/lib/appBrand'

type LoginMode = 'normal' | 'bootstrap' | 'forcedReset'

function getGreeting(lang: string): string {
  const h = new Date().getHours()
  if (lang === 'ar') {
    if (h < 5) return 'مرحباً بك'
    if (h < 12) return 'صباح الخير'
    if (h < 18) return 'مساء الخير'
    return 'مساء الخير'
  }
  if (h < 5) return 'Welcome'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function pinStrength(pin: string): { score: 0 | 1 | 2 | 3 | 4; label: { ar: string; en: string }; color: string } {
  if (!pin) return { score: 0, label: { ar: '', en: '' }, color: '#e2e8f0' }
  let score = 0
  if (pin.length >= 4) score++
  if (pin.length >= 8) score++
  if (/[A-Za-z]/.test(pin) && /\d/.test(pin)) score++
  if (/[^A-Za-z0-9]/.test(pin)) score++
  const s = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4
  const map: Record<number, { label: { ar: string; en: string }; color: string }> = {
    0: { label: { ar: 'ضعيف جداً', en: 'Too weak' }, color: '#ef4444' },
    1: { label: { ar: 'ضعيف', en: 'Weak' }, color: '#f97316' },
    2: { label: { ar: 'متوسط', en: 'Fair' }, color: '#f59e0b' },
    3: { label: { ar: 'جيد', en: 'Good' }, color: '#10b981' },
    4: { label: { ar: 'قوي', en: 'Strong' }, color: '#059669' },
  }
  return { score: s, ...map[s] }
}

type FloatingFieldProps = {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon: React.ElementType
  rightSlot?: React.ReactNode
  autoComplete?: string
  disabled?: boolean
  hasError?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  onKeyEvent?: (e: ReactKeyboardEvent<HTMLInputElement>) => void
}

function FloatingField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  rightSlot,
  autoComplete,
  disabled,
  hasError,
  inputRef,
  onKeyEvent,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false)
  const float = focused || value.length > 0
  return (
    <div
      className={`relative rounded-xl border bg-white/95 transition-all duration-200 ${
        hasError
          ? 'border-rose-300 ring-2 ring-rose-100'
          : focused
            ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Icon
        className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 transition-colors start-3.5 ${
          focused ? 'text-teal-600' : hasError ? 'text-rose-400' : 'text-slate-400'
        }`}
        aria-hidden
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute z-10 select-none transition-all duration-150 start-9 ${
          float
            ? 'top-1.5 text-[10px] font-semibold uppercase tracking-wider'
            : 'top-1/2 -translate-y-1/2 text-sm font-medium'
        } ${focused ? 'text-teal-700' : hasError ? 'text-rose-500' : 'text-slate-500'}`}
      >
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        onKeyDown={onKeyEvent}
        onKeyUp={onKeyEvent}
        className="block w-full bg-transparent pb-1.5 pe-12 ps-9 pt-5 text-sm font-medium text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      {rightSlot ? (
        <div className="absolute top-1/2 -translate-y-1/2 end-1.5 flex items-center">{rightSlot}</div>
      ) : null}
    </div>
  )
}

function StrengthMeter({ pin, lang }: { pin: string; lang: string }) {
  const { score, label, color } = pinStrength(pin)
  return (
    <div className="mt-1 space-y-1">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <motion.div
            key={seg}
            className="h-1.5 rounded-full"
            initial={false}
            animate={{
              backgroundColor: seg <= score ? color : '#e2e8f0',
              opacity: seg <= score ? 1 : 0.6,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        ))}
      </div>
      {pin ? (
        <p className="text-[11px] font-semibold tabular-nums" style={{ color }}>
          {lang === 'ar' ? label.ar : label.en}
        </p>
      ) : null}
    </div>
  )
}

export function LoginScreen() {
  const { t, i18n } = useTranslation()
  const reducedMotion = useReducedMotion()
  const setUser = useSessionStore((s) => s.setUser)

  const [users, setUsers] = useState<DbUser[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [clinicLogo, setClinicLogo] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string>('')

  const [bootUser, setBootUser] = useState('doctor')
  const [bootPin, setBootPin] = useState('')
  const [bootPin2, setBootPin2] = useState('')
  const [showBootPin, setShowBootPin] = useState(false)
  const [bootBusy, setBootBusy] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const [mustResetUser, setMustResetUser] = useState<DbUser | null>(null)
  const [newPin, setNewPin] = useState('')
  const [newPin2, setNewPin2] = useState('')
  const [showNewPin, setShowNewPin] = useState(false)
  const [pinResetBusy, setPinResetBusy] = useState(false)
  const [pinResetError, setPinResetError] = useState<string | null>(null)

  const passwordRef = useRef<HTMLInputElement | null>(null)
  const usernameRef = useRef<HTMLInputElement | null>(null)
  const newPinRef = useRef<HTMLInputElement | null>(null)

  const lang = i18n.language === 'ar' ? 'ar' : 'en'
  const greeting = useMemo(() => getGreeting(lang), [lang])

  useEffect(() => {
    if (!isDentAssistBridgeAvailable()) return
    void listUsers()
      .then((u) => {
        setUsers(u)
        if (u[0]) setUsername(u[0].username)
        else setUsername('')
      })
      .catch(() => {
        setUsers([])
        setUsername('')
      })

    void getConfigs(['clinic_logo_path', 'clinic_name']).then(async (cfg) => {
      if (cfg.clinic_name) setClinicName(cfg.clinic_name)
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
    if (mustResetUser) {
      const t1 = window.setTimeout(() => newPinRef.current?.focus(), 80)
      return () => window.clearTimeout(t1)
    }
  }, [mustResetUser])

  if (import.meta.env.PROD && !isDentAssistBridgeAvailable()) {
    return <BrowserWrongLaunchScreen />
  }

  const mode: LoginMode = users.length === 0 ? 'bootstrap' : mustResetUser ? 'forcedReset' : 'normal'

  const handleCapsKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'))
    }
  }

  const handleQuickPickUser = (u: DbUser) => {
    setUsername(u.username)
    setError(false)
    setPassword('')
    window.setTimeout(() => passwordRef.current?.focus(), 60)
  }

  const onLogin = async () => {
    setError(false)
    setVerifying(true)
    try {
      const u = await verifyCredentials(username.trim(), password.trim())
      if (!u) {
        setError(true)
        return
      }
      if (u.mustChangePin) {
        setMustResetUser(u)
        setPinResetError(null)
        setNewPin('')
        setNewPin2('')
        return
      }
      setSuccess(true)
      window.setTimeout(() => setUser(u), reducedMotion ? 0 : 480)
    } finally {
      setVerifying(false)
    }
  }

  const onBootstrap = async () => {
    setBootError(null)
    if (!bootUser.trim()) {
      setBootError(lang === 'ar' ? 'اسم المستخدم مطلوب.' : 'Username is required.')
      return
    }
    if (bootPin.length < 4) {
      setBootError(
        lang === 'ar'
          ? 'يجب أن يكون الرمز السري 4 أرقام/أحرف على الأقل.'
          : 'PIN must be at least 4 characters.',
      )
      return
    }
    if (bootPin !== bootPin2) {
      setBootError(lang === 'ar' ? 'تأكيد الرمز السري غير مطابق.' : 'PIN confirmation does not match.')
      return
    }
    setBootBusy(true)
    try {
      const name = bootUser.trim()
      const pin = bootPin.trim()
      await createUser(name, 'doctor', pin)
      if (import.meta.env.VITE_TARGET === 'web') {
        const { flushSqlitePersist } = await import('@/platform/web/sqlJsDatabase')
        await flushSqlitePersist()
      }
      const refreshed = await listUsers()
      setUsers(refreshed)
      setUsername(name)
      setPassword(pin)
      setBootPin('')
      setBootPin2('')
      const u = await verifyCredentials(name, pin)
      if (u) {
        if (u.mustChangePin) {
          setMustResetUser(u)
          setPinResetError(null)
          setNewPin('')
          setNewPin2('')
          return
        }
        setSuccess(true)
        window.setTimeout(() => setUser(u), reducedMotion ? 0 : 480)
      }
    } catch (err) {
      setBootError(err instanceof Error ? err.message : String(err))
    } finally {
      setBootBusy(false)
    }
  }

  const onForcedPinReset = async () => {
    if (!mustResetUser) return
    setPinResetError(null)
    if (newPin.length < 4) {
      setPinResetError(
        lang === 'ar'
          ? 'يجب أن يكون الرمز السري 4 أرقام/أحرف على الأقل.'
          : 'PIN must be at least 4 characters.',
      )
      return
    }
    if (newPin !== newPin2) {
      setPinResetError(
        lang === 'ar' ? 'تأكيد الرمز السري غير مطابق.' : 'PIN confirmation does not match.',
      )
      return
    }
    setPinResetBusy(true)
    try {
      await updateUserPin(mustResetUser.id, newPin)
      setMustResetUser(null)
      setPassword('')
      setNewPin('')
      setNewPin2('')
      setSuccess(true)
      window.setTimeout(
        () => setUser({ id: mustResetUser.id, username: mustResetUser.username, role: mustResetUser.role }),
        reducedMotion ? 0 : 480,
      )
    } catch (err) {
      setPinResetError(err instanceof Error ? err.message : String(err))
    } finally {
      setPinResetBusy(false)
    }
  }

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (verifying || success || bootBusy || pinResetBusy) return
    if (mode === 'bootstrap') return void onBootstrap()
    if (mode === 'forcedReset') return void onForcedPinReset()
    return void onLogin()
  }

  const toggleLang = async () => {
    const next = lang === 'ar' ? 'en' : 'ar'
    await i18n.changeLanguage(next)
    document.documentElement.lang = next
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr')
  }

  const bridgeReady = isDentAssistBridgeAvailable()

  const submitLabel =
    mode === 'bootstrap'
      ? lang === 'ar'
        ? 'إنشاء حساب الطبيب'
        : 'Create doctor account'
      : mode === 'forcedReset'
        ? lang === 'ar'
          ? 'تحديث الرمز والمتابعة'
          : 'Update PIN and continue'
        : t('login.submit')

  const submitBusy = verifying || bootBusy || pinResetBusy
  const errorText =
    mode === 'bootstrap' ? bootError : mode === 'forcedReset' ? pinResetError : error ? t('login.error') : null

  const showQuickUsers = mode === 'normal' && users.length > 0 && users.length <= 4

  return (
    <motion.div
      className="relative flex min-h-full flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(20,184,166,0.10), transparent 60%), radial-gradient(900px 500px at 110% 110%, rgba(34,211,238,0.10), transparent 55%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: 'easeOut' }}
    >
      <WindowTitleBar />

      {/* Animated decorative orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-24 size-[360px] rounded-full bg-teal-200/40 blur-3xl start-[-100px]"
          animate={
            reducedMotion
              ? undefined
              : { x: [0, 30, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.98, 1] }
          }
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 size-[420px] rounded-full bg-cyan-200/40 blur-3xl end-[-120px]"
          animate={
            reducedMotion
              ? undefined
              : { x: [0, -25, 15, 0], y: [0, 20, -10, 0], scale: [1, 1.04, 0.97, 1] }
          }
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 size-[280px] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl"
          animate={reducedMotion ? undefined : { y: [0, -18, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative flex flex-1 cursor-default items-center justify-center p-6 md:p-10">
        <motion.form
          onSubmit={onFormSubmit}
          className="relative w-full max-w-md space-y-7 rounded-3xl border border-white/60 bg-white/85 p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_8px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Lang toggle (top corner of card) */}
          <button
            type="button"
            onClick={() => void toggleLang()}
            className="absolute end-4 top-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-700"
            aria-label="Toggle language"
            title={lang === 'ar' ? 'English' : 'العربية'}
          >
            <Languages className="size-3.5" aria-hidden />
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* Logo with rotating gradient ring + breathing animation */}
          <div className="relative mx-auto size-24">
            <motion.div
              className="absolute inset-0 rounded-[28px]"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(20,184,166,0.55), rgba(34,211,238,0.45), rgba(20,184,166,0.55))',
                filter: 'blur(8px)',
                opacity: 0.85,
              }}
              animate={reducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-1 flex items-center justify-center overflow-hidden rounded-[24px] border border-white bg-white shadow-xl shadow-slate-200/60"
              animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={clinicLogo || defaultAppLogoSrc()}
                alt="DentAssist"
                className="size-full object-contain p-2"
                onError={(e) => applyAppLogoFallback(e.currentTarget)}
              />
            </motion.div>
          </div>

          {/* Heading */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.3, ease: 'easeOut', delay: reducedMotion ? 0 : 0.1 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">{greeting}</p>
            <h1
              className="mt-1 text-2xl font-bold tracking-tight text-transparent"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 60%, #0e7490 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
            >
              {clinicName?.trim() || t('login.title')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('login.subtitle')}</p>
          </motion.div>

          {/* Quick user chips */}
          {showQuickUsers ? (
            <motion.div
              className="flex flex-wrap items-center justify-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.3, delay: reducedMotion ? 0 : 0.14 }}
            >
              {users.map((u) => {
                const active = u.username === username
                return (
                  <motion.button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickPickUser(u)}
                    whileHover={reducedMotion ? undefined : { y: -2 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/40 hover:text-teal-800'
                    }`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {u.username.slice(0, 2).toUpperCase()}
                    </span>
                    {u.username}
                  </motion.button>
                )
              })}
            </motion.div>
          ) : null}

          {/* === Forms === */}
          <AnimatePresence mode="wait">
            {mode === 'bootstrap' && (
              <motion.div
                key="bootstrap"
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: 'easeOut' }}
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900">
                  {lang === 'ar'
                    ? 'الإعداد الأول: أنشئ حساب الطبيب الرئيسي لتأمين النظام.'
                    : 'First-time setup: create the primary doctor account to secure the system.'}
                </div>
                <FloatingField
                  id="boot-username"
                  label={t('login.username')}
                  value={bootUser}
                  onChange={setBootUser}
                  icon={UserIcon}
                  autoComplete="username"
                  disabled={!bridgeReady || bootBusy}
                />
                <FloatingField
                  id="boot-pin"
                  label={t('login.password')}
                  value={bootPin}
                  onChange={setBootPin}
                  type={showBootPin ? 'text' : 'password'}
                  icon={Lock}
                  autoComplete="new-password"
                  disabled={!bridgeReady || bootBusy}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowBootPin((s) => !s)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showBootPin ? 'Hide PIN' : 'Show PIN'}
                      tabIndex={-1}
                    >
                      {showBootPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
                <StrengthMeter pin={bootPin} lang={lang} />
                <FloatingField
                  id="boot-pin2"
                  label={lang === 'ar' ? 'تأكيد الرمز السري' : 'Confirm PIN'}
                  value={bootPin2}
                  onChange={setBootPin2}
                  type={showBootPin ? 'text' : 'password'}
                  icon={ShieldCheck}
                  autoComplete="new-password"
                  disabled={!bridgeReady || bootBusy}
                  hasError={!!bootPin2 && bootPin !== bootPin2}
                />
              </motion.div>
            )}

            {mode === 'forcedReset' && mustResetUser && (
              <motion.div
                key="reset"
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: 'easeOut' }}
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900">
                  {lang === 'ar'
                    ? `لأسباب أمنية، يجب تغيير الرمز السري للحساب "${mustResetUser.username}" قبل المتابعة.`
                    : `For security, you must change the PIN for "${mustResetUser.username}" before continuing.`}
                </div>
                <FloatingField
                  id="reset-pin"
                  label={lang === 'ar' ? 'الرمز السري الجديد' : 'New PIN'}
                  value={newPin}
                  onChange={setNewPin}
                  type={showNewPin ? 'text' : 'password'}
                  icon={Lock}
                  autoComplete="new-password"
                  disabled={!bridgeReady || pinResetBusy}
                  inputRef={newPinRef}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowNewPin((s) => !s)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                      tabIndex={-1}
                    >
                      {showNewPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
                <StrengthMeter pin={newPin} lang={lang} />
                <FloatingField
                  id="reset-pin2"
                  label={lang === 'ar' ? 'تأكيد الرمز السري الجديد' : 'Confirm new PIN'}
                  value={newPin2}
                  onChange={setNewPin2}
                  type={showNewPin ? 'text' : 'password'}
                  icon={ShieldCheck}
                  autoComplete="new-password"
                  disabled={!bridgeReady || pinResetBusy}
                  hasError={!!newPin2 && newPin !== newPin2}
                />
              </motion.div>
            )}

            {mode === 'normal' && (
              <motion.div
                key="login"
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: 'easeOut' }}
              >
                <FloatingField
                  id="dentassist-username"
                  label={t('login.username')}
                  value={username}
                  onChange={(v) => {
                    setUsername(v)
                    if (error) setError(false)
                  }}
                  icon={UserIcon}
                  autoComplete="username"
                  disabled={!bridgeReady || verifying || success}
                  inputRef={usernameRef}
                  rightSlot={
                    username ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('')
                          window.setTimeout(() => usernameRef.current?.focus(), 0)
                        }}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Clear username"
                        tabIndex={-1}
                      >
                        <X className="size-4" />
                      </button>
                    ) : null
                  }
                />

                <FloatingField
                  id="dentassist-password"
                  label={t('login.password')}
                  value={password}
                  onChange={(v) => {
                    setPassword(v)
                    if (error) setError(false)
                  }}
                  type={showPass ? 'text' : 'password'}
                  icon={Lock}
                  autoComplete="current-password"
                  disabled={!bridgeReady || verifying || success}
                  hasError={error}
                  inputRef={passwordRef}
                  onKeyEvent={handleCapsKey}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />

                <AnimatePresence initial={false}>
                  {capsOn ? (
                    <motion.p
                      key="caps-on"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: reducedMotion ? 0.01 : 0.18 }}
                    >
                      <AlertCircle className="size-3.5" aria-hidden />
                      {lang === 'ar'
                        ? 'تنبيه: Caps Lock مُفعّل — الرمز حساس لحالة الأحرف (A ≠ a)'
                        : 'Caps Lock is on — PIN is case-sensitive (A ≠ a)'}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence initial={false}>
            {errorText ? (
              <motion.p
                key="login-error"
                className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                initial={{ opacity: 0, y: -6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: reducedMotion ? 0 : [0, -5, 5, -3, 3, 0],
                }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.32, ease: 'easeOut' }}
              >
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{errorText}</span>
              </motion.p>
            ) : null}
          </AnimatePresence>

          {error && import.meta.env.VITE_TARGET === 'web' && mode === 'normal' ? (
            <button
              type="button"
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                void (async () => {
                  const { resetLocalDatabase } = await import('@/platform/web/sqlJsDatabase')
                  await resetLocalDatabase()
                  setUsers([])
                  setUsername('')
                  setPassword('')
                  setError(false)
                  setMustResetUser(null)
                })()
              }}
            >
              {lang === 'ar'
                ? 'مسح البيانات المحلية والبدء من جديد'
                : 'Clear local data and start over'}
            </button>
          ) : null}

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={!bridgeReady || submitBusy || success}
            className="relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: success
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #0d9488, #0891b2)',
            }}
            whileHover={reducedMotion || submitBusy || success ? undefined : { scale: 1.012 }}
            whileTap={reducedMotion || submitBusy || success ? undefined : { scale: 0.985 }}
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.span
                  key="ok"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.22 }}
                >
                  <CheckCircle2 className="size-5" aria-hidden />
                  {lang === 'ar' ? 'تم بنجاح' : 'Success'}
                </motion.span>
              ) : submitBusy ? (
                <motion.span
                  key="busy"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.16 }}
                >
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {lang === 'ar' ? 'جارٍ التحقق…' : 'Signing in…'}
                </motion.span>
              ) : (
                <motion.span
                  key="label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0.01 : 0.16 }}
                >
                  {submitLabel}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <p className="text-center font-mono text-[10px] text-slate-400">{APP_BUILD_TIME}</p>
        </motion.form>
      </div>
    </motion.div>
  )
}
