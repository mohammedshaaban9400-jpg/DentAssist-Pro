import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe,
  ImageUp,
  KeyRound,
  Phone,
  Shield,
  ShieldCheck,
  Upload,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { DataExportCsvSection } from '@/components/DataExportCsvSection'
import i18n from '@/i18n'
import { useConfirm } from '@/hooks/useConfirm'
import {
  exportDatabaseBackupEncrypted,
  importDatabaseBackupEncrypted,
  importDatabaseBackupEncryptedFromFile,
  getConfigs,
  readUserDataFileDataUrl,
  setConfig,
  listUsers,
  createUser,
  updateUserPin,
  updateUsername,
  deleteUser,
} from '@/services/dbService'
import { isWebAppBuild, supportsEncryptedBackup } from '@/lib/backupSupport'
import type { DbUser } from '@/types/user'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'
import { useSettingsStore } from '@/stores/settingsStore'

function SectionCard({
  children,
  icon: Icon,
  title,
  subtitle,
  iconGradient,
  footer,
}: {
  children: React.ReactNode
  icon: React.ElementType
  title: string
  subtitle?: string
  iconGradient: string
  footer?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{ background: iconGradient }}
        >
          <Icon className="size-5 text-white" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-5 px-6 py-6">{children}</div>
      {footer ? (
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const isDoctor = user?.role === 'doctor'
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()
  const { setSettings } = useSettingsStore()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const restoreFileRef = useRef<HTMLInputElement>(null)

  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [clinicName, setClinicName] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [backupPass, setBackupPass] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [restorePass, setRestorePass] = useState('')
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreFileName, setRestoreFileName] = useState('')

  const isWeb = isWebAppBuild()
  const backupSupported = supportsEncryptedBackup()

  // Users state
  const [dbUsers, setDbUsers] = useState<DbUser[]>([])
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newUserRole, setNewUserRole] = useState<'doctor' | 'receptionist'>('receptionist')
  const [newUserPin, setNewUserPin] = useState('')
  
  const [editUserOpen, setEditUserOpen] = useState<number | null>(null)
  const [editUserUsername, setEditUserUsername] = useState('')
  const [editUserPin, setEditUserPin] = useState('')

  const loadUsers = useCallback(async () => {
    if (!isDoctor) return
    try {
      setDbUsers(await listUsers())
    } catch (e) {
      console.error(e)
    }
  }, [isDoctor])

  useEffect(() => {
    void (async () => {
      try {
        const keys = ['language', 'clinic_name', 'clinic_phone', 'clinic_address', 'clinic_logo_path', 'currency', 'exchange_rate']
        const cfg = await getConfigs(keys)
        setLang(cfg.language === 'en' ? 'en' : 'ar')
        setCurrency(cfg.currency ?? 'USD')
        setExchangeRate(cfg.exchange_rate ?? '1')
        setClinicName(cfg.clinic_name ?? '')
        setClinicPhone(cfg.clinic_phone ?? '')
        setClinicAddress(cfg.clinic_address ?? '')
        const lp = cfg.clinic_logo_path?.trim() || null
        setLogoPath(lp)
        if (lp) {
          try { setLogoPreview(await readUserDataFileDataUrl(lp)) } catch { /* ignore */ }
        }
        await loadUsers()
      } catch {
        setLang(i18n.language === 'en' ? 'en' : 'ar')
      }
    })()
  }, [loadUsers])

  const handleAddUser = async () => {
    if (!newUsername || !newUserPin || newUserPin.length < 4) {
      push(i18n.language === 'ar' ? 'كلمة المرور يجب أن تكون 4 رموز على الأقل' : 'PIN must be at least 4 chars', 'error')
      return
    }
    setSaving(true)
    try {
      await createUser(newUsername, newUserRole, newUserPin)
      push(i18n.language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'User created successfully', 'success')
      setNewUserOpen(false)
      setNewUsername('')
      setNewUserPin('')
      await loadUsers()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally { setSaving(false) }
  }

  const handleUpdateUser = async (id: number) => {
    if (!editUserUsername) {
      push(i18n.language === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required', 'error')
      return
    }
    setSaving(true)
    try {
      const userToEdit = dbUsers.find(u => u.id === id)
      if (editUserUsername !== userToEdit?.username) {
        await updateUsername(id, editUserUsername)
      }
      if (editUserPin) {
        if (editUserPin.length < 4) {
          push(i18n.language === 'ar' ? 'كلمة المرور يجب أن تكون 4 رموز على الأقل' : 'PIN must be at least 4 chars', 'error')
          setSaving(false)
          return
        }
        await updateUserPin(id, editUserPin)
      }
      push(i18n.language === 'ar' ? 'تم تحديث الحساب بنجاح' : 'User updated successfully', 'success')
      setEditUserOpen(null)
      setEditUserUsername('')
      setEditUserPin('')
      await loadUsers()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally { setSaving(false) }
  }

  const handleDeleteUser = async (id: number) => {
    if (!await confirm(i18n.language === 'ar' ? 'هل أنت متأكد من حذف الحساب؟' : 'Are you sure you want to delete this user?', { danger: true })) return
    setSaving(true)
    try {
      await deleteUser(id)
      push(i18n.language === 'ar' ? 'تم حذف الحساب بنجاح' : 'User deleted successfully', 'success')
      await loadUsers()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally { setSaving(false) }
  }

  const applyLang = async (next: 'ar' | 'en') => {
    setSaving(true)
    try {
      await setConfig('language', next)
      setLang(next)
      await i18n.changeLanguage(next)
      document.documentElement.lang = next
      document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr')
      push(t('settings.saved'), 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally { setSaving(false) }
  }

  const saveClinic = async () => {
    if (!isDoctor) return
    setSaving(true)
    try {
      await setConfig('clinic_name', clinicName.trim() || 'DentAssist Pro')
      await setConfig('clinic_phone', clinicPhone.trim())
      await setConfig('clinic_address', clinicAddress.trim())
      await setConfig('currency', currency)
      await setConfig('exchange_rate', exchangeRate)
      if (logoPath) await setConfig('clinic_logo_path', logoPath)
      setSettings(currency, parseFloat(exchangeRate) || 1)
      push(t('settings.saved'), 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally { setSaving(false) }
  }

  const onLogo = async (file: File | null) => {
    if (!file || !isDoctor) return
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      push(t('settings.logoBadType'), 'error'); return
    }
    setSaving(true)
    try {
      const buf = await file.arrayBuffer()
      const d = window.dentassist
      if (!d?.saveClinicLogo) throw new Error('Logo upload unavailable')
      const rel = await d.saveClinicLogo(buf, ext)
      await setConfig('clinic_logo_path', rel)
      setLogoPath(rel)
      try { setLogoPreview(await readUserDataFileDataUrl(rel)) } catch { /* ignore */ }
      push(t('settings.logoSaved'), 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setSaving(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const runBackup = async () => {
    if (!backupSupported) {
      push(t('settings.backupUnavailable'), 'error')
      return
    }
    if (backupPass.length < 8) {
      push(t('settings.backupPassHint'), 'error')
      return
    }
    setBackupBusy(true)
    try {
      const r = await exportDatabaseBackupEncrypted(backupPass)
      if (r.ok) {
        push(
          isWeb
            ? t('settings.backupDoneWeb', { path: r.filePath })
            : t('settings.backupDone', { path: r.filePath }),
          'success',
        )
      } else {
        push(t('settings.backupCancelled'), 'info')
      }
      setBackupPass('')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBackupBusy(false)
    }
  }

  const runRestore = async () => {
    if (!backupSupported) {
      push(t('settings.backupUnavailable'), 'error')
      return
    }
    if (restorePass.length < 8) {
      push(t('settings.backupPassHint'), 'error')
      return
    }
    const restoreFile = restoreFileRef.current?.files?.[0]
    if (isWeb && !restoreFile) {
      push(t('settings.backupSelectFile'), 'error')
      return
    }
    if (
      !(await confirm(
        i18n.language === 'ar'
          ? 'سيتم استبدال قاعدة البيانات الحالية بالكامل. هل أنت متأكد؟'
          : 'This will replace the entire current database. Are you sure?',
        { danger: true },
      ))
    ) {
      return
    }
    setRestoreBusy(true)
    try {
      const r = isWeb && restoreFile
        ? await importDatabaseBackupEncryptedFromFile(restoreFile, restorePass)
        : await importDatabaseBackupEncrypted(restorePass)
      if (r.ok) {
        push(
          isWeb ? t('settings.backupRestoreWeb') : t('settings.backupRestoreDesktop'),
          'success',
        )
        setRestorePass('')
        setRestoreFileName('')
        if (restoreFileRef.current) restoreFileRef.current.value = ''
        if (isWeb) {
          window.setTimeout(() => window.location.reload(), 800)
        }
      } else {
        push(i18n.language === 'ar' ? 'تم إلغاء الاستيراد.' : 'Import cancelled.', 'info')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      push(
        msg.includes('wrong passphrase') || msg.includes('خاطئة')
          ? t('settings.backupWrongPass')
          : msg,
        'error',
      )
    } finally {
      setRestoreBusy(false)
    }
  }

  const startTourAgain = async () => {
    try {
      await setConfig('onboarding_tour_done', '0')
      window.dispatchEvent(new Event('dentassist:start-tour'))
      push(t('settings.tourRestarted'), 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const passOk = backupPass.length >= 8
  const restorePassOk = restorePass.length >= 8
  const restoreReady = restorePassOk && (!isWeb || restoreFileName.length > 0)

  return (
    <div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">{t('settings.title')}</h1>
      </div>
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-sm text-slate-500 mb-6">{t('settings.subtitle')}</p>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0f766e, #115e59)' }}
            >
              <BookOpen className="size-5 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t('settings.docHelpTitle')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t('settings.docHelpSubtitle')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/about"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-900"
            >
              <ExternalLink className="size-4 shrink-0 opacity-70" aria-hidden />
              {t('settings.docHelpOpen')}
            </Link>
            <Link
              to="/about?tab=privacy"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              <Shield className="size-3.5 shrink-0 text-teal-600" aria-hidden />
              {t('settings.docHelpPrivacy')}
            </Link>
            <Link
              to="/about?tab=terms"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              <FileText className="size-3.5 shrink-0 text-teal-600" aria-hidden />
              {t('settings.docHelpTerms')}
            </Link>
            <Link
              to="/about?tab=guide"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/40"
            >
              <BookOpen className="size-3.5 shrink-0 text-teal-600" aria-hidden />
              {t('settings.docHelpGuide')}
            </Link>
          </div>
        </div>

      {/* ── Language ── */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}
            >
              <Globe className="size-5 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t('settings.language')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t('settings.languageHint')}</p>
            </div>
          </div>
          <div className="shrink-0">
            <div className="inline-flex rounded-xl p-1 gap-0.5" style={{ background: '#f1f5f9' }}>
              {(['ar', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  disabled={saving}
                  onClick={() => void applyLang(l)}
                  className="cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200"
                  style={
                    lang === l
                      ? { background: 'white', color: '#0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(0,0,0,0.05)' }
                      : { color: '#64748b' }
                  }
                >
                  {l === 'ar' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        icon={BookOpen}
        title={t('settings.tourTitle')}
        subtitle={t('settings.tourSubtitle')}
        iconGradient="linear-gradient(135deg, #0ea5e9, #2563eb)"
      >
        <button
          type="button"
          onClick={() => void startTourAgain()}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {t('settings.tourRestart')}
        </button>
      </SectionCard>

      {/* ── Currency Settings ── */}
      <SectionCard
        icon={Globe}
        title={t('settings.currencyTitle', 'العملة')}
        subtitle={t('settings.currencyHint', 'إعدادات العملة وصرف الليرة السورية')}
        iconGradient="linear-gradient(135deg, #059669, #047857)"
        footer={
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveClinic()}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            {t('settings.displayCurrency', 'عملة العرض')}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="da-input cursor-pointer bg-white"
            >
              <option value="SYP">SYP (ل.س)</option>
              <option value="IQD">IQD (د.ع)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="SAR">SAR (ر.س)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </label>

          {(currency === 'SYP' || currency === 'IQD') && (
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t('settings.exchangeRate', 'سعر الصرف (مقابل الدولار)')}
              <input
                type="text"
                inputMode="decimal"
                value={exchangeRate}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '')
                  setExchangeRate(val)
                }}
                className="da-input cursor-text tabular-nums"
                placeholder="مثال: 15000"
              />
            </label>
          )}
        </div>
      </SectionCard>

      {/* ── CSV export (all roles) ── */}
      <SectionCard
        icon={FileSpreadsheet}
        title={t('settings.exportCsvTitle')}
        subtitle={t('settings.exportCsvSubtitle')}
        iconGradient="linear-gradient(135deg, #0d9488, #0f766e)"
      >
        <DataExportCsvSection />
      </SectionCard>

      {/* ── Clinic info (doctor only) ── */}
      {isDoctor ? (
        <>
          <SectionCard
            icon={Building2}
            title={t('settings.clinicTitle')}
            subtitle={t('settings.clinicHint')}
            iconGradient="linear-gradient(135deg, #0d9488, #0f766e)"
            footer={
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveClinic()}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                {saving ? t('common.loading') : t('settings.saveClinic')}
              </button>
            }
          >
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Building2 className="size-3.5 text-slate-400" aria-hidden />
                {t('settings.clinicName')}
              </span>
              <input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="da-input cursor-text"
                placeholder="DentAssist Pro"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Phone className="size-3.5 text-slate-400" aria-hidden />
                {t('settings.clinicPhone')}
              </span>
              <input
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                className="da-input cursor-text tabular-nums"
                  placeholder="+963 9xx xxx xxxx"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {t('settings.clinicAddress')}
              <textarea
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                rows={2}
                className="da-input min-h-[5rem] cursor-text resize-none"
              />
            </label>

            {/* Logo upload */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={saving}
                className="sr-only"
                onChange={(e) => void onLogo(e.target.files?.[0] ?? null)}
              />
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{t('settings.clinicLogo')}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t('settings.logoHint')}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                >
                  <ImageUp className="size-3.5" aria-hidden />
                  {logoPath ? t('settings.logoReplace') : t('settings.logoPick')}
                </button>
              </div>
              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="clinic logo"
                    className="h-16 w-auto max-w-[160px] rounded-xl border border-slate-200 object-contain shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoPreview(null); setLogoPath(null) }}
                    className="absolute -end-2 -top-2 flex size-5 cursor-pointer items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="remove logo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex h-16 w-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-xs text-slate-400 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-500"
                  style={{ borderColor: '#cbd5e1' }}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ImageUp className="size-4" />
                    <span>{t('settings.logoPick')}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Backup ── */}
          <SectionCard
            icon={Database}
            title={t('settings.backupTitle')}
            subtitle={t('settings.backupHint')}
            iconGradient="linear-gradient(135deg, #7c3aed, #6d28d9)"
            footer={
              <button
                type="button"
                disabled={backupBusy || !passOk || !backupSupported}
                onClick={() => void runBackup()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {backupBusy ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Database className="size-4" />
                    {t('settings.backupExport')}
                  </>
                )}
              </button>
            }
          >
            {/* Info note */}
            <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
              <p className="text-xs leading-relaxed text-teal-900">
                {backupSupported
                  ? isWeb
                    ? t('settings.backupWebHint')
                    : t('settings.backupDesktopHint')
                  : t('settings.backupUnavailable')}
              </p>
            </div>

            {/* Export */}
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <KeyRound className="size-3.5 text-slate-400" aria-hidden />
                {t('settings.backupPass')}
              </span>
              <div className="relative max-w-sm">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={backupPass}
                  onChange={(e) => setBackupPass(e.target.value)}
                  className="da-input cursor-text font-mono"
                  placeholder="min. 8 characters"
                />
              </div>
              {backupPass.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (backupPass.length / 12) * 100)}%`,
                        background: passOk ? '#10b981' : backupPass.length >= 6 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${passOk ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {passOk ? `✓ ${t('settings.backupPassHint')}` : t('settings.backupPassHint')}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">{t('settings.backupPassHint')}</p>
              )}
            </label>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Import / Restore */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Upload className="size-4 text-slate-400" aria-hidden />
                <p className="text-sm font-semibold text-slate-700">
                  {i18n.language === 'ar' ? 'استيراد نسخة احتياطية' : 'Import Backup'}
                </p>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                {isWeb ? t('settings.backupRestoreHintWeb') : t('settings.backupRestoreHintDesktop')}
              </p>
              {isWeb ? (
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={restoreFileRef}
                    type="file"
                    accept=".dentassist,application/octet-stream,*/*"
                    className="hidden"
                    onChange={(e) => {
                      const name = e.target.files?.[0]?.name ?? ''
                      setRestoreFileName(name)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => restoreFileRef.current?.click()}
                    className="da-btn-secondary w-full sm:w-auto"
                  >
                    {restoreFileName
                      ? t('settings.backupFileSelected', { name: restoreFileName })
                      : t('settings.backupPickFile')}
                  </button>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="password"
                  autoComplete="off"
                  value={restorePass}
                  onChange={(e) => setRestorePass(e.target.value)}
                  className="da-input max-w-xs cursor-text font-mono"
                  placeholder={t('settings.backupPass')}
                />
                <button
                  type="button"
                  disabled={restoreBusy || !restoreReady || !backupSupported}
                  onClick={() => void runRestore()}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {restoreBusy ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {i18n.language === 'ar' ? 'استيراد واستعادة' : 'Import & restore'}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ── User Management ── */}
          <SectionCard
            icon={Users}
            title={i18n.language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
            subtitle={i18n.language === 'ar' ? 'إضافة وتعديل حسابات الأطباء والموظفين' : 'Manage doctor and receptionist accounts'}
            iconGradient="linear-gradient(135deg, #3b82f6, #2563eb)"
            footer={
              <button
                type="button"
                disabled={saving}
                onClick={() => setNewUserOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
              >
                <UserPlus className="size-4" />
                {i18n.language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
              </button>
            }
          >
            <div className="space-y-4">
              {dbUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{u.username}</p>
                      <p className="text-xs text-slate-500">{u.role === 'doctor' ? (i18n.language === 'ar' ? 'طبيب' : 'Doctor') : (i18n.language === 'ar' ? 'استقبال' : 'Receptionist')}</p>
                    </div>
                  </div>
                  
                  {editUserOpen === u.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        placeholder="Username"
                        value={editUserUsername}
                        onChange={e => setEditUserUsername(e.target.value)}
                        className="da-input !w-32 !py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="New PIN (optional)"
                        value={editUserPin}
                        onChange={e => setEditUserPin(e.target.value)}
                        className="da-input !w-32 !py-1.5 text-xs"
                      />
                      <button
                        onClick={() => handleUpdateUser(u.id)}
                        className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        {i18n.language === 'ar' ? 'حفظ' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditUserOpen(null)
                          setEditUserUsername('')
                          setEditUserPin('')
                        }}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditUserOpen(u.id)
                          setEditUserUsername(u.username)
                          setEditUserPin('')
                        }}
                        className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-blue-600"
                        title={i18n.language === 'ar' ? 'تعديل الحساب' : 'Edit Account'}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={dbUsers.length <= 1}
                        className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-rose-600 disabled:opacity-30"
                        title={i18n.language === 'ar' ? 'حذف الحساب' : 'Delete User'}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {newUserOpen && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{i18n.language === 'ar' ? 'حساب جديد' : 'New Account'}</h3>
                  <button onClick={() => setNewUserOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {i18n.language === 'ar' ? 'اسم المستخدم' : 'Username'}
                    <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="da-input" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {i18n.language === 'ar' ? 'الصلاحية' : 'Role'}
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'doctor' | 'receptionist')} className="da-input">
                      <option value="doctor">{i18n.language === 'ar' ? 'طبيب' : 'Doctor'}</option>
                      <option value="receptionist">{i18n.language === 'ar' ? 'استقبال' : 'Receptionist'}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {i18n.language === 'ar' ? 'كلمة المرور (الرمز)' : 'PIN'}
                    <input type="text" value={newUserPin} onChange={e => setNewUserPin(e.target.value)} className="da-input" />
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleAddUser}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    {i18n.language === 'ar' ? 'إنشاء' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5 text-sm font-medium leading-relaxed text-amber-900">
          <Building2 className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          {t('settings.receptionClinicNote')}
        </div>
      )}

      </div>
      {confirmModal}
    </div>
  )
}
