import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  Calendar,
  Download,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { getDailyReports, type ReportRow } from '@/services/dbService'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  DesktopTablePane,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
  MobileCard,
  MobileCardList,
  MobileEmptyState,
} from '@/components/layout/ListPageLayout'

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function ReportsPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()

  const [reports, setReports] = useState<ReportRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDailyReports()
      .then((data) => {
        setReports(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const currencySymbol = useMemo(() => {
    if (currency === 'SYP') return isAr ? 'ل.س' : 'SYP'
    if (currency === 'IQD') return isAr ? 'د.ع' : 'IQD'
    if (currency === 'USD') return '$'
    if (currency === 'EUR') return '€'
    if (currency === 'SAR') return isAr ? 'ر.س' : 'SAR'
    if (currency === 'AED') return isAr ? 'د.إ' : 'AED'
    return currency || ''
  }, [currency, isAr])

  const filtered = reports.filter((r) => r.date.includes(q))

  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Daily-Profit-Reports',
  })

  // Cumulative totals
  const totals = useMemo(() => {
    const totalIncome = filtered.reduce((s, r) => s + (r.income || 0), 0)
    const totalExpense = filtered.reduce((s, r) => s + (r.expense || 0), 0)
    const totalProfit = filtered.reduce((s, r) => s + (r.profit || 0), 0)
    const totalPatients = filtered.reduce((s, r) => s + (r.patientsCount || 0), 0)
    return { totalIncome, totalExpense, totalProfit, totalPatients }
  }, [filtered])

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
            <BarChart3 className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'التقارير المالية والأرباح اليومية' : 'Daily Profit & Financial Reports'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'تحليل الإيرادات والمصروفات وصافي العائد وتصدير الكشوفات المطبوعة'
                : 'Daily financial ledger breakdown, patient load, and PDF export'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handlePrint()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 active:scale-95"
        >
          <Download className="size-4 text-teal-600" />
          <span>{isAr ? 'طباعة / تصدير PDF' : 'Export PDF'}</span>
        </button>
      </ListPageHeader>

      {/* ─── 4 Summary KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:gap-4 sm:p-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shadow-2xs">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-extrabold text-teal-700 tabular-nums">
                {formatNumber(totals.totalIncome)}{' '}
                <span className="text-[11px] font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي الإيرادات' : 'Total Income'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-2xs">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-extrabold text-rose-700 tabular-nums">
                {formatNumber(totals.totalExpense)}{' '}
                <span className="text-[11px] font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي المصروفات' : 'Total Expenses'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
              <Wallet className="size-5" />
            </div>
            <div>
              <p
                className={`text-base sm:text-lg font-extrabold tabular-nums ${
                  totals.totalProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                }`}
              >
                {formatNumber(totals.totalProfit)}{' '}
                <span className="text-[11px] font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                {isAr ? 'صافي الأرباح' : 'Net Profit'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-extrabold text-indigo-700 tabular-nums">
                {totals.totalPatients}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                {isAr ? 'حالات المعاينة' : 'Total Patients'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-700">
            {isAr ? 'سجل التقارير اليومية المؤرشفة' : 'Daily Archived Reports'}
          </p>
          <div className="relative w-full max-w-xs">
            <Calendar className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
            <input
              type="date"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-2 ps-9 pe-9 text-xs font-medium text-slate-800 shadow-2xs outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
          <MobileEmptyState icon={Calendar}>
            <p className="text-sm font-semibold text-slate-700">
              {isAr ? 'لا توجد تقارير لهذا التاريخ' : 'No reports for this date'}
            </p>
          </MobileEmptyState>
        ) : (
          filtered.map((r) => (
            <MobileCard key={r.id}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-800">{r.date}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {r.patientsCount} {isAr ? 'مرضى' : 'patients'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">{isAr ? 'إيراد' : 'Income'}</p>
                  <p className="font-bold text-teal-700 tabular-nums">
                    {formatNumber(r.income)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{isAr ? 'مصروف' : 'Expense'}</p>
                  <p className="font-bold text-rose-600 tabular-nums">
                    {formatNumber(r.expense)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">{isAr ? 'الصافي' : 'Profit'}</p>
                  <p
                    className={`font-extrabold tabular-nums ${
                      r.profit >= 0 ? 'text-blue-700' : 'text-rose-600'
                    }`}
                  >
                    {formatNumber(r.profit)}
                  </p>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      {/* ─── Desktop Table & Printable Section ─── */}
      <DesktopTablePane ref={printRef}>
        <style type="text/css" media="print">
          {`@media print { 
            .print-header { display: block !important; padding: 24px; text-align: center; border-bottom: 2px solid #0d9488; } 
            body { background: white !important; }
          }`}
        </style>
        <div className="print-header hidden">
          <h2 className="text-xl font-bold text-slate-900">DentAssist Pro — تقارير الأرباح السريرية اليومية</h2>
          <p className="text-xs text-slate-500 mt-1">كشف مالي معتمد</p>
        </div>

        <table className="min-w-[850px] w-full text-xs text-slate-600">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-slate-600 backdrop-blur-xs">
            <tr>
              <th className="w-16 px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-400">
                #
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'التاريخ' : 'Date'}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'عدد المرضى' : 'Patients'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'الإيرادات اليومية' : 'Daily Income'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المصروفات التشغيلية' : 'Expenses'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'الصافي الفعلي' : 'Net Profit'}
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
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-4 w-12 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <BarChart3 className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {isAr ? 'لا توجد تقارير لهذا التاريخ' : 'No reports for this date'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="group transition-colors duration-150 hover:bg-teal-50/20"
                >
                  <td className="px-6 py-3.5 text-center font-mono font-bold text-slate-400">
                    #{r.id}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-slate-800 font-mono">
                    {r.date}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                      {r.patientsCount}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-extrabold tabular-nums text-teal-700 text-sm">
                    {formatNumber(r.income)}{' '}
                    <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                  </td>
                  <td className="px-6 py-3.5 font-extrabold tabular-nums text-rose-600 text-sm">
                    {formatNumber(r.expense)}{' '}
                    <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                  </td>
                  <td
                    className={`px-6 py-3.5 font-extrabold tabular-nums text-sm ${
                      r.profit >= 0 ? 'text-blue-700' : 'text-rose-600'
                    }`}
                  >
                    {r.profit >= 0 ? '+' : ''}
                    {formatNumber(r.profit)}{' '}
                    <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
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