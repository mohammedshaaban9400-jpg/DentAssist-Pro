import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Briefcase, Activity, CalendarCheck, TrendingUp, Wallet, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardStats } from '@/types/clinical'
import { getDashboardStats, getConfigs } from '@/services/dbService'
import { useSessionStore } from '@/stores/sessionStore'
import { useToastStore } from '@/stores/toastStore'

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  trend?: string
}

function StatCard({ label, value, icon: Icon, colorClass, bgClass, trend }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl sm:size-12 ${bgClass} ${colorClass}`}>
          <Icon className="size-5 sm:size-6" />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
            <TrendingUp className="size-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-slate-800 tabular-nums sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      </div>
      <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-[0.03] ${bgClass}`} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="size-12 rounded-xl bg-slate-100" />
            <div className="mt-4 h-8 w-24 rounded-lg bg-slate-100" />
            <div className="mt-2 h-4 w-32 rounded-md bg-slate-50" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-pulse rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-80" />
        <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-80" />
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
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('SYP')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await getDashboardStats())
      const cfg = await getConfigs(['currency'])
      setCurrency(cfg.currency ?? 'SYP')
    } catch (e) {
      pushToast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    void load()
  }, [load])

  const locNum = isAr ? 'ar-SA' : 'en-US'
  const fmt = (n: number) => n.toLocaleString(locNum, { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  const hour = new Date().getHours()
  const greeting = isAr
    ? hour < 12 ? 'صباح الخير،' : hour < 17 ? 'طاب مساؤك،' : 'مساء الخير،'
    : hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,'

  const today = new Date().toLocaleDateString(locNum, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {greeting} <span className="text-teal-600">{user?.username ?? ''}</span> 👋
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            {isAr ? 'إليك ملخص أداء العيادة لهذا اليوم:' : 'Here is the summary of your clinic today:'} <span className="text-slate-700">{today}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-700 border border-slate-200"
        >
          <Activity className="size-4" />
          {isAr ? 'تحديث البيانات' : 'Refresh Data'}
        </button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <>
          {/* Main KPI Cards */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <StatCard
              label={isAr ? 'إيرادات الشهر' : 'Monthly Revenue'}
              value={`${fmt(stats.revenueMonth)} ${currency}`}
              icon={Briefcase}
              colorClass="text-teal-600"
              bgClass="bg-teal-50"
              trend={isAr ? '+ هذا الشهر' : 'This Month'}
            />
            <StatCard
              label={isAr ? 'إيرادات اليوم (الصندوق)' : 'Today Revenue (Cash)'}
              value={`${fmt(stats.revenueToday)} ${currency}`}
              icon={Wallet}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
            <StatCard
              label={isAr ? 'الذمم المالية (متبقي)' : 'Pending Debt'}
              value={`${fmt(stats.pendingDebt)} ${currency}`}
              icon={AlertCircle}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
            />
            <StatCard
              label={isAr ? 'إجمالي المواعيد' : 'Total Appointments'}
              value={fmt(stats.appointmentsCompleted + stats.appointmentsScheduled)}
              icon={CalendarCheck}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart Area */}
            <div className="lg:col-span-2 flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">
                  {isAr ? 'نظرة عامة على الإيرادات' : 'Revenue Overview'}
                </h2>
                <span className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  {currency}
                </span>
              </div>
              <div className="h-[280px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{ day: '01', value: 0 }, { day: '15', value: stats.revenueToday }, { day: '30', value: stats.revenueMonth }]} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(val: unknown) => {
                        const n = Array.isArray(val) ? Number(val[0]) : Number(val)
                        return [`${fmt(Number.isFinite(n) ? n : 0)} ${currency}`, isAr ? 'الإيرادات' : 'Revenue']
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Column: Appointments & Procedures */}
            <div className="flex flex-col gap-6">
              {/* Appointments Summary */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-5">
                  {isAr ? 'حالة المواعيد' : 'Appointments Status'}
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600"><CheckSquare className="size-4" /></div>
                      <span className="font-medium text-slate-700">{isAr ? 'مكتملة' : 'Completed'}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{stats.appointmentsCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-2 text-blue-600"><Clock className="size-4" /></div>
                      <span className="font-medium text-slate-700">{isAr ? 'مجدولة' : 'Scheduled'}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{stats.appointmentsScheduled}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-rose-100 p-2 text-rose-600"><AlertCircle className="size-4" /></div>
                      <span className="font-medium text-slate-700">{isAr ? 'ملغاة' : 'Cancelled'}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{stats.appointmentsCancelled}</span>
                  </div>
                </div>
              </div>

              {/* Top Procedures */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex-1">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                  {isAr ? 'أكثر الإجراءات طلباً' : 'Top Procedures'}
                </h2>
                {stats.topProcedures.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topProcedures.slice(0, 4).map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 truncate pe-4">{p.description}</span>
                        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          {p.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                    <Activity className="size-8 opacity-50" />
                    <p className="text-sm">{isAr ? 'لا توجد بيانات كافية' : 'No data available'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
