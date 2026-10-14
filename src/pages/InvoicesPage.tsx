import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import {
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useConfirm } from '@/hooks/useConfirm'
import type { InvoiceLineDraft, InvoiceListRow, Patient } from '@/types/clinical'
import {
  createInvoice,
  deleteInvoice,
  getConfigs,
  getInvoice,
  listInvoices,
  listPatients,
  updateInvoiceStatus,
  updateInvoiceWithItems,
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

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

function getInitials(first?: string, last?: string): string {
  const f = (first || '').trim().charAt(0)
  const l = (last || '').trim().charAt(0)
  return `${f}${l}`.toUpperCase() || '؟'
}

export function InvoicesPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const loc = isAr ? arSA : enUS
  const { confirm, confirmModal } = useConfirm()
  const [searchParams] = useSearchParams()

  const filterPidRaw = searchParams.get('patientId')
  const filterPatientId =
    filterPidRaw != null && filterPidRaw !== '' && Number.isFinite(Number(filterPidRaw))
      ? Number(filterPidRaw)
      : null

  const [rows, setRows] = useState<InvoiceListRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [currency, setCurrency] = useState('SYP')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [patientId, setPatientId] = useState(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'pending' | 'paid'>('pending')
  const [lines, setLines] = useState<InvoiceLineDraft[]>([
    { description: '', toothNumber: null, price: 0 },
  ])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inv, p, cfg] = await Promise.all([
        listInvoices(200, filterPatientId),
        listPatients(),
        getConfigs(['currency']).catch(() => ({})),
      ])
      setRows(inv)
      setPatients(p)
      const cfgRecord = cfg as Record<string, string>
      if (cfgRecord?.currency) setCurrency(cfgRecord.currency)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [filterPatientId])

  useEffect(() => {
    void load()
  }, [load])

  const currencySymbol = useMemo(() => {
    if (currency === 'SYP') return isAr ? 'ل.س' : 'SYP'
    if (currency === 'IQD') return isAr ? 'د.ع' : 'IQD'
    if (currency === 'USD') return '$'
    if (currency === 'EUR') return '€'
    if (currency === 'SAR') return isAr ? 'ر.س' : 'SAR'
    if (currency === 'AED') return isAr ? 'د.إ' : 'AED'
    return currency
  }, [currency, isAr])

  const totalModalSum = lines.reduce(
    (s, l) => s + (Number.isFinite(l.price) ? l.price : 0),
    0,
  )

  // Financial KPI totals
  const stats = useMemo(() => {
    const totalInvoiced = rows.reduce((s, r) => s + (r.total_amount || 0), 0)
    const paidAmount = rows
      .filter((r) => r.status === 'paid')
      .reduce((s, r) => s + (r.total_amount || 0), 0)
    const pendingAmount = rows
      .filter((r) => r.status !== 'paid')
      .reduce((s, r) => s + (r.total_amount || 0), 0)
    return { totalInvoiced, paidAmount, pendingAmount }
  }, [rows])

  const openCreate = () => {
    setModal('create')
    setEditId(null)
    const pre =
      filterPatientId != null && patients.some((x) => x.id === filterPatientId)
        ? filterPatientId
        : patients[0]?.id ?? 0
    setPatientId(pre)
    setDate(new Date().toISOString().slice(0, 10))
    setStatus('pending')
    setLines([{ description: '', toothNumber: null, price: 0 }])
  }

  const openEdit = async (id: number) => {
    setBusy(true)
    setError(null)
    try {
      const data = await getInvoice(id)
      if (!data) {
        setError(t('invoices.notFound'))
        return
      }
      setModal('edit')
      setEditId(id)
      setPatientId(data.invoice.patient_id)
      setDate(data.invoice.date.slice(0, 10))
      setStatus(data.invoice.status as 'paid' | 'pending')
      setLines(
        data.items.length > 0
          ? data.items.map((it) => ({
              description: it.description,
              toothNumber: it.tooth_number,
              price: it.price,
            }))
          : [{ description: '', toothNumber: null, price: 0 }],
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    const clean = lines
      .map((l) => ({
        description: l.description.trim(),
        toothNumber: l.toothNumber,
        price: Number(l.price),
      }))
      .filter((l) => l.description.length > 0)
    if (!patientId) {
      setError(t('invoices.needPatient'))
      return
    }
    if (clean.length === 0) {
      setError(t('invoices.needLine'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (modal === 'create') {
        await createInvoice({
          patientId,
          date: new Date(date + 'T12:00:00').toISOString(),
          status,
          items: clean,
        })
      } else if (modal === 'edit' && editId != null) {
        await updateInvoiceWithItems(editId, {
          date: new Date(date + 'T12:00:00').toISOString(),
          status,
          items: clean,
        })
      }
      setModal(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const togglePaid = async (row: InvoiceListRow) => {
    const next = row.status === 'paid' ? 'pending' : 'paid'
    setBusy(true)
    try {
      await updateInvoiceStatus(row.id, next)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (!(await confirm(t('invoices.confirmDelete')))) return
    setBusy(true)
    try {
      await deleteInvoice(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const updateLine = (i: number, patch: Partial<InvoiceLineDraft>) => {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  const filteredRows = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      r.patient_first_name.toLowerCase().includes(s) ||
      r.patient_last_name.toLowerCase().includes(s) ||
      String(r.id).includes(s)
    )
  })

  return (
    <ListPageLayout>
      {/* ─── Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0891b2)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Receipt className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t('invoices.title', isAr ? 'الفواتير والذمم المالية' : 'Invoices & Billing')}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? `${rows.length} فاتورة مسجلة — إدارة الحسابات والمدفوعات السريرية`
                : `${rows.length} recorded invoices — patient billing and receipts`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={patients.length === 0}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
            boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
          }}
        >
          <Plus className="size-4" />
          <span>{t('invoices.new', isAr ? 'فاتورة جديدة' : 'New Invoice')}</span>
        </button>
      </ListPageHeader>

      {/* ─── Patient Filter Active Banner ─── */}
      {filterPatientId != null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200/70 bg-teal-50 px-6 py-2.5 text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-teal-700" />
            <span className="font-bold">
              {t('invoices.filterForPatient', {
                name: (() => {
                  const pt = patients.find((x) => x.id === filterPatientId)
                  return pt ? `${pt.first_name} ${pt.last_name}` : `#${filterPatientId}`
                })(),
              })}
            </span>
          </div>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1 font-bold text-teal-800 hover:text-teal-950 no-underline"
          >
            <X className="size-3.5" />
            {t('invoices.clearPatientFilter', isAr ? 'عرض كل الفواتير' : 'Show all')}
          </Link>
        </div>
      ) : null}

      {/* ─── Financial KPI Summary Bar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:gap-4 sm:p-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-2xs">
              <Receipt className="size-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                {formatNumber(stats.totalInvoiced)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي المطالبات' : 'Total Invoiced'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 tabular-nums">
                {formatNumber(stats.paidAmount)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'المبالغ المحصلة (مدفوعة)' : 'Paid Invoices'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-2xs">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-amber-700 tabular-nums">
                {formatNumber(stats.pendingAmount)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'الذمم المعلقة (غير مدفوعة)' : 'Pending Debt'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search and Status Filters Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? 'بحث برقم الفاتورة أو اسم المريض...' : 'Search by ID or Patient Name...'}
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
              { id: 'paid', label: isAr ? 'مدفوعة' : 'Paid' },
              { id: 'pending', label: isAr ? 'معلقة' : 'Pending' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
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

      {error ? <div className="list-page-error">{error}</div> : null}

      {/* ─── Mobile Cards ─── */}
      <MobileCardList>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={FileText}>
            <p className="text-sm font-semibold text-slate-700">
              {t('invoices.empty', isAr ? 'لا توجد فواتير مطابقة' : 'No invoices')}
            </p>
          </MobileEmptyState>
        ) : (
          filteredRows.map((r) => {
            const initials = getInitials(r.patient_first_name, r.patient_last_name)
            return (
              <MobileCard key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {r.patient_first_name} {r.patient_last_name}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        #{r.id} · {format(parseISO(r.date), 'PP', { locale: loc })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void togglePaid(r)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition"
                    style={
                      r.status === 'paid'
                        ? {
                            background: '#f0fdf4',
                            color: '#047857',
                            boxShadow: 'inset 0 0 0 1px #bbf7d0',
                          }
                        : {
                            background: '#fffbeb',
                            color: '#92400e',
                            boxShadow: 'inset 0 0 0 1px #fde68a',
                          }
                    }
                  >
                    {r.status === 'paid' ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    <span>{t(`invoices.payStatus.${r.status}`)}</span>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100/80 pt-2.5">
                  <span className="text-xs text-slate-500">{isAr ? 'الإجمالي:' : 'Total:'}</span>
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                    {formatNumber(r.total_amount)} {currencySymbol}
                  </span>
                </div>

                <MobileCardActions>
                  <button
                    type="button"
                    onClick={() => void openEdit(r.id)}
                    className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    disabled={busy}
                    className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </MobileCardActions>
              </MobileCard>
            )
          })
        )}
      </MobileCardList>

      {/* ─── Desktop Table View ─── */}
      <DesktopTablePane>
        <table className="min-w-[850px] w-full text-xs text-slate-600">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-slate-600 backdrop-blur-xs">
            <tr>
              <th className="w-16 px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-400">
                #
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('invoices.colDate', isAr ? 'تاريخ الفاتورة' : 'Date')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('invoices.colPatient', isAr ? 'المريض' : 'Patient')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('invoices.colTotal', isAr ? 'المبلغ الإجمالي' : 'Total Amount')}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {t('invoices.colStatus', isAr ? 'حالة الدفع' : 'Status')}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {t('invoices.colActions', isAr ? 'إجراءات' : 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-8 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-20 mx-auto animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-16 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <Receipt className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {t('invoices.empty', isAr ? 'لا توجد فواتير مطابقة' : 'No invoices')}
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      disabled={patients.length === 0}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'إنشاء فاتورة جديدة' : 'Create Invoice'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const initials = getInitials(r.patient_first_name, r.patient_last_name)
                return (
                  <tr
                    key={r.id}
                    className="group transition-colors duration-150 hover:bg-teal-50/20"
                  >
                    <td className="px-6 py-3.5 text-center font-mono font-bold text-slate-400">
                      #{r.id}
                    </td>

                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {format(parseISO(r.date), 'PP', { locale: loc })}
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex size-7.5 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-2xs"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                        >
                          {initials}
                        </div>
                        <Link
                          to={`/patients/${r.patient_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 no-underline transition-colors"
                        >
                          {r.patient_first_name} {r.patient_last_name}
                        </Link>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-extrabold tabular-nums text-slate-900 text-sm">
                      {formatNumber(r.total_amount)}{' '}
                      <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void togglePaid(r)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 hover:scale-105 active:scale-95 disabled:pointer-events-none"
                        style={
                          r.status === 'paid'
                            ? {
                                background: '#f0fdf4',
                                color: '#15803d',
                                boxShadow: 'inset 0 0 0 1px #bbf7d0',
                              }
                            : {
                                background: '#fffbeb',
                                color: '#b45309',
                                boxShadow: 'inset 0 0 0 1px #fde68a',
                              }
                        }
                        title={isAr ? 'اضغط لتغيير حالة السداد' : 'Click to toggle payment status'}
                      >
                        {r.status === 'paid' ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <Clock className="size-3.5" />
                        )}
                        <span>{t(`invoices.payStatus.${r.status}`)}</span>
                      </button>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openEdit(r.id)}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                          title={t('common.edit')}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(r.id)}
                          disabled={busy}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          title={t('common.delete')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DesktopTablePane>

      {/* ─── Modal for Create / Edit ─── */}
      {modal ? (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Receipt className="size-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modal === 'create'
                      ? t('invoices.modalCreate', isAr ? 'إنشاء فاتورة جديدة' : 'New Invoice')
                      : t('invoices.modalEdit', isAr ? 'تعديل الفاتورة' : 'Edit Invoice')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="da-mobile-sheet-body thin-scrollbar space-y-4.5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                  <span>{t('invoices.fieldPatient', isAr ? 'المريض' : 'Patient')}</span>
                  <select
                    value={patientId || ''}
                    onChange={(e) => setPatientId(Number(e.target.value))}
                    className="da-input cursor-pointer bg-white text-xs font-semibold"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{t('invoices.fieldDate', isAr ? 'التاريخ' : 'Date')}</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="da-input cursor-text bg-white text-xs font-semibold"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{t('invoices.fieldStatus', isAr ? 'حالة السداد' : 'Payment Status')}</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
                    className="da-input cursor-pointer bg-white text-xs font-semibold"
                  >
                    <option value="pending">
                      {t('invoices.payStatus.pending', isAr ? 'معلقة (غير مدفوعة)' : 'Pending')}
                    </option>
                    <option value="paid">
                      {t('invoices.payStatus.paid', isAr ? 'مدفوعة بالكامل' : 'Paid in full')}
                    </option>
                  </select>
                </label>
              </div>

              {/* Line items section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('invoices.lines', isAr ? 'بنود المعالجة والأسعار' : 'Invoice Items')}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => [
                        ...prev,
                        { description: '', toothNumber: null, price: 0 },
                      ])
                    }
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-teal-200/80 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 transition hover:bg-teal-100 active:scale-95"
                  >
                    <Plus className="size-3.5" />
                    <span>{t('invoices.addLine', isAr ? 'إضافة بند' : 'Add Item')}</span>
                  </button>
                </div>

                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="grid gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-12 sm:items-end"
                  >
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-6">
                      <span>{t('invoices.lineDesc', isAr ? 'البيان / المعالجة' : 'Description')}</span>
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        placeholder={isAr ? 'مثال: حشوة كمبوزيت تجميلية...' : 'e.g. Composite filling'}
                        className="da-input !py-2 text-xs bg-white"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                      <span>{t('invoices.lineTooth', isAr ? 'السن' : 'Tooth')}</span>
                      <input
                        type="number"
                        min="11"
                        max="85"
                        value={line.toothNumber ?? ''}
                        onChange={(e) =>
                          updateLine(i, {
                            toothNumber: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="16"
                        className="da-input !py-2 text-xs tabular-nums bg-white"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-3">
                      <span>{t('invoices.linePrice', isAr ? 'السعر' : 'Price')}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.price || ''}
                        onChange={(e) => updateLine(i, { price: Number(e.target.value) })}
                        placeholder="50000"
                        className="da-input !py-2 text-xs tabular-nums bg-white font-bold"
                      />
                    </label>
                    <div className="flex h-9 items-center justify-center sm:col-span-1 sm:mb-0.5">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                        className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-teal-50/70 border border-teal-100 px-4 py-3">
                  <span className="text-xs font-bold text-teal-900">
                    {t('invoices.total', isAr ? 'المجموع النهائي:' : 'Total Amount:')}
                  </span>
                  <span className="text-base font-extrabold text-teal-950 tabular-nums">
                    {formatNumber(totalModalSum)} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="da-mobile-sheet-footer bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
              >
                {t('common.cancel', isAr ? 'إلغاء' : 'Cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
                }}
              >
                <span>{t('common.save', isAr ? 'حفظ الفاتورة' : 'Save Invoice')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal}
    </ListPageLayout>
  )
}
