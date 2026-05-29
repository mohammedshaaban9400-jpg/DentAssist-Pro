import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { CheckCircle2, ClipboardList, Link2, Plus, Printer, Trash2 } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import type { Appointment, TreatmentPlan, TreatmentPlanStage } from '@/types/clinical'
import {
  getConfigs,
  readUserDataFileDataUrl,
  acceptTreatmentPlan,
  createTreatmentPlan,
  createTreatmentPlanStage,
  deleteTreatmentPlan,
  deleteTreatmentPlanStage,
  listAppointments,
  listTreatmentPlanStages,
  listTreatmentPlans,
  updateTreatmentPlan,
  updateTreatmentPlanStage,
} from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { TreatmentPlanPrintDocument, type TreatmentPlanPrintDocumentProps } from '@/components/TreatmentPlanPrintDocument'

type Props = {
  patientId: number
  patientDisplayName: string
  patientPhone: string | null
}

export function TreatmentPlanPanel({ patientId, patientDisplayName, patientPhone }: Props) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const loc = isAr ? arSA : enUS
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()

  const [plans, setPlans] = useState<TreatmentPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [stages, setStages] = useState<TreatmentPlanStage[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [planTitle, setPlanTitle] = useState('')
  const [planDiagnosis, setPlanDiagnosis] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planStatus, setPlanStatus] = useState<TreatmentPlan['status']>('draft')
  const [acceptedByName, setAcceptedByName] = useState('')
  const [signatureText, setSignatureText] = useState('')

  const [stageId, setStageId] = useState<number | null>(null)
  const [stageOrder, setStageOrder] = useState(1)
  const [stageTitle, setStageTitle] = useState('')
  const [stageDescription, setStageDescription] = useState('')
  const [stageEstimated, setStageEstimated] = useState('')
  const [stagePaid, setStagePaid] = useState('')
  const [stageStatus, setStageStatus] = useState<TreatmentPlanStage['status']>('pending')
  const [stageAppointmentId, setStageAppointmentId] = useState<number | null>(null)
  const [stageDueDate, setStageDueDate] = useState('')
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: isAr ? 'TreatmentPlan' : 'TreatmentPlan',
    onAfterPrint: () => setPrintSnap(null),
  })
  const [printSnap, setPrintSnap] = useState<TreatmentPlanPrintDocumentProps | null>(null)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [planRows, appointmentRows] = await Promise.all([
        listTreatmentPlans(patientId),
        listAppointments(null, null),
      ])
      setPlans(planRows)
      setAppointments(appointmentRows.filter((a) => a.patient_id === patientId))
      const firstId = planRows[0]?.id ?? null
      const activeId = selectedPlanId && planRows.some((p) => p.id === selectedPlanId) ? selectedPlanId : firstId
      setSelectedPlanId(activeId)
      if (activeId) {
        const stageRows = await listTreatmentPlanStages(activeId)
        setStages(stageRows)
      } else {
        setStages([])
      }
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [patientId, push, selectedPlanId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedPlan) {
      setPlanTitle('')
      setPlanDiagnosis('')
      setPlanNotes('')
      setPlanStatus('draft')
      return
    }
    setPlanTitle(selectedPlan.title)
    setPlanDiagnosis(selectedPlan.diagnosis ?? '')
    setPlanNotes(selectedPlan.notes ?? '')
    setPlanStatus(selectedPlan.status)
  }, [selectedPlan])

  const resetStageForm = () => {
    setStageId(null)
    setStageOrder(stages.length + 1)
    setStageTitle('')
    setStageDescription('')
    setStageEstimated('')
    setStagePaid('')
    setStageStatus('pending')
    setStageAppointmentId(null)
    setStageDueDate('')
  }

  const onCreatePlan = async () => {
    const title = planTitle.trim()
    if (!title) {
      push(isAr ? 'أدخل عنوان خطة العلاج.' : 'Enter treatment plan title.', 'error')
      return
    }
    setBusy(true)
    try {
      const id = await createTreatmentPlan({
        patientId,
        title,
        diagnosis: planDiagnosis.trim() || null,
        notes: planNotes.trim() || null,
      })
      await load()
      setSelectedPlanId(id)
      push(isAr ? 'تم إنشاء خطة العلاج.' : 'Treatment plan created.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onSavePlan = async () => {
    if (!selectedPlan) return
    if (!planTitle.trim()) {
      push(isAr ? 'العنوان مطلوب.' : 'Title is required.', 'error')
      return
    }
    setBusy(true)
    try {
      await updateTreatmentPlan({
        id: selectedPlan.id,
        title: planTitle,
        diagnosis: planDiagnosis.trim() || null,
        notes: planNotes.trim() || null,
        status: planStatus,
      })
      await load()
      push(isAr ? 'تم تحديث الخطة.' : 'Plan updated.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onAcceptPlan = async () => {
    if (!selectedPlan) return
    if (!acceptedByName.trim() || !signatureText.trim()) {
      push(isAr ? 'الاسم والتوقيع مطلوبان لاعتماد الخطة.' : 'Name and signature are required to accept plan.', 'error')
      return
    }
    setBusy(true)
    try {
      await acceptTreatmentPlan(selectedPlan.id, acceptedByName, signatureText)
      setAcceptedByName('')
      setSignatureText('')
      await load()
      push(isAr ? 'تم اعتماد الخطة وتوقيع قبول المريض.' : 'Plan accepted with patient signature.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDeletePlan = async () => {
    if (!selectedPlan) return
    const ok = await confirm(
      isAr ? 'سيتم حذف الخطة وجميع مراحلها. متابعة؟' : 'This will delete the plan and all stages. Continue?',
      { danger: true },
    )
    if (!ok) return
    setBusy(true)
    try {
      await deleteTreatmentPlan(selectedPlan.id)
      await load()
      resetStageForm()
      push(isAr ? 'تم حذف الخطة.' : 'Plan deleted.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onEditStage = (s: TreatmentPlanStage) => {
    setStageId(s.id)
    setStageOrder(s.stage_order)
    setStageTitle(s.title)
    setStageDescription(s.description ?? '')
    setStageEstimated(String(s.estimated_cost ?? 0))
    setStagePaid(String(s.paid_amount ?? 0))
    setStageStatus(s.status)
    setStageAppointmentId(s.appointment_id)
    setStageDueDate(s.due_date ? s.due_date.slice(0, 10) : '')
  }

  const onSaveStage = async () => {
    if (!selectedPlanId) return
    if (!stageTitle.trim()) {
      push(isAr ? 'عنوان المرحلة مطلوب.' : 'Stage title is required.', 'error')
      return
    }
    const estimated = Number(stageEstimated || '0')
    const paid = Number(stagePaid || '0')
    if (!Number.isFinite(estimated) || estimated < 0 || !Number.isFinite(paid) || paid < 0) {
      push(isAr ? 'أدخل مبالغ صحيحة.' : 'Enter valid amounts.', 'error')
      return
    }
    setBusy(true)
    try {
      if (stageId) {
        await updateTreatmentPlanStage({
          id: stageId,
          stageOrder: stageOrder || 1,
          title: stageTitle,
          description: stageDescription.trim() || null,
          estimatedCost: estimated,
          paidAmount: paid,
          status: stageStatus,
          appointmentId: stageAppointmentId,
          dueDate: stageDueDate ? new Date(`${stageDueDate}T12:00:00`).toISOString() : null,
        })
      } else {
        await createTreatmentPlanStage({
          planId: selectedPlanId,
          stageOrder: stageOrder || 1,
          title: stageTitle,
          description: stageDescription.trim() || null,
          estimatedCost: estimated,
          paidAmount: paid,
          status: stageStatus,
          appointmentId: stageAppointmentId,
          dueDate: stageDueDate ? new Date(`${stageDueDate}T12:00:00`).toISOString() : null,
        })
      }
      const rows = await listTreatmentPlanStages(selectedPlanId)
      setStages(rows)
      resetStageForm()
      push(isAr ? 'تم حفظ المرحلة.' : 'Stage saved.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDeleteStage = async (id: number) => {
    const ok = await confirm(isAr ? 'حذف هذه المرحلة؟' : 'Delete this stage?', { danger: true })
    if (!ok) return
    setBusy(true)
    try {
      await deleteTreatmentPlanStage(id)
      if (selectedPlanId) {
        setStages(await listTreatmentPlanStages(selectedPlanId))
      }
      if (stageId === id) resetStageForm()
      push(isAr ? 'تم حذف المرحلة.' : 'Stage deleted.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const queuePrintPlan = useCallback(async () => {
    if (!selectedPlan) return
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
      const snap: TreatmentPlanPrintDocumentProps = {
        clinicName: (cfg.clinic_name || 'DentAssist Pro').trim(),
        clinicPhone: (cfg.clinic_phone ?? '').trim(),
        clinicAddress: (cfg.clinic_address ?? '').trim(),
        logoDataUrl,
        patientName: patientDisplayName,
        patientPhone,
        printedAtLabel: format(new Date(), 'PPpp', { locale: loc }),
        plan: selectedPlan,
        stages,
        labels: {
          title: isAr ? 'خطة علاج' : 'Treatment Plan',
          diagnosis: isAr ? 'التشخيص' : 'Diagnosis',
          notes: isAr ? 'ملاحظات' : 'Notes',
          status: isAr ? 'الحالة' : 'Status',
          acceptedBy: isAr ? 'اعتمدها' : 'Accepted by',
          acceptedAt: isAr ? 'تاريخ الاعتماد' : 'Accepted at',
          signature: isAr ? 'التوقيع' : 'Signature',
          stage: isAr ? 'المرحلة' : 'Stage',
          estimated: isAr ? 'التكلفة' : 'Estimated',
          paid: isAr ? 'المدفوع' : 'Paid',
          remaining: isAr ? 'المتبقي' : 'Remaining',
          linkedAppointment: isAr ? 'موعد مرتبط' : 'Linked appointment',
          dueDate: isAr ? 'تاريخ الاستحقاق' : 'Due date',
        },
      }
      setPrintSnap(snap)
      window.setTimeout(() => void handlePrint(), 80)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }, [handlePrint, isAr, loc, patientDisplayName, patientPhone, push, selectedPlan, stages])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="size-5 text-teal-700" />
        <h2 className="text-lg font-semibold text-slate-900">
          {isAr ? 'خطة العلاج' : 'Treatment Plan'}
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  selectedPlanId === p.id
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => {
                  setSelectedPlanId(p.id)
                  void listTreatmentPlanStages(p.id).then(setStages)
                  resetStageForm()
                }}
              >
                {p.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId(null)
                setStages([])
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="size-3.5" />
              {isAr ? 'خطة جديدة' : 'New plan'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              {isAr ? 'عنوان الخطة' : 'Plan title'}
              <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} className="da-input mt-1" />
            </label>
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              {isAr ? 'التشخيص' : 'Diagnosis'}
              <textarea value={planDiagnosis} onChange={(e) => setPlanDiagnosis(e.target.value)} rows={2} className="da-input mt-1" />
            </label>
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              {isAr ? 'ملاحظات الخطة' : 'Plan notes'}
              <textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} rows={2} className="da-input mt-1" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {isAr ? 'حالة الخطة' : 'Plan status'}
              <select value={planStatus} onChange={(e) => setPlanStatus(e.target.value as TreatmentPlan['status'])} className="da-input mt-1">
                <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                <option value="accepted">{isAr ? 'معتمدة' : 'Accepted'}</option>
                <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In progress'}</option>
                <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                <option value="cancelled">{isAr ? 'ملغية' : 'Cancelled'}</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              {selectedPlan ? (
                <>
                  <button type="button" disabled={busy} onClick={() => void onSavePlan()} className="da-btn-primary !px-4 !py-2">
                    {isAr ? 'حفظ الخطة' : 'Save plan'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void onDeletePlan()} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                    {isAr ? 'حذف' : 'Delete'}
                  </button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={() => void onCreatePlan()} className="da-btn-primary !px-4 !py-2">
                  {isAr ? 'إنشاء الخطة' : 'Create plan'}
                </button>
              )}
            </div>
          </div>

          {selectedPlan ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-sm font-semibold text-emerald-900">
                  {isAr ? 'توقيع قبول المريض للخطة' : 'Patient plan acceptance signature'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={acceptedByName}
                    onChange={(e) => setAcceptedByName(e.target.value)}
                    placeholder={isAr ? 'اسم المريض الكامل' : 'Patient full name'}
                    className="da-input"
                  />
                  <input
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder={isAr ? 'التوقيع النصي' : 'Signature text'}
                    className="da-input"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => void onAcceptPlan()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="size-4" />
                      {isAr ? 'اعتماد الخطة' : 'Accept plan'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void queuePrintPlan()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      <Printer className="size-4" />
                      {isAr ? 'طباعة الخطة' : 'Print plan'}
                    </button>
                  </div>
                  {selectedPlan.accepted_at ? (
                    <span className="text-xs font-medium text-emerald-800">
                      {isAr ? 'تم الاعتماد:' : 'Accepted:'} {format(parseISO(selectedPlan.accepted_at), 'PPp', { locale: loc })}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  {isAr ? 'مراحل الخطة' : 'Plan stages'}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={String(stageOrder)} onChange={(e) => setStageOrder(Number(e.target.value || '1'))} className="da-input" placeholder={isAr ? 'ترتيب المرحلة' : 'Stage order'} />
                  <input value={stageTitle} onChange={(e) => setStageTitle(e.target.value)} className="da-input" placeholder={isAr ? 'عنوان المرحلة' : 'Stage title'} />
                  <textarea value={stageDescription} onChange={(e) => setStageDescription(e.target.value)} rows={2} className="da-input sm:col-span-2" placeholder={isAr ? 'وصف المرحلة' : 'Stage description'} />
                  <input value={stageEstimated} onChange={(e) => setStageEstimated(e.target.value)} className="da-input" placeholder={isAr ? 'التكلفة التقديرية' : 'Estimated cost'} />
                  <input value={stagePaid} onChange={(e) => setStagePaid(e.target.value)} className="da-input" placeholder={isAr ? 'المبلغ المدفوع' : 'Paid amount'} />
                  <select value={stageStatus} onChange={(e) => setStageStatus(e.target.value as TreatmentPlanStage['status'])} className="da-input">
                    <option value="pending">{isAr ? 'معلقة' : 'Pending'}</option>
                    <option value="scheduled">{isAr ? 'مجدولة' : 'Scheduled'}</option>
                    <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In progress'}</option>
                    <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                    <option value="cancelled">{isAr ? 'ملغية' : 'Cancelled'}</option>
                  </select>
                  <select
                    value={stageAppointmentId ?? ''}
                    onChange={(e) => setStageAppointmentId(e.target.value ? Number(e.target.value) : null)}
                    className="da-input"
                  >
                    <option value="">{isAr ? 'بدون موعد مرتبط' : 'No linked appointment'}</option>
                    {appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {format(parseISO(a.start_time), 'PPp', { locale: loc })}
                      </option>
                    ))}
                  </select>
                  <input type="date" value={stageDueDate} onChange={(e) => setStageDueDate(e.target.value)} className="da-input" />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void onSaveStage()} className="da-btn-primary !px-4 !py-2">
                    {stageId ? (isAr ? 'تحديث المرحلة' : 'Update stage') : (isAr ? 'إضافة مرحلة' : 'Add stage')}
                  </button>
                  {stageId ? (
                    <button type="button" onClick={resetStageForm} className="da-btn-secondary !px-4 !py-2">
                      {isAr ? 'إلغاء التعديل' : 'Cancel edit'}
                    </button>
                  ) : null}
                </div>

                <ul className="mt-4 space-y-2">
                  {stages.map((s) => (
                    <li key={s.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {isAr ? 'المرحلة' : 'Stage'} {s.stage_order}: {s.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onEditStage(s)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            <Link2 className="size-3.5" />
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>
                          <button type="button" onClick={() => void onDeleteStage(s.id)} className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                            <Trash2 className="size-3.5" />
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{s.description || '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isAr ? 'التكلفة:' : 'Cost:'} {s.estimated_cost} | {isAr ? 'المدفوع:' : 'Paid:'} {s.paid_amount} | {isAr ? 'المتبقي:' : 'Remaining:'} {Math.max(0, s.estimated_cost - s.paid_amount)}
                      </p>
                      {s.appointment_start_time ? (
                        <p className="text-xs text-slate-500">
                          {isAr ? 'الموعد المرتبط:' : 'Linked appointment:'} {format(parseISO(s.appointment_start_time), 'PPp', { locale: loc })}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {stages.length === 0 ? (
                    <li className="text-sm text-slate-500">{isAr ? 'لا توجد مراحل بعد.' : 'No stages yet.'}</li>
                  ) : null}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      )}
      {confirmModal}
      <div className="fixed start-[-12000px] top-0 -z-10" aria-hidden>
        {printSnap ? <TreatmentPlanPrintDocument ref={printRef} {...printSnap} /> : null}
      </div>
    </section>
  )
}
