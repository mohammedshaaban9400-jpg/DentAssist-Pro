import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, PackageOpen, Phone, MapPin, Package, Trash2, Pencil, Wallet, Coins } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  DesktopTableScroll,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
} from '@/components/layout/ListPageLayout'
import {
  listDistributors,
  createDistributor,
  updateDistributor,
  deleteDistributor,
  type DistributorRow,
} from '@/services/dbService'

export function DistributorsPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency, exchangeRate } = useSettingsStore()

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
    remainingAmount: ''
  })

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
      name: '', company: '', phone: '', address: '', items: '', paymentAmount: '', remainingAmount: ''
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
      remainingAmount: d.remaining_amount.toString()
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
      remainingAmount: parseFloat(formData.remainingAmount) || 0
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
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف الموزع؟' : 'Are you sure you want to delete this distributor?')) {
      try {
        await deleteDistributor(id)
        loadData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const formatMoney = (amount: number) => {
    if (currency === 'SYP' || currency === 'IQD') return amount.toLocaleString()
    return (amount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <ListPageLayout>
      {/* Header */}
      <ListPageHeader>
        <h1>
          <PackageOpen className="size-6 text-teal-600" />
          {isAr ? 'الموزعين' : 'Distributors'}
        </h1>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
        >
          <Plus className="size-4" />
          {isAr ? 'إضافة موزع' : 'Add Distributor'}
        </button>
      </ListPageHeader>

      <ListPageToolbar>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
          <Package className="size-4" />
          {distributors.length} {isAr ? 'موزع مسجل' : 'Registered Distributors'}
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-slate-400 start-3" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? 'بحث (الاسم / الشركة / المواد)...' : 'Search (Name / Company / Items)...'}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </ListPageToolbar>

      {/* Table Section */}
      <DesktopTableScroll>
        <table className="w-full text-sm text-slate-600 min-w-[1000px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white shadow-[0_1px_0_0_#f1f5f9]">
            <tr>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المندوب / الشركة' : 'Agent / Company'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'بيانات الاتصال' : 'Contact Info'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المواد والمستهلكات' : 'Supplies & Items'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'سعر الدفعة' : 'Payment Amount'}</th>
              <th className="px-6 py-3 text-start font-semibold text-slate-500 border-e border-slate-100">{isAr ? 'المبلغ المتبقي' : 'Remaining'}</th>
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
            ) : distributors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <PackageOpen className="size-10 text-slate-300" />
                    {isAr ? 'لا يوجد موزعين' : 'No distributors found'}
                  </div>
                </td>
              </tr>
            ) : (
              distributors.map(d => (
                <tr key={d.id} className="transition-colors hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{d.name}</div>
                    <div className="text-xs text-teal-700 font-semibold mt-0.5">{d.company}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-slate-400" />
                        {d.phone || '—'}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="size-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px]" title={d.address}>{d.address || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <Package className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="truncate max-w-[200px] leading-relaxed" title={d.items}>{d.items || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums text-teal-600">
                    {formatMoney(d.payment_amount)} <span className="text-xs text-slate-400 font-medium">{currency}</span>
                  </td>
                  <td className="px-6 py-4 font-bold tabular-nums text-rose-600">
                    {formatMoney(d.remaining_amount)} <span className="text-xs text-slate-400 font-medium">{currency}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(d)}
                        className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-teal-100 hover:text-teal-700"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTableScroll>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl my-auto">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editId ? (isAr ? 'تعديل موزع' : 'Edit Distributor') : (isAr ? 'إضافة موزع جديد' : 'Add New Distributor')}
              </h2>
            </div>
            <div className="space-y-4 p-6 overflow-y-auto max-h-[70vh] thin-scrollbar">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'اسم المندوب' : 'Agent Name'}
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="da-input bg-white"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'اسم الشركة' : 'Company Name'}
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="da-input bg-white"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'رقم الهاتف' : 'Phone Number'}
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="da-input bg-white tabular-nums ltr"
                    dir="ltr"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  {isAr ? 'العنوان' : 'Address'}
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="da-input bg-white"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                {isAr ? 'المواد والمستهلكات التي يوفرها' : 'Supplies & Items Provided'}
                <textarea
                  value={formData.items}
                  onChange={e => setFormData({...formData, items: e.target.value})}
                  className="da-input bg-white min-h-[4rem] resize-none"
                  placeholder={isAr ? 'مثال: قطن, مواد تخدير, زرعات...' : 'e.g. Cotton, Anesthetics, Implants...'}
                />
              </label>

              {/* Financials */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4 mt-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="size-4 text-teal-600" />
                    {isAr ? 'سعر الدفعة (المدفوع)' : 'Payment Amount'}
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.paymentAmount}
                      onChange={e => setFormData({...formData, paymentAmount: e.target.value.replace(/[^0-9.]/g, '')})}
                      className="da-input bg-white pe-12 tabular-nums"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                      <span className="text-xs font-bold text-slate-400">{currency}</span>
                    </div>
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Coins className="size-4 text-rose-500" />
                    {isAr ? 'المبلغ المتبقي (الذمة)' : 'Remaining Amount'}
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.remainingAmount}
                      onChange={e => setFormData({...formData, remainingAmount: e.target.value.replace(/[^0-9.]/g, '')})}
                      className="da-input bg-white pe-12 tabular-nums"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                      <span className="text-xs font-bold text-slate-400">{currency}</span>
                    </div>
                  </div>
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
                onClick={handleSave}
                disabled={!formData.name || !formData.company}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                {isAr ? 'حفظ الموزع' : 'Save Distributor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ListPageLayout>
  )
}
