import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { Pencil, Pill, Plus, Printer, Trash2 } from 'lucide-react'
import { useConfirm } from '@/hooks/useConfirm'
import { useReactToPrint } from 'react-to-print'
import type { MedicationLineDraft, PrescriptionRow } from '@/types/clinical'
import { PrescriptionPrintDocument, type PrescriptionPrintDocumentProps } from '@/components/PrescriptionPrintDocument'
import { MEDICATION_SUGGESTIONS, suggestionLabel } from '@/lib/medicationSuggestions'
import {
  createPrescription,
  deletePrescription,
  getConfigs,
  listPrescriptions,
  readUserDataFileDataUrl,
  updatePrescription,
} from '@/services/dbService'

function parseMedications(json: string): MedicationLineDraft[] {
  try {
    const raw = JSON.parse(json) as unknown
    if (!Array.isArray(raw)) return []
    return raw.map((x) => {
      const o = x as Record<string, unknown>
      return {
        name: String(o.name ?? '').trim(),
        dose: String(o.dose ?? ''),
        duration: String(o.duration ?? ''),
        notes: String(o.notes ?? ''),
      }
    })
  } catch {
    return []
  }
}

function serializeMedications(lines: MedicationLineDraft[]): string {
  const cleaned = lines
    .map((l) => ({
      name: l.name.trim(),
      dose: l.dose.trim() || undefined,
      duration: l.duration.trim() || undefined,
      notes: l.notes.trim() || undefined,
    }))
    .filter((l) => l.name.length > 0)
  return JSON.stringify(cleaned)
}

function emptyMedLine(): MedicationLineDraft {
  return { name: '', dose: '', duration: '', notes: '' }
}

function emptyDraft(patientId: number, doctorId: number): {
  patientId: number
  doctorId: number
  date: string
  notes: string
  meds: MedicationLineDraft[]
} {
  return {
    patientId,
    doctorId,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    meds: [emptyMedLine()],
  }
}

type Props = {
  patientId: number
  doctorId: number | null
  patientDisplayName: string
  patientPhone: string | null
}

export function PrescriptionsPanel({ patientId, doctorId, patientDisplayName, patientPhone }: Props) {
  const { t, i18n } = useTranslation()
  const loc = i18n.language === 'ar' ? arSA : enUS
  const { confirm, confirmModal } = useConfirm()
  const [rows, setRows] = useState<PrescriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState(() => emptyDraft(patientId, doctorId ?? 0))
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Prescription',
    onAfterPrint: () => setPrintSnap(null),
  })
  const [printSnap, setPrintSnap] = useState<PrescriptionPrintDocumentProps | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listPrescriptions(patientId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (editingId === 'new') {
      setDraft(emptyDraft(patientId, doctorId ?? 0))
    }
  }, [editingId, patientId, doctorId])

  const startEdit = (r: PrescriptionRow) => {
    const meds = parseMedications(r.medications_json)
    setEditingId(r.id)
    setDraft({
      patientId: r.patient_id,
      doctorId: r.doctor_id,
      date: r.date.slice(0, 10),
      notes: r.notes ?? '',
      meds: meds.length > 0 ? meds : [emptyMedLine()],
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(emptyDraft(patientId, doctorId ?? 0))
  }

  const save = async () => {
    const effectiveDoctorId =
      editingId === 'new' ? doctorId ?? null : draft.doctorId > 0 ? draft.doctorId : doctorId
    if (!effectiveDoctorId) {
      setError(t('patients.rxNeedDoctor'))
      return
    }
    const json = serializeMedications(draft.meds)
    if (json === '[]') {
      setError(t('patients.rxNeedMed'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const dateIso = new Date(draft.date + 'T12:00:00').toISOString()
      const notes = draft.notes.trim() || null
      if (editingId === 'new') {
        await createPrescription({
          patientId,
          doctorId: effectiveDoctorId,
          date: dateIso,
          medicationsJson: json,
          notes,
        })
      } else if (typeof editingId === 'number') {
        await updatePrescription(editingId, {
          patientId,
          doctorId: effectiveDoctorId,
          date: dateIso,
          medicationsJson: json,
          notes,
        })
      }
      setEditingId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (!await confirm(t('patients.rxConfirmDelete'))) return
    setBusy(true)
    try {
      await deletePrescription(id)
      if (editingId === id) cancelEdit()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const queuePrint = useCallback(
    async (r: PrescriptionRow) => {
      try {
        const cfg = await getConfigs(['clinic_name', 'clinic_phone', 'clinic_address', 'clinic_logo_path'])
        let logoDataUrl: string | null = null
        const logoPath = cfg.clinic_logo_path?.trim()
        if (logoPath) {
          try {
            logoDataUrl = await readUserDataFileDataUrl(logoPath)
          } catch {
            logoDataUrl = null
          }
        }
        const meds = parseMedications(r.medications_json)
        const snap: PrescriptionPrintDocumentProps = {
          clinicName: (cfg.clinic_name || 'DentAssist Pro').trim(),
          clinicPhone: (cfg.clinic_phone ?? '').trim(),
          clinicAddress: (cfg.clinic_address ?? '').trim(),
          logoDataUrl,
          doctorName: r.doctor_username,
          patientName: patientDisplayName,
          patientPhone,
          dateLabel: format(parseISO(r.date), 'PPpp', { locale: loc }),
          medications: meds,
          notes: r.notes,
          title: t('print.rxTitle'),
          colDrug: t('patients.rxMedName'),
          colDose: t('patients.rxMedDose'),
          colDuration: t('patients.rxMedDuration'),
          colNotes: t('patients.rxMedNotes'),
        }
        setPrintSnap(snap)
        window.setTimeout(() => void handlePrint(), 80)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [handlePrint, loc, patientDisplayName, patientPhone, t],
  )

  const medSummary = (r: PrescriptionRow) => {
    const meds = parseMedications(r.medications_json)
    if (meds.length === 0) return '—'
    return meds
      .map((m) => m.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ')
  }

  const showForm = editingId !== null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="rx-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="rx-heading" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Pill className="size-5 text-teal-600" aria-hidden />
            {t('patients.rxTitle')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t('patients.rxSubtitle')}</p>
        </div>
        {!showForm ? (
          <button
            type="button"
            disabled={!doctorId || busy}
            onClick={() => setEditingId('new')}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            {t('patients.rxAdd')}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <datalist id="rx-med-suggestions">
        {MEDICATION_SUGGESTIONS.map((s) => (
          <option key={s.id} value={suggestionLabel(i18n.language, s)} />
        ))}
      </datalist>

      {showForm ? (
        <div className="mt-6 space-y-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
              {t('patients.rxDate')}
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              />
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium text-slate-800">
              {t('patients.rxNotes')}
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                rows={2}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              />
            </label>
          </div>
          <p className="text-sm font-semibold text-slate-800">{t('patients.rxMedications')}</p>
          <div className="space-y-3">
            {draft.meds.map((line, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
              >
                <label className="lg:col-span-4 flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {t('patients.rxMedName')}
                  <input
                    value={line.name}
                    list="rx-med-suggestions"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        meds: d.meds.map((m, j) => (j === i ? { ...m, name: e.target.value } : m)),
                      }))
                    }
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {t('patients.rxMedDose')}
                  <input
                    value={line.dose}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        meds: d.meds.map((m, j) => (j === i ? { ...m, dose: e.target.value } : m)),
                      }))
                    }
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {t('patients.rxMedDuration')}
                  <input
                    value={line.duration}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        meds: d.meds.map((m, j) => (j === i ? { ...m, duration: e.target.value } : m)),
                      }))
                    }
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="lg:col-span-3 flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {t('patients.rxMedNotes')}
                  <input
                    value={line.notes}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        meds: d.meds.map((m, j) => (j === i ? { ...m, notes: e.target.value } : m)),
                      }))
                    }
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <div className="flex lg:col-span-1 lg:justify-center">
                  <button
                    type="button"
                    disabled={draft.meds.length <= 1}
                    onClick={() => setDraft((d) => ({ ...d, meds: d.meds.filter((_, j) => j !== i) }))}
                    className="text-rose-600 hover:text-rose-800 disabled:opacity-30"
                    aria-label={t('patients.rxRemoveMed')}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, meds: [...d.meds, emptyMedLine()] }))}
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            {t('patients.rxAddMed')}
          </button>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80">
            <tr>
              <th className="px-3 py-2.5 font-semibold text-slate-700">{t('patients.rxDate')}</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700">{t('patients.rxDoctor')}</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700">{t('patients.rxMedications')}</th>
              <th className="px-3 py-2.5 font-semibold text-slate-700">{t('print.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : rows.length === 0 && !showForm ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  {t('patients.rxEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 text-slate-700">
                    {format(parseISO(r.date), 'PP', { locale: loc })}
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">{r.doctor_username}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2.5 text-slate-600" title={medSummary(r)}>
                    {medSummary(r)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void queuePrint(r)}
                        className="inline-flex items-center gap-1 text-slate-700 hover:underline disabled:opacity-50"
                      >
                        <Printer className="size-3.5" aria-hidden />
                        {t('print.reprint')}
                      </button>
                      <button
                        type="button"
                        disabled={busy || editingId !== null}
                        onClick={() => startEdit(r)}
                        className="inline-flex items-center gap-1 text-teal-700 hover:underline disabled:opacity-40"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(r.id)}
                        className="inline-flex items-center gap-1 text-rose-700 hover:underline disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="fixed start-[-12000px] top-0 -z-10" aria-hidden>
        {printSnap ? <PrescriptionPrintDocument ref={printRef} {...printSnap} /> : null}
      </div>
      {confirmModal}
    </section>
  )
}
