import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, isToday } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import type { Patient } from '@/types/clinical'
import { listPatients } from '@/services/dbService'
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

function getAge(dobStr?: string | null): number | null {
  if (!dobStr) return null
  try {
    const birth = new Date(dobStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 0 && age < 130 ? age : null
  } catch {
    return null
  }
}

function getInitials(first: string, last: string): string {
  const f = (first || '').trim().charAt(0)
  const l = (last || '').trim().charAt(0)
  return `${f}${l}`.toUpperCase() || '؟'
}

export function PatientsPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const loc = isAr ? arSA : enUS
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today')
  const [rows, setRows] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPatients(q.trim() || undefined)
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 200)
    return () => window.clearTimeout(id)
  }, [load])

  const todayCount = useMemo(
    () => rows.filter((p) => (p.created_at ? isToday(parseISO(p.created_at)) : false)).length,
    [rows],
  )

  const filteredRows = rows.filter((p) => {
    if (activeTab === 'today') {
      return p.created_at ? isToday(parseISO(p.created_at)) : false
    }

    if (dateFrom || dateTo) {
      if (!p.created_at) return false
      const dateStr = p.created_at.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
    }

    return true
  })

  return (
    <ListPageLayout>
      {/* ─── Modern List Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0284c7)',
              boxShadow: '0 4px 12px var(--color-primary-glow, rgba(13, 148, 136, 0.25))',
            }}
          >
            <Users className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t('patients.title', isAr ? 'سجل المرضى' : 'Patient Records')}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? `إجمالي ${rows.length} ملف مريض مسجل بالعيادة`
                : `${rows.length} total registered patient profiles`}
            </p>
          </div>
        </div>

        {/* Action button & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="flex rounded-2xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                activeTab === 'today'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{isAr ? 'مسجلي اليوم' : "Today's"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'today'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {todayCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{isAr ? 'جميع المرضى' : 'All Patients'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'all'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {rows.length}
              </span>
            </button>
          </div>

          {/* New Patient Button */}
          <Link
            to="/patients/new"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] no-underline"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
              boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
            }}
          >
            <Plus className="size-4" />
            <span>{t('patients.new', isAr ? 'مريض جديد' : 'New Patient')}</span>
          </Link>
        </div>
      </ListPageHeader>

      {/* ─── Search & Date Range Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(
                'patients.searchPlaceholder',
                isAr ? 'بحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...',
              )}
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

          {/* Date Range Filters (for 'all' tab) */}
          {activeTab === 'all' && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-500">
                <Filter className="size-3.5 text-slate-400" />
                {isAr ? 'الفترة:' : 'Period:'}
              </span>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 py-1 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'من' : 'From'}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 py-1 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'إلى' : 'To'}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 outline-none"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  {isAr ? 'إلغاء الفلتر' : 'Reset'}
                </button>
              )}
            </div>
          )}
        </div>
      </ListPageToolbar>

      {error ? <div className="list-page-error">{error}</div> : null}

      {/* ─── Mobile Cards View ─── */}
      <MobileCardList>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-50" />
                </div>
              </div>
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={UserRound}>
            <p className="text-sm font-semibold text-slate-700">
              {activeTab === 'today'
                ? isAr
                  ? 'لا يوجد مرضى مسجلين اليوم'
                  : 'No patients registered today'
                : t('patients.empty', isAr ? 'لا يوجد مرضى مطابقين' : 'No matching patients')}
            </p>
            <Link
              to="/patients/new"
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
            >
              <Plus className="size-3.5" />
              {isAr ? 'إضافة مريض جديد الآن' : 'Add new patient now'}
            </Link>
          </MobileEmptyState>
        ) : (
          filteredRows.map((p) => {
            const age = getAge(p.dob)
            const initials = getInitials(p.first_name, p.last_name)
            return (
              <MobileCard key={p.id}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-2xs"
                    style={{
                      background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">
                      {p.first_name} {p.last_name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {p.phone ? (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Phone className="size-3 text-slate-400" />
                          {p.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {age != null && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                          {age} {isAr ? 'سنة' : 'yrs'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <MobileCardActions>
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-teal-200/80 bg-teal-50/60 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-2xs transition-all hover:bg-teal-100 active:scale-95"
                  >
                    <span>{t('patients.open', isAr ? 'فتح الملف' : 'Open')}</span>
                    {isAr ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
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
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('patients.colName', isAr ? 'المريض' : 'Patient')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('patients.colPhone', isAr ? 'رقم الهاتف' : 'Phone')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('patients.colDob', isAr ? 'تاريخ الميلاد / العمر' : 'DOB / Age')}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {t('patients.colGender', isAr ? 'الجنس' : 'Gender')}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {t('patients.colActions', isAr ? 'إجراءات' : 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="mx-auto h-7 w-20 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <UserRound className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {activeTab === 'today'
                        ? isAr
                          ? 'لا يوجد مرضى مسجلين اليوم'
                          : 'No patients registered today'
                        : t('patients.empty', isAr ? 'لا يوجد مرضى مطابقين للبحث' : 'No matching patients')}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {isAr
                        ? 'يمكنك إضافة مريض جديد وسيبدأ سجله الطبي بالظهور هنا وفي كافة أقسام العيادة.'
                        : 'Add a new patient to build their dental record, treatments, and appointments.'}
                    </p>
                    <Link
                      to="/patients/new"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 no-underline shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'إضافة مريض جديد الآن' : 'Add New Patient'}
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((p) => {
                const age = getAge(p.dob)
                const initials = getInitials(p.first_name, p.last_name)
                return (
                  <tr
                    key={p.id}
                    className="group transition-colors duration-150 hover:bg-teal-50/20"
                  >
                    {/* Patient Name with Avatar */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-9.5 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white shadow-2xs transition-transform duration-200 group-hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0284c7)',
                          }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: #{p.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-3.5">
                      {p.phone ? (
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Phone className="size-3 text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* DOB / Age */}
                    <td className="px-6 py-3.5">
                      {p.dob ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">
                            {format(parseISO(p.dob), 'PP', { locale: loc })}
                          </span>
                          {age != null && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {age} {isAr ? 'سنة' : 'yrs'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Gender */}
                    <td className="px-6 py-3.5">
                      {p.gender ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            p.gender === 'female'
                              ? 'border border-pink-200/80 bg-pink-50 text-pink-700'
                              : 'border border-blue-200/80 bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t(`patients.gender.${p.gender}`)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="px-6 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 active:scale-95"
                      >
                        <span>{t('patients.open', isAr ? 'الملف الطبي' : 'Record')}</span>
                        {isAr ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DesktopTablePane>
    </ListPageLayout>
  )
}
