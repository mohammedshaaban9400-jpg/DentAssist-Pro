import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Trash2,
  Truck,
  Wrench,
  X,
} from 'lucide-react'
import {
  listLabOrders,
  createLabOrder,
  updateLabOrderStatus,
  deleteLabOrder,
  type LabOrderRow,
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

type LabOrderStatus = 'progress' | 'received' | 'delayed'

function statusSelectClass(status: LabOrderStatus): string {
  if (status === 'progress') return 'bg-amber-50 text-amber-800 border-amber-300/80 ring-amber-400/20'
  if (status === 'received') return 'bg-emerald-50 text-emerald-800 border-emerald-300/80 ring-emerald-400/20'
  return 'bg-rose-50 text-rose-800 border-rose-300/80 ring-rose-400/20'
}

function statusBadgeClass(status: LabOrderStatus): string {
  if (status === 'progress') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'received') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function statusLabel(status: LabOrderStatus, isAr: boolean): string {
  if (status === 'progress') return isAr ? 'قيد العمل' : 'In Progress'
  if (status === 'received') return isAr ? 'تم الاستلام' : 'Received'
  return isAr ? 'متأخر' : 'Delayed'
}

function getInitials(name?: string): string {
  const parts = (name || '').trim().split(' ')
  const f = parts[0]?.charAt(0) || ''
  const l = parts[1]?.charAt(0) || ''
  return `${f}${l}`.toUpperCase() || '؟'
}

const COMMON_PRESETS = [
  'تاج زيركون',
  'جسر خزف / E.max',
  'جهاز تقويم متحرك',
  'صفيحة ليلية Night Guard',
  'طقم أسنان جزئي',
  'دعامة زراعة مخصصة',
]

export function DentalLabPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const [orders, setOrders] = useState<LabOrderRow[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabOrderStatus>('all')
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<boolean>(false)
  const [newOrder, setNewOrder] = useState({
    patientName: '',
    labName: '',
    workType: '',
    status: 'progress' as LabOrderStatus,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLabOrders(q.trim() || undefined)
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const id = window.setTimeout(() => void loadData(), 200)
    return () => window.clearTimeout(id)
  }, [loadData])

  const handleAdd = async () => {
    if (!newOrder.patientName || !newOrder.labName || !newOrder.workType) return
    try {
      await createLabOrder({
        patientName: newOrder.patientName.trim(),
        labName: newOrder.labName.trim(),
        workType: newOrder.workType.trim(),
        sentDate: new Date().toISOString().split('T')[0],
        status: newOrder.status,
      })
      setModal(false)
      setNewOrder({ patientName: '', labName: '', workType: '', status: 'progress' })
      await loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateStatus = async (id: number, status: LabOrderStatus) => {
    try {
      await updateLabOrderStatus(id, status)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      window.confirm(
        isAr
          ? 'هل أنت متأكد من حذف هذا العمل المخبري؟'
          : 'Are you sure you want to delete this lab order?',
      )
    ) {
      try {
        await deleteLabOrder(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const progressCount = useMemo(() => orders.filter((o) => o.status === 'progress').length, [orders])
  const receivedCount = useMemo(() => orders.filter((o) => o.status === 'received').length, [orders])
  const delayedCount = useMemo(() => orders.filter((o) => o.status === 'delayed').length, [orders])

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    return true
  })

  return (
    <ListPageLayout>
      {/* ─── Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0284c7)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Truck className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'الأعمال المخبرية والتعويضات' : 'Dental Lab Orders'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'متابعة أعمال التيجان، الجسور، التعويضات والتقويم مع المخابر الخارجية'
                : 'Track prosthodontic orders, crowns, bridges and orthodontic appliances'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
            boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
          }}
        >
          <Plus className="size-4" />
          <span>{isAr ? 'إرسال عمل جديد' : 'New Lab Order'}</span>
        </button>
      </ListPageHeader>

      {/* ─── 3 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:gap-4 sm:p-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-2xs">
              <Clock className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-amber-700 tabular-nums">
                {progressCount}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'قيد التصنيع بالمخبر' : 'In Progress'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle2 className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 tabular-nums">
                {receivedCount}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'تم استلامها بالعيادة' : 'Received & Ready'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-2xs">
              <AlertCircle className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 tabular-nums">
                {delayedCount}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'متأخرة عن الموعد' : 'Delayed Orders'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Status Filter Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? 'بحث باسم المريض أو المخبر أو العمل...' : 'Search patient, lab or work...'}
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 ps-10 pe-9 text-xs font-medium text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60">
            {[
              { id: 'all', label: isAr ? 'الكل' : 'All' },
              { id: 'progress', label: isAr ? 'قيد العمل' : 'In Progress' },
              { id: 'received', label: isAr ? 'تم الاستلام' : 'Received' },
              { id: 'delayed', label: isAr ? 'متأخر' : 'Delayed' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`cursor-pointer rounded-xl px-3.5 py-1 text-xs font-bold transition-all duration-150 ${
                  statusFilter === st.id
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </ListPageToolbar>

      {/* ─── Mobile Cards ─── */}
      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filtered.length === 0 ? (
          <MobileEmptyState icon={Truck}>
            <p className="text-sm font-semibold text-slate-700">
              {isAr ? 'لا توجد أعمال مخبرية مسجلة' : 'No lab orders recorded'}
            </p>
          </MobileEmptyState>
        ) : (
          filtered.map((o) => (
            <MobileCard key={o.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {o.order_id ? `#${o.order_id}` : `#${o.id}`}
                </span>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(
                    o.status,
                  )}`}
                >
                  {statusLabel(o.status, isAr)}
                </span>
              </div>
              <p className="mt-2 font-bold text-slate-900">{o.patient_name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="size-3 text-slate-400" />
                <span>{o.lab_name}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-teal-700">
                <Wrench className="size-3 text-teal-600" />
                <span>{o.work_type}</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-mono">
                {isAr ? 'تاريخ الإرسال:' : 'Sent:'} {o.sent_date}
              </p>

              <MobileCardActions className="lab-mobile-actions">
                <select
                  value={o.status}
                  onChange={(e) => void handleUpdateStatus(o.id, e.target.value as LabOrderStatus)}
                  className={`da-input !py-1.5 !text-xs font-bold ${statusSelectClass(o.status)}`}
                >
                  <option value="progress">{isAr ? 'قيد العمل' : 'In Progress'}</option>
                  <option value="received">{isAr ? 'تم الاستلام' : 'Received'}</option>
                  <option value="delayed">{isAr ? 'متأخر' : 'Delayed'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleDelete(o.id)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      {/* ─── Desktop Table View ─── */}
      <DesktopTablePane>
        <table className="min-w-[900px] w-full text-xs text-slate-600">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-slate-600 backdrop-blur-xs">
            <tr>
              <th className="w-16 px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-400">
                #
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المريض' : 'Patient'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المخبر السني' : 'Dental Lab'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'نوع العمل / القطعة' : 'Work Type'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'تاريخ الإرسال' : 'Sent Date'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'حالة الطلب' : 'Status'}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'إجراءات' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-8 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-7 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-8 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <Truck className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {isAr ? 'لا توجد أعمال مخبرية مسجلة' : 'No lab orders recorded'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal(true)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'إرسال عمل جديد الآن' : 'New Lab Order'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const initials = getInitials(o.patient_name)
                return (
                  <tr
                    key={o.id}
                    className="group transition-colors duration-150 hover:bg-teal-50/20"
                  >
                    <td className="px-6 py-3.5 text-center font-mono font-bold text-slate-400">
                      {o.order_id ? `#${o.order_id}` : `#${o.id}`}
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex size-7.5 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-2xs"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #0284c7)' }}
                        >
                          {initials}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                          {o.patient_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-slate-400" />
                        <span>{o.lab_name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-bold text-teal-800">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="size-3.5 text-teal-600" />
                        <span>{o.work_type}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-mono text-slate-500 font-medium">
                      {o.sent_date}
                    </td>

                    <td className="px-6 py-3.5">
                      <select
                        value={o.status}
                        onChange={(e) =>
                          void handleUpdateStatus(o.id, e.target.value as LabOrderStatus)
                        }
                        className={`da-input !py-1.5 !text-xs font-bold !w-auto cursor-pointer rounded-xl transition-all ${statusSelectClass(
                          o.status,
                        )}`}
                      >
                        <option value="progress" className="text-slate-800">
                          {isAr ? 'قيد العمل' : 'In Progress'}
                        </option>
                        <option value="received" className="text-slate-800">
                          {isAr ? 'تم الاستلام' : 'Received'}
                        </option>
                        <option value="delayed" className="text-slate-800">
                          {isAr ? 'متأخر' : 'Delayed'}
                        </option>
                      </select>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => void handleDelete(o.id)}
                        className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 mx-auto"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DesktopTablePane>

      {/* ─── Modal Dialog ─── */}
      {modal ? (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Truck className="size-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isAr ? 'إرسال عمل مخبري جديد' : 'New Lab Order'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="da-mobile-sheet-body thin-scrollbar space-y-4 p-5 sm:p-6">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'اسم المريض' : 'Patient Name'}</span>
                <input
                  type="text"
                  value={newOrder.patientName || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, patientName: e.target.value })}
                  placeholder={isAr ? 'مثال: أحمد عبد الله...' : 'e.g. John Doe'}
                  className="da-input text-xs"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'اسم المخبر السني' : 'Lab Name'}</span>
                <input
                  type="text"
                  value={newOrder.labName || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, labName: e.target.value })}
                  placeholder={isAr ? 'مثال: مخبر النخبة السني...' : 'e.g. Elite Dental Lab'}
                  className="da-input text-xs"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'نوع العمل / التفاصيل' : 'Work Type'}</span>
                <input
                  type="text"
                  value={newOrder.workType || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, workType: e.target.value })}
                  placeholder={isAr ? 'مثال: تاج زيركون لون A2 سن 24...' : 'e.g. Zirconium crown 24'}
                  className="da-input text-xs"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {COMMON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewOrder({ ...newOrder, workType: preset })}
                      className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'حالة الطلب الأولية' : 'Status'}</span>
                <select
                  value={newOrder.status}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      status: e.target.value as LabOrderStatus,
                    })
                  }
                  className="da-input bg-white text-xs font-semibold"
                >
                  <option value="progress">{isAr ? 'قيد العمل بالمخبر' : 'In Progress'}</option>
                  <option value="received">{isAr ? 'تم الاستلام' : 'Received'}</option>
                  <option value="delayed">{isAr ? 'متأخر' : 'Delayed'}</option>
                </select>
              </label>
            </div>

            <div className="da-mobile-sheet-footer bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={!newOrder.patientName || !newOrder.labName || !newOrder.workType}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
                }}
              >
                <span>{isAr ? 'إضافة وتأكيد' : 'Confirm Order'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ListPageLayout>
  )
}
