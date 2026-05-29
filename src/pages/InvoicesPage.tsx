import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { CheckCircle2, Clock, FileText, Pencil, Plus, Trash2, X, Search, Receipt } from 'lucide-react'
import { useConfirm } from '@/hooks/useConfirm'
import type { InvoiceLineDraft, InvoiceListRow } from '@/types/clinical'
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  listPatients,
  updateInvoiceStatus,
  updateInvoiceWithItems,
} from '@/services/dbService'
import type { Patient } from '@/types/clinical'
import {
  DesktopTableScroll,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
} from '@/components/layout/ListPageLayout'

export function InvoicesPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { confirm, confirmModal } = useConfirm()
  const [searchParams] = useSearchParams()
  const filterPidRaw = searchParams.get('patientId')
  const filterPatientId =
    filterPidRaw != null && filterPidRaw !== '' && Number.isFinite(Number(filterPidRaw))
      ? Number(filterPidRaw)
      : null
  const loc = isAr ? arSA : enUS
  const locNum = isAr ? 'ar-SA' : 'en-US'
  const [rows, setRows] = useState<InvoiceListRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [patientId, setPatientId] = useState(0)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'pending' | 'paid'>('pending')
  const [lines, setLines] = useState<InvoiceLineDraft[]>([{ description: '', toothNumber: null, price: 0 }])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [inv, p] = await Promise.all([listInvoices(200, filterPatientId), listPatients()])
      setRows(inv); setPatients(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }, [filterPatientId])

  useEffect(() => { void load() }, [load])

  const total = lines.reduce((s, l) => s + (Number.isFinite(l.price) ? l.price : 0), 0)

  const openCreate = () => {
    setModal('create'); setEditId(null)
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
    setBusy(true); setError(null)
    try {
      const data = await getInvoice(id)
      if (!data) { setError(t('invoices.notFound')); return }
      setModal('edit'); setEditId(id); setPatientId(data.invoice.patient_id)
      setDate(data.invoice.date.slice(0, 10))
      setStatus(data.invoice.status as 'paid' | 'pending')
      setLines(
        data.items.length > 0
          ? data.items.map((it) => ({ description: it.description, toothNumber: it.tooth_number, price: it.price }))
          : [{ description: '', toothNumber: null, price: 0 }],
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const submit = async () => {
    const clean = lines
      .map((l) => ({ description: l.description.trim(), toothNumber: l.toothNumber, price: Number(l.price) }))
      .filter((l) => l.description.length > 0)
    if (!patientId) { setError(t('invoices.needPatient')); return }
    if (clean.length === 0) { setError(t('invoices.needLine')); return }
    setBusy(true); setError(null)
    try {
      if (modal === 'create') {
        await createInvoice({ patientId, date: new Date(date + 'T12:00:00').toISOString(), status, items: clean })
      } else if (modal === 'edit' && editId != null) {
        await updateInvoiceWithItems(editId, { date: new Date(date + 'T12:00:00').toISOString(), status, items: clean })
      }
      setModal(null); await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const togglePaid = async (row: InvoiceListRow) => {
    const next = row.status === 'paid' ? 'pending' : 'paid'
    setBusy(true)
    try { await updateInvoiceStatus(row.id, next); await load() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const remove = async (id: number) => {
    if (!await confirm(t('invoices.confirmDelete'))) return
    setBusy(true)
    try { await deleteInvoice(id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const updateLine = (i: number, patch: Partial<InvoiceLineDraft>) => {
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  const filteredRows = rows.filter((r) => {
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
      {/* Header */}
      <ListPageHeader>
        <h1>
          <Receipt className="size-6 text-teal-600" />
          {t('invoices.title')}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          disabled={patients.length === 0}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
        >
          <Plus className="size-4" aria-hidden />
          {t('invoices.new')}
        </button>
      </ListPageHeader>

      {/* Patient filter banner */}
      {filterPatientId != null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200/70 bg-teal-50 px-6 py-3 text-sm text-teal-900">
          <div className="flex items-center gap-2.5">
            <FileText className="size-4 text-teal-600" aria-hidden />
            <span className="font-medium">
              {t('invoices.filterForPatient', {
                name: (() => {
                  const pt = patients.find((x) => x.id === filterPatientId)
                  return pt ? `${pt.first_name} ${pt.last_name}` : `#${filterPatientId}`
                })(),
              })}
            </span>
          </div>
          <Link to="/invoices" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-teal-700 hover:text-teal-900 no-underline">
            <X className="size-4" aria-hidden />
            {t('invoices.clearPatientFilter')}
          </Link>
        </div>
      ) : null}

      <ListPageToolbar>
        <div className="relative w-full max-w-md">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? 'بحث برقم الفاتورة أو اسم المريض...' : 'Search by ID or Patient Name...'}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </ListPageToolbar>

      {error ? (
        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <DesktopTableScroll>
        <table className="w-full text-sm text-slate-600 min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="px-6 py-3 text-center font-semibold text-slate-500 border-e border-slate-100">#</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{t('invoices.colDate')}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{t('invoices.colPatient')}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{t('invoices.colTotal')}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500 border-e border-slate-100">{t('invoices.colStatus')}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500">{t('invoices.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-center"><div className="h-4 w-8 mx-auto animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-6 w-20 mx-auto animate-pulse rounded-full bg-slate-100" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-6 w-16 mx-auto animate-pulse rounded bg-slate-100" /></td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileText className="size-10 text-slate-300" />
                    {t('invoices.empty')}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-slate-500">#{r.id}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">
                    {format(parseISO(r.date), 'PP', { locale: loc })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <Link to={`/patients/${r.patient_id}`} className="hover:underline text-teal-700">
                      {r.patient_first_name} {r.patient_last_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums text-slate-900">
                    {r.total_amount.toLocaleString(locNum, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void togglePaid(r)}
                      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:pointer-events-none"
                      style={r.status === 'paid'
                        ? { background: '#f0fdf4', color: '#047857', boxShadow: 'inset 0 0 0 1px #bbf7d0' }
                        : { background: '#fffbeb', color: '#92400e', boxShadow: 'inset 0 0 0 1px #fde68a' }
                      }
                    >
                      {r.status === 'paid'
                        ? <CheckCircle2 className="size-3.5" />
                        : <Clock className="size-3.5" />
                      }
                      {t(`invoices.payStatus.${r.status}`)}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => void openEdit(r.id)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded bg-slate-100 text-slate-500 transition hover:bg-teal-100 hover:text-teal-700"
                        title={t('common.edit')}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        disabled={busy}
                        className="flex size-7 cursor-pointer items-center justify-center rounded bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                        title={t('common.delete')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTableScroll>

      {/* Modal */}
      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-base font-bold text-slate-900">
                {modal === 'create' ? t('invoices.modalCreate') : t('invoices.modalEdit')}
              </h2>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                  {t('invoices.fieldPatient')}
                  <select value={patientId || ''} onChange={(e) => setPatientId(Number(e.target.value))} className="da-input cursor-pointer bg-white">
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {t('invoices.fieldDate')}
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="da-input cursor-text bg-white" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {t('invoices.fieldStatus')}
                  <select value={status} onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')} className="da-input cursor-pointer bg-white">
                    <option value="pending">{t('invoices.payStatus.pending')}</option>
                    <option value="paid">{t('invoices.payStatus.paid')}</option>
                  </select>
                </label>
              </div>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{t('invoices.lines')}</p>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, { description: '', toothNumber: null, price: 0 }])}
                    className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {t('invoices.addLine')}
                  </button>
                </div>
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-12 sm:items-end"
                  >
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-5">
                      {t('invoices.lineDesc')}
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        className="da-input !py-2 text-sm bg-white"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-3">
                      {t('invoices.lineTooth')}
                      <input
                        type="number"
                        min="11" max="85"
                        value={line.toothNumber ?? ''}
                        onChange={(e) => updateLine(i, { toothNumber: e.target.value ? Number(e.target.value) : null })}
                        className="da-input !py-2 text-sm tabular-nums bg-white"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-3">
                      {t('invoices.linePrice')}
                      <input
                        type="number"
                        min="0" step="any"
                        value={line.price || ''}
                        onChange={(e) => updateLine(i, { price: Number(e.target.value) })}
                        className="da-input !py-2 text-sm tabular-nums bg-white"
                      />
                    </label>
                    <div className="flex h-9 items-center justify-center sm:col-span-1 sm:mb-0.5">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={t('invoices.removeLine')}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100/50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-500">{t('invoices.total')}</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {total.toLocaleString(locNum, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl">
              <button type="button" onClick={() => setModal(null)} className="da-btn-secondary !px-5 !py-2.5">
                {t('common.cancel')}
              </button>
              <button type="button" disabled={busy} onClick={() => void submit()}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal}
    </ListPageLayout>
  )
}
