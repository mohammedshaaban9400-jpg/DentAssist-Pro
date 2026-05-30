import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, endOfWeek, parseISO, startOfWeek, isToday } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { Activity, Plus, Search, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import type { Appointment, DueWhatsAppReminder, Patient } from '@/types/clinical'
import { buildWhatsAppAppUrl, buildWhatsAppUrl, digitsForWhatsApp } from '@/lib/waPhone'
import {
  DesktopTablePane,
  ListPageBand,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
  MobileCard,
  MobileCardActions,
  MobileCardList,
  MobileEmptyState,
} from '@/components/layout/ListPageLayout'
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  listDueWhatsAppReminders,
  markAppointmentReminderSent,
  listPatients,
  openExternalUrl,
  updateAppointment,
} from '@/services/dbService'

type StatusKey = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

const STATUS_CONFIG: Record<StatusKey, { bg: string; text: string; ring: string }> = {
  scheduled:  { bg: '#f0f9ff', text: '#0369a1', ring: '#bae6fd' },
  completed:  { bg: '#f0fdf4', text: '#047857', ring: '#a7f3d0' },
  cancelled:  { bg: '#fff1f2', text: '#be123c', ring: '#fecdd3' },
  no_show:    { bg: '#f8fafc', text: '#475569', ring: '#e2e8f0' },
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AppointmentsPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const loc = isAr ? arSA : enUS
  const pushToast = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()
  
  const [anchor, setAnchor] = useState(() => new Date())
  const fromIso = useMemo(() => startOfWeek(anchor, { weekStartsOn: 6 }).toISOString(), [anchor])
  const toIso = useMemo(() => endOfWeek(anchor, { weekStartsOn: 6 }).toISOString(), [anchor])

  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [patientId, setPatientId] = useState<number>(0)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [status, setStatus] = useState('scheduled')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [dueReminders, setDueReminders] = useState<DueWhatsAppReminder[]>([])
  const [sendingReminderKey, setSendingReminderKey] = useState<string | null>(null)
  const [sendingManualWaId, setSendingManualWaId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, p] = await Promise.all([listAppointments(fromIso, toIso), listPatients()])
      setRows(a)
      setPatients(p)
      setDueReminders(await listDueWhatsAppReminders(new Date().toISOString()))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [fromIso, toIso])

  useEffect(() => { void load() }, [load])

  const openCreate = () => {
    setModal('create'); setEditId(null)
    setPatientId(patients[0]?.id ?? 0)
    const s = new Date(); s.setMinutes(0, 0, 0)
    const e = new Date(s.getTime() + 30 * 60 * 1000)
    setStartTime(toLocalInput(s)); setEndTime(toLocalInput(e))
    setStatus('scheduled'); setNotes('')
  }

  const openEdit = (a: Appointment) => {
    setModal('edit'); setEditId(a.id); setPatientId(a.patient_id)
    setStartTime(toLocalInput(parseISO(a.start_time)))
    setEndTime(toLocalInput(parseISO(a.end_time)))
    setStatus(a.status); setNotes(a.notes ?? '')
  }

  const submit = async () => {
    if (!patientId) { setError(t('appointments.needPatient')); return }
    setBusy(true); setError(null)
    try {
      const st = new Date(startTime).toISOString()
      const en = new Date(endTime).toISOString()
      if (modal === 'create') {
        await createAppointment({ patientId, startTime: st, endTime: en, status, notes: notes.trim() || null })
      } else if (modal === 'edit' && editId != null) {
        await updateAppointment(editId, { patientId, startTime: st, endTime: en, status, notes: notes.trim() || null })
      }
      setModal(null); await load()
      pushToast(t('common.saved'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const remove = async (id: number) => {
    if (!await confirm(t('appointments.confirmDelete'))) return
    setBusy(true)
    try { await deleteAppointment(id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const weekLabel = `${format(parseISO(fromIso), 'PP', { locale: loc })} — ${format(parseISO(toIso), 'PP', { locale: loc })}`
  const isCurrentWeek = (() => {
    const now = new Date()
    const ws = startOfWeek(now, { weekStartsOn: 6 })
    return ws.toDateString() === startOfWeek(anchor, { weekStartsOn: 6 }).toDateString()
  })()

  // Filter rows based on search query
  const filteredRows = rows.filter((r) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      r.patient_first_name.toLowerCase().includes(s) ||
      r.patient_last_name.toLowerCase().includes(s) ||
      (r.notes && r.notes.toLowerCase().includes(s))
    )
  })

  const sendWhatsAppReminder = async (row: DueWhatsAppReminder) => {
    const digits = digitsForWhatsApp(row.patient_phone)
    if (!digits) {
      pushToast(isAr ? 'رقم الهاتف غير صالح لواتساب.' : 'Invalid WhatsApp phone number.', 'error')
      return
    }
    const dt = parseISO(row.start_time)
    const message = t('appointments.waReminderBody', {
      name: row.patient_name,
      date: format(dt, 'PP', { locale: loc }),
      time: format(dt, 'p', { locale: loc }),
      type: row.reminder_type,
    })
    const sendKey = `${row.appointment_id}-${row.reminder_type}`
    setSendingReminderKey(sendKey)
    try {
      // Prefer https://wa.me — works reliably on Windows; whatsapp:// is fallback for desktop app protocol.
      const waWeb = buildWhatsAppUrl(digits, message)
      const waApp = buildWhatsAppAppUrl(digits, message)
      let opened = await openExternalUrl(waWeb)
      if (!opened) opened = await openExternalUrl(waApp)
      if (!opened) {
        pushToast(
          isAr ? 'تعذر فتح واتساب. تأكد من تثبيت واتساب أو المتصفح الافتراضي.' : 'Could not open WhatsApp. Check WhatsApp or your default browser.',
          'error',
        )
        return
      }
      await markAppointmentReminderSent(row.appointment_id, row.reminder_type)
      setDueReminders((prev) =>
        prev.filter(
          (x) => !(x.appointment_id === row.appointment_id && x.reminder_type === row.reminder_type),
        ),
      )
      pushToast(isAr ? 'تم فتح واتساب ووضع علامة إرسال التذكير.' : 'WhatsApp opened and reminder marked sent.', 'success')
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setSendingReminderKey(null)
    }
  }

  /** Opens WhatsApp for any scheduled row with a phone (does not mark 24h/2h reminder rows in DB). */
  const sendManualWhatsAppForAppointment = async (a: Appointment) => {
    if (a.status !== 'scheduled') return
    const phone = a.patient_phone?.trim()
    if (!phone) {
      pushToast(isAr ? 'لا يوجد رقم هاتف لهذا المريض.' : 'No phone number for this patient.', 'error')
      return
    }
    const digits = digitsForWhatsApp(phone)
    if (!digits) {
      pushToast(isAr ? 'رقم الهاتف غير صالح لواتساب.' : 'Invalid WhatsApp phone number.', 'error')
      return
    }
    const dt = parseISO(a.start_time)
    const name = `${a.patient_first_name} ${a.patient_last_name}`.trim()
    const message = t('appointments.waReminderBody', {
      name,
      date: format(dt, 'PP', { locale: loc }),
      time: format(dt, 'p', { locale: loc }),
      type: '',
    })
    setSendingManualWaId(a.id)
    try {
      const waWeb = buildWhatsAppUrl(digits, message)
      const waApp = buildWhatsAppAppUrl(digits, message)
      let opened = await openExternalUrl(waWeb)
      if (!opened) opened = await openExternalUrl(waApp)
      if (!opened) {
        pushToast(
          isAr ? 'تعذر فتح واتساب. تأكد من تثبيت واتساب أو المتصفح الافتراضي.' : 'Could not open WhatsApp. Check WhatsApp or your default browser.',
          'error',
        )
        return
      }
      pushToast(isAr ? 'تم فتح واتساب.' : 'WhatsApp opened.', 'success')
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setSendingManualWaId(null)
    }
  }

  return (
    <ListPageLayout>
      {/* Header */}
      <ListPageHeader>
        <h1>
          <Activity className="size-6 text-teal-600" />
          {isAr ? 'العمليات اليومية' : 'Daily Operations'}
        </h1>
        
        {/* Week navigator */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setAnchor((d) => new Date(d.getTime() - 7 * 86400000))}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-200 text-slate-600 transition"
            aria-label={t('appointments.prevWeek')}
          >
            <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1 sm:min-w-[200px] sm:px-2">
            <CalendarDays className="size-4 text-teal-500" />
            <span className="text-xs font-bold text-slate-700">{weekLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnchor((d) => new Date(d.getTime() + 7 * 86400000))}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-200 text-slate-600 transition"
            aria-label={t('appointments.nextWeek')}
          >
            <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setAnchor(new Date())}
              className="hidden sm:block ms-2 px-2 py-1 text-[10px] font-bold rounded bg-teal-100 text-teal-800"
            >
              {isAr ? 'هذا الأسبوع' : 'This week'}
            </button>
          )}
        </div>
      </ListPageHeader>

      <ListPageToolbar>
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? 'بحث (المريض / الملاحظات)...' : 'Search (Patient / Notes)...'}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            disabled={patients.length === 0}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
          >
            <Plus className="size-4" />
            {isAr ? 'إضافة' : 'Add'}
          </button>
        </div>
      </ListPageToolbar>

      {/* Due WhatsApp reminders */}
      <ListPageBand className="bg-emerald-50/40">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="size-4 text-emerald-700" />
          <p className="text-sm font-semibold text-emerald-900">
            {isAr ? 'تذكيرات واتساب المستحقة الآن' : 'Due WhatsApp reminders now'}
          </p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
            {dueReminders.length}
          </span>
        </div>
        {dueReminders.length === 0 ? (
          <p className="text-xs text-emerald-800/90">
            {isAr
              ? 'لا توجد تذكيرات آلية مستحقة الآن (نافذة ~24س: من 22 إلى 26 ساعة قبل الموعد، ونافذة ~2س: من 1 إلى 3 ساعات قبله). يمكنك دائماً إرسال واتساب من زر الرسالة في عمود الإجراءات بجانب كل موعد مجدول.'
              : 'No automatic reminder slots right now (≈24h band: 22–26h before start; ≈2h band: 1–3h before). Use the message button in each scheduled row to open WhatsApp anytime.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dueReminders.map((r) => {
              const key = `${r.appointment_id}-${r.reminder_type}`
              return (
                <button
                  key={key}
                  type="button"
                  disabled={sendingReminderKey === key}
                  onClick={() => void sendWhatsAppReminder(r)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
                >
                  <MessageCircle className="size-3.5" />
                  <span>{r.patient_name}</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px]">
                    {r.reminder_type}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </ListPageBand>

      {error ? (
        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={CalendarDays}>
            {t('appointments.empty', isAr ? 'لا توجد عمليات/مواعيد' : 'No operations')}
          </MobileEmptyState>
        ) : (
          filteredRows.map((a) => {
            const statusLabel = ['scheduled', 'completed', 'cancelled', 'no_show'].includes(a.status)
              ? t(`appointments.status.${a.status}` as 'appointments.status.scheduled')
              : a.status
            const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
            const d = parseISO(a.start_time)
            return (
              <MobileCard key={a.id} className={isToday(d) ? 'ring-1 ring-teal-200' : ''}>
                <p className="text-xs font-semibold text-slate-600">{format(d, 'PPp', { locale: loc })}</p>
                <p className="mt-1 font-semibold text-slate-900">{a.patient_first_name} {a.patient_last_name}</p>
                <span
                  className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: st.bg, color: st.text, boxShadow: `0 0 0 1px ${st.ring}` }}
                >
                  {statusLabel}
                </span>
                <MobileCardActions>
                  <button type="button" onClick={() => openEdit(a)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => void remove(a.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600">
                    <Trash2 className="size-4" />
                  </button>
                </MobileCardActions>
              </MobileCard>
            )
          })
        )}
      </MobileCardList>

      <DesktopTablePane>
        <table className="w-full text-sm text-slate-600 min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="w-12 px-6 py-3 text-center font-semibold text-slate-500 border-e border-slate-100">#</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{t('appointments.colPatient')}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500 border-e border-slate-100">{t('appointments.colStatus')}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{t('appointments.fieldNotes')}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500">{t('appointments.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-center"><div className="h-4 w-6 mx-auto animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-6 w-20 mx-auto animate-pulse rounded-full bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-48 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-6 w-16 mx-auto animate-pulse rounded bg-slate-100" /></td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <CalendarDays className="size-10 text-slate-300" />
                    {t('appointments.empty', isAr ? 'لا توجد عمليات/مواعيد' : 'No operations')}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((a, i) => {
                const statusLabel = ['scheduled', 'completed', 'cancelled', 'no_show'].includes(a.status)
                  ? t(`appointments.status.${a.status}` as 'appointments.status.scheduled')
                  : a.status
                const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
                
                const d = parseISO(a.start_time)
                const isTodayDate = isToday(d)

                return (
                  <tr key={a.id} className={`transition-colors hover:bg-slate-50/50 ${isTodayDate ? 'bg-teal-50/10' : ''}`}>
                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">{i + 1}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {format(d, 'PPp', { locale: loc })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {a.patient_first_name} {a.patient_last_name}
                      {a.patient_phone ? (
                        <span className="block text-xs font-mono text-slate-500">{a.patient_phone}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: st.bg, color: st.text, boxShadow: `0 0 0 1px ${st.ring}` }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" title={a.notes ?? ''}>
                      {a.notes || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {a.status === 'scheduled' && a.patient_phone?.trim() ? (
                          <button
                            type="button"
                            onClick={() => void sendManualWhatsAppForAppointment(a)}
                            disabled={sendingManualWaId === a.id}
                            className="flex size-7 cursor-pointer items-center justify-center rounded bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            title={isAr ? 'فتح واتساب (تذكير يدوي)' : 'Open WhatsApp (manual reminder)'}
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded bg-slate-100 text-slate-500 transition hover:bg-teal-100 hover:text-teal-700"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          disabled={busy}
                          className="flex size-7 cursor-pointer items-center justify-center rounded bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                          title={isAr ? 'حذف' : 'Delete'}
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

      {/* Modal */}
      {modal ? (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-lg">
            <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-bold text-slate-900">
                {modal === 'create' ? t('appointments.modalCreate') : t('appointments.modalEdit')}
              </h2>
            </div>
            <div className="da-mobile-sheet-body thin-scrollbar space-y-5 p-4 sm:p-6">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {t('appointments.fieldPatient')}
                <select value={patientId || ''} onChange={(e) => setPatientId(Number(e.target.value))} className="da-input cursor-pointer bg-white">
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {t('appointments.fieldStart')}
                  <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="da-input cursor-text tabular-nums" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {t('appointments.fieldEnd')}
                  <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="da-input cursor-text tabular-nums" />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {t('appointments.fieldStatus')}
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="da-input cursor-pointer bg-white">
                  <option value="scheduled">{t('appointments.status.scheduled')}</option>
                  <option value="completed">{t('appointments.status.completed')}</option>
                  <option value="cancelled">{t('appointments.status.cancelled')}</option>
                  <option value="no_show">{t('appointments.status.no_show')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {t('appointments.fieldNotes')}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="da-input min-h-[5rem] cursor-text resize-none" />
              </label>
            </div>
            <div className="da-mobile-sheet-footer">
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
