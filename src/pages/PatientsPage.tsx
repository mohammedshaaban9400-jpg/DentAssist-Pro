import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, isToday } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { Plus, Search, UserRound, Users } from 'lucide-react'
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

  const filteredRows = rows.filter((p) => {
    if (activeTab === 'today') {
      return p.created_at ? isToday(parseISO(p.created_at)) : false
    }
    
    // date filtering
    if (dateFrom || dateTo) {
      if (!p.created_at) return false
      // simple lexicographical string compare works for YYYY-MM-DD
      const dateStr = p.created_at.slice(0, 10)
      if (dateFrom && dateStr < dateFrom) return false
      if (dateTo && dateStr > dateTo) return false
    }

    return true
  })

  return (
    <ListPageLayout>
      <ListPageHeader className="sm:items-start">
        <h1>
          <Users className="size-5 text-teal-600 sm:size-6" />
          {t('patients.title', isAr ? 'المرضى' : 'Patients')}
        </h1>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isAr ? 'مسجلي اليوم' : 'Today\'s Patients'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isAr ? 'داتا المرضى' : 'Patient Data'}
          </button>
        </div>
      </ListPageHeader>

      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('patients.searchPlaceholder', isAr ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...')}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          
          {/* Date Range (only for 'all' tab) */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium whitespace-nowrap">{isAr ? 'من:' : 'From:'}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <span className="font-medium whitespace-nowrap">{isAr ? 'إلى:' : 'To:'}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/patients/new"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm no-underline transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}
          >
            <Plus className="size-4" />
            {t('patients.new', isAr ? 'مريض جديد' : 'New Patient')}
          </Link>
        </div>

      </ListPageToolbar>

      {error ? <div className="list-page-error">{error}</div> : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={UserRound}>
            {activeTab === 'today'
              ? isAr ? 'لا يوجد مرضى مسجلين اليوم' : 'No patients registered today'
              : t('patients.empty', isAr ? 'لا يوجد مرضى' : 'No patients')}
          </MobileEmptyState>
        ) : (
          filteredRows.map((p) => (
            <MobileCard key={p.id}>
              <p className="font-semibold text-slate-900">
                {p.first_name} {p.last_name}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-600">{p.phone || '—'}</p>
              <p className="mt-2 text-xs text-slate-500">
                {p.dob ? format(parseISO(p.dob), 'PP', { locale: loc }) : '—'}
                {' · '}
                {p.gender ? t(`patients.gender.${p.gender}`) : '—'}
              </p>
              <MobileCardActions>
                <button
                  type="button"
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 active:scale-95"
                >
                  {t('patients.open', isAr ? 'فتح الملف' : 'Open')}
                </button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      <DesktopTablePane>
        <table className="min-w-[800px] w-full text-sm text-slate-600">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="border-e border-slate-100 px-6 py-3 text-start font-semibold text-slate-500">
                {t('patients.colName', isAr ? 'الاسم' : 'Name')}
              </th>
              <th className="border-e border-slate-100 px-6 py-3 text-start font-semibold text-slate-500">
                {t('patients.colPhone', isAr ? 'الهاتف' : 'Phone')}
              </th>
              <th className="border-e border-slate-100 px-6 py-3 text-start font-semibold text-slate-500">
                {t('patients.colDob', isAr ? 'تاريخ الميلاد' : 'DOB')}
              </th>
              <th className="border-e border-slate-100 px-6 py-3 text-start font-semibold text-slate-500">
                {t('patients.colGender', isAr ? 'الجنس' : 'Gender')}
              </th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500">
                {t('patients.colActions', isAr ? 'إجراءات' : 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-6 py-4 text-center"><div className="mx-auto h-8 w-20 animate-pulse rounded-lg bg-slate-100" /></td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <UserRound className="size-10 text-slate-300" />
                    {activeTab === 'today' 
                      ? (isAr ? 'لا يوجد مرضى مسجلين اليوم' : 'No patients registered today')
                      : t('patients.empty', isAr ? 'لا يوجد مرضى' : 'No patients')}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700">
                    {p.phone || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.dob ? format(parseISO(p.dob), 'PP', { locale: loc }) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.gender ? t(`patients.gender.${p.gender}`) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 active:scale-95"
                    >
                      {t('patients.open', isAr ? 'فتح الملف' : 'Open')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTablePane>
    </ListPageLayout>
  )
}
