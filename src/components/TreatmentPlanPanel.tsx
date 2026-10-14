import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import {
  Plus,
  Printer,
  Trash2,
  Sparkles,
  Pencil,
  Calendar,
  X,
  FileText,
  Save,
  Check,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import type { Appointment, TreatmentPlan, TreatmentPlanStage, TreatmentCatalogItem } from '@/types/clinical'
import {
  getConfigs,
  readUserDataFileDataUrl,
  createTreatmentPlan,
  createTreatmentPlanStage,
  deleteTreatmentPlan,
  deleteTreatmentPlanStage,
  listAppointments,
  listTreatmentPlanStages,
  listTreatmentPlans,
  listTreatmentCatalog,
  updateTreatmentPlan,
  updateTreatmentPlanStage,
} from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { TreatmentPlanPrintDocument, type TreatmentPlanPrintDocumentProps } from '@/components/TreatmentPlanPrintDocument'
import { TreatmentCatalogModal } from '@/components/TreatmentCatalogModal'

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

  // Plan Details State
  const [planTitle, setPlanTitle] = useState('')
  const [planDiagnosis, setPlanDiagnosis] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planStatus, setPlanStatus] = useState<TreatmentPlan['status']>('draft')

  // New Plan Modal State
  const [newPlanModalOpen, setNewPlanModalOpen] = useState(false)
  const [newPlanTitle, setNewPlanTitle] = useState('')
  const [newPlanDiagnosis, setNewPlanDiagnosis] = useState('')

  // Stage Form State
  const [stageId, setStageId] = useState<number | null>(null)
  const [stageOrder, setStageOrder] = useState(1)
  const [stageTitle, setStageTitle] = useState('')
  const [stageDescription, setStageDescription] = useState('')
  const [stageEstimated, setStageEstimated] = useState('')
  const [stagePaid, setStagePaid] = useState('')
  const [stageStatus, setStageStatus] = useState<TreatmentPlanStage['status']>('pending')
  const [stageAppointmentId, setStageAppointmentId] = useState<number | null>(null)
  const [stageDueDate, setStageDueDate] = useState('')

  // Print Setup
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: isAr ? 'TreatmentPlan' : 'TreatmentPlan',
    onAfterPrint: () => setPrintSnap(null),
  })
  const [printSnap, setPrintSnap] = useState<TreatmentPlanPrintDocumentProps | null>(null)

  // Treatment Catalog
  const [catalog, setCatalog] = useState<TreatmentCatalogItem[]>([])
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const loadCatalog = useCallback(async () => {
    try {
      const rows = await listTreatmentCatalog({ activeOnly: true })
      setCatalog(rows)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [planRows, appointmentRows] = await Promise.all([
        listTreatmentPlans(patientId),
        listAppointments(null, null),
      ])
      setPlans(planRows)
      setAppointments(appointmentRows.filter((a) => a.patient_id === patientId))

      const currentSelectedExists = selectedPlanId && planRows.some((p) => p.id === selectedPlanId)
      const targetId = currentSelectedExists ? selectedPlanId : planRows[0]?.id ?? null
      setSelectedPlanId(targetId)

      if (targetId) {
        const stageRows = await listTreatmentPlanStages(targetId)
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

  // Financial Metrics
  const totalEstimated = useMemo(
    () => stages.reduce((s, x) => s + (Number.isFinite(x.estimated_cost) ? x.estimated_cost : 0), 0),
    [stages],
  )
  const totalPaid = useMemo(
    () => stages.reduce((s, x) => s + (Number.isFinite(x.paid_amount) ? x.paid_amount : 0), 0),
    [stages],
  )
  const totalRemaining = Math.max(0, totalEstimated - totalPaid)

  // Plan Handlers
  const onCreateNewPlan = async () => {
    const title = newPlanTitle.trim()
    if (!title) {
      push(isAr ? 'يرجى إدخال عنوان خطة العلاج.' : 'Please enter treatment plan title.', 'error')
      return
    }
    setBusy(true)
    try {
      const id = await createTreatmentPlan({
        patientId,
        title,
        diagnosis: newPlanDiagnosis.trim() || null,
        notes: null,
      })
      setNewPlanModalOpen(false)
      setNewPlanTitle('')
      setNewPlanDiagnosis('')
      await load()
      setSelectedPlanId(id)
      const stageRows = await listTreatmentPlanStages(id)
      setStages(stageRows)
      resetStageForm()
      push(isAr ? 'تم إنشاء خطة العلاج بنجاح.' : 'Treatment plan created successfully.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onSavePlan = async () => {
    if (!selectedPlan) return
    if (!planTitle.trim()) {
      push(isAr ? 'عنوان الخطة مطلوب.' : 'Plan title is required.', 'error')
      return
    }
    setBusy(true)
    try {
      await updateTreatmentPlan({
        id: selectedPlan.id,
        title: planTitle.trim(),
        diagnosis: planDiagnosis.trim() || null,
        notes: planNotes.trim() || null,
        status: planStatus,
      })
      await load()
      push(isAr ? 'تم حفظ التعديلات على الخطة.' : 'Plan changes saved.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDeletePlan = async () => {
    if (!selectedPlan) return
    const ok = await confirm(
      isAr ? 'هل أنت متأكد من حذف هذه الخطة العلاجية وجميع مراحلها؟' : 'Are you sure you want to delete this treatment plan and all its stages?',
      { danger: true },
    )
    if (!ok) return
    setBusy(true)
    try {
      await deleteTreatmentPlan(selectedPlan.id)
      await load()
      resetStageForm()
      push(isAr ? 'تم حذف الخطة العلاجية.' : 'Treatment plan deleted.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  // Stage Handlers
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
    // Scroll smoothly to stage form
    const el = document.getElementById('treatment-stage-form')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const onSaveStage = async () => {
    if (!selectedPlanId) return
    if (!stageTitle.trim()) {
      push(isAr ? 'يرجى كتابة اسم الإجراء أو المرحلة.' : 'Please enter procedure or stage title.', 'error')
      return
    }
    const estimated = Number(stageEstimated || '0')
    const paid = Number(stagePaid || '0')
    if (!Number.isFinite(estimated) || estimated < 0 || !Number.isFinite(paid) || paid < 0) {
      push(isAr ? 'يرجى إدخال مبالغ مالية صحيحة.' : 'Please enter valid amounts.', 'error')
      return
    }
    setBusy(true)
    try {
      if (stageId) {
        await updateTreatmentPlanStage({
          id: stageId,
          stageOrder: stageOrder || 1,
          title: stageTitle.trim(),
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
          stageOrder: stageOrder || (stages.length + 1),
          title: stageTitle.trim(),
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
      push(isAr ? 'تم حفظ المرحلة بنجاح.' : 'Stage saved successfully.', 'success')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onToggleStageStatus = async (s: TreatmentPlanStage) => {
    if (!selectedPlanId) return
    const nextStatus: TreatmentPlanStage['status'] = s.status === 'completed' ? 'pending' : 'completed'
    try {
      await updateTreatmentPlanStage({
        id: s.id,
        stageOrder: s.stage_order,
        title: s.title,
        description: s.description,
        estimatedCost: s.estimated_cost,
        paidAmount: s.paid_amount,
        status: nextStatus,
        appointmentId: s.appointment_id,
        dueDate: s.due_date,
      })
      const rows = await listTreatmentPlanStages(selectedPlanId)
      setStages(rows)
      push(
        nextStatus === 'completed'
          ? (isAr ? 'تم وضع علامة مكتملة على المرحلة.' : 'Marked stage as completed.')
          : (isAr ? 'تم تغيير الحالة إلى معلقة.' : 'Marked stage as pending.'),
        'success',
      )
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const onDeleteStage = async (id: number) => {
    const ok = await confirm(isAr ? 'حذف هذه المرحلة من الخطة؟' : 'Delete this stage from plan?', { danger: true })
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

  // Print Plan
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
          title: isAr ? 'خطة علاج المريض' : 'Patient Treatment Plan',
          diagnosis: isAr ? 'التشخيص' : 'Diagnosis',
          notes: isAr ? 'ملاحظات' : 'Notes',
          status: isAr ? 'الحالة' : 'Status',
          acceptedBy: '',
          acceptedAt: '',
          signature: '',
          stage: isAr ? 'المرحلة' : 'Stage',
          estimated: isAr ? 'التكلفة' : 'Estimated',
          paid: isAr ? 'المدفوع' : 'Paid',
          remaining: isAr ? 'المتبقي' : 'Remaining',
          linkedAppointment: isAr ? 'الموعد المرتبط' : 'Linked appointment',
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
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <FileText className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAr ? 'الخطة العلاجية للمريض' : 'Patient Treatment Plan'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'إدارة مراحل وإجراءات العلاج والتكاليف التقديرية بدقة وسهولة'
                : 'Manage clinical procedures, stages and treatment costs seamlessly'}
            </p>
          </div>
        </div>

        {/* Plan Tabs & New Plan Button */}
        <div className="flex flex-wrap items-center gap-2">
          {plans.map((p) => {
            const isSelected = selectedPlanId === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPlanId(p.id)
                  void listTreatmentPlanStages(p.id).then(setStages)
                  resetStageForm()
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25 ring-2 ring-teal-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{p.title}</span>
                <span
                  className={`size-2 rounded-full ${
                    p.status === 'completed'
                      ? 'bg-emerald-400'
                      : p.status === 'in_progress'
                      ? 'bg-sky-400'
                      : p.status === 'cancelled'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`}
                />
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => {
              setNewPlanTitle(isAr ? `خطة علاج #${plans.length + 1}` : `Treatment Plan #${plans.length + 1}`)
              setNewPlanDiagnosis('')
              setNewPlanModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100"
          >
            <Plus className="size-3.5" />
            <span>{isAr ? 'خطة جديدة' : 'New Plan'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold text-slate-500 animate-pulse">
            {isAr ? 'جاري تحميل خطة العلاج...' : 'Loading treatment plan...'}
          </p>
        </div>
      ) : !selectedPlan ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <Sparkles className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {isAr ? 'لا توجد خطة علاج مسجلة لهذا المريض بعد' : 'No treatment plan for this patient yet'}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500">
            {isAr
              ? 'قم بإنشاء خطة علاج جديدة لتنظيم المراحل، اختيار الإجراءات من قائمة الأسعار، ومتابعة التكاليف والدفعات المالية.'
              : 'Create a treatment plan to organize stages, select procedures from fee schedule, and track finances.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setNewPlanTitle(isAr ? 'خطة علاج شاملة' : 'Comprehensive Treatment Plan')
              setNewPlanDiagnosis('')
              setNewPlanModalOpen(true)
            }}
            className="da-btn-primary mt-5 !px-5 !py-2.5 text-xs font-bold"
          >
            <Plus className="size-4" />
            <span>{isAr ? 'إنشاء خطة العلاج الآن' : 'Create Treatment Plan Now'}</span>
          </button>
        </div>
      ) : (
        /* Active Plan View */
        <div className="space-y-6">
          {/* Plan Settings Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-1 min-w-[260px] items-center gap-3">
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-slate-50 px-2 py-1 rounded-md outline-none transition"
                  placeholder={isAr ? 'عنوان الخطة...' : 'Plan title...'}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Dropdown without 'accepted' */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'حالة الخطة:' : 'Status:'}
                  </span>
                  <select
                    value={planStatus}
                    onChange={(e) => setPlanStatus(e.target.value as TreatmentPlan['status'])}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                    <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
                    <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                    <option value="cancelled">{isAr ? 'ملغية' : 'Cancelled'}</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSavePlan()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
                  title={isAr ? 'حفظ تعديلات الخطة' : 'Save plan'}
                >
                  <Save className="size-3.5" />
                  <span>{isAr ? 'حفظ' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void queuePrintPlan()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  title={isAr ? 'طباعة الخطة العلاجية' : 'Print plan'}
                >
                  <Printer className="size-3.5 text-slate-500" />
                  <span>{isAr ? 'طباعة' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDeletePlan()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  title={isAr ? 'حذف الخطة' : 'Delete plan'}
                >
                  <Trash2 className="size-3.5" />
                  <span>{isAr ? 'حذف الخطة' : 'Delete'}</span>
                </button>
              </div>
            </div>

            {/* Compact Diagnosis & Notes Row */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {isAr ? 'التشخيص الطبي / ملخص الحالة' : 'Diagnosis'}
                </label>
                <input
                  type="text"
                  value={planDiagnosis}
                  onChange={(e) => setPlanDiagnosis(e.target.value)}
                  placeholder={isAr ? 'مثال: نخر متعدد، بحاجة لمعالجة لبية، فقدان أرحاء سفلية...' : 'e.g. Deep caries, missing lower molars...'}
                  className="da-input !text-xs !py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {isAr ? 'ملاحظات الطبيب' : 'Clinical Notes'}
                </label>
                <input
                  type="text"
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: المريض يفضل التيجان الخزفية، يعاني من حساسية سابقة...' : 'e.g. Prefers aesthetic restorations...'}
                  className="da-input !text-xs !py-2"
                />
              </div>
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <span className="text-xs font-bold text-slate-500">
                {isAr ? 'إجمالي التكلفة التقديرية' : 'Total Estimated Cost'}
              </span>
              <p className="mt-1 text-xl font-black text-slate-900">
                {totalEstimated.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">{isAr ? 'ل.س' : 'SYP'}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
              <span className="text-xs font-bold text-emerald-800">
                {isAr ? 'المبلغ المدفوع' : 'Total Paid'}
              </span>
              <p className="mt-1 text-xl font-black text-emerald-700">
                {totalPaid.toLocaleString()}{' '}
                <span className="text-xs font-normal text-emerald-600">{isAr ? 'ل.س' : 'SYP'}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
              <span className="text-xs font-bold text-amber-900">
                {isAr ? 'المبلغ المتبقي' : 'Remaining Balance'}
              </span>
              <p className="mt-1 text-xl font-black text-amber-700">
                {totalRemaining.toLocaleString()}{' '}
                <span className="text-xs font-normal text-amber-600">{isAr ? 'ل.س' : 'SYP'}</span>
              </p>
            </div>
          </div>

          {/* Treatment Stages Section */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-bold text-xs">
                  {stages.length}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'مراحل وإجراءات الخطة العلاجية' : 'Treatment Stages & Procedures'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
              >
                <Sparkles className="size-3.5 text-teal-600" />
                <span>{isAr ? 'دليل الإجراءات وقائمة الأسعار' : 'Fee Catalog & Price List'}</span>
              </button>
            </div>

            {/* Quick Procedure Add / Edit Form */}
            <div id="treatment-stage-form" className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 mb-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-950">
                  <Sparkles className="size-3.5 text-teal-600" />
                  <span>
                    {stageId
                      ? (isAr ? 'تعديل المرحلة المحددة:' : 'Edit Selected Stage:')
                      : (isAr ? 'إضافة إجراء سريع من قائمة الأسعار الموحدة (تنزيل تلقائي):' : 'Quick add procedure from catalog (Auto-fill):')}
                  </span>
                </span>
                {stageId ? (
                  <button
                    type="button"
                    onClick={resetStageForm}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <X className="size-3.5" />
                    <span>{isAr ? 'إلغاء التعديل' : 'Cancel'}</span>
                  </button>
                ) : null}
              </div>

              {/* Catalog Dropdown */}
              <div className="mb-3">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    if (!id) return
                    const it = catalog.find((c) => c.id === id)
                    if (it) {
                      setStageTitle(isAr ? it.name_ar : (it.name_en || it.name_ar))
                      setStageDescription(it.description || '')
                      setStageEstimated(String(it.default_cost))
                    }
                    e.target.value = ''
                  }}
                  className="da-input w-full bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="">{isAr ? '-- انقر هنا لاختيار الإجراء وتنزيل البيانات والأسعار تلقائياً --' : '-- Choose a procedure to auto-fill --'}</option>
                  {['restorative', 'endodontics', 'prosthetics', 'implants', 'surgery', 'periodontics', 'cosmetic', 'preventive', 'other'].map((catKey) => {
                    const groupItems = catalog.filter((c) => c.category === catKey)
                    if (groupItems.length === 0) return null
                    const catLabel =
                      catKey === 'restorative' ? (isAr ? 'حشوات وترميم' : 'Restorative') :
                      catKey === 'endodontics' ? (isAr ? 'علاج عصب وجذور' : 'Endodontics') :
                      catKey === 'prosthetics' ? (isAr ? 'تعويضات وتيجان' : 'Prosthetics') :
                      catKey === 'implants' ? (isAr ? 'زراعة الأسنان' : 'Implants') :
                      catKey === 'surgery' ? (isAr ? 'جراحة وقلع' : 'Oral Surgery') :
                      catKey === 'periodontics' ? (isAr ? 'تنظيف ولثة' : 'Periodontics') :
                      catKey === 'cosmetic' ? (isAr ? 'تجميل وتبييض' : 'Cosmetics') :
                      catKey === 'preventive' ? (isAr ? 'وقاية وأطفال' : 'Preventive') :
                      (isAr ? 'أخرى' : 'Other')
                    return (
                      <optgroup key={catKey} label={catLabel}>
                        {groupItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {isAr ? it.name_ar : it.name_en} — ({it.default_cost.toLocaleString()} ل.س)
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'عنوان المرحلة / الإجراء *' : 'Stage / Procedure Title *'}
                  </label>
                  <input
                    type="text"
                    value={stageTitle}
                    onChange={(e) => setStageTitle(e.target.value)}
                    placeholder={isAr ? 'مثال: حشوة كمبوزيت ضرس 36' : 'e.g. Composite filling molar 36'}
                    className="da-input bg-white !text-xs !py-1.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'التكلفة التقديرية' : 'Estimated Cost'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stageEstimated}
                    onChange={(e) => setStageEstimated(e.target.value)}
                    placeholder="0"
                    className="da-input bg-white !text-xs !py-1.5 font-bold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'المدفوع' : 'Paid Amount'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stagePaid}
                    onChange={(e) => setStagePaid(e.target.value)}
                    placeholder="0"
                    className="da-input bg-white !text-xs !py-1.5 font-bold text-emerald-700"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'حالة المرحلة' : 'Status'}
                  </label>
                  <select
                    value={stageStatus}
                    onChange={(e) => setStageStatus(e.target.value as TreatmentPlanStage['status'])}
                    className="da-input bg-white !text-xs !py-1.5 font-semibold text-slate-800"
                  >
                    <option value="pending">{isAr ? 'معلقة' : 'Pending'}</option>
                    <option value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</option>
                    <option value="completed">{isAr ? 'مكتملة' : 'Completed'}</option>
                    <option value="cancelled">{isAr ? 'ملغية' : 'Cancelled'}</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'الوصف السريري أو رقم السن (اختياري)' : 'Clinical notes / Tooth (optional)'}
                  </label>
                  <input
                    type="text"
                    value={stageDescription}
                    onChange={(e) => setStageDescription(e.target.value)}
                    placeholder={isAr ? 'مثال: السن رقم 16 - تنظيف نخر عميق مع تبطين' : 'e.g. Tooth 16 - deep caries lining'}
                    className="da-input bg-white !text-xs !py-1.5"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'ربط بموعد للمريض' : 'Linked Appointment'}
                  </label>
                  <select
                    value={stageAppointmentId ?? ''}
                    onChange={(e) => setStageAppointmentId(e.target.value ? Number(e.target.value) : null)}
                    className="da-input bg-white !text-xs !py-1.5"
                  >
                    <option value="">{isAr ? 'بدون موعد' : 'No appointment'}</option>
                    {appointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {format(parseISO(a.start_time), 'PPp', { locale: loc })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">
                    {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={stageDueDate}
                    onChange={(e) => setStageDueDate(e.target.value)}
                    className="da-input bg-white !text-xs !py-1.5"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center justify-end gap-2">
                {stageId ? (
                  <button
                    type="button"
                    onClick={resetStageForm}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveStage()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  <Plus className="size-4" />
                  <span>
                    {stageId
                      ? (isAr ? 'تحديث المرحلة' : 'Update Stage')
                      : (isAr ? 'إضافة المرحلة للخطة' : 'Add Stage to Plan')}
                  </span>
                </button>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2.5">
              {stages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
                  {isAr
                    ? 'لم يتم إضافة أي مراحل أو إجراءات لهذه الخطة بعد. استخدم النموذج أعلاه لاختيار وإضافة الإجراءات.'
                    : 'No stages added yet. Use the quick selector above to add procedures.'}
                </div>
              ) : (
                stages.map((s, idx) => {
                  const isCompleted = s.status === 'completed'
                  const stageRem = Math.max(0, s.estimated_cost - s.paid_amount)
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                        isCompleted
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : s.status === 'in_progress'
                          ? 'border-sky-200 bg-sky-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Left Side: Order, Title, Description */}
                      <div className="flex items-start gap-3 min-w-[240px] flex-1">
                        <button
                          type="button"
                          onClick={() => void onToggleStageStatus(s)}
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                            isCompleted
                              ? 'border-emerald-500 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-slate-100 text-slate-500 hover:border-emerald-400 hover:text-emerald-700'
                          }`}
                          title={isCompleted ? (isAr ? 'انقر لإلغاء الاكتمال' : 'Mark pending') : (isAr ? 'انقر لتعليم المرحلة كمكتملة' : 'Mark completed')}
                        >
                          {isCompleted ? <Check className="size-3.5 stroke-[3]" /> : idx + 1}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {s.title}
                            </h4>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'in_progress'
                                  ? 'bg-sky-100 text-sky-800'
                                  : s.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.status === 'completed'
                                ? (isAr ? 'مكتملة' : 'Completed')
                                : s.status === 'in_progress'
                                ? (isAr ? 'قيد التنفيذ' : 'In Progress')
                                : s.status === 'cancelled'
                                ? (isAr ? 'ملغية' : 'Cancelled')
                                : (isAr ? 'معلقة' : 'Pending')}
                            </span>
                          </div>
                          {s.description ? (
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{s.description}</p>
                          ) : null}
                          {s.appointment_start_time ? (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                              <Calendar className="size-3 text-teal-600" />
                              <span>
                                {isAr ? 'موعد مرتبط:' : 'Linked:'} {format(parseISO(s.appointment_start_time), 'PPp', { locale: loc })}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Right Side: Financial Badges & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-end">
                          <p className="text-xs font-bold text-slate-800">
                            {s.estimated_cost.toLocaleString()} {isAr ? 'ل.س' : 'SYP'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500">
                            {isAr ? 'المدفوع:' : 'Paid:'}{' '}
                            <span className="font-bold text-emerald-700">{s.paid_amount.toLocaleString()}</span>
                            {stageRem > 0 ? (
                              <span className="ms-1.5 text-amber-700 font-bold">
                                ({isAr ? 'باقي' : 'due'} {stageRem.toLocaleString()})
                              </span>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditStage(s)}
                            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                            title={isAr ? 'تعديل المرحلة' : 'Edit stage'}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteStage(s.id)}
                            className="flex size-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            title={isAr ? 'حذف المرحلة' : 'Delete stage'}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Plan Modal */}
      {newPlanModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'إنشاء خطة علاج جديدة' : 'Create New Treatment Plan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewPlanModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'عنوان خطة العلاج *' : 'Plan Title *'}
                </label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: خطة تجميلية، معالجة لبية، زراعة...' : 'e.g. Cosmetic Plan, Implants...'}
                  className="da-input"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {isAr ? 'التشخيص الأولي (اختياري)' : 'Initial Diagnosis (optional)'}
                </label>
                <textarea
                  rows={2}
                  value={newPlanDiagnosis}
                  onChange={(e) => setNewPlanDiagnosis(e.target.value)}
                  placeholder={isAr ? 'ملخص تشخيص الحالة أو أسباب الخطة...' : 'Summary of diagnosis...'}
                  className="da-input"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setNewPlanModalOpen(false)}
                  className="da-btn-secondary !text-xs !px-4 !py-2"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onCreateNewPlan()}
                  className="da-btn-primary !text-xs !px-5 !py-2"
                >
                  <Plus className="size-4" />
                  <span>{isAr ? 'إنشاء الخطة والبدء' : 'Create Plan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal}

      <TreatmentCatalogModal
        isOpen={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
        onItemUpdated={() => void loadCatalog()}
      />

      <div className="fixed start-[-12000px] top-0 -z-10" aria-hidden>
        {printSnap ? <TreatmentPlanPrintDocument ref={printRef} {...printSnap} /> : null}
      </div>
    </div>
  )
}
