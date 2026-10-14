import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Appointment, DashboardStats } from '@/types/clinical'
import {
  getConfigs,
  getDailyReports,
  getDashboardStats,
  listAppointments,
  type ReportRow,
} from '@/services/dbService'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

function getCurrencySymbol(cur: string, isAr: boolean): string {
  if (cur === 'SYP') return isAr ? 'ل.س' : 'SYP'
  if (cur === 'IQD') return isAr ? 'د.ع' : 'IQD'
  if (cur === 'USD') return '$'
  if (cur === 'EUR') return '€'
  if (cur === 'SAR') return isAr ? 'ر.س' : 'SAR'
  if (cur === 'AED') return isAr ? 'د.إ' : 'AED'
  return cur
}

function formatTime(iso: string, isAr: boolean): string {
  try {
    const timePart = iso.includes('T') ? iso.split('T')[1]?.slice(0, 5) : iso.slice(11, 16)
    if (!timePart) return ''
    const [hStr, mStr] = timePart.split(':')
    let h = parseInt(hStr, 10)
    const m = mStr ?? '00'
    const period = h >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM')
    h = h % 12 || 12
    return `${h}:${m} ${period}`
  } catch {
    return ''
  }
}

interface StatCardProps {
  label: string
  value: number
  currency?: string
  icon: React.ElementType
  iconColorClass?: string
  iconBgClass?: string
  trendBadge?: string
  subtitle?: string
}

function StatCard({
  label,
  value,
  currency,
  icon: Icon,
  iconColorClass = 'text-teal-700',
  iconBgClass = 'bg-teal-50 border-teal-100/80',
  trendBadge,
  subtitle,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-xs">
      <div className="flex items-center justify-between">
        <div
          className={`flex size-10 items-center justify-center rounded-xl border ${iconBgClass} ${iconColorClass} transition-colors`}
        >
          <Icon className="size-5" />
        </div>
        {trendBadge && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            <TrendingUp className="size-3 text-slate-500" />
            {trendBadge}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
            {formatNumber(value)}
          </span>
          {currency && (
            <span className="text-xs font-semibold text-slate-500 sm:text-sm">{currency}</span>
          )}
        </div>
        <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs"
          >
            <div className="size-10 rounded-xl bg-slate-100" />
            <div className="mt-4 h-8 w-24 rounded-lg bg-slate-100" />
            <div className="mt-2 h-4 w-32 rounded-md bg-slate-50" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const user = useSessionStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [currency, setCurrency] = useState('SYP')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d')

  const currencySymbol = useMemo(
    () => getCurrencySymbol(currency, isAr),
    [currency, isAr],
  )

  const loadData = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true)
      else setLoading(true)
      try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const [dashStats, cfg, appts, dailyReports] = await Promise.all([
          getDashboardStats(),
          getConfigs(['currency']),
          listAppointments(startOfDay.toISOString(), endOfDay.toISOString()).catch(() => []),
          getDailyReports().catch(() => []),
        ])
        setStats(dashStats)
        setCurrency(cfg.currency ?? 'SYP')
        setAppointments(appts)
        setReports(dailyReports)
      } catch (e) {
        pushToast(e instanceof Error ? e.message : String(e), 'error')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [pushToast],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Greeting
  const hour = new Date().getHours()
  const greeting = isAr
    ? hour < 12
      ? 'صباح الخير،'
      : hour < 17
      ? 'طاب مساؤك،'
      : 'مساء الخير،'
    : hour < 12
    ? 'Good morning,'
    : hour < 17
    ? 'Good afternoon,'
    : 'Good evening,'

  // Today Date formatted in Arabic
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [isAr])

  // Today's appointments filtered
  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const todayAppts = useMemo(() => {
    return appointments
      .filter((a) => a.start_time.startsWith(todayYmd))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointments, todayYmd])

  // Chart data calculation
  const chartData = useMemo(() => {
    const daysCount = chartRange === '7d' ? 7 : 30
    const result: { date: string; label: string; income: number }[] = []
    const now = new Date()

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const ymd = d.toISOString().slice(0, 10)
      const reportMatch = reports.find((r) => r.date === ymd)

      const label = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
        weekday: daysCount === 7 ? 'short' : undefined,
        day: 'numeric',
        month: daysCount === 30 ? 'numeric' : undefined,
      })

      result.push({
        date: ymd,
        label,
        income: reportMatch ? reportMatch.income : 0,
      })
    }

    // Ensure today reflects stats.revenueToday if reports not yet aggregated
    if (stats && stats.revenueToday > 0 && result.length > 0) {
      const lastPoint = result[result.length - 1]
      if (lastPoint && lastPoint.income === 0) {
        lastPoint.income = stats.revenueToday
      }
    }

    return result
  }, [reports, stats, chartRange, isAr])

  // Appointments progress percentages
  const totalApptsCount = stats
    ? stats.appointmentsCompleted + stats.appointmentsScheduled + stats.appointmentsCancelled
    : 0
  const completedPct =
    totalApptsCount > 0
      ? Math.round(((stats?.appointmentsCompleted ?? 0) / totalApptsCount) * 100)
      : 0
  const scheduledPct =
    totalApptsCount > 0
      ? Math.round(((stats?.appointmentsScheduled ?? 0) / totalApptsCount) * 100)
      : 0
  const cancelledPct =
    totalApptsCount > 0
      ? Math.round(((stats?.appointmentsCancelled ?? 0) / totalApptsCount) * 100)
      : 0

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8 sm:space-y-6">
      {/* ─── Hero Welcome & Quick Actions Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Doctor Info & Welcome */}
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-xs sm:size-16 sm:text-xl"
              style={{
                background: 'var(--color-primary, #0d9488)',
              }}
            >
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  {greeting} {isAr ? 'د.' : 'Dr.'} {user?.username ?? ''}
                </h1>
                <span
                  className="rounded-md px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    background: 'var(--color-primary-light, #ccfbf1)',
                    color: 'var(--color-primary, #0d9488)',
                  }}
                >
                  {isAr ? 'طبيب العيادة' : 'Lead Doctor'}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
                <Calendar className="size-3.5 text-slate-400" />
                <span>{todayFormatted}</span>
              </p>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Link
              to="/patients"
              className="da-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs shadow-2xs sm:text-sm"
            >
              <UserPlus className="size-4" />
              <span>{isAr ? 'مريض جديد' : 'New Patient'}</span>
            </Link>

            <Link
              to="/appointments"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 sm:text-sm"
            >
              <Calendar className="size-4 text-teal-600" />
              <span>{isAr ? 'حجز موعد' : 'Book Appointment'}</span>
            </Link>

            <Link
              to="/invoices"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 sm:text-sm"
            >
              <Receipt className="size-4 text-blue-600" />
              <span>{isAr ? 'فاتورة' : 'New Invoice'}</span>
            </Link>

            <button
              type="button"
              disabled={refreshing}
              onClick={() => void loadData(true)}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <>
          {/* ─── 4 Primary KPI Stat Cards ─── */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={isAr ? 'إيرادات الشهر' : 'Monthly Revenue'}
              value={stats.revenueMonth}
              currency={currencySymbol}
              icon={TrendingUp}
              iconColorClass="text-teal-700"
              iconBgClass="bg-teal-50 border-teal-100/80"
              trendBadge={isAr ? 'هذا الشهر' : 'This Month'}
              subtitle={isAr ? 'إجمالي المحصّل خلال الشهر' : 'Total collected this month'}
            />

            <StatCard
              label={isAr ? 'إيرادات اليوم (الصندوق)' : 'Today Revenue (Cash)'}
              value={stats.revenueToday}
              currency={currencySymbol}
              icon={Wallet}
              iconColorClass="text-emerald-700"
              iconBgClass="bg-emerald-50 border-emerald-100/80"
              subtitle={isAr ? 'المقبوضات النقدية لليوم' : 'Direct cash recorded today'}
            />

            <StatCard
              label={isAr ? 'الذمم المالية (متبقي)' : 'Pending Debt'}
              value={stats.pendingDebt}
              currency={currencySymbol}
              icon={AlertCircle}
              iconColorClass="text-rose-700"
              iconBgClass="bg-rose-50 border-rose-100/80"
              subtitle={isAr ? 'مستحقات وفواتير غير مسددة' : 'Outstanding patient balances'}
            />

            <StatCard
              label={isAr ? 'إجمالي مواعيد اليوم' : 'Today Appointments'}
              value={stats.appointmentsCompleted + stats.appointmentsScheduled}
              currency={isAr ? 'موعد' : 'Appts'}
              icon={CalendarCheck}
              iconColorClass="text-blue-700"
              iconBgClass="bg-blue-50 border-blue-100/80"
              trendBadge={
                stats.appointmentsCompleted > 0
                  ? `${stats.appointmentsCompleted} ${isAr ? 'مكتمل' : 'done'}`
                  : undefined
              }
              subtitle={isAr ? 'مكتملة ومجدولة اليوم' : 'Completed and scheduled'}
            />
          </div>

          {/* ─── Middle Section: Revenue Chart & Appointments Breakdown ─── */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Interactive Revenue Chart */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6 lg:col-span-2">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {isAr ? 'نظرة عامة على الإيرادات والأرباح' : 'Revenue Trend'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isAr
                      ? 'مخطط الإيرادات اليومية المقبوضة خلال الفترة المحددة'
                      : 'Daily incoming revenue across the selected period'}
                  </p>
                </div>

                {/* Range Filter Buttons */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setChartRange('7d')}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === '7d'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {isAr ? 'آخر 7 أيام' : '7 Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartRange('30d')}
                    className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === '30d'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {isAr ? 'آخر 30 يوماً' : '30 Days'}
                  </button>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="h-[280px] w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                  <AreaChart
                    data={chartData}
                    margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-primary, #0d9488)"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-primary, #0d9488)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        padding: '10px 14px',
                        backgroundColor: '#ffffff',
                      }}
                      formatter={(val: unknown) => {
                        const n = Array.isArray(val) ? Number(val[0]) : Number(val)
                        return [
                          `${formatNumber(Number.isFinite(n) ? n : 0)} ${currencySymbol}`,
                          isAr ? 'الإيرادات' : 'Revenue',
                        ]
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="var(--color-primary, #0d9488)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Appointments Status Distribution & Visual Bar */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {isAr ? 'حالة مواعيد اليوم' : 'Appointments Status'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {isAr ? 'نسب الإنجاز والمتابعة اليومية' : 'Daily completion breakdown'}
                  </p>
                </div>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <span>{isAr ? 'الجدول' : 'View'}</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              {/* Stacked Progress Bar */}
              <div className="mt-5">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  {completedPct > 0 && (
                    <div
                      style={{ width: `${completedPct}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`${completedPct}% مكتملة`}
                    />
                  )}
                  {scheduledPct > 0 && (
                    <div
                      style={{ width: `${scheduledPct}%` }}
                      className="bg-blue-500 transition-all duration-500"
                      title={`${scheduledPct}% مجدولة`}
                    />
                  )}
                  {cancelledPct > 0 && (
                    <div
                      style={{ width: `${cancelledPct}%` }}
                      className="bg-rose-500 transition-all duration-500"
                      title={`${cancelledPct}% ملغاة`}
                    />
                  )}
                </div>
              </div>

              {/* 3 Status Detail Cards */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-3 transition-colors hover:bg-emerald-50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isAr ? 'مكتملة' : 'Completed'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {completedPct}% {isAr ? 'من الإجمالي' : 'of total'}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
                    {formatNumber(stats.appointmentsCompleted)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-blue-100/80 bg-blue-50/50 p-3 transition-colors hover:bg-blue-50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isAr ? 'مجدولة' : 'Scheduled'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {scheduledPct}% {isAr ? 'من الإجمالي' : 'of total'}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-blue-700 tabular-nums">
                    {formatNumber(stats.appointmentsScheduled)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-rose-100/80 bg-rose-50/50 p-3 transition-colors hover:bg-rose-50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                      <XCircle className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isAr ? 'ملغاة' : 'Cancelled'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {cancelledPct}% {isAr ? 'من الإجمالي' : 'of total'}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-rose-700 tabular-nums">
                    {formatNumber(stats.appointmentsCancelled)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Bottom Section: Today's Appointments Queue & Top Procedures ─── */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Today's Queue / Appointments Feed */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <CalendarCheck className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                      {isAr ? 'مواعيد اليوم في الانتظار' : "Today's Schedule"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isAr
                        ? `إجمالي مواعيد اليوم: ${todayAppts.length}`
                        : `${todayAppts.length} appointments scheduled today`}
                    </p>
                  </div>
                </div>

                <Link
                  to="/appointments"
                  className="da-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs shadow-sm"
                >
                  <Plus className="size-3.5" />
                  <span>{isAr ? 'حجز موعد' : 'New Appointment'}</span>
                </Link>
              </div>

              {/* Appointments List */}
              {todayAppts.length > 0 ? (
                <div className="divide-y divide-slate-100 overflow-hidden">
                  {todayAppts.slice(0, 5).map((appt) => {
                    const isCompleted = appt.status === 'completed'
                    const isCancelled = appt.status === 'cancelled'
                    const timeLabel = formatTime(appt.start_time, isAr)

                    return (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between py-3.5 transition-colors hover:bg-slate-50/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                            {appt.patient_first_name
                              ? appt.patient_first_name.slice(0, 2).toUpperCase()
                              : 'PT'}
                          </div>
                          <div>
                            <Link
                              to={`/patients/${appt.patient_id}`}
                              className="font-bold text-slate-900 hover:text-teal-600 transition-colors text-sm"
                            >
                              {appt.patient_first_name} {appt.patient_last_name}
                            </Link>
                            <p className="text-xs text-slate-500 truncate max-w-xs">
                              {appt.notes || (isAr ? 'معاينة عامة ومتابعة' : 'General Checkup')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">
                            {timeLabel}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700'
                                : isCancelled
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {isCompleted
                              ? isAr
                                ? 'مكتمل'
                                : 'Done'
                              : isCancelled
                              ? isAr
                                ? 'ملغى'
                                : 'Cancelled'
                              : isAr
                              ? 'مجدول'
                              : 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Empty state when no appointments today */
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-sm">
                    <Sparkles className="size-7" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-800">
                    {isAr ? 'لا توجد مواعيد متبقية لليوم' : 'No Appointments Today'}
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    {isAr
                      ? 'جدول مواعيدك فارغ حالياً ومريح. يمكنك حجز موعد جديد لأي مريض بنقرة زر واحدة.'
                      : 'Your queue is empty today. You can schedule a new appointment anytime.'}
                  </p>
                  <Link
                    to="/appointments"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
                  >
                    <Plus className="size-4" />
                    <span>{isAr ? 'حجز موعد لمريض' : 'Book Appointment'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Top Clinical Procedures */}
            <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Stethoscope className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {isAr ? 'أكثر العلاجات طلباً' : 'Top Procedures'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'الإجراءات الأكثر تنفيذاً في العيادة' : 'Most performed treatments'}
                  </p>
                </div>
              </div>

              {stats.topProcedures.length > 0 ? (
                <div className="mt-2 space-y-4">
                  {stats.topProcedures.slice(0, 5).map((p, i) => {
                    const maxCount = Math.max(...stats.topProcedures.map((item) => item.count), 1)
                    const pct = Math.round((p.count / maxCount) * 100)

                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate pe-2">
                            {p.description}
                          </span>
                          <span className="font-extrabold text-slate-900 tabular-nums">
                            {formatNumber(p.count)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {isAr ? 'عملية' : 'cases'}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background:
                                i === 0
                                  ? 'linear-gradient(90deg, #0d9488, #06b6d4)'
                                  : i === 1
                                  ? 'linear-gradient(90deg, #2563eb, #6366f1)'
                                  : i === 2
                                  ? 'linear-gradient(90deg, #059669, #10b981)'
                                  : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-slate-400">
                  <Activity className="size-8 opacity-40" />
                  <p className="mt-2 text-xs">
                    {isAr
                      ? 'ستظهر هنا الإحصائيات بعد إضافة بنود الفواتير'
                      : 'Procedures will populate after treatments'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
