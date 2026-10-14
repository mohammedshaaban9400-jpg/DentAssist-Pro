import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  DollarSign,
  Edit2,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type {
  OrthodonticApplianceType,
  OrthodonticCase,
  OrthodonticCaseStatus,
  OrthodonticClassification,
  OrthodonticVisit,
} from '@/types/clinical'
import {
  createOrthodonticCase,
  createOrthodonticVisit,
  deleteOrthodonticCase,
  deleteOrthodonticVisit,
  listOrthodonticCases,
  listOrthodonticVisits,
  openExternalUrl,
  updateOrthodonticCase,
  updateOrthodonticVisit,
} from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { buildWhatsAppUrl, digitsForWhatsApp } from '@/lib/waPhone'

type Props = {
  patientId: number
  patientDisplayName: string
  patientPhone: string | null
  onCaseChange?: (hasCase: boolean, caseData: OrthodonticCase | null) => void
  requestOpenNewModal?: boolean
  onRequestOpenHandled?: () => void
}

const WIRE_PRESETS = [
  '0.012 NiTi',
  '0.014 NiTi',
  '0.016 NiTi',
  '0.018 NiTi',
  '0.016x0.022 NiTi',
  '0.016x0.022 SS',
  '0.017x0.025 SS',
  '0.019x0.025 SS',
  '0.019x0.025 TMA',
  'None',
]

const ELASTIC_PRESETS = [
  'None',
  'Class II (3/16" 4.5oz)',
  'Class II (1/4" 4.5oz)',
  'Class III (3/16" 4.5oz)',
  'Class III (1/4" 4.5oz)',
  'Box Elastic',
  'Triangle Elastic',
  'Crossbite Elastic',
]

const ACTION_OPTIONS = [
  { id: 'wire_change', ar: 'تغيير سلك', en: 'Wire Change' },
  { id: 'orings', ar: 'تبديل مطاط ملون', en: 'O-Rings Replacement' },
  { id: 'power_chain', ar: 'سلسلة مطاطية (Power Chain)', en: 'Power Chain' },
  { id: 'bracket_rebond', ar: 'إعادة لصق حاصرة', en: 'Bracket Rebond' },
  { id: 'coil_spring', ar: 'نابض سبرنغ (Coil Spring)', en: 'Coil Spring' },
  { id: 'ipr', ar: 'تجريد سني (IPR)', en: 'Interproximal Reduction' },
  { id: 'bite_turbo', ar: 'رفع عضة (Bite Turbo)', en: 'Bite Turbos' },
  { id: 'debonding', ar: 'إزالة تقويم وتنظيف', en: 'Debonding & Polish' },
]

export function OrthodonticsPanel({
  patientId,
  patientDisplayName,
  patientPhone,
  onCaseChange,
  requestOpenNewModal,
  onRequestOpenHandled,
}: Props) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()

  const [activeCase, setActiveCase] = useState<OrthodonticCase | null>(null)
  const [visits, setVisits] = useState<OrthodonticVisit[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [isEditingCase, setIsEditingCase] = useState(false)
  const [visitModalOpen, setVisitModalOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<OrthodonticVisit | null>(null)

  // Case Form State
  const [caseStartDate, setCaseStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [caseDuration, setCaseDuration] = useState('18')
  const [caseStatus, setCaseStatus] = useState<OrthodonticCaseStatus>('active')
  const [caseClassification, setCaseClassification] = useState<OrthodonticClassification>('class_1')
  const [caseAppliance, setCaseAppliance] = useState<OrthodonticApplianceType>('metal')
  const [caseArch, setCaseArch] = useState<'upper' | 'lower' | 'both'>('both')
  const [caseExtraction, setCaseExtraction] = useState('')
  const [caseComplaint, setCaseComplaint] = useState('')
  const [caseNotes, setCaseNotes] = useState('')
  const [caseTotalCost, setCaseTotalCost] = useState('0')
  const [caseDownPayment, setCaseDownPayment] = useState('0')
  const [caseInstallment, setCaseInstallment] = useState('0')
  const [caseRetainer, setCaseRetainer] = useState('')

  // Visit Form State
  const [vDate, setVDate] = useState(new Date().toISOString().slice(0, 10))
  const [vUpperWire, setVUpperWire] = useState('0.014 NiTi')
  const [vLowerWire, setVLowerWire] = useState('0.014 NiTi')
  const [vElastic, setVElastic] = useState('None')
  const [vActions, setVActions] = useState<string[]>(['wire_change'])
  const [vBrokenBrackets, setVBrokenBrackets] = useState('0')
  const [vHygiene, setVHygiene] = useState(4)
  const [vPain, setVPain] = useState(1)
  const [vPaid, setVPaid] = useState('0')
  const [vNextDate, setVNextDate] = useState('')
  const [vNotes, setVNotes] = useState('')

  const loadCaseData = async () => {
    try {
      setLoading(true)
      const cases = await listOrthodonticCases({ patientId })
      if (cases && cases.length > 0) {
        const c = cases[0]
        setActiveCase(c)
        onCaseChange?.(true, c)
        const vList = await listOrthodonticVisits(c.id)
        setVisits(vList)
      } else {
        setActiveCase(null)
        onCaseChange?.(false, null)
        setVisits([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCaseData()
  }, [patientId])

  useEffect(() => {
    if (requestOpenNewModal) {
      openNewCaseModal()
      onRequestOpenHandled?.()
    }
  }, [requestOpenNewModal])

  const openNewCaseModal = () => {
    setIsEditingCase(false)
    setCaseStartDate(new Date().toISOString().slice(0, 10))
    setCaseDuration('18')
    setCaseStatus('active')
    setCaseClassification('class_1')
    setCaseAppliance('metal')
    setCaseArch('both')
    setCaseExtraction(isAr ? 'بدون خلع (Non-extraction)' : 'Non-extraction')
    setCaseComplaint('')
    setCaseNotes('')
    setCaseTotalCost('1200000')
    setCaseDownPayment('300000')
    setCaseInstallment('50000')
    setCaseRetainer(isAr ? 'مثبت شفاف Essix للفكين' : 'Clear Essix Retainers')
    setCaseModalOpen(true)
  }

  const openEditCaseModal = () => {
    if (!activeCase) return
    setIsEditingCase(true)
    setCaseStartDate(activeCase.start_date)
    setCaseDuration(String(activeCase.estimated_duration_months || 18))
    setCaseStatus(activeCase.status)
    setCaseClassification(activeCase.classification)
    setCaseAppliance(activeCase.appliance_type)
    setCaseArch(activeCase.arch_type)
    setCaseExtraction(activeCase.extraction_plan || '')
    setCaseComplaint(activeCase.chief_complaint || '')
    setCaseNotes(activeCase.diagnosis_notes || '')
    setCaseTotalCost(String(activeCase.total_cost || 0))
    setCaseDownPayment(String(activeCase.down_payment || 0))
    setCaseInstallment(String(activeCase.monthly_installment || 0))
    setCaseRetainer(activeCase.retainer_type || '')
    setCaseModalOpen(true)
  }

  const handleSaveCase = async () => {
    try {
      if (isEditingCase && activeCase) {
        await updateOrthodonticCase(activeCase.id, {
          startDate: caseStartDate,
          estimatedDurationMonths: parseInt(caseDuration, 10) || 18,
          status: caseStatus,
          classification: caseClassification,
          applianceType: caseAppliance,
          archType: caseArch,
          extractionPlan: caseExtraction.trim() || null,
          chiefComplaint: caseComplaint.trim() || null,
          diagnosisNotes: caseNotes.trim() || null,
          totalCost: parseFloat(caseTotalCost) || 0,
          downPayment: parseFloat(caseDownPayment) || 0,
          monthlyInstallment: parseFloat(caseInstallment) || 0,
          retainerType: caseRetainer.trim() || null,
        })
        push(isAr ? 'تم تحديث ملف التقويم بنجاح' : 'Orthodontic case updated', 'success')
      } else {
        await createOrthodonticCase({
          patientId,
          startDate: caseStartDate,
          estimatedDurationMonths: parseInt(caseDuration, 10) || 18,
          status: caseStatus,
          classification: caseClassification,
          applianceType: caseAppliance,
          archType: caseArch,
          extractionPlan: caseExtraction.trim() || null,
          chiefComplaint: caseComplaint.trim() || null,
          diagnosisNotes: caseNotes.trim() || null,
          totalCost: parseFloat(caseTotalCost) || 0,
          downPayment: parseFloat(caseDownPayment) || 0,
          monthlyInstallment: parseFloat(caseInstallment) || 0,
          retainerType: caseRetainer.trim() || null,
        })
        push(isAr ? 'تم إنشاء وتفعيل ملف التقويم بنجاح' : 'Orthodontic plan activated', 'success')
      }
      setCaseModalOpen(false)
      await loadCaseData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const handleDeleteCase = async () => {
    if (!activeCase) return
    if (!(await confirm(isAr ? 'هل أنت متأكد من إلغاء تفعيل وحذف ملف التقويم لهذا المريض؟' : 'Deactivate and delete orthodontic case?'))) return
    try {
      await deleteOrthodonticCase(activeCase.id)
      push(isAr ? 'تم حذف ملف التقويم وإخفاء القسم' : 'Case removed', 'success')
      setActiveCase(null)
      onCaseChange?.(false, null)
      setVisits([])
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const openNewVisitModal = () => {
    setEditingVisit(null)
    setVDate(new Date().toISOString().slice(0, 10))
    if (visits.length > 0) {
      setVUpperWire(visits[0].upper_wire || '0.016 NiTi')
      setVLowerWire(visits[0].lower_wire || '0.016 NiTi')
      setVElastic(visits[0].elastic_prescription || 'None')
    } else {
      setVUpperWire('0.014 NiTi')
      setVLowerWire('0.014 NiTi')
      setVElastic('None')
    }
    setVActions(['wire_change'])
    setVBrokenBrackets('0')
    setVHygiene(4)
    setVPain(1)
    setVPaid(String(activeCase?.monthly_installment || 0))
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 28)
    setVNextDate(nextDate.toISOString().slice(0, 10))
    setVNotes('')
    setVisitModalOpen(true)
  }

  const openEditVisitModal = (v: OrthodonticVisit) => {
    setEditingVisit(v)
    setVDate(v.visit_date)
    setVUpperWire(v.upper_wire || '')
    setVLowerWire(v.lower_wire || '')
    setVElastic(v.elastic_prescription || 'None')
    try {
      setVActions(v.actions_json ? JSON.parse(v.actions_json) : [])
    } catch {
      setVActions([])
    }
    setVBrokenBrackets(String(v.broken_brackets_count ?? 0))
    setVHygiene(v.oral_hygiene_rating ?? 4)
    setVPain(v.pain_level ?? 1)
    setVPaid(String(v.amount_paid ?? 0))
    setVNextDate(v.next_appointment_date || '')
    setVNotes(v.notes || '')
    setVisitModalOpen(true)
  }

  const handleSaveVisit = async () => {
    if (!activeCase) return
    try {
      const actionsJson = JSON.stringify(vActions)
      if (editingVisit) {
        await updateOrthodonticVisit(editingVisit.id, {
          upperWire: vUpperWire.trim() || null,
          lowerWire: vLowerWire.trim() || null,
          elasticPrescription: vElastic.trim() || null,
          actionsJson,
          brokenBracketsCount: parseInt(vBrokenBrackets, 10) || 0,
          oralHygieneRating: vHygiene,
          painLevel: vPain,
          amountPaid: parseFloat(vPaid) || 0,
          notes: vNotes.trim() || null,
          nextAppointmentDate: vNextDate || null,
        })
        push(isAr ? 'تم تحديث جلسة الشد' : 'Adjustment visit updated', 'success')
      } else {
        await createOrthodonticVisit({
          caseId: activeCase.id,
          visitDate: vDate,
          upperWire: vUpperWire.trim() || null,
          lowerWire: vLowerWire.trim() || null,
          elasticPrescription: vElastic.trim() || null,
          actionsJson,
          brokenBracketsCount: parseInt(vBrokenBrackets, 10) || 0,
          oralHygieneRating: vHygiene,
          painLevel: vPain,
          amountPaid: parseFloat(vPaid) || 0,
          notes: vNotes.trim() || null,
          nextAppointmentDate: vNextDate || null,
        })
        push(isAr ? 'تم تسجيل جلسة الشد بنجاح' : 'Adjustment visit recorded', 'success')
      }
      setVisitModalOpen(false)
      await loadCaseData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const handleDeleteVisit = async (visitId: number) => {
    if (!(await confirm(isAr ? 'هل أنت متأكد من حذف هذه الجلسة؟' : 'Delete visit?'))) return
    try {
      await deleteOrthodonticVisit(visitId)
      push(isAr ? 'تم حذف الجلسة' : 'Visit deleted', 'success')
      await loadCaseData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const toggleAction = (id: string) => {
    setVActions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const progressPercent = useMemo(() => {
    if (!activeCase?.start_date || !activeCase?.estimated_duration_months) return 0
    try {
      const start = new Date(activeCase.start_date).getTime()
      const now = Date.now()
      const totalMs = activeCase.estimated_duration_months * 30.4 * 86400000
      const elapsed = Math.max(0, now - start)
      return Math.min(100, Math.round((elapsed / totalMs) * 100))
    } catch {
      return 0
    }
  }, [activeCase])

  const totalPaidSum = useMemo(() => {
    if (!activeCase) return 0
    const down = Number(activeCase.down_payment || 0)
    const visitsTotal = visits.reduce((acc, v) => acc + (Number(v.amount_paid) || 0), 0)
    return down + visitsTotal
  }, [activeCase, visits])

  const remainingBalance = useMemo(() => {
    if (!activeCase) return 0
    return Math.max(0, Number(activeCase.total_cost || 0) - totalPaidSum)
  }, [activeCase, totalPaidSum])

  const handleWhatsAppNextVisit = async (v: OrthodonticVisit) => {
    if (!patientPhone || !v.next_appointment_date) return
    const digits = digitsForWhatsApp(patientPhone)
    if (!digits) {
      push(isAr ? 'رقم الهاتف غير صالح' : 'Invalid phone', 'error')
      return
    }
    const msg = isAr
      ? `مرحباً ${patientDisplayName}، نذكرك بموعد جلسة شد وتعديل التقويم القادمة بتاريخ: ${v.next_appointment_date}. نتمنى لك ابتسامة جميلة دائماً! (عيادة الأسنان)`
      : `Hello ${patientDisplayName}, reminding you of your next orthodontic adjustment visit on ${v.next_appointment_date}. Dental Clinic.`
    const url = buildWhatsAppUrl(digits, msg)
    await openExternalUrl(url)
  }

  const getStatusBadge = (st: OrthodonticCaseStatus) => {
    switch (st) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">{isAr ? 'علاج نشط' : 'Active'}</span>
      case 'retention':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">{isAr ? 'مرحلة التثبيت' : 'Retention'}</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">{isAr ? 'مكتمل' : 'Completed'}</span>
      case 'suspended':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">{isAr ? 'معلق / متوقف' : 'Suspended'}</span>
    }
  }

  const getClassificationLabel = (c: OrthodonticClassification) => {
    switch (c) {
      case 'class_1':
        return isAr ? 'صنف أول (Class I)' : 'Class I'
      case 'class_2_div_1':
        return isAr ? 'صنف ثانٍ/قسم 1 (Class II Div 1)' : 'Class II Div 1'
      case 'class_2_div_2':
        return isAr ? 'صنف ثانٍ/قسم 2 (Class II Div 2)' : 'Class II Div 2'
      case 'class_3':
        return isAr ? 'صنف ثالث (Class III)' : 'Class III'
      case 'open_bite':
        return isAr ? 'عضة مفتوحة (Open Bite)' : 'Open Bite'
      case 'crossbite':
        return isAr ? 'عضة معكوسة (Crossbite)' : 'Crossbite'
      default:
        return isAr ? 'أخرى' : 'Other'
    }
  }

  const getApplianceLabel = (a: OrthodonticApplianceType) => {
    switch (a) {
      case 'metal':
        return isAr ? 'حاصرات معدنية (Metal)' : 'Metal Brackets'
      case 'ceramic':
        return isAr ? 'حاصرات خزفية تجميلية (Ceramic)' : 'Ceramic Brackets'
      case 'self_ligating':
        return isAr ? 'ذاتي الربط (Damon / Self-Ligating)' : 'Self-Ligating'
      case 'clear_aligner':
        return isAr ? 'قوالب شفافة (Clear Aligners)' : 'Clear Aligners'
      case 'lingual':
        return isAr ? 'تقويم لساني داخلي (Lingual)' : 'Lingual'
      case 'functional':
        return isAr ? 'أجهزة وظيفية (Functional)' : 'Functional'
      case 'retainer_only':
        return isAr ? 'مثبتات فقط (Retainers)' : 'Retainer Only'
    }
  }

  const caseModalJsx = caseModalOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">
              {isEditingCase
                ? (isAr ? 'تعديل ملف التقويم' : 'Edit Orthodontic Case')
                : (isAr ? 'تفعيل ملف تقويم جديد' : 'New Orthodontic Case')}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setCaseModalOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto thin-scrollbar flex-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'تاريخ البدء' : 'Start Date'} *</span>
              <input
                type="date"
                value={caseStartDate}
                onChange={(e) => setCaseStartDate(e.target.value)}
                className="da-input text-xs"
              />
            </label>

            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'المدة التقديرية (شهور)' : 'Estimated Duration (months)'}</span>
              <input
                type="number"
                min="1"
                max="60"
                value={caseDuration}
                onChange={(e) => setCaseDuration(e.target.value)}
                className="da-input text-xs font-mono"
              />
            </label>

            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'تصنيف الإطباق (Angle Classification)' : 'Classification'}</span>
              <select
                value={caseClassification}
                onChange={(e) => setCaseClassification(e.target.value as OrthodonticClassification)}
                className="da-input text-xs bg-white"
              >
                <option value="class_1">{isAr ? 'صنف أول (Class I)' : 'Class I'}</option>
                <option value="class_2_div_1">{isAr ? 'صنف ثانٍ / قسم 1 (Class II Div 1)' : 'Class II Div 1'}</option>
                <option value="class_2_div_2">{isAr ? 'صنف ثانٍ / قسم 2 (Class II Div 2)' : 'Class II Div 2'}</option>
                <option value="class_3">{isAr ? 'صنف ثالث (Class III)' : 'Class III'}</option>
                <option value="open_bite">{isAr ? 'عضة مفتوحة (Open Bite)' : 'Open Bite'}</option>
                <option value="crossbite">{isAr ? 'عضة معكوسة (Crossbite)' : 'Crossbite'}</option>
                <option value="other">{isAr ? 'أخرى' : 'Other'}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'نوع جهاز التقويم' : 'Appliance Type'}</span>
              <select
                value={caseAppliance}
                onChange={(e) => setCaseAppliance(e.target.value as OrthodonticApplianceType)}
                className="da-input text-xs bg-white"
              >
                <option value="metal">{isAr ? 'حاصرات معدنية (Metal)' : 'Metal Brackets'}</option>
                <option value="ceramic">{isAr ? 'حاصرات خزفية تجميلية (Ceramic)' : 'Ceramic'}</option>
                <option value="self_ligating">{isAr ? 'ذاتي الربط (Damon / Self-Ligating)' : 'Self-Ligating'}</option>
                <option value="clear_aligner">{isAr ? 'قوالب شفافة (Clear Aligners)' : 'Clear Aligners'}</option>
                <option value="lingual">{isAr ? 'تقويم لساني داخلي (Lingual)' : 'Lingual'}</option>
                <option value="functional">{isAr ? 'أجهزة وظيفية (Functional)' : 'Functional'}</option>
                <option value="retainer_only">{isAr ? 'مثبتات فقط (Retainers Only)' : 'Retainers Only'}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'الفك المعالج' : 'Treated Arch'}</span>
              <select
                value={caseArch}
                onChange={(e) => setCaseArch(e.target.value as 'upper' | 'lower' | 'both')}
                className="da-input text-xs bg-white"
              >
                <option value="both">{isAr ? 'الفكّين معاً (Both Arches)' : 'Both Arches'}</option>
                <option value="upper">{isAr ? 'الفك العلوي فقط (Upper)' : 'Upper Arch Only'}</option>
                <option value="lower">{isAr ? 'الفك السفلي فقط (Lower)' : 'Lower Arch Only'}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'حالة العلاج' : 'Status'}</span>
              <select
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value as OrthodonticCaseStatus)}
                className="da-input text-xs bg-white font-bold"
              >
                <option value="active">{isAr ? 'علاج نشط (Active)' : 'Active'}</option>
                <option value="retention">{isAr ? 'مرحلة التثبيت (Retention)' : 'Retention'}</option>
                <option value="completed">{isAr ? 'مكتمل (Completed)' : 'Completed'}</option>
                <option value="suspended">{isAr ? 'معلق / متوقف (Suspended)' : 'Suspended'}</option>
              </select>
            </label>

            <label className="sm:col-span-2 flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'خطة القلع (Extractions)' : 'Extraction Plan'}</span>
              <input
                value={caseExtraction}
                onChange={(e) => setCaseExtraction(e.target.value)}
                placeholder={isAr ? 'مثال: بدون خلع، أو خلع 14, 24, 34, 44' : 'Non-extraction or 14, 24, 34, 44'}
                className="da-input text-xs"
              />
            </label>

            {/* Financial section */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <DollarSign className="size-4 text-emerald-600" />
                <span>{isAr ? 'الاتفاق المالي وخطة الأقساط' : 'Financial Agreement'}</span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'التكلفة الإجمالية' : 'Total Fee'}</span>
                  <input
                    type="number"
                    value={caseTotalCost}
                    onChange={(e) => setCaseTotalCost(e.target.value)}
                    className="da-input text-xs font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'الدفعة الأولى عند التركيب' : 'Down Payment'}</span>
                  <input
                    type="number"
                    value={caseDownPayment}
                    onChange={(e) => setCaseDownPayment(e.target.value)}
                    className="da-input text-xs font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'القسط الشهري لكل جلسة' : 'Monthly Installment'}</span>
                  <input
                    type="number"
                    value={caseInstallment}
                    onChange={(e) => setCaseInstallment(e.target.value)}
                    className="da-input text-xs font-mono"
                  />
                </label>
              </div>
            </div>

            <label className="sm:col-span-2 flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'خطة التثبيت المقررة (Retainer Plan)' : 'Retainer Plan'}</span>
              <input
                value={caseRetainer}
                onChange={(e) => setCaseRetainer(e.target.value)}
                placeholder={isAr ? 'مثال: Hawley Retainer علوي + سلك لثوي ثابت سفلي' : 'Hawley upper + Fixed lingual lower'}
                className="da-input text-xs"
              />
            </label>

            <label className="sm:col-span-2 flex flex-col gap-1 font-semibold text-slate-700">
              <span>{isAr ? 'شكوى المريض الرئيسية والملاحظات السريرية' : 'Chief Complaint & Clinical Notes'}</span>
              <textarea
                rows={2}
                value={caseComplaint}
                onChange={(e) => setCaseComplaint(e.target.value)}
                placeholder={isAr ? 'مثال: تراكب شديد في الثنايا العلوية وبروز في القواطع...' : 'Severe crowding in upper incisors...'}
                className="da-input text-xs resize-none"
              />
            </label>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 p-3.5 sm:p-4 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setCaseModalOpen(false)}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            {t('common.cancel', isAr ? 'إلغاء' : 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveCase()}
            className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition"
          >
            {t('common.save', isAr ? 'حفظ وتفعيل التقويم' : 'Save & Activate')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (loading) {
    return null
  }

  // ─── If patient has NO orthodontic plan: render clean activation card ───
  if (!activeCase) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-200/90 bg-gradient-to-r from-teal-50/40 via-white to-slate-50/50 p-6 text-center shadow-2xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shadow-xs mb-3">
          <Sparkles className="size-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">
          {isAr ? 'ملف تقويم الأسنان غير مفعّل لهذا المريض' : 'Orthodontics Not Activated'}
        </h4>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          {isAr
            ? 'إذا كان المريض بحاجة لمعالجة تقويمية، يمكنك تفعيل الخطة لتسجيل تصنيف الإطباق وجلسات الشد الدورية وتتبع الأقساط.'
            : 'If this patient needs orthodontic treatment, activate the case to track classification, wires, visits, and installments.'}
        </p>
        <button
          type="button"
          onClick={openNewCaseModal}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition"
        >
          <Plus className="size-4" />
          <span>{isAr ? 'بدء وتفعيل ملف تقويم جديد' : 'Activate Orthodontic Case'}</span>
        </button>

        {caseModalJsx}
        {confirmModal}
      </div>
    )
  }

  // ─── If patient HAS an active orthodontic plan: render full rich clinical record ───
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/50 via-white to-slate-50/40 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'ملف تقويم الأسنان (Orthodontics)' : 'Orthodontic Record'}
              </h2>
              {getStatusBadge(activeCase.status)}
            </div>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'متابعة سلسلة الأسلاك، جلسات الشد الدورية، التزام المريض، وخطة الأقساط'
                : 'Wire tracking, adjustment sessions, patient compliance, and installment contract'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewVisitModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-teal-700 active:scale-95"
          >
            <Plus className="size-4" />
            <span>{isAr ? 'تسجيل جلسة شد' : 'Add Adjustment Visit'}</span>
          </button>
          <button
            type="button"
            onClick={openEditCaseModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            title={isAr ? 'تعديل بيانات الحالة' : 'Edit Case Info'}
          >
            <Edit2 className="size-3.5" />
            <span className="hidden sm:inline">{isAr ? 'تعديل الخطة' : 'Edit'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteCase()}
            className="inline-flex cursor-pointer items-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600 transition hover:bg-rose-100"
            title={isAr ? 'إلغاء تفعيل وحذف ملف التقويم' : 'Delete'}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Top Case Summary Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Case Details Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {isAr ? 'بيانات الحالة والتصنيف' : 'Classification & Specs'}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'رقم الحالة:' : 'Case #:'}</span>
                <span className="font-mono font-bold text-slate-800">{activeCase.case_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'التصنيف:' : 'Class:'}</span>
                <span className="font-semibold text-slate-800">{getClassificationLabel(activeCase.classification)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'نوع الجهاز:' : 'Appliance:'}</span>
                <span className="font-semibold text-teal-700">{getApplianceLabel(activeCase.appliance_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'الفك المعالج:' : 'Arch:'}</span>
                <span className="font-semibold text-slate-700">
                  {activeCase.arch_type === 'both' ? (isAr ? 'الفكّين' : 'Both Arches') : activeCase.arch_type === 'upper' ? (isAr ? 'العلوي' : 'Upper') : (isAr ? 'السفلي' : 'Lower')}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Duration */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isAr ? 'الجدول الزمني والتقدم' : 'Timeline & Progress'}
              </span>
              <span className="font-mono font-bold text-teal-700 text-xs">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'تاريخ البدء:' : 'Start Date:'}</span>
                <span className="font-mono font-semibold text-slate-800">{activeCase.start_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'المدة المقدرة:' : 'Est. Duration:'}</span>
                <span className="font-semibold text-slate-800">{activeCase.estimated_duration_months} {isAr ? 'شهراً' : 'months'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'جلسات منجزة:' : 'Visits Done:'}</span>
                <span className="font-bold text-slate-900">{visits.length} {isAr ? 'جلسة' : 'visits'}</span>
              </div>
            </div>
          </div>

          {/* Financial Contract Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {isAr ? 'العقد المالي والأقساط' : 'Financial Contract'}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
                <span className="font-mono font-bold text-slate-900">{Number(activeCase.total_cost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'الدفعة الأولى:' : 'Down Payment:'}</span>
                <span className="font-mono font-semibold text-emerald-700">{Number(activeCase.down_payment || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{isAr ? 'المدفوع الكلي:' : 'Total Paid:'}</span>
                <span className="font-mono font-bold text-teal-700">{totalPaidSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-700 font-bold">{isAr ? 'المتبقي:' : 'Balance:'}</span>
                <span className="font-mono font-bold text-rose-600">{remainingBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Clinical Directives */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-1.5 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {isAr ? 'ملاحظات وتوجيهات الخطة' : 'Clinical Directives'}
            </div>
            {activeCase.extraction_plan && (
              <p className="text-slate-700">
                <strong className="text-slate-900">{isAr ? 'القلع: ' : 'Extraction: '}</strong>
                {activeCase.extraction_plan}
              </p>
            )}
            {activeCase.retainer_type && (
              <p className="text-slate-700">
                <strong className="text-slate-900">{isAr ? 'التثبيت: ' : 'Retainer: '}</strong>
                {activeCase.retainer_type}
              </p>
            )}
            {activeCase.chief_complaint && (
              <p className="text-slate-600 italic line-clamp-2" title={activeCase.chief_complaint}>
                "{activeCase.chief_complaint}"
              </p>
            )}
          </div>
        </div>

        {/* Visits Table / Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">
                {isAr ? 'سجل جلسات الشد وتغيير الأسلاك' : 'Adjustment Visits & Wire Sequence'}
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {visits.length}
              </span>
            </div>
          </div>

          {visits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              {isAr
                ? 'لم يتم تسجيل أي جلسة شد بعد. اضغط على "تسجيل جلسة شد" لتوثيق السلك الأول وإجراءات الزيارة.'
                : 'No adjustment visits recorded yet. Click "Add Adjustment Visit" to record the first wire change.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-start">#</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'السلك العلوي' : 'Upper Wire'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'السلك السفلي' : 'Lower Wire'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'المطاط والإجراءات' : 'Elastics & Actions'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'نظافة الفم' : 'Hygiene'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'حاصرات مكسورة' : 'Broken'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الدفعة' : 'Paid'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الموعد القادم' : 'Next Appt'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visits.map((v) => {
                    let parsedActions: string[] = []
                    try {
                      parsedActions = v.actions_json ? JSON.parse(v.actions_json) : []
                    } catch {
                      /* ignore */
                    }

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          #{v.visit_number}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {v.visit_date}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono font-bold text-teal-800 border border-teal-200/60">
                            {v.upper_wire || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="rounded-md bg-cyan-50 px-2 py-0.5 font-mono font-bold text-cyan-800 border border-cyan-200/60">
                            {v.lower_wire || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            {v.elastic_prescription && v.elastic_prescription !== 'None' && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                {v.elastic_prescription}
                              </span>
                            )}
                            {parsedActions.map((act) => {
                              const found = ACTION_OPTIONS.find((o) => o.id === act)
                              return (
                                <span
                                  key={act}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                                >
                                  {found ? (isAr ? found.ar : found.en) : act}
                                </span>
                              )
                            })}
                          </div>
                          {v.notes && (
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1 italic">
                              {v.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`size-3 ${
                                  i < (v.oral_hygiene_rating ?? 4)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {(v.broken_brackets_count ?? 0) > 0 ? (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                              {v.broken_brackets_count} {isAr ? 'حاصرة' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {(Number(v.amount_paid) || 0) > 0
                            ? Number(v.amount_paid).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600">
                          {v.next_appointment_date ? (
                            <div className="flex items-center gap-1.5">
                              <span>{v.next_appointment_date}</span>
                              {patientPhone && (
                                <button
                                  type="button"
                                  onClick={() => void handleWhatsAppNextVisit(v)}
                                  className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                  title={isAr ? 'تذكير واتساب بالموعد القادم' : 'WhatsApp Reminder'}
                                >
                                  <MessageCircle className="size-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditVisitModal(v)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title={isAr ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteVisit(v.id)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {caseModalJsx}

      {/* ─── Visit Modal (Add / Edit Adjustment Visit) ─── */}
      {visitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingVisit
                    ? (isAr ? `تعديل الجلسة #${editingVisit.visit_number}` : `Edit Visit #${editingVisit.visit_number}`)
                    : (isAr ? 'تسجيل جلسة شد وتعديل أسلاك جديدة' : 'New Orthodontic Adjustment Visit')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVisitModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto thin-scrollbar flex-1">
              {/* Date & Wires */}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'تاريخ الجلسة' : 'Visit Date'} *</span>
                  <input
                    type="date"
                    value={vDate}
                    onChange={(e) => setVDate(e.target.value)}
                    className="da-input text-xs"
                  />
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'السلك العلوي (Upper Wire)' : 'Upper Archwire'}</span>
                  <input
                    value={vUpperWire}
                    onChange={(e) => setVUpperWire(e.target.value)}
                    placeholder="0.016 NiTi"
                    className="da-input text-xs font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'السلك السفلي (Lower Wire)' : 'Lower Archwire'}</span>
                  <input
                    value={vLowerWire}
                    onChange={(e) => setVLowerWire(e.target.value)}
                    placeholder="0.016 NiTi"
                    className="da-input text-xs font-mono"
                  />
                </label>
              </div>

              {/* Wire Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  {isAr ? 'اختيار سريع لمقاس السلك (Presets):' : 'Quick Wire Presets:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WIRE_PRESETS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setVUpperWire(w)
                        setVLowerWire(w)
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 transition"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elastics */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'مطاط الشد الفكي (Elastics)' : 'Elastic Prescription'}</span>
                  <select
                    value={vElastic}
                    onChange={(e) => setVElastic(e.target.value)}
                    className="da-input text-xs bg-white font-mono"
                  >
                    {ELASTIC_PRESETS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'الحاصرات المنكسرة (Broken Brackets)' : 'Broken Brackets'}</span>
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={vBrokenBrackets}
                    onChange={(e) => setVBrokenBrackets(e.target.value)}
                    className="da-input text-xs font-mono"
                  />
                </label>
              </div>

              {/* Clinical Actions checklist */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-700">
                  {isAr ? 'الإجراءات المنفذة في هذه الزيارة' : 'Procedures Done This Visit'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {ACTION_OPTIONS.map((opt) => {
                    const checked = vActions.includes(opt.id)
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition select-none ${
                          checked
                            ? 'border-teal-400 bg-teal-50/70 text-teal-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAction(opt.id)}
                          className="size-3.5 rounded text-teal-600 accent-teal-600 cursor-pointer"
                        />
                        <span>{isAr ? opt.ar : opt.en}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Compliance & Hygiene */}
              <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 block">
                    {isAr ? 'تقييم نظافة الفم والعناية (1-5)' : 'Oral Hygiene Rating'}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 pt-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setVHygiene(lvl)}
                        className="cursor-pointer p-0.5 hover:scale-110 transition"
                      >
                        <Star
                          className={`size-5 ${
                            lvl <= vHygiene ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ms-2 font-mono font-bold text-slate-700">{vHygiene}/5</span>
                  </div>
                </div>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'الدفعة المالية المستلمة في الجلسة' : 'Payment Received in Visit'}</span>
                  <input
                    type="number"
                    value={vPaid}
                    onChange={(e) => setVPaid(e.target.value)}
                    className="da-input text-xs font-mono font-bold text-emerald-700"
                  />
                </label>
              </div>

              {/* Next Appointment Date & Notes */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'موعد جلسة الشد القادمة' : 'Next Adjustment Date'}</span>
                  <input
                    type="date"
                    value={vNextDate}
                    onChange={(e) => setVNextDate(e.target.value)}
                    className="da-input text-xs font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'ملاحظات الطبيب السريرية' : 'Doctor Notes'}</span>
                  <input
                    value={vNotes}
                    onChange={(e) => setVNotes(e.target.value)}
                    placeholder={isAr ? 'مثال: إغلاق مسافة 2 مم، تبديل مطاط رمادي...' : 'Space closure 2mm...'}
                    className="da-input text-xs"
                  />
                </label>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 p-3.5 sm:p-4 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setVisitModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {t('common.cancel', isAr ? 'إلغاء' : 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveVisit()}
                className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition"
              >
                {t('common.save', isAr ? 'حفظ الجلسة' : 'Save Visit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
