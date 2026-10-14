import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Edit3,
  HeartPulse,
  Maximize2,
  MessageCircle,
  Minimize2,
  Phone,
  Pill,
  Plus,
  Receipt,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react'
import { useConfirm } from '@/hooks/useConfirm'
import {
  createPatient,
  deletePatient,
  getPatient,
  openExternalUrl,
  updatePatient,
} from '@/services/dbService'
import { DentalChart } from '@/components/DentalChart'
import { PatientImageGallery } from '@/components/PatientImageGallery'
import { PrescriptionsPanel } from '@/components/PrescriptionsPanel'
import { TreatmentPlanPanel } from '@/components/TreatmentPlanPanel'
import { OrthodonticsPanel } from '@/components/OrthodonticsPanel'
import { ImplantsPanel } from '@/components/ImplantsPanel'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'
import { buildWhatsAppUrl, digitsForWhatsApp } from '@/lib/waPhone'

function getAge(dobStr?: string | null): number | null {
  if (!dobStr) return null
  try {
    const birth = new Date(dobStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 0 && age < 130 ? age : null
  } catch {
    return null
  }
}

function getInitials(first: string, last: string): string {
  const f = (first || '').trim().charAt(0)
  const l = (last || '').trim().charAt(0)
  return `${f}${l}`.toUpperCase() || '؟'
}

const MEDICAL_ALERT_CHIPS = [
  { id: 'penicillin', ar: 'حساسية بنسلين', en: 'Penicillin Allergy' },
  { id: 'diabetes', ar: 'مرض السكري', en: 'Diabetes' },
  { id: 'hypertension', ar: 'ارتفاع ضغط الدم', en: 'Hypertension' },
  { id: 'blood_thinners', ar: 'أدوية مميعة للدم', en: 'Blood Thinners' },
  { id: 'heart', ar: 'أمراض قلبية / صمامات', en: 'Heart Condition' },
  { id: 'asthma', ar: 'ربو تحسسي', en: 'Asthma' },
  { id: 'bleeding', ar: 'نزف دموي متكرر', en: 'Bleeding Tendency' },
  { id: 'pregnancy', ar: 'حمل / إرضاع', en: 'Pregnancy/Nursing' },
]

export function PatientDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const user = useSessionStore((s) => s.user)
  const isDoctor = user?.role === 'doctor'
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const patientId = isNew ? null : Number(id)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [resolvedId, setResolvedId] = useState<number | null>(null)
  const [hasOrthoCase, setHasOrthoCase] = useState(false)
  const [openOrthoTrigger, setOpenOrthoTrigger] = useState(false)
  const [implantsCount, setImplantsCount] = useState(0)
  const [openImplantTrigger, setOpenImplantTrigger] = useState(false)

  // Collapsible States
  const [isEditOpen, setIsEditOpen] = useState(isNew)
  const [sections, setSections] = useState({
    treatment: true,
    gallery: false,
    prescriptions: false,
    orthodontics: true,
    implants: true,
  })

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setIsEditOpen(true)
      return
    }
    if (!patientId || Number.isNaN(patientId)) {
      setError(t('patients.notFound'))
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      setResolvedId(null)
      try {
        const p = await getPatient(patientId)
        if (!p) {
          setError(t('patients.notFound'))
          return
        }
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setDob(p.dob ?? '')
        setGender(p.gender ?? '')
        setPhone(p.phone ?? '')
        setMedicalHistory(p.medical_history ?? '')
        setResolvedId(p.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [isNew, patientId, t])

  const toggleMedicalChip = (label: string) => {
    const trimmed = medicalHistory.trim()
    if (!trimmed) {
      setMedicalHistory(label)
      return
    }
    if (trimmed.includes(label)) {
      const updated = trimmed
        .replace(new RegExp(`(^|[,،\\s]+)${label}([,،\\s]+|$)`, 'g'), ' ')
        .replace(/[,،]{2,}/g, '،')
        .replace(/\s+/g, ' ')
        .trim()
      setMedicalHistory(updated)
    } else {
      setMedicalHistory(`${trimmed}، ${label}`)
    }
  }

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const expandAllSections = () => {
    setSections({
      treatment: true,
      gallery: true,
      prescriptions: true,
      orthodontics: true,
      implants: true,
    })
  }

  const collapseAllSections = () => {
    setSections({
      treatment: false,
      gallery: false,
      prescriptions: false,
      orthodontics: false,
      implants: false,
    })
  }

  const onSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!firstName.trim() || !lastName.trim()) {
        setError(t('patients.validationName', isAr ? 'يرجى إدخال الاسم الأول واسم العائلة' : 'Name is required'))
        return
      }
      if (isNew) {
        const newId = await createPatient({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dob: dob || null,
          gender: gender || null,
          phone: phone.trim() || null,
          medicalHistory: medicalHistory.trim() || null,
        })
        push(t('patients.savedSuccess', isAr ? 'تم حفظ ملف المريض بنجاح' : 'Saved successfully'), 'success')
        navigate(`/patients/${newId}`, { replace: true })
        return
      }
      if (!resolvedId) return
      await updatePatient(resolvedId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: dob || null,
        gender: gender || null,
        phone: phone.trim() || null,
        medicalHistory: medicalHistory.trim() || null,
      })
      push(t('patients.savedSuccess', isAr ? 'تم تحديث بيانات المريض' : 'Updated successfully'), 'success')
      setIsEditOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (isNew || !resolvedId) return
    if (!(await confirm(t('patients.confirmDelete', isAr ? 'هل أنت متأكد من حذف هذا المريض وكافة سجلاته؟' : 'Delete patient?')))) return
    setSaving(true)
    setError(null)
    try {
      await deletePatient(resolvedId)
      navigate('/patients')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const openWhatsApp = async () => {
    const digits = digitsForWhatsApp(phone)
    if (!digits) {
      push(isAr ? 'رقم الهاتف غير صالح لواتساب.' : 'Invalid phone number.', 'error')
      return
    }
    const url = buildWhatsAppUrl(digits, isAr ? `مرحباً ${firstName}، من عيادة الأسنان...` : `Hello ${firstName}...`)
    await openExternalUrl(url)
  }

  const initials = useMemo(() => getInitials(firstName, lastName), [firstName, lastName])
  const age = useMemo(() => getAge(dob), [dob])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-6">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const showChart = !isNew && resolvedId != null && resolvedId > 0 && Number.isFinite(resolvedId)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-16">
      {/* ─── Top Bar: Navigation & Action Quicklinks ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/patients"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs border border-slate-200/80 transition hover:border-teal-300 hover:text-teal-800 no-underline"
        >
          <ArrowLeft className="size-3.5 rtl:rotate-180" />
          <span>{t('patients.back', isAr ? 'العودة لقائمة المرضى' : 'Back to Patients')}</span>
        </Link>

        {showChart && (
          <div className="flex items-center gap-2">
            <Link
              to={`/invoices?patientId=${resolvedId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200/80 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-2xs hover:bg-teal-100 no-underline transition"
            >
              <Receipt className="size-3.5 text-teal-700" />
              <span>{t('patients.openInvoices', isAr ? 'كشف فواتير المريض' : 'Patient Invoices')}</span>
            </Link>

            {hasOrthoCase ? (
              <button
                type="button"
                onClick={() => {
                  setSections((s) => ({ ...s, orthodontics: true }))
                  document.getElementById('patient-orthodontics')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-2xs hover:bg-teal-100 transition active:scale-95"
              >
                <Sparkles className="size-3.5 text-teal-700" />
                <span>{isAr ? 'ملف التقويم (نشط)' : 'Orthodontics (Active)'}</span>
              </button>
            ) : isDoctor ? (
              <button
                type="button"
                onClick={() => {
                  setSections((s) => ({ ...s, orthodontics: true }))
                  setOpenOrthoTrigger(true)
                  document.getElementById('patient-orthodontics')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-teal-400 hover:text-teal-800 hover:bg-teal-50/50 transition active:scale-95"
                title={isAr ? 'تفعيل ملف تقويم أسنان لهذا المريض' : 'Activate Orthodontics'}
              >
                <Sparkles className="size-3.5 text-teal-600" />
                <span>{isAr ? '+ تفعيل تقويم الأسنان' : '+ Activate Orthodontics'}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => document.getElementById('patient-odontogram')?.scrollIntoView({ behavior: 'smooth' })}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              {t('patients.scrollToChart', isAr ? 'المخطط السني' : 'Chart')}
            </button>
          </div>
        )}
      </div>

      {/* ─── Executive Patient Dossier Card (Existing Patients) ─── */}
      {!isNew && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all">
          <div className="p-5 sm:p-6 space-y-4">
            {/* Top Row: Avatar + Name + Tags + Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-xs"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
                  }}
                >
                  {initials}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      {firstName} {lastName}
                    </h1>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-600">
                      #{resolvedId}
                    </span>
                    {hasOrthoCase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <Sparkles className="size-3 text-emerald-600" />
                        <span>{isAr ? 'مريض تقويم (نشط)' : 'Ortho Patient'}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {age != null && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-0.5 font-bold text-teal-800 border border-teal-200/70">
                        <Calendar className="size-3 text-teal-600" />
                        <span>{age} {isAr ? 'سنة' : 'years'}</span>
                        {dob && <span className="text-[10px] text-teal-700/80 font-mono">({dob})</span>}
                      </span>
                    )}
                    {gender && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                        <User className="size-3 text-slate-400" />
                        <span>{t(`patients.gender.${gender}`)}</span>
                      </span>
                    )}
                    {phone && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-0.5 font-mono text-slate-700 font-bold">
                        <Phone className="size-3 text-slate-400" />
                        <span dir="ltr">{phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {phone && (
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100 active:scale-95"
                    title="WhatsApp"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditOpen((prev) => !prev)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-2xs transition active:scale-95 ${
                    isEditOpen
                      ? 'border-teal-300 bg-teal-50 text-teal-800 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-800'
                  }`}
                >
                  <Edit3 className="size-3.5" />
                  <span>{isEditOpen ? (isAr ? 'إغلاق الحقول' : 'Close Form') : (isAr ? 'تعديل البيانات' : 'Edit Info')}</span>
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${isEditOpen ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onDelete()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-2xs transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                  title={isAr ? 'حذف ملف المريض' : 'Delete'}
                >
                  <Trash2 className="size-3.5" />
                  <span>{t('common.delete', isAr ? 'حذف' : 'Delete')}</span>
                </button>
              </div>
            </div>

            {/* Second Row: Prominent Clinical Warning & Allergy Strip */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {medicalHistory ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                      <AlertTriangle className="size-3.5" />
                    </span>
                    <div>
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                        {isAr ? 'تنبيه سريري / سوابق وحساسية:' : 'Medical Alerts & Allergies:'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 ms-2">
                        {medicalHistory}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
                  >
                    {isAr ? 'تحديث السيرة المرضية' : 'Update Alerts'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-emerald-600" />
                    <span className="font-medium">
                      {isAr
                        ? 'سليم جهازياً — لا توجد تحذيرات طبية أو حساسية مسجلة'
                        : 'Systemically Healthy — No reported allergies or medical warnings'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
                  >
                    {isAr ? '+ إضافة تحذير أو حساسية' : '+ Add Alert'}
                  </button>
                </div>
              )}
            </div>

            {/* ─── Collapsible Compact Form Card (Inside the dossier) ─── */}
            {isEditOpen && (
              <div className="border-t border-slate-100 pt-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-teal-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {isAr ? 'تعديل البيانات السريرية والشخصية' : 'Edit Personal & Clinical Info'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {error ? (
                  <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Subcard 1: Personal and Contact */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {isAr ? 'البيانات الشخصية ومعلومات الاتصال' : 'Personal & Contact Info'}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        <span>{t('patients.fieldFirstName', isAr ? 'الاسم الأول' : 'First Name')} *</span>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={isAr ? 'مثال: سامر' : 'John'}
                          className="da-input text-xs bg-white"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        <span>{t('patients.fieldLastName', isAr ? 'اسم العائلة / الكنية' : 'Last Name')} *</span>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={isAr ? 'مثال: الأحمد' : 'Doe'}
                          className="da-input text-xs bg-white"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        <span>{t('patients.fieldDob', isAr ? 'تاريخ الميلاد' : 'Date of Birth')}</span>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="da-input text-xs bg-white font-mono"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                        <span>{t('patients.fieldGender', isAr ? 'الجنس' : 'Gender')}</span>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="da-input cursor-pointer bg-white text-xs font-semibold"
                        >
                          <option value="">{t('patients.gender.unspecified', isAr ? 'غير محدد' : 'Unspecified')}</option>
                          <option value="male">{t('patients.gender.male', isAr ? 'ذكر' : 'Male')}</option>
                          <option value="female">{t('patients.gender.female', isAr ? 'أنثى' : 'Female')}</option>
                        </select>
                      </label>

                      <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-bold text-slate-700">
                        <span>{t('patients.fieldPhone', isAr ? 'رقم الهاتف / واتساب' : 'Phone Number')}</span>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-slate-400 start-3" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="09..."
                            className="da-input text-xs font-mono ps-9 bg-white"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Subcard 2: Medical History with Quick Chips */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <HeartPulse className="size-3.5 text-rose-500" />
                        <span>{t('patients.fieldHistory', isAr ? 'السيرة المرضية والتحذيرات السريرية' : 'Medical History')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isAr ? 'انقر على الوسم للإضافة السريعة' : 'Click to toggle tags'}
                      </span>
                    </div>

                    {/* Quick Medical Alert Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {MEDICAL_ALERT_CHIPS.map((chip) => {
                        const label = isAr ? chip.ar : chip.en
                        const isSelected = medicalHistory.includes(label)
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => toggleMedicalChip(label)}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition active:scale-95 ${
                              isSelected
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? <Check className="size-3 text-rose-600" /> : <Tag className="size-3 text-slate-400" />}
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <textarea
                      value={medicalHistory}
                      onChange={(e) => setMedicalHistory(e.target.value)}
                      rows={3}
                      placeholder={
                        isAr
                          ? 'ملاحظات إضافية: حساسية بنسلين، ضغط، سكري، أدوية مميعة...'
                          : 'Specific medical notes, allergies, chronic medications...'
                      }
                      className="da-input text-xs resize-none bg-white"
                    />
                  </div>
                </div>

                {/* Save Footer Bar */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {t('common.cancel', isAr ? 'إلغاء' : 'Cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onSave()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 disabled:opacity-60"
                  >
                    <Save className="size-3.5" />
                    <span>{t('common.save', isAr ? 'حفظ التعديلات' : 'Save Changes')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── New Patient Registration Form Card ─── */}
      {isNew && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t('patients.newTitle', isAr ? 'تسجيل مريض جديد' : 'New Patient File')}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'يرجى إدخال البيانات الشخصية والاتصال لتفعيل المخطط السني' : 'Enter basic info to unlock clinical dental chart'}
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Personal info subcard */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isAr ? 'البيانات الشخصية ومعلومات الاتصال' : 'Personal & Contact Info'}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  <span>{t('patients.fieldFirstName', isAr ? 'الاسم الأول' : 'First Name')} *</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={isAr ? 'مثال: سامر' : 'John'}
                    className="da-input text-xs bg-white"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  <span>{t('patients.fieldLastName', isAr ? 'اسم العائلة / الكنية' : 'Last Name')} *</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={isAr ? 'مثال: الأحمد' : 'Doe'}
                    className="da-input text-xs bg-white"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  <span>{t('patients.fieldDob', isAr ? 'تاريخ الميلاد' : 'Date of Birth')}</span>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="da-input text-xs bg-white font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  <span>{t('patients.fieldGender', isAr ? 'الجنس' : 'Gender')}</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="da-input cursor-pointer bg-white text-xs font-semibold"
                  >
                    <option value="">{t('patients.gender.unspecified', isAr ? 'غير محدد' : 'Unspecified')}</option>
                    <option value="male">{t('patients.gender.male', isAr ? 'ذكر' : 'Male')}</option>
                    <option value="female">{t('patients.gender.female', isAr ? 'أنثى' : 'Female')}</option>
                  </select>
                </label>

                <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-bold text-slate-700">
                  <span>{t('patients.fieldPhone', isAr ? 'رقم الهاتف / واتساب' : 'Phone Number')}</span>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-slate-400 start-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09..."
                      className="da-input text-xs font-mono ps-9 bg-white"
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Medical history subcard */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <HeartPulse className="size-3.5 text-rose-500" />
                  <span>{t('patients.fieldHistory', isAr ? 'السيرة المرضية والتحذيرات السريرية' : 'Medical History')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MEDICAL_ALERT_CHIPS.map((chip) => {
                  const label = isAr ? chip.ar : chip.en
                  const isSelected = medicalHistory.includes(label)
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleMedicalChip(label)}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition active:scale-95 ${
                        isSelected
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? <Check className="size-3 text-rose-600" /> : <Tag className="size-3 text-slate-400" />}
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>

              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                rows={3}
                placeholder={
                  isAr
                    ? 'مثال: حساسية بنسلين، ضغط دم، سكري، أدوية مميعة للدم...'
                    : 'Penicillin allergy, diabetes, hypertension, chronic medications...'
                }
                className="da-input text-xs resize-none bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 disabled:opacity-60"
            >
              <Save className="size-4" />
              <span>{t('common.save', isAr ? 'حفظ وتفعيل الملف السريري' : 'Save Patient')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Dental Chart Container (Spacious & Dedicated) ─── */}
      <div id="patient-odontogram" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-teal-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {t('patients.chartSection', isAr ? 'المخطط السني السريري التفاعلي (Odontogram)' : 'Interactive Dental Chart')}
            </h2>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/60 font-mono">
            FDI Two-Digit
          </span>
        </div>

        {isNew ? (
          <div className="rounded-2xl border border-dashed border-teal-200/80 bg-teal-50/40 p-8 text-center text-xs leading-relaxed text-teal-950 shadow-2xs">
            <p className="font-bold">
              {t(
                'patients.saveToUnlockChart',
                isAr
                  ? 'احفظ بيانات المريض الأساسية أولاً لتفعيل المخطط السني التفاعلي والخطة العلاجية.'
                  : 'Save basic patient info to unlock interactive dental chart.',
              )}
            </p>
          </div>
        ) : showChart ? (
          isDoctor ? (
            <DentalChart
              patientId={resolvedId}
              patientName={`${firstName} ${lastName}`.trim()}
            />
          ) : (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-6 text-xs font-medium text-amber-900 shadow-2xs">
              {t(
                'patients.rbacClinical',
                isAr
                  ? 'صلاحيات المشاهدة والتعديل على المخطط السني مخصصة لحساب الطبيب فقط.'
                  : 'Dental chart editing is restricted to doctor accounts.',
              )}
            </div>
          )
        ) : !isNew ? (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-8 text-center text-xs text-slate-500">
            {error ?? t('common.loading')}
          </div>
        ) : null}
      </div>

      {/* ─── Clinical Modules (Accordion / Collapsible Groups) ─── */}
      {showChart && resolvedId && isDoctor ? (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <ClipboardList className="size-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {isAr ? 'السجل السريري التخصصي' : 'Specialized Clinical Records'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={expandAllSections}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              >
                <Maximize2 className="size-3 text-slate-400" />
                <span>{isAr ? 'توسيع الكل' : 'Expand All'}</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              >
                <Minimize2 className="size-3 text-slate-400" />
                <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
              </button>
            </div>
          </div>

          {/* Orthodontics Section */}
          <div id="patient-orthodontics" className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('orthodontics')}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-2xs transition active:scale-[0.99] ${
                hasOrthoCase
                  ? 'border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/20'
                  : 'border-slate-200/90 hover:border-teal-300 hover:bg-teal-50/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-7 items-center justify-center rounded-lg ${
                    hasOrthoCase ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <Sparkles className="size-4" />
                </div>
                <div className="flex items-center gap-2 text-start">
                  <span className="text-xs font-bold text-slate-800">
                    {isAr ? 'ملف تقويم الأسنان (Orthodontics)' : 'Orthodontics'}
                  </span>
                  {hasOrthoCase ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      {isAr ? 'خطة نشطة' : 'Active'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {isAr ? 'غير مفعّل' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!hasOrthoCase && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSections((s) => ({ ...s, orthodontics: true }))
                      setOpenOrthoTrigger(true)
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100 transition"
                  >
                    <Plus className="size-3 text-teal-600" />
                    <span>{isAr ? 'تفعيل الآن' : 'Activate'}</span>
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-500">
                  {sections.orthodontics ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform duration-200 ${
                    sections.orthodontics ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {sections.orthodontics && (
              <OrthodonticsPanel
                patientId={resolvedId}
                patientDisplayName={`${firstName} ${lastName}`.trim()}
                patientPhone={phone.trim() || null}
                onCaseChange={(has) => {
                  setHasOrthoCase(has)
                  if (has) setSections((s) => ({ ...s, orthodontics: true }))
                }}
                requestOpenNewModal={openOrthoTrigger}
                onRequestOpenHandled={() => setOpenOrthoTrigger(false)}
              />
            )}
          </div>

          {/* Dental Implantology Section */}
          <div id="patient-implants" className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('implants')}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-2xs transition active:scale-[0.99] ${
                implantsCount > 0
                  ? 'border-teal-300/90 hover:border-teal-400 hover:bg-teal-50/20'
                  : 'border-slate-200/90 hover:border-teal-300 hover:bg-teal-50/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-7 items-center justify-center rounded-lg ${
                    implantsCount > 0 ? 'bg-teal-800 text-teal-200' : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex items-center gap-2 text-start">
                  <span className="text-xs font-bold text-slate-800">
                    {isAr ? 'زراعة الأسنان والجراحة (Implantology Tracker)' : 'Dental Implantology & Surgery'}
                  </span>
                  {implantsCount > 0 ? (
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                      {implantsCount} {isAr ? 'زرعة مسجلة' : 'implants'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {isAr ? 'لا توجد زرعات' : 'No implants'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setSections((s) => ({ ...s, implants: true }))
                    setOpenImplantTrigger(true)
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100 transition"
                >
                  <Plus className="size-3 text-teal-600" />
                  <span>{isAr ? 'إضافة زرعة' : 'Add Implant'}</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {sections.implants ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform duration-200 ${
                    sections.implants ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {sections.implants && (
              <ImplantsPanel
                patientId={resolvedId}
                patientDisplayName={`${firstName} ${lastName}`.trim()}
                patientPhone={phone.trim() || null}
                onImplantsChange={(cnt) => setImplantsCount(cnt)}
                requestOpenNewModal={openImplantTrigger}
                onRequestOpenHandled={() => setOpenImplantTrigger(false)}
              />
            )}
          </div>

          {/* Treatment Plan Section (Open by default) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('treatment')}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/20 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <ClipboardList className="size-4" />
                </div>
                <div className="text-start">
                  <span className="text-xs font-bold text-slate-800">
                    {isAr ? 'خطة العلاج والمراحل السريرية (Treatment Plan)' : 'Treatment Plan & Clinical Stages'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {sections.treatment ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform duration-200 ${
                    sections.treatment ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {sections.treatment && (
              <TreatmentPlanPanel
                patientId={resolvedId}
                patientDisplayName={`${firstName} ${lastName}`.trim()}
                patientPhone={phone.trim() || null}
              />
            )}
          </div>

          {/* Clinical Images Gallery Section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('gallery')}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/20 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Camera className="size-4" />
                </div>
                <div className="text-start">
                  <span className="text-xs font-bold text-slate-800">
                    {isAr ? 'معرض الصور السريرية والأشعة (X-Rays & Gallery)' : 'Clinical Images & X-Rays'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {sections.gallery ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform duration-200 ${
                    sections.gallery ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {sections.gallery && <PatientImageGallery patientId={resolvedId} />}
          </div>

          {/* Prescriptions Section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('prescriptions')}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/20 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Pill className="size-4" />
                </div>
                <div className="text-start">
                  <span className="text-xs font-bold text-slate-800">
                    {isAr ? 'الوصفات والتقارير الطبية (Prescriptions)' : 'Prescriptions & Medical Orders'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {sections.prescriptions ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform duration-200 ${
                    sections.prescriptions ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {sections.prescriptions && (
              <PrescriptionsPanel
                patientId={resolvedId}
                doctorId={user?.id ?? null}
                patientDisplayName={`${firstName} ${lastName}`.trim()}
                patientPhone={phone.trim() || null}
              />
            )}
          </div>
        </div>
      ) : null}

      {confirmModal}
    </div>
  )
}
