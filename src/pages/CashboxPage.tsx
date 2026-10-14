import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
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
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
  type TransactionRow,
} from '@/services/dbService'

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function CashboxPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()

  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<boolean>(false)
  const [newTrx, setNewTrx] = useState({
    description: '',
    type: 'income',
    amount: '',
    currency: currency || 'SYP',
  })

  const currencySymbol = useMemo(() => {
    if (currency === 'SYP') return isAr ? 'ل.س' : 'SYP'
    if (currency === 'IQD') return isAr ? 'د.ع' : 'IQD'
    if (currency === 'USD') return '$'
    if (currency === 'EUR') return '€'
    if (currency === 'SAR') return isAr ? 'ر.س' : 'SAR'
    if (currency === 'AED') return isAr ? 'د.إ' : 'AED'
    return currency || ''
  }, [currency, isAr])

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
    setNewTrx((prev) => ({ ...prev, currency: currency || 'SYP' }))
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
        currency: newTrx.currency,
      })
      setModal(false)
      setNewTrx({
        description: '',
        type: 'income',
        amount: '',
        currency: currency || 'SYP',
      })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      window.confirm(
        isAr
          ? 'هل أنت متأكد من حذف هذه الحركة من الصندوق؟'
          : 'Are you sure you want to delete this cashbox entry?',
      )
    ) {
      try {
        await deleteTransaction(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  )
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  )
  const balance = totalIncome - totalExpense

  const filtered = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    return true
  })

  return (
    <ListPageLayout>
      {/* ─── Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Wallet className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'حسابات الصندوق والخزينة' : 'Clinic Cashbox'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'إدارة التدفق المالي اليومي، المقبوضات والمدفوعات التشغيلية'
                : 'Track daily cash inflow, patient collections and clinic expenses'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
            boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
          }}
        >
          <Plus className="size-4" />
          <span>{isAr ? 'حركة نقدية جديدة' : 'New Transaction'}</span>
        </button>
      </ListPageHeader>

      {/* ─── 3 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:gap-4 sm:p-5">
        {/* Income Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
              <TrendingUp className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 tabular-nums">
                {formatNumber(totalIncome)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي المقبوضات (إيرادات)' : 'Total Collections (In)'}
              </p>
            </div>
          </div>
        </div>

        {/* Expense Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-2xs">
              <TrendingDown className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 tabular-nums">
                {formatNumber(totalExpense)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي المدفوعات (مصاريف)' : 'Total Expenses (Out)'}
              </p>
            </div>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-2xl shadow-2xs ${
                balance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <RefreshCcw className="size-5.5" />
            </div>
            <div>
              <p
                className={`text-lg sm:text-xl font-extrabold tabular-nums ${
                  balance >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {balance >= 0 ? '+' : ''}
                {formatNumber(balance)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'الرصيد الصافي الفعلي' : 'Net Cash Position'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Type Filter Toolbar ─── */}
      <ListPageToolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAr ? 'بحث في البيان أو الملاحظات...' : 'Search description...'}
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
              { id: 'income', label: isAr ? 'إيرادات (+)' : 'Income' },
              { id: 'expense', label: isAr ? 'مصروفات (-)' : 'Expense' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setTypeFilter(st.id as any)}
                className={`cursor-pointer rounded-xl px-3.5 py-1 text-xs font-bold transition-all duration-150 ${
                  typeFilter === st.id
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

      {/* ─── Mobile Cards ─── */}
      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filtered.length === 0 ? (
          <MobileEmptyState icon={Wallet}>
            <p className="text-sm font-semibold text-slate-700">
              {isAr ? 'لا توجد حركات نقدية مسجلة' : 'No transactions recorded'}
            </p>
          </MobileEmptyState>
        ) : (
          filtered.map((t) => (
            <MobileCard key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                      t.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <ArrowDownLeft className="size-5" />
                    ) : (
                      <ArrowUpRight className="size-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{t.description}</p>
                    <p className="text-xs font-mono text-slate-400">
                      {t.trx_id ? `#${t.trx_id} · ` : ''}
                      {t.date}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-sm font-extrabold tabular-nums ${
                    t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatNumber(t.amount)} {currencySymbol}
                </p>
              </div>

              <MobileCardActions>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="flex size-7.5 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      {/* ─── Desktop Table View ─── */}
      <DesktopTablePane>
        <table className="min-w-[850px] w-full text-xs text-slate-600">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-slate-600 backdrop-blur-xs">
            <tr>
              <th className="w-16 px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-400">
                {isAr ? 'رقم' : 'ID'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'التاريخ' : 'Date'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'البيان / تفاصيل الحركة' : 'Description'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'نوع السند' : 'Type'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المبلغ الصافي' : 'Amount'}
              </th>
              <th className="px-6 py-3.5 text-center font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'إجراءات' : 'Actions'}
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
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-8 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <Wallet className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {isAr ? 'لا توجد حركات مسجلة في الصندوق' : 'No transactions recorded'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal(true)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'تسجيل حركة جديدة الآن' : 'New Transaction'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.id}
                  className="group transition-colors duration-150 hover:bg-teal-50/20"
                >
                  <td className="px-6 py-3.5 text-center font-mono font-bold text-slate-400">
                    {t.trx_id ? `#${t.trx_id}` : `#${t.id}`}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-600 font-mono">
                    {t.date}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                    {t.description}
                  </td>
                  <td className="px-6 py-3.5">
                    {t.type === 'income' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <ArrowDownLeft className="size-3" />
                        <span>{isAr ? 'سند قبض' : 'Income'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                        <ArrowUpRight className="size-3" />
                        <span>{isAr ? 'سند صرف' : 'Expense'}</span>
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-6 py-3.5 font-extrabold tabular-nums text-sm ${
                      t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatNumber(t.amount)}{' '}
                    <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 mx-auto"
                      title={isAr ? 'حذف الحركة' : 'Delete'}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTablePane>

      {/* ─── Modal Dialog ─── */}
      {modal && (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Wallet className="size-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isAr ? 'تسجيل حركة نقدية بالصندوق' : 'New Transaction'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="da-mobile-sheet-body thin-scrollbar space-y-4 p-5 sm:p-6">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'نوع الحركة النقدية' : 'Type'}</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTrx({ ...newTrx, type: 'income' })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      newTrx.type === 'income'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownLeft className="size-3.5 text-emerald-600" />
                    <span>{isAr ? 'سند قبض (إيراد)' : 'Income (+)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrx({ ...newTrx, type: 'expense' })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      newTrx.type === 'expense'
                        ? 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="size-3.5 text-rose-600" />
                    <span>{isAr ? 'سند صرف (مصروف)' : 'Expense (-)'}</span>
                  </button>
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'البيان / سبب الحركة' : 'Description'}</span>
                <input
                  type="text"
                  value={newTrx.description || ''}
                  onChange={(e) => setNewTrx({ ...newTrx, description: e.target.value })}
                  placeholder={
                    newTrx.type === 'income'
                      ? isAr
                        ? 'مثال: دفعة جلسة تقويم، كشف استشارة...'
                        : 'e.g. Patient consultation fee'
                      : isAr
                        ? 'مثال: شراء كيت تبييض، مصاريف تعقيم...'
                        : 'e.g. Clinic supplies, sterilization'
                  }
                  className="da-input text-xs"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'المبلغ النقدي' : 'Amount'}</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newTrx.amount || ''}
                    onChange={(e) => setNewTrx({ ...newTrx, amount: e.target.value })}
                    placeholder="0"
                    className="da-input text-sm font-bold tabular-nums pe-16"
                  />
                  <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 text-xs font-bold text-slate-400">
                    {currencySymbol}
                  </span>
                </div>
              </label>
            </div>

            <div className="da-mobile-sheet-footer bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
                }}
              >
                <span>{isAr ? 'تسجيل الحركة' : 'Save Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ListPageLayout>
  )
}
