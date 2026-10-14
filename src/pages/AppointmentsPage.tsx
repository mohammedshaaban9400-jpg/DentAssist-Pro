import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, endOfWeek, parseISO, startOfWeek, isToday } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import {
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
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

const STATUS_CONFIG: Record<
  StatusKey,
  { bg: string; text: string; ring: string; dot: string; icon: React.ElementType }
> = {
  scheduled: {
    bg: '#eff6ff',
    text: '#1d4ed8',
    ring: '#bfdbfe',
    dot: '#3b82f6',
    icon: Clock,
  },
  completed: {
    bg: '#f0fdf4',
    text: '#15803d',
    ring: '#bbf7d0',
    dot: '#22c55e',
    icon: CheckCircle2,
  },
  cancelled: {
    bg: '#fff1f2',
    text: '#be123c',
    ring: '#fecdd3',
    dot: '#f43f5e',
    icon: XCircle,
  },
  no_show: {
    bg: '#f8fafc',
    text: '#475569',
    ring: '#e2e8f0',
    dot: '#94a3b8',
    icon: Clock,
  },
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getInitials(first?: string, last?: string): string {
  const f = (first || '').trim().charAt(0)
  const l = (last || '').trim().charAt(0)
  return `${f}${l}`.toUpperCase() || '؟'
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
  const [statusFilter, setStatusFilter] = useState<string>('all')
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

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setModal('create')
    setEditId(null)
    setPatientId(patients[0]?.id ?? 0)
    const s = new Date()
    s.setMinutes(0, 0, 0)
    const e = new Date(s.getTime() + 30 * 60 * 1000)
    setStartTime(toLocalInput(s))
    setEndTime(toLocalInput(e))
    setStatus('scheduled')
    setNotes('')
  }

  const openEdit = (a: Appointment) => {
    setModal('edit')
    setEditId(a.id)
    setPatientId(a.patient_id)
    setStartTime(toLocalInput(parseISO(a.start_time)))
    setEndTime(toLocalInput(parseISO(a.end_time)))
    setStatus(a.status)
    setNotes(a.notes ?? '')
  }

  const submit = async () => {
    if (!patientId) {
      setError(t('appointments.needPatient'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const st = new Date(startTime).toISOString()
      const en = new Date(endTime).toISOString()
      if (modal === 'create') {
        await createAppointment({
          patientId,
          startTime: st,
          endTime: en,
          status,
          notes: notes.trim() || null,
        })
      } else if (modal === 'edit' && editId != null) {
        await updateAppointment(editId, {
          patientId,
          startTime: st,
          endTime: en,
          status,
          notes: notes.trim() || null,
        })
      }
      setModal(null)
      await load()
      pushToast(t('common.saved'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (!(await confirm(t('appointments.confirmDelete')))) return
    setBusy(true)
    try {
      await deleteAppointment(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const weekLabel = `${format(parseISO(fromIso), 'PP', { locale: loc })} — ${format(parseISO(toIso), 'PP', { locale: loc })}`
  const isCurrentWeek = (() => {
    const now = new Date()
    const ws = startOfWeek(now, { weekStartsOn: 6 })
    return ws.toDateString() === startOfWeek(anchor, { weekStartsOn: 6 }).toDateString()
  })()

  // Filter rows based on search query & status filter
  const filteredRows = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
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
      pushToast(
        isAr ? 'رقم الهاتف غير صالح لواتساب.' : 'Invalid WhatsApp phone number.',
        'error',
      )
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
      const waWeb = buildWhatsAppUrl(digits, message)
      const waApp = buildWhatsAppAppUrl(digits, message)
      let opened = await openExternalUrl(waWeb)
      if (!opened) opened = await openExternalUrl(waApp)
      if (!opened) {
        pushToast(
          isAr
            ? 'تعذر فتح واتساب. تأكد من تثبيت واتساب أو المتصفح الافتراضي.'
            : 'Could not open WhatsApp. Check WhatsApp or your default browser.',
          'error',
        )
        return
      }
      await markAppointmentReminderSent(row.appointment_id, row.reminder_type)
      setDueReminders((prev) =>
        prev.filter(
          (x) =>
            !(
              x.appointment_id === row.appointment_id &&
              x.reminder_type === row.reminder_type
            ),
        ),
      )
      pushToast(
        isAr
          ? 'تم فتح واتساب ووضع علامة إرسال التذكير.'
          : 'WhatsApp opened and reminder marked sent.',
        'success',
      )
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setSendingReminderKey(null)
    }
  }

  const sendManualWhatsAppForAppointment = async (a: Appointment) => {
    if (a.status !== 'scheduled') return
    const phone = a.patient_phone?.trim()
    if (!phone) {
      pushToast(
        isAr ? 'لا يوجد رقم هاتف لهذا المريض.' : 'No phone number for this patient.',
        'error',
      )
      return
    }
    const digits = digitsForWhatsApp(phone)
    if (!digits) {
      pushToast(
        isAr ? 'رقم الهاتف غير صالح لواتساب.' : 'Invalid WhatsApp phone number.',
        'error',
      )
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
          isAr
            ? 'تعذر فتح واتساب. تأكد من تثبيت واتساب أو المتصفح الافتراضي.'
            : 'Could not open WhatsApp. Check WhatsApp or your default browser.',
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
      {/* ─── Header with Calendar & Navigator ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #2563eb)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <CalendarCheck2 className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'جدول المواعيد والعمليات' : 'Appointments & Operations'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? `${filteredRows.length} موعد مجدول في نطاق الأسبوع المحدد`
                : `${filteredRows.length} scheduled sessions in selected week`}
            </p>
          </div>
        </div>

        {/* Week Navigator & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Navigator Pill */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setAnchor((d) => new Date(d.getTime() - 7 * 86400000))}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              aria-label={t('appointments.prevWeek')}
            >
              <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-800">
              <CalendarDays className="size-3.5 text-teal-600" />
              <span>{weekLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnchor((d) => new Date(d.getTime() + 7 * 86400000))}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              aria-label={t('appointments.nextWeek')}
            >
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className="cursor-pointer rounded-xl bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 transition hover:bg-teal-100"
              >
                {isAr ? 'الأسبوع الحالي' : 'Current'}
              </button>
            )}
          </div>

          {/* New Appointment Button */}
          <button
            type="button"
            onClick={openCreate}
            disabled={patients.length === 0}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
              boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
            }}
          >
            <Plus className="size-4" />
            <span>{isAr ? 'حجز موعد جديد' : 'New Appointment'}</span>
          </button>
        </div>
      </ListPageHeader>

      {/* ─── WhatsApp Due Reminders Banner ─── */}
      {dueReminders.length > 0 ? (
        <ListPageBand className="bg-emerald-50/60 border-emerald-100/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-2xs">
                <MessageCircle className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-emerald-950">
                    {isAr ? 'تذكيرات واتساب المستحقة للإرسال الآن' : 'Due WhatsApp Reminders'}
                  </p>
                  <span className="rounded-full bg-emerald-200/70 px-2 py-0.2 text-[10px] font-extrabold text-emerald-900">
                    {dueReminders.length}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80">
                  {isAr
                    ? 'اضغط على أي زر أدناه لإرسال رسالة التذكير للمريض مباشرة وتأكيد الحضور'
                    : 'Click any patient below to fire a customized reminder notification'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {dueReminders.map((r) => {
                const key = `${r.appointment_id}-${r.reminder_type}`
                const isBusy = sendingReminderKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void sendWhatsAppReminder(r)}
                    disabled={isBusy}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    <span>{r.patient_name}</span>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      ({r.reminder_type === '24h' ? '24h' : '2h'})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </ListPageBand>
      ) : null}

      {/* ─── Search and Status Filters Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? 'بحث باسم المريض أو الملاحظات...' : 'Search patient or notes...'}
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

          {/* Status Filter Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60">
            {[
              { id: 'all', label: isAr ? 'الكل' : 'All' },
              { id: 'scheduled', label: isAr ? 'مجدول' : 'Scheduled' },
              { id: 'completed', label: isAr ? 'مكتمل' : 'Completed' },
              { id: 'cancelled', label: isAr ? 'ملغي' : 'Cancelled' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-bold transition-all duration-150 ${
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
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={CalendarDays}>
            <p className="text-sm font-semibold text-slate-700">
              {t('appointments.empty', isAr ? 'لا توجد مواعيد في هذا النطاق' : 'No appointments')}
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
            >
              <Plus className="size-3.5" />
              {isAr ? 'إضافة موعد جديد' : 'Add appointment'}
            </button>
          </MobileEmptyState>
        ) : (
          filteredRows.map((a) => {
            const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
            const d = parseISO(a.start_time)
            const isTodayDate = isToday(d)
            const initials = getInitials(a.patient_first_name, a.patient_last_name)
            const StatusIcon = st.icon

            return (
              <MobileCard
                key={a.id}
                className={isTodayDate ? 'ring-2 ring-teal-500/30 border-teal-200' : ''}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #2563eb)' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {a.patient_first_name} {a.patient_last_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="size-3 text-slate-400" />
                        <span className="font-medium">{format(d, 'PPp', { locale: loc })}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{
                      background: st.bg,
                      color: st.text,
                      boxShadow: `0 0 0 1px ${st.ring}`,
                    }}
                  >
                    <StatusIcon className="size-3" />
                    <span>{t(`appointments.status.${a.status}` as any) || a.status}</span>
                  </span>
                </div>

                {a.notes ? (
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    {a.notes}
                  </p>
                ) : null}

                <MobileCardActions>
                  {a.status === 'scheduled' && a.patient_phone?.trim() ? (
                    <button
                      type="button"
                      onClick={() => void sendManualWhatsAppForAppointment(a)}
                      disabled={sendingManualWaId === a.id}
                      className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
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
        <table className="min-w-[900px] w-full text-xs text-slate-600">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-slate-600 backdrop-blur-xs">
            <tr>
              <th className="w-12 px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-400">#</th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'التاريخ والوقت' : 'Date & Time'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('appointments.colPatient')}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {t('appointments.colStatus')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('appointments.fieldNotes')}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {t('appointments.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-6 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-20 mx-auto animate-pulse rounded-full bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
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
                      <CalendarDays className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {t('appointments.empty', isAr ? 'لا توجد مواعيد في هذا النطاق' : 'No appointments')}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {isAr
                        ? 'يمكنك حجز موعد جديد وتحديد وقته لتبدأ التنبيهات بالظهور في لوحة التحكم وجدول العيادة.'
                        : 'Schedule sessions to manage your clinic queue and patient bookings.'}
                    </p>
                    <button
                      type="button"
                      onClick={openCreate}
                      disabled={patients.length === 0}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'حجز موعد الآن' : 'Schedule Appointment'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((a, i) => {
                const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
                const d = parseISO(a.start_time)
                const isTodayDate = isToday(d)
                const initials = getInitials(a.patient_first_name, a.patient_last_name)
                const StatusIcon = st.icon

                return (
                  <tr
                    key={a.id}
                    className={`group transition-colors duration-150 ${
                      isTodayDate ? 'bg-teal-50/25 hover:bg-teal-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-6 py-3.5 text-center font-mono text-slate-400">
                      {i + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-teal-600" />
                        <span className="font-bold text-slate-800">
                          {format(d, 'PPp', { locale: loc })}
                        </span>
                        {isTodayDate && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.2 text-[10px] font-extrabold text-teal-800">
                            {isAr ? 'اليوم' : 'Today'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #2563eb)' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                            {a.patient_first_name} {a.patient_last_name}
                          </p>
                          {a.patient_phone ? (
                            <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                              <Phone className="size-2.5" />
                              <span>{a.patient_phone}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={{
                          background: st.bg,
                          color: st.text,
                          boxShadow: `0 0 0 1px ${st.ring}`,
                        }}
                      >
                        <StatusIcon className="size-3" />
                        <span>{t(`appointments.status.${a.status}` as any) || a.status}</span>
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-6 py-3.5 max-w-[220px] truncate" title={a.notes ?? ''}>
                      <span className="text-slate-500 font-medium">
                        {a.notes || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {a.status === 'scheduled' && a.patient_phone?.trim() ? (
                          <button
                            type="button"
                            onClick={() => void sendManualWhatsAppForAppointment(a)}
                            disabled={sendingManualWaId === a.id}
                            className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs transition hover:bg-emerald-100 disabled:opacity-50"
                            title={isAr ? 'فتح وتذكير عبر واتساب' : 'Open WhatsApp'}
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          disabled={busy}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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

      {/* ─── Modal Dialog for Create/Edit ─── */}
      {modal ? (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Calendar className="size-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modal === 'create'
                      ? t('appointments.modalCreate', isAr ? 'حجز موعد جديد' : 'New Appointment')
                      : t('appointments.modalEdit', isAr ? 'تعديل الموعد' : 'Edit Appointment')}
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
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{t('appointments.fieldPatient', isAr ? 'المريض' : 'Patient')}</span>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{t('appointments.fieldStart', isAr ? 'وقت البدء' : 'Start Time')}</span>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="da-input cursor-text tabular-nums text-xs font-semibold"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{t('appointments.fieldEnd', isAr ? 'وقت الانتهاء' : 'End Time')}</span>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="da-input cursor-text tabular-nums text-xs font-semibold"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{t('appointments.fieldStatus', isAr ? 'حالة الموعد' : 'Status')}</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="da-input cursor-pointer bg-white text-xs font-semibold"
                >
                  <option value="scheduled">{t('appointments.status.scheduled', isAr ? 'مجدول' : 'Scheduled')}</option>
                  <option value="completed">{t('appointments.status.completed', isAr ? 'مكتمل' : 'Completed')}</option>
                  <option value="cancelled">{t('appointments.status.cancelled', isAr ? 'ملغي' : 'Cancelled')}</option>
                  <option value="no_show">{t('appointments.status.no_show', isAr ? 'لم يحضر' : 'No Show')}</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{t('appointments.fieldNotes', isAr ? 'ملاحظات الجلسة / الإجراء المطلوب' : 'Notes')}</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="da-input min-h-[5rem] cursor-text resize-none text-xs"
                  placeholder={isAr ? 'مثال: جلسة حشو تجميلي للرحى العلوية...' : 'Optional treatment notes...'}
                />
              </label>
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
                <span>{t('common.save', isAr ? 'حفظ الموعد' : 'Save')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal}
    </ListPageLayout>
  )
}
