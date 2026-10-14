import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  DollarSign,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type {
  OrthodonticApplianceType,
  OrthodonticCase,
  OrthodonticCaseStatus,
  OrthodonticClassification,
  OrthodonticStats,
  Patient,
} from '@/types/clinical'
import {
  createOrthodonticCase,
  deleteOrthodonticCase,
  getOrthodonticStats,
  listOrthodonticCases,
  listPatients,
  openExternalUrl,
} from '@/services/dbService'
import {
  DesktopTablePane,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
  MobileCard,
  MobileCardActions,
  MobileCardList,
  MobileEmptyState,
} from '@/components/layout/ListPageLayout'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { buildWhatsAppUrl, digitsForWhatsApp } from '@/lib/waPhone'

export function OrthodonticsPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()
  const navigate = useNavigate()

  const [cases, setCases] = useState<OrthodonticCase[]>([])
  const [stats, setStats] = useState<OrthodonticStats | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrthodonticCaseStatus>('all')
  const [classFilter, setClassFilter] = useState<string>('all')

  // New Case Modal
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('')
  const [caseStartDate, setCaseStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [caseDuration, setCaseDuration] = useState('18')
  const [caseClassification, setCaseClassification] = useState<OrthodonticClassification>('class_1')
  const [caseAppliance, setCaseAppliance] = useState<OrthodonticApplianceType>('metal')
  const [caseArch, setCaseArch] = useState<'upper' | 'lower' | 'both'>('both')
  const [caseExtraction, setCaseExtraction] = useState('')
  const [caseTotalCost, setCaseTotalCost] = useState('1200000')
  const [caseDownPayment, setCaseDownPayment] = useState('300000')
  const [caseInstallment, setCaseInstallment] = useState('50000')
  const [caseComplaint, setCaseComplaint] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [allCases, st, pts] = await Promise.all([
        listOrthodonticCases({
          status: statusFilter === 'all' ? undefined : statusFilter,
          query: searchQuery.trim() || undefined,
        }),
        getOrthodonticStats().catch(() => null),
        listPatients().catch(() => []),
      ])
      setCases(allCases)
      setStats(st)
      setPatients(pts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (classFilter !== 'all' && c.classification !== classFilter) return false
      return true
    })
  }, [cases, classFilter])

  const handleCreateCase = async () => {
    if (!selectedPatientId) {
      push(isAr ? 'يرجى اختيار المريض أولاً' : 'Please select a patient', 'error')
      return
    }

    try {
      await createOrthodonticCase({
        patientId: Number(selectedPatientId),
        startDate: caseStartDate,
        estimatedDurationMonths: parseInt(caseDuration, 10) || 18,
        status: 'active',
        classification: caseClassification,
        applianceType: caseAppliance,
        archType: caseArch,
        extractionPlan: caseExtraction.trim() || null,
        chiefComplaint: caseComplaint.trim() || null,
        totalCost: parseFloat(caseTotalCost) || 0,
        downPayment: parseFloat(caseDownPayment) || 0,
        monthlyInstallment: parseFloat(caseInstallment) || 0,
      })

      push(isAr ? 'تم إنشاء ملف التقويم بنجاح' : 'Case created successfully', 'success')
      setNewCaseModalOpen(false)
      await loadData()
      // Navigate to patient's file
      navigate(`/patients/${selectedPatientId}`)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const handleDeleteCase = async (id: number) => {
    if (!(await confirm(isAr ? 'هل أنت متأكد من حذف ملف التقويم هذا؟' : 'Delete case?'))) return
    try {
      await deleteOrthodonticCase(id)
      push(isAr ? 'تم حذف الملف' : 'Deleted', 'success')
      await loadData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const handleWhatsApp = async (phone: string | null | undefined, name: string) => {
    if (!phone) return
    const digits = digitsForWhatsApp(phone)
    if (!digits) return
    const msg = isAr ? `مرحباً ${name}، بخصوص موعد علاج التقويم في العيادة...` : `Hello ${name}...`
    const url = buildWhatsAppUrl(digits, msg)
    await openExternalUrl(url)
  }

  const getStatusBadge = (st: OrthodonticCaseStatus) => {
    switch (st) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">{isAr ? 'علاج نشط' : 'Active'}</span>
      case 'retention':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">{isAr ? 'تثبيت' : 'Retention'}</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">{isAr ? 'مكتمل' : 'Completed'}</span>
      case 'suspended':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">{isAr ? 'معلق' : 'Suspended'}</span>
    }
  }

  const getClassificationLabel = (c: OrthodonticClassification) => {
    switch (c) {
      case 'class_1':
        return isAr ? 'صنف أول (Class I)' : 'Class I'
      case 'class_2_div_1':
        return isAr ? 'صنف ثانٍ/1' : 'Class II/1'
      case 'class_2_div_2':
        return isAr ? 'صنف ثانٍ/2' : 'Class II/2'
      case 'class_3':
        return isAr ? 'صنف ثالث (Class III)' : 'Class III'
      case 'open_bite':
        return isAr ? 'عضة مفتوحة' : 'Open Bite'
      case 'crossbite':
        return isAr ? 'عضة معكوسة' : 'Crossbite'
      default:
        return isAr ? 'أخرى' : 'Other'
    }
  }

  const getApplianceLabel = (a: OrthodonticApplianceType) => {
    switch (a) {
      case 'metal':
        return isAr ? 'معدني' : 'Metal'
      case 'ceramic':
        return isAr ? 'خزفي' : 'Ceramic'
      case 'self_ligating':
        return isAr ? 'ذاتي الربط' : 'Self-Ligate'
      case 'clear_aligner':
        return isAr ? 'قوالب شفافة' : 'Aligners'
      case 'lingual':
        return isAr ? 'لساني' : 'Lingual'
      case 'functional':
        return isAr ? 'وظيفي' : 'Functional'
      case 'retainer_only':
        return isAr ? 'مثبتات' : 'Retainers'
    }
  }

  return (
    <ListPageLayout>
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0284c7)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Sparkles className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'تقويم الأسنان' : 'Orthodontics'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'متابعة شاملة لحالات التقويم، جلسات الشد الدورية، سلسلة الأسلاك، وعقود الأقساط'
                : 'Comprehensive management of orthodontic cases, adjustment visits, archwires, and financial contracts'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedPatientId('')
            setCaseStartDate(new Date().toISOString().slice(0, 10))
            setCaseDuration('18')
            setCaseClassification('class_1')
            setCaseAppliance('metal')
            setCaseArch('both')
            setCaseExtraction(isAr ? 'بدون خلع (Non-extraction)' : 'Non-extraction')
            setCaseTotalCost('1200000')
            setCaseDownPayment('300000')
            setCaseInstallment('50000')
            setCaseComplaint('')
            setNewCaseModalOpen(true)
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
            boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
          }}
        >
          <Plus className="size-4" />
          <span>{isAr ? 'فتح ملف تقويم جديد' : 'New Orthodontic Case'}</span>
        </button>
      </ListPageHeader>

      {/* ─── Top Stats Cards ─── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isAr ? 'الحالات النشطة' : 'Active Cases'}</span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats?.activeCases ?? 0}</span>
            <span className="text-xs text-slate-400">{isAr ? 'مريض تقويم' : 'patients'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isAr ? 'مرحلة التثبيت' : 'In Retention'}</span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats?.retentionCases ?? 0}</span>
            <span className="text-xs text-slate-400">{isAr ? 'حالة' : 'cases'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isAr ? 'مواعيد شد قادمة' : 'Upcoming Adjustments'}</span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-800">{stats?.upcomingVisitsCount ?? 0}</span>
            <span className="text-xs text-slate-400">{isAr ? 'جلسة مجدولة' : 'scheduled'}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{isAr ? 'أقساط تقويم متبقية' : 'Outstanding Balance'}</span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {Number(stats?.totalDebt ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search & Filter Toolbar ─── */}
      <ListPageToolbar>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم المريض، رقم الحالة ORT، أو الهاتف...' : 'Search by patient, case #, phone...'}
            className="da-input text-xs ps-9"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'active', 'retention', 'completed', 'suspended'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all'
                ? (isAr ? 'الكل' : 'All')
                : st === 'active'
                ? (isAr ? 'النشطة' : 'Active')
                : st === 'retention'
                ? (isAr ? 'التثبيت' : 'Retention')
                : st === 'completed'
                ? (isAr ? 'المكتملة' : 'Completed')
                : (isAr ? 'المعلقة' : 'Suspended')}
            </button>
          ))}
        </div>

        {/* Classification Filter Dropdown */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="da-input text-xs bg-white cursor-pointer w-auto min-w-[140px]"
        >
          <option value="all">{isAr ? 'جميع التصنيفات' : 'All Classes'}</option>
          <option value="class_1">{isAr ? 'صنف أول (Class I)' : 'Class I'}</option>
          <option value="class_2_div_1">{isAr ? 'صنف ثانٍ/قسم 1' : 'Class II Div 1'}</option>
          <option value="class_2_div_2">{isAr ? 'صنف ثانٍ/قسم 2' : 'Class II Div 2'}</option>
          <option value="class_3">{isAr ? 'صنف ثالث (Class III)' : 'Class III'}</option>
          <option value="open_bite">{isAr ? 'عضة مفتوحة' : 'Open Bite'}</option>
          <option value="crossbite">{isAr ? 'عضة معكوسة' : 'Crossbite'}</option>
        </select>
      </ListPageToolbar>

      {/* ─── Desktop Table ─── */}
      <DesktopTablePane>
        <table className="w-full text-start text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-start">#</th>
              <th className="py-3 px-4 text-start">{isAr ? 'المريض' : 'Patient'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الحالة والنوع' : 'Appliance & Class'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'تاريخ البدء والمدة' : 'Start & Duration'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الجلسات' : 'Visits'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'المالية (المدفوع / الإجمالي)' : 'Paid / Total'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredCases.map((c) => {
              const fullName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim() || '—'
              const totalCost = Number(c.total_cost || 0)
              const totalPaid = Number(c.total_paid || 0)
              const remaining = Number(c.remaining_balance || 0)

              return (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    {c.case_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/patients/${c.patient_id}`}
                      className="font-bold text-slate-900 hover:text-teal-700 transition"
                    >
                      {fullName}
                    </Link>
                    {c.patient_phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>{c.patient_phone}</span>
                        <button
                          type="button"
                          onClick={() => void handleWhatsApp(c.patient_phone, fullName)}
                          className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          title="WhatsApp"
                        >
                          <MessageCircle className="size-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-teal-800">
                        {getApplianceLabel(c.appliance_type)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {getClassificationLabel(c.classification)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-slate-800 font-semibold">{c.start_date}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {c.estimated_duration_months} {isAr ? 'شهراً' : 'mos'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800">
                      {c.visits_count || 0} {isAr ? 'جلسات' : 'visits'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-700">{totalPaid.toLocaleString()}</span>
                      <span className="text-slate-400">/</span>
                      <span className="font-semibold text-slate-700">{totalCost.toLocaleString()}</span>
                    </div>
                    {remaining > 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold block">
                        {isAr ? 'متبقي: ' : 'Rem: '}
                        {remaining.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/patients/${c.patient_id}`}
                        className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100 transition no-underline"
                      >
                        {isAr ? 'فتح الملف' : 'Open File'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCase(c.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
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
      </DesktopTablePane>

      {/* ─── Mobile Cards ─── */}
      <MobileCardList>
        {filteredCases.map((c) => {
          const fullName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim() || '—'
          return (
            <MobileCard key={c.id}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs">{c.case_number}</span>
                  {getStatusBadge(c.status)}
                </div>
                <span className="text-[11px] font-semibold text-teal-800">
                  {getApplianceLabel(c.appliance_type)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs pt-1">
                <Link
                  to={`/patients/${c.patient_id}`}
                  className="font-bold text-slate-900 text-sm hover:text-teal-700 block"
                >
                  {fullName}
                </Link>
                <div className="flex justify-between text-slate-600">
                  <span>{isAr ? 'التصنيف:' : 'Class:'}</span>
                  <span className="font-semibold text-slate-800">{getClassificationLabel(c.classification)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isAr ? 'المدفوع / الإجمالي:' : 'Paid / Total:'}</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {Number(c.total_paid || 0).toLocaleString()} / {Number(c.total_cost || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <MobileCardActions>
                <Link
                  to={`/patients/${c.patient_id}`}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white no-underline hover:bg-teal-700"
                >
                  {isAr ? 'عرض وتعديل الجلسات' : 'View & Visits'}
                </Link>
                {c.patient_phone && (
                  <button
                    type="button"
                    onClick={() => void handleWhatsApp(c.patient_phone, fullName)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800"
                  >
                    واتساب
                  </button>
                )}
              </MobileCardActions>
            </MobileCard>
          )
        })}
      </MobileCardList>

      {/* Empty State */}
      {!loading && filteredCases.length === 0 && (
        <MobileEmptyState icon={Sparkles}>
          <p className="text-xs">
            {searchQuery
              ? isAr
                ? 'لم يتم العثور على أي حالة مطابقة للبحث'
                : 'No matching orthodontic cases found'
              : isAr
              ? 'لا توجد حالات تقويم مسجلة بعد'
              : 'No orthodontic cases registered yet'}
          </p>
        </MobileEmptyState>
      )}

      {/* ─── New Case Modal ─── */}
      {newCaseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'فتح ملف تقويم جديد لمريض' : 'New Orthodontic Case'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewCaseModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto thin-scrollbar flex-1">
              <label className="flex flex-col gap-1 font-semibold text-slate-700">
                <span>{isAr ? 'اختيار المريض' : 'Select Patient'} *</span>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
                  className="da-input text-xs bg-white font-bold"
                >
                  <option value="">{isAr ? '— اختر مريضاً من القائمة —' : '— Select Patient —'}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} — {p.first_name} {p.last_name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              </label>

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
                  <span>{isAr ? 'تصنيف الإطباق' : 'Angle Classification'}</span>
                  <select
                    value={caseClassification}
                    onChange={(e) => setCaseClassification(e.target.value as OrthodonticClassification)}
                    className="da-input text-xs bg-white"
                  >
                    <option value="class_1">{isAr ? 'صنف أول (Class I)' : 'Class I'}</option>
                    <option value="class_2_div_1">{isAr ? 'صنف ثانٍ / قسم 1' : 'Class II Div 1'}</option>
                    <option value="class_2_div_2">{isAr ? 'صنف ثانٍ / قسم 2' : 'Class II Div 2'}</option>
                    <option value="class_3">{isAr ? 'صنف ثالث (Class III)' : 'Class III'}</option>
                    <option value="open_bite">{isAr ? 'عضة مفتوحة' : 'Open Bite'}</option>
                    <option value="crossbite">{isAr ? 'عضة معكوسة' : 'Crossbite'}</option>
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
                    <option value="metal">{isAr ? 'حاصرات معدنية (Metal)' : 'Metal'}</option>
                    <option value="ceramic">{isAr ? 'حاصرات خزفية (Ceramic)' : 'Ceramic'}</option>
                    <option value="self_ligating">{isAr ? 'ذاتي الربط (Damon / Self-Ligate)' : 'Self-Ligate'}</option>
                    <option value="clear_aligner">{isAr ? 'قوالب شفافة (Clear Aligners)' : 'Clear Aligners'}</option>
                    <option value="lingual">{isAr ? 'تقويم لساني داخلي' : 'Lingual'}</option>
                    <option value="functional">{isAr ? 'أجهزة وظيفية' : 'Functional'}</option>
                    <option value="retainer_only">{isAr ? 'مثبتات فقط' : 'Retainers'}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'الفك المعالج' : 'Treated Arch'}</span>
                  <select
                    value={caseArch}
                    onChange={(e) => setCaseArch(e.target.value as 'upper' | 'lower' | 'both')}
                    className="da-input text-xs bg-white"
                  >
                    <option value="both">{isAr ? 'الفكّين معاً' : 'Both Arches'}</option>
                    <option value="upper">{isAr ? 'الفك العلوي فقط' : 'Upper Only'}</option>
                    <option value="lower">{isAr ? 'الفك السفلي فقط' : 'Lower Only'}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>{isAr ? 'خطة القلع' : 'Extraction Plan'}</span>
                  <input
                    value={caseExtraction}
                    onChange={(e) => setCaseExtraction(e.target.value)}
                    placeholder={isAr ? 'مثال: بدون خلع، أو خلع 14, 24' : 'Non-extraction'}
                    className="da-input text-xs"
                  />
                </label>
              </div>

              {/* Financial Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block">
                  {isAr ? 'العقد المالي وخطة الأقساط' : 'Financial Agreement'}
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 font-semibold text-slate-700">
                    <span>{isAr ? 'التكلفة الإجمالية' : 'Total Cost'}</span>
                    <input
                      type="number"
                      value={caseTotalCost}
                      onChange={(e) => setCaseTotalCost(e.target.value)}
                      className="da-input text-xs font-mono"
                    />
                  </label>

                  <label className="flex flex-col gap-1 font-semibold text-slate-700">
                    <span>{isAr ? 'الدفعة الأولى' : 'Down Payment'}</span>
                    <input
                      type="number"
                      value={caseDownPayment}
                      onChange={(e) => setCaseDownPayment(e.target.value)}
                      className="da-input text-xs font-mono"
                    />
                  </label>

                  <label className="flex flex-col gap-1 font-semibold text-slate-700">
                    <span>{isAr ? 'القسط الشهري' : 'Monthly Installment'}</span>
                    <input
                      type="number"
                      value={caseInstallment}
                      onChange={(e) => setCaseInstallment(e.target.value)}
                      className="da-input text-xs font-mono"
                    />
                  </label>
                </div>
              </div>

              <label className="flex flex-col gap-1 font-semibold text-slate-700">
                <span>{isAr ? 'شكوى المريض وملاحظات سريرية' : 'Chief Complaint & Notes'}</span>
                <textarea
                  rows={2}
                  value={caseComplaint}
                  onChange={(e) => setCaseComplaint(e.target.value)}
                  placeholder={isAr ? 'مثال: بروز في الأسنان وتزاحم...' : 'Notes...'}
                  className="da-input text-xs resize-none"
                />
              </label>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 p-3.5 sm:p-4 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setNewCaseModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                {t('common.cancel', isAr ? 'إلغاء' : 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleCreateCase()}
                className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition"
              >
                {isAr ? 'إنشاء ملف التقويم وفتحه' : 'Create & Open Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </ListPageLayout>
  )
}
