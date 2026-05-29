import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Calendar, Download, Search } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { getDailyReports, type ReportRow } from '@/services/dbService'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  DesktopTableScroll,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
} from '@/components/layout/ListPageLayout'

export function ReportsPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency, exchangeRate } = useSettingsStore()

  const [reports, setReports] = useState<ReportRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDailyReports().then(data => {
      setReports(data)
      setLoading(false)
    }).catch(console.error)
  }, [])

  const filtered = reports.filter(r => r.date.includes(q))

  const printRef = useRef<HTMLDivElement>(null)
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Daily-Profit-Reports',
  })

  // helper for currency
  const formatMoney = (amount: number) => {
    if (currency === 'SYP' || currency === 'IQD') return amount.toLocaleString()
    return (amount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <ListPageLayout>
      {/* Header */}
      <ListPageHeader>
        <h1>
          <BarChart3 className="size-6 text-teal-600" />
          {isAr ? 'التقارير' : 'Reports'}
        </h1>
        <button
          type="button"
          onClick={() => handlePrint()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:text-teal-700 active:scale-95"
        >
          <Download className="size-4" />
          {isAr ? 'تصدير PDF' : 'Export PDF'}
        </button>
      </ListPageHeader>

      <ListPageToolbar>
        <h2 className="font-semibold text-slate-800">{isAr ? 'تقارير الأرباح اليومية' : 'Daily Profit Reports'}</h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            type="date"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </ListPageToolbar>

      {/* Table Section (printable) */}
      <DesktopTableScroll ref={printRef}>
        {/* Printable Header only visible during printing */}
        <style type="text/css" media="print">
          {`@media print { .print-title { display: block !important; padding: 20px; font-size: 24px; font-weight: bold; text-align: center; } }`}
        </style>
        <div className="print-title hidden">
          {isAr ? 'تقارير الأرباح اليومية' : 'Daily Profit Reports'}
        </div>
        
        <table className="w-full text-sm text-slate-600 min-w-[800px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'رقم التقرير' : 'ID'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'عدد المرضى' : 'Patients'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'الإيرادات' : 'Income'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المصروفات' : 'Expenses'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500">{isAr ? 'الصافي' : 'Net Profit'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={6} className="p-6 text-center">{isAr ? 'جاري التحميل...' : 'Loading...'}</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Calendar className="size-10 text-slate-300" />
                    {isAr ? 'لا توجد تقارير لهذا التاريخ' : 'No reports for this date'}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{r.id}</td>
                  <td className="px-6 py-4 font-mono text-slate-900">{r.date}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{r.patientsCount}</td>
                  <td className="px-6 py-4 font-bold tabular-nums text-teal-600">
                    {formatMoney(r.income)} <span className="text-xs text-slate-400">{currency}</span>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums text-rose-600">
                    {formatMoney(r.expense)} <span className="text-xs text-slate-400">{currency}</span>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums text-blue-600">
                    {formatMoney(r.profit)} <span className="text-xs text-slate-400">{currency}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTableScroll>
    </ListPageLayout>
  )
}