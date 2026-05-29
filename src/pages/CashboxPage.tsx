import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Wallet, TrendingUp, TrendingDown, RefreshCcw, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  DesktopTableScroll,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
} from '@/components/layout/ListPageLayout'
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
  type TransactionRow,
} from '@/services/dbService'

export function CashboxPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()

  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [modal, setModal] = useState<boolean>(false)
  const [newTrx, setNewTrx] = useState({
    description: '',
    type: 'income',
    amount: '',
    currency: currency || 'SYP'
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTransactions(q.trim() || undefined)
      setTransactions(data)
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

  useEffect(() => {
    setNewTrx(prev => ({ ...prev, currency: currency || 'SYP' }))
  }, [currency])

  const handleAdd = async () => {
    if (!newTrx.description || !newTrx.amount) return
    const amt = parseFloat(newTrx.amount)
    if (isNaN(amt) || amt <= 0) return

    try {
      await createTransaction({
        date: new Date().toISOString().split('T')[0],
        description: newTrx.description.trim(),
        type: newTrx.type as 'income' | 'expense',
        amount: amt,
        currency: newTrx.currency
      })
      setModal(false)
      setNewTrx({ description: '', type: 'income', amount: '', currency: currency || 'SYP' })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الحركة؟' : 'Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpense

  return (
    <ListPageLayout>
      {/* Header */}
      <ListPageHeader>
        <h1>
          <Wallet className="size-6 text-teal-600" />
          {isAr ? 'الصندوق' : 'Cash Box'}
        </h1>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
        >
          <Plus className="size-4" />
          {isAr ? 'حركة جديدة' : 'New Transaction'}
        </button>
      </ListPageHeader>

      {/* KPI Cards */}
      <div className="list-page-kpi-grid">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {totalIncome.toLocaleString()} <span className="text-xs text-slate-500">{currency}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'إجمالي المقبوضات' : 'Total Income'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {totalExpense.toLocaleString()} <span className="text-xs text-slate-500">{currency}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'إجمالي المدفوعات' : 'Total Expenses'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RefreshCcw className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums" dir="ltr">
                {balance.toLocaleString()} <span className="text-xs text-slate-500">{currency}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">{isAr ? 'الرصيد الصافي' : 'Net Balance'}</p>
            </div>
          </div>
        </div>
      </div>

      <ListPageToolbar>
        <h2 className="font-semibold text-slate-800">{isAr ? 'سجل الحركات' : 'Transaction Log'}</h2>
        <div className="relative w-full max-w-xs">
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

      {/* Table Section */}
      <DesktopTableScroll>
        <table className="w-full text-sm text-slate-600 min-w-[800px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'رقم الحركة' : 'ID'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'التاريخ' : 'Date'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'البيان' : 'Description'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'النوع' : 'Type'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المبلغ' : 'Amount'}</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-500">{isAr ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Wallet className="size-10 text-slate-300" />
                    {isAr ? 'لا توجد حركات مسجلة' : 'No transactions recorded'}
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">{t.trx_id}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{t.date}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{t.description}</td>
                  <td className="px-6 py-4">
                    {t.type === 'income' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                        <TrendingUp className="size-3.5" />
                        {isAr ? 'قبض (إيراد)' : 'Income'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        <TrendingDown className="size-3.5" />
                        {isAr ? 'صرف (مصروف)' : 'Expense'}
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 font-bold tabular-nums ${t.type === 'income' ? 'text-teal-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} <span className="text-xs text-slate-400">{t.currency}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 mx-auto"
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
      </DesktopTableScroll>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                {isAr ? 'تسجيل حركة جديدة' : 'New Transaction'}
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'نوع الحركة' : 'Type'}
                <select
                  value={newTrx.type}
                  onChange={e => setNewTrx({...newTrx, type: e.target.value as 'income' | 'expense'})}
                  className="da-input bg-white"
                >
                  <option value="income">{isAr ? 'سند قبض (إيراد)' : 'Income'}</option>
                  <option value="expense">{isAr ? 'سند صرف (مصروف)' : 'Expense'}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'البيان' : 'Description'}
                <input
                  type="text"
                  value={newTrx.description || ''}
                  onChange={e => setNewTrx({...newTrx, description: e.target.value})}
                  className="da-input bg-white"
                  placeholder={isAr ? 'مثال: شراء مواد عيادة...' : 'e.g. Clinic supplies...'}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'المبلغ' : 'Amount'}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newTrx.amount}
                      onChange={e => setNewTrx({...newTrx, amount: e.target.value.replace(/[^0-9.]/g, '')})}
                      className="da-input bg-white pe-12 tabular-nums"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                      <span className="text-xs font-bold text-slate-400">{newTrx.currency}</span>
                    </div>
                  </div>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'العملة' : 'Currency'}
                  <select
                    value={newTrx.currency}
                    onChange={e => setNewTrx({...newTrx, currency: e.target.value})}
                    className="da-input bg-white"
                  >
                    <option value="SYP">SYP</option>
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="da-btn-secondary !px-5 !py-2.5"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTrx.description || !newTrx.amount}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                {isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ListPageLayout>
  )
}
