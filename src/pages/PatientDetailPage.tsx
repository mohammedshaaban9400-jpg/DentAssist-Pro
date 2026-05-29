import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useConfirm } from '@/hooks/useConfirm'
import {
  createPatient,
  deletePatient,
  getPatient,
  updatePatient,
} from '@/services/dbService'
import { DentalChart } from '@/components/DentalChart'
import { PatientImageGallery } from '@/components/PatientImageGallery'
import { PrescriptionsPanel } from '@/components/PrescriptionsPanel'
import { TreatmentPlanPanel } from '@/components/TreatmentPlanPanel'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'

export function PatientDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
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

  useEffect(() => {
    if (isNew) {
      setLoading(false)
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

  const onSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!firstName.trim() || !lastName.trim()) {
        setError(t('patients.validationName'))
        return
      }
      if (isNew) {
        const newId = await createPatient({
          firstName,
          lastName,
          dob: dob || null,
          gender: gender || null,
          phone: phone || null,
          medicalHistory: medicalHistory || null,
        })
        push(t('patients.savedSuccess'), 'success')
        navigate(`/patients/${newId}`, { replace: true })
        return
      }
      if (!resolvedId) return
      await updatePatient(resolvedId, {
        firstName,
        lastName,
        dob: dob || null,
        gender: gender || null,
        phone: phone || null,
        medicalHistory: medicalHistory || null,
      })
      push(t('patients.savedSuccess'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (isNew || !resolvedId) return
    if (!await confirm(t('patients.confirmDelete'))) return
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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-8">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="da-card animate-pulse space-y-4 !py-10">
            <div className="h-8 w-2/3 rounded-xl bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100 sm:col-span-2" />
            </div>
          </div>
          <div className="da-card h-72 animate-pulse rounded-2xl bg-slate-100/70" />
        </div>
      </div>
    )
  }

  const showChart = !isNew && resolvedId != null && resolvedId > 0 && Number.isFinite(resolvedId)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/patients"
          className="da-btn-ghost -ms-1 inline-flex items-center gap-2 !px-2 text-sm text-teal-700"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('patients.back')}
        </Link>
        {showChart ? (
          <a
            href="#patient-odontogram"
            className="cursor-pointer rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-teal-100/90 lg:hidden"
          >
            {t('patients.scrollToChart')}
          </a>
        ) : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="da-card">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isNew ? t('patients.newTitle') : t('patients.editTitle')}
          </h1>
          {error ? (
            <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldFirstName')}
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="da-input cursor-text text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldLastName')}
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="da-input cursor-text text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldDob')}
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="da-input cursor-text text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldGender')}
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="da-input cursor-pointer text-base"
            >
              <option value="">{t('patients.gender.unspecified')}</option>
              <option value="male">{t('patients.gender.male')}</option>
              <option value="female">{t('patients.gender.female')}</option>
            </select>
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldPhone')}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="da-input cursor-text text-base"
            />
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm font-medium text-slate-800">
            {t('patients.fieldHistory')}
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              rows={4}
              className="da-input cursor-text text-base"
            />
          </label>
        </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="da-btn-primary !px-6 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
            {showChart ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void onDelete()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
              >
                <Trash2 className="size-4" aria-hidden />
                {t('common.delete')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('patients.chartSection')}
          </h2>
          <p className="mb-4 text-xs font-medium leading-relaxed text-slate-400 lg:hidden">
            {t('patients.chartAsideHint')}
          </p>
          {isNew ? (
            <div className="rounded-2xl border border-dashed border-teal-200/80 bg-teal-50/40 p-8 text-sm leading-relaxed text-teal-950 shadow-[var(--shadow-dent-card)]">
              {t('patients.saveToUnlockChart')}
            </div>
          ) : showChart ? (
            isDoctor ? (
              <DentalChart patientId={resolvedId} patientName={`${firstName} ${lastName}`.trim()} />
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-sm font-medium leading-relaxed text-amber-900 shadow-[var(--shadow-dent-card)]">
                {t('patients.rbacClinical')}
              </div>
            )
          ) : !isNew ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-8 text-sm text-slate-600">
              {error ?? t('common.loading')}
            </div>
          ) : null}
        </div>
      </div>

      {showChart && resolvedId ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/invoices?patientId=${resolvedId}`}
              className="da-btn-secondary inline-flex cursor-pointer items-center gap-2 !px-5 !py-2.5 no-underline"
            >
              {t('patients.openInvoices')}
            </Link>
          </div>
          {isDoctor ? (
            <TreatmentPlanPanel
              patientId={resolvedId}
              patientDisplayName={`${firstName} ${lastName}`.trim()}
              patientPhone={phone.trim() || null}
            />
          ) : null}
          {isDoctor ? <PatientImageGallery patientId={resolvedId} /> : null}
          {isDoctor ? (
            <PrescriptionsPanel
              patientId={resolvedId}
              doctorId={user?.id ?? null}
              patientDisplayName={`${firstName} ${lastName}`.trim()}
              patientPhone={phone.trim() || null}
            />
          ) : null}
        </div>
      ) : null}
      {confirmModal}
    </div>
  )
}
