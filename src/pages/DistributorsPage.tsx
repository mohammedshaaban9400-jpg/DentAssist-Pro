import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Coins,
  MapPin,
  Package,
  PackageOpen,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
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
  listDistributors,
  createDistributor,
  updateDistributor,
  deleteDistributor,
  type DistributorRow,
} from '@/services/dbService'

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

function getInitials(name?: string): string {
  const parts = (name || '').trim().split(' ')
  const f = parts[0]?.charAt(0) || ''
  const l = parts[1]?.charAt(0) || ''
  return `${f}${l}`.toUpperCase() || '؟'
}

export function DistributorsPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()

  const [distributors, setDistributors] = useState<DistributorRow[]>([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  // For add/edit
  const [editId, setEditId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    address: '',
    items: '',
    paymentAmount: '',
    remainingAmount: '',
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
      const data = await listDistributors(q.trim() || undefined)
      setDistributors(data)
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

  const openAddModal = () => {
    setEditId(null)
    setFormData({
      name: '',
      company: '',
      phone: '',
      address: '',
      items: '',
      paymentAmount: '',
      remainingAmount: '',
    })
    setModal(true)
  }

  const openEditModal = (d: DistributorRow) => {
    setEditId(d.id)
    setFormData({
      name: d.name,
      company: d.company,
      phone: d.phone || '',
      address: d.address || '',
      items: d.items || '',
      paymentAmount: d.payment_amount.toString(),
      remainingAmount: d.remaining_amount.toString(),
    })
    setModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.company) return
    const input = {
      name: formData.name.trim(),
      company: formData.company.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      items: formData.items.trim(),
      paymentAmount: parseFloat(formData.paymentAmount) || 0,
      remainingAmount: parseFloat(formData.remainingAmount) || 0,
    }

    try {
      if (editId) {
        await updateDistributor(editId, input)
      } else {
        await createDistributor(input)
      }
      setModal(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      window.confirm(
        isAr
          ? 'هل أنت متأكد من حذف الموزع؟'
          : 'Are you sure you want to delete this distributor?',
      )
    ) {
      try {
        await deleteDistributor(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const totalPaid = useMemo(
    () => distributors.reduce((sum, d) => sum + (d.payment_amount || 0), 0),
    [distributors],
  )
  const totalRemaining = useMemo(
    () => distributors.reduce((sum, d) => sum + (d.remaining_amount || 0), 0),
    [distributors],
  )

  return (
    <ListPageLayout>
      {/* ─── Header ─── */}
      <ListPageHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #2563eb)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <PackageOpen className="size-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAr ? 'مستودعات ومندوبي المواد السنية' : 'Dental Suppliers & Distributors'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? `${distributors.length} مستودع ومورد مسجل لتأمين المستهلكات والأدوات الطبية`
                : `${distributors.length} registered medical suppliers and supply debt accounts`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4.5 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
            boxShadow: '0 2px 10px var(--color-primary-glow, rgba(13, 148, 136, 0.3))',
          }}
        >
          <Plus className="size-4" />
          <span>{isAr ? 'إضافة موزع جديد' : 'Add Distributor'}</span>
        </button>
      </ListPageHeader>

      {/* ─── 2 Financial Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/40 p-4 sm:gap-4 sm:p-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-2xs">
              <Wallet className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-teal-700 tabular-nums">
                {formatNumber(totalPaid)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي الدفعات المسددة للموردين' : 'Total Supplier Payments'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-2xs">
              <Coins className="size-5.5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 tabular-nums">
                {formatNumber(totalRemaining)}{' '}
                <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'إجمالي المبالغ المستحقة المتبقية' : 'Outstanding Supply Debts'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search Toolbar ─── */}
      <ListPageToolbar>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? 'بحث (الاسم / الشركة / المواد)...' : 'Search by name, company, items...'}
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
      </ListPageToolbar>

      {/* ─── Mobile Cards ─── */}
      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : distributors.length === 0 ? (
          <MobileEmptyState icon={PackageOpen}>
            <p className="text-sm font-semibold text-slate-700">
              {isAr ? 'لا يوجد موزعين مسجلين' : 'No distributors found'}
            </p>
          </MobileEmptyState>
        ) : (
          distributors.map((d) => {
            const initials = getInitials(d.name)
            return (
              <MobileCard key={d.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #2563eb)' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <span className="rounded-md bg-teal-50 px-2 py-0.2 text-[10px] font-bold text-teal-800 border border-teal-200/60">
                        {d.company}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                  {d.phone && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="size-3 text-slate-400" />
                      <span>{d.phone}</span>
                    </div>
                  )}
                  {d.items && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Package className="size-3 text-slate-400" />
                      <span className="truncate">{d.items}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400">{isAr ? 'مسدد:' : 'Paid:'} </span>
                    <span className="font-bold text-teal-700">
                      {formatNumber(d.payment_amount)} {currencySymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">{isAr ? 'متبقي:' : 'Left:'} </span>
                    <span className="font-bold text-rose-600">
                      {formatNumber(d.remaining_amount)} {currencySymbol}
                    </span>
                  </div>
                </div>

                <MobileCardActions>
                  <button
                    type="button"
                    onClick={() => openEditModal(d)}
                    className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
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
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المندوب / المستودع' : 'Agent / Company'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'بيانات الاتصال' : 'Contact Info'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المواد والمستهلكات' : 'Supplies & Items'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'الدفعات المسددة' : 'Paid Amount'}
              </th>
              <th className="px-6 py-3.5 text-start font-bold uppercase tracking-wider text-slate-500">
                {isAr ? 'المبلغ المتبقي' : 'Remaining'}
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
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="h-6 w-14 mx-auto animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : distributors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
                      <PackageOpen className="size-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {isAr ? 'لا يوجد موردين مسجلين' : 'No distributors found'}
                    </p>
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      {isAr ? 'إضافة مورد جديد الآن' : 'Add Distributor'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              distributors.map((d) => {
                const initials = getInitials(d.name)
                return (
                  <tr
                    key={d.id}
                    className="group transition-colors duration-150 hover:bg-teal-50/20"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #2563eb)' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                            {d.name}
                          </p>
                          <span className="rounded-md bg-teal-50 px-1.5 py-0.2 text-[10px] font-bold text-teal-800 border border-teal-200/60">
                            {d.company}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="size-3 text-slate-400" />
                          <span>{d.phone || '—'}</span>
                        </div>
                        {d.address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans">
                            <MapPin className="size-2.5" />
                            <span className="truncate max-w-[160px]">{d.address}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-slate-700">
                      <div className="flex items-center gap-1.5 max-w-[220px]">
                        <Package className="size-3.5 text-teal-600 shrink-0" />
                        <span className="truncate font-medium">{d.items || '—'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 font-extrabold tabular-nums text-teal-700 text-sm">
                      {formatNumber(d.payment_amount)}{' '}
                      <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                    </td>

                    <td className="px-6 py-3.5 font-extrabold tabular-nums text-rose-600 text-sm">
                      {formatNumber(d.remaining_amount)}{' '}
                      <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(d)}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          className="flex size-7.5 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
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

      {/* ─── Modal Dialog ─── */}
      {modal && (
        <div className="da-mobile-sheet-overlay">
          <div className="da-mobile-sheet max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <PackageOpen className="size-4.5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editId
                      ? isAr
                        ? 'تعديل بيانات الموزع'
                        : 'Edit Distributor'
                      : isAr
                        ? 'إضافة مورد / مستودع جديد'
                        : 'New Distributor'}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'اسم المندوب' : 'Agent Name'}</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isAr ? 'مثال: سامر العلي...' : 'e.g. Samer Ali'}
                    className="da-input text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'اسم المستودع / الشركة' : 'Company Name'}</span>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={isAr ? 'مثال: شركة النقاء للمواد السنية...' : 'e.g. Pure Dental Supplies'}
                    className="da-input text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09..."
                    className="da-input text-xs font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'العنوان / المدينة' : 'Address'}</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={isAr ? 'دمشق — شارع بغداد' : 'City, Street'}
                    className="da-input text-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'المواد والمستهلكات الموردة' : 'Supplies & Items'}</span>
                <textarea
                  rows={2}
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                  placeholder={
                    isAr
                      ? 'مثال: كمبوزيت، مبارد إندو، قفازات، بنج سني...'
                      : 'e.g. Composite, endo files, gloves, anesthetic'
                  }
                  className="da-input text-xs resize-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'المبلغ المسدد (الدفعة)' : 'Paid Amount'}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.paymentAmount}
                    onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                    placeholder="0"
                    className="da-input text-xs font-bold tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                  <span>{isAr ? 'المبلغ المتبقي (الذمة)' : 'Remaining Debt'}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.remainingAmount}
                    onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                    placeholder="0"
                    className="da-input text-xs font-bold tabular-nums text-rose-600"
                  />
                </label>
              </div>
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
                onClick={handleSave}
                disabled={!formData.name || !formData.company}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary, #0d9488), #0f766e)',
                }}
              >
                <span>{isAr ? 'حفظ البيانات' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ListPageLayout>
  )
}
