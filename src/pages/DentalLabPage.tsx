import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Truck, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { listLabOrders, createLabOrder, updateLabOrderStatus, deleteLabOrder, type LabOrderRow } from '@/services/dbService'
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
  if (status === 'progress') return '!bg-amber-50 !text-amber-700 !border-amber-200'
  if (status === 'received') return '!bg-teal-50 !text-teal-700 !border-teal-200'
  return '!bg-rose-50 !text-rose-700 !border-rose-200'
}

function statusBadgeClass(status: LabOrderStatus): string {
  if (status === 'progress') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'received') return 'bg-teal-50 text-teal-700 border-teal-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function statusLabel(status: LabOrderStatus, isAr: boolean): string {
  if (status === 'progress') return isAr ? 'قيد العمل' : 'In Progress'
  if (status === 'received') return isAr ? 'تم الاستلام' : 'Received'
  return isAr ? 'متأخر' : 'Delayed'
}

export function DentalLabPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const [orders, setOrders] = useState<LabOrderRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [modal, setModal] = useState<boolean>(false)
  const [newOrder, setNewOrder] = useState({
    patientName: '',
    labName: '',
    workType: '',
    status: 'progress' as 'progress' | 'received' | 'delayed'
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
        status: newOrder.status
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
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا العمل المخبري؟' : 'Are you sure you want to delete this lab order?')) {
      try {
        await deleteLabOrder(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const progressCount = orders.filter(o => o.status === 'progress').length
  const receivedCount = orders.filter(o => o.status === 'received').length
  const delayedCount = orders.filter(o => o.status === 'delayed').length

  return (
    <ListPageLayout>
      {/* Header */}
      <ListPageHeader>
        <h1>
          <Truck className="size-6 text-teal-600" />
          {isAr ? 'إرسال إلى المخبر' : 'Send to Dental Lab'}
        </h1>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 sm:w-auto"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
        >
          <Plus className="size-4" />
          {isAr ? 'عمل جديد' : 'New Order'}
        </button>
      </ListPageHeader>

      {/* KPI Cards */}
      <div className="list-page-kpi-grid">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{progressCount}</p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'قيد العمل' : 'In Progress'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{receivedCount}</p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'تم الاستلام' : 'Received'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{delayedCount}</p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'متأخر' : 'Delayed'}</p>
            </div>
          </div>
        </div>
      </div>

      <ListPageToolbar>
        <h2 className="font-semibold text-slate-800">{isAr ? 'الأعمال الحالية' : 'Current Orders'}</h2>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? 'بحث...' : 'Search...'}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </ListPageToolbar>

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : orders.length === 0 ? (
          <MobileEmptyState icon={Truck}>
            {isAr ? 'لا توجد أعمال مخبرية مسجلة' : 'No lab orders recorded'}
          </MobileEmptyState>
        ) : (
          orders.map((o) => (
            <MobileCard key={o.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500">{o.order_id}</span>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(o.status)}`}
                >
                  {statusLabel(o.status, isAr)}
                </span>
              </div>
              <p className="mt-2 font-bold text-slate-900">{o.patient_name}</p>
              <p className="mt-1 text-sm text-slate-600">{o.lab_name}</p>
              <p className="mt-0.5 text-sm font-medium text-teal-700">{o.work_type}</p>
              <p className="mt-1 text-xs text-slate-500">
                {isAr ? 'تاريخ الإرسال:' : 'Sent:'} {o.sent_date}
              </p>
              <MobileCardActions className="lab-mobile-actions">
                <select
                  value={o.status}
                  onChange={(e) => void handleUpdateStatus(o.id, e.target.value as LabOrderStatus)}
                  className={`da-input !py-2 !text-xs font-semibold ${statusSelectClass(o.status)}`}
                  aria-label={isAr ? 'تحديث الحالة' : 'Update status'}
                >
                  <option value="progress">{isAr ? 'قيد العمل' : 'In Progress'}</option>
                  <option value="received">{isAr ? 'تم الاستلام' : 'Received'}</option>
                  <option value="delayed">{isAr ? 'متأخر' : 'Delayed'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleDelete(o.id)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                  title={isAr ? 'حذف' : 'Delete'}
                  aria-label={isAr ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="size-4" />
                </button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      <DesktopTablePane>
        <table className="w-full text-sm text-slate-600 min-w-[900px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'رقم العمل' : 'Order ID'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المريض' : 'Patient'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المخبر' : 'Lab'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'النوع' : 'Type'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'تاريخ الإرسال' : 'Sent Date'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'تحديث الحالة' : 'Update Status'}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500">{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Truck className="size-10 text-slate-300" />
                    {isAr ? 'لا توجد أعمال مخبرية مسجلة' : 'No lab orders recorded'}
                  </div>
                </td>
              </tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{o.order_id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{o.patient_name}</td>
                  <td className="px-6 py-4">{o.lab_name}</td>
                  <td className="px-6 py-4 text-teal-700 font-medium">{o.work_type}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{o.sent_date}</td>
                  <td className="px-6 py-4">
                    <select
                      value={o.status}
                      onChange={e => handleUpdateStatus(o.id, e.target.value as LabOrderStatus)}
                      className={`da-input !py-1.5 !text-xs font-semibold !w-auto ${statusSelectClass(o.status)}`}
                    >
                      <option value="progress" className="text-slate-700">{isAr ? 'قيد العمل' : 'In Progress'}</option>
                      <option value="received" className="text-slate-700">{isAr ? 'تم الاستلام' : 'Received'}</option>
                      <option value="delayed" className="text-slate-700">{isAr ? 'متأخر' : 'Delayed'}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="inline-flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 mx-auto"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTablePane>

      {modal ? (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-md">
            <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'عمل مخبري جديد' : 'New Lab Order'}
              </h2>
            </div>
            <div className="da-mobile-sheet-body thin-scrollbar space-y-4 p-4 sm:p-6">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'اسم المريض' : 'Patient Name'}
                <input
                  type="text"
                  value={newOrder.patientName || ''}
                  onChange={e => setNewOrder({...newOrder, patientName: e.target.value})}
                  className="da-input bg-white"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'اسم المخبر' : 'Lab Name'}
                <input
                  type="text"
                  value={newOrder.labName || ''}
                  onChange={e => setNewOrder({...newOrder, labName: e.target.value})}
                  className="da-input bg-white"
                  placeholder={isAr ? 'مثال: مخبر الابتسامة...' : 'e.g. Smile Lab...'}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'نوع العمل / التفاصيل' : 'Work Type & Details'}
                <input
                  type="text"
                  value={newOrder.workType || ''}
                  onChange={e => setNewOrder({...newOrder, workType: e.target.value})}
                  className="da-input bg-white"
                  placeholder={isAr ? 'مثال: تاج زيركون لسن 46...' : 'e.g. Zirconium crown for 46...'}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'حالة الطلب' : 'Status'}
                <select
                  value={newOrder.status}
                  onChange={e => setNewOrder({...newOrder, status: e.target.value as 'progress' | 'received' | 'delayed'})}
                  className="da-input bg-white"
                >
                  <option value="progress">{isAr ? 'قيد العمل' : 'In Progress'}</option>
                  <option value="received">{isAr ? 'تم الاستلام' : 'Received'}</option>
                  <option value="delayed">{isAr ? 'متأخر' : 'Delayed'}</option>
                </select>
              </label>
            </div>
            <div className="da-mobile-sheet-footer">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="da-btn-secondary !px-5 !py-2.5"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={!newOrder.patientName || !newOrder.labName || !newOrder.workType}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                {isAr ? 'إضافة وتأكيد' : 'Add Order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ListPageLayout>
  )
}
