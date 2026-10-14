import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Boxes,
  Clock,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import type { InventoryCategory, InventoryItem, InventoryStats } from '@/types/clinical'
import {
  adjustInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  getConfigs,
  getInventoryStats,
  listDistributors,
  listInventoryItems,
  openExternalUrl,
  updateInventoryItem,
  type DistributorRow,
} from '@/services/dbService'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { buildWhatsAppUrl, digitsForWhatsApp } from '@/lib/waPhone'

const CATEGORIES: { id: InventoryCategory | 'all'; labelAr: string; labelEn: string; color: string }[] = [
  { id: 'all', labelAr: 'كافة الأصناف', labelEn: 'All Items', color: 'bg-slate-100 text-slate-800' },
  { id: 'anesthesia', labelAr: 'التخدير الموضعي', labelEn: 'Anesthesia', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'composite', labelAr: 'الحشوات والكمبوزيت', labelEn: 'Composite', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'endodontics', labelAr: 'علاج العصب والجذور', labelEn: 'Endodontics', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'surgery_implants', labelAr: 'الجراحة والزرعات', labelEn: 'Surgery & Implants', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'sterilization', labelAr: 'التعقيم والقفازات', labelEn: 'Sterilization & PPE', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'impression', labelAr: 'الطبعات والمخبر', labelEn: 'Impression', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'other', labelAr: 'مستلزمات أخرى', labelEn: 'Other', color: 'bg-slate-100 text-slate-700 border-slate-200' },
]

const UNITS = [
  'علبة',
  'كاربولة',
  'سيرنج',
  'قطعة',
  'مبرد',
  'باكت',
  'زجاجة',
  'طقم',
  'كيس',
  'كرتونة',
]

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function InventoryPage() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [distributors, setDistributors] = useState<DistributorRow[]>([])
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockCount: 0,
    expiringCount: 0,
    totalEstimatedValue: 0,
  })

  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [filterExpiring, setFilterExpiring] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<InventoryCategory>('anesthesia')
  const [formSpecification, setFormSpecification] = useState('')
  const [formQuantity, setFormQuantity] = useState<number | ''>(10)
  const [formUnit, setFormUnit] = useState('علبة')
  const [formMinThreshold, setFormMinThreshold] = useState<number | ''>(5)
  const [formCostPerUnit, setFormCostPerUnit] = useState<number | ''>(50000)
  const [formDistributorId, setFormDistributorId] = useState<number | ''>('')
  const [formExpiryDate, setFormExpiryDate] = useState('')
  const [formBatchNumber, setFormBatchNumber] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemList, statData, distList] = await Promise.all([
        listInventoryItems({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          query: query.trim() || undefined,
          lowStockOnly: filterLowStock,
          expiringSoon: filterExpiring,
        }),
        getInventoryStats(),
        listDistributors(),
      ])
      setItems(itemList)
      setStats(statData)
      setDistributors(distList)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, query, filterLowStock, filterExpiring, push])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openAddModal = () => {
    setEditingId(null)
    setFormName('')
    setFormCategory('anesthesia')
    setFormSpecification('')
    setFormQuantity(10)
    setFormUnit('علبة')
    setFormMinThreshold(5)
    setFormCostPerUnit(50000)
    setFormDistributorId(distributors[0]?.id ?? '')
    setFormExpiryDate('')
    setFormBatchNumber('')
    setFormLocation('')
    setFormNotes('')
    setModalOpen(true)
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormCategory(item.category)
    setFormSpecification(item.specification || '')
    setFormQuantity(item.quantity)
    setFormUnit(item.unit)
    setFormMinThreshold(item.min_threshold)
    setFormCostPerUnit(item.cost_per_unit)
    setFormDistributorId(item.distributor_id ?? '')
    setFormExpiryDate(item.expiry_date || '')
    setFormBatchNumber(item.batch_number || '')
    setFormLocation(item.location || '')
    setFormNotes(item.notes || '')
    setModalOpen(true)
  }

  const onSave = async () => {
    const name = formName.trim()
    if (!name) {
      push(isAr ? 'يرجى إدخال اسم المادة السنية.' : 'Item name is required.', 'error')
      return
    }

    setBusy(true)
    try {
      const payload = {
        name,
        category: formCategory,
        specification: formSpecification.trim() || null,
        quantity: Number(formQuantity || 0),
        unit: formUnit.trim() || 'قطعة',
        minThreshold: Number(formMinThreshold || 0),
        costPerUnit: Number(formCostPerUnit || 0),
        distributorId: formDistributorId ? Number(formDistributorId) : null,
        expiryDate: formExpiryDate || null,
        batchNumber: formBatchNumber.trim() || null,
        location: formLocation.trim() || null,
        notes: formNotes.trim() || null,
      }

      if (editingId) {
        await updateInventoryItem(editingId, payload)
        push(isAr ? 'تم تحديث المادة في المخزون بنجاح.' : 'Item updated successfully.', 'success')
      } else {
        await createInventoryItem(payload)
        push(isAr ? 'تمت إضافة المادة إلى المخزون بنجاح.' : 'Item added to inventory.', 'success')
      }

      setModalOpen(false)
      await loadData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onQuickAdjust = async (item: InventoryItem, delta: number) => {
    try {
      await adjustInventoryQuantity(item.id, delta)
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it)),
      )
      // refresh stats in background
      void getInventoryStats().then(setStats)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const onDelete = async (item: InventoryItem) => {
    const ok = await confirm(
      isAr
        ? `هل أنت متأكد من حذف المادة "${item.name}" من المخزون نهائياً؟`
        : `Delete "${item.name}" from inventory?`,
      { title: isAr ? 'حذف مادة من المخزون' : 'Delete Item', isDestructive: true },
    )
    if (!ok) return

    try {
      await deleteInventoryItem(item.id)
      push(isAr ? 'تم حذف الصنف.' : 'Item deleted.', 'success')
      await loadData()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const onReorderViaWhatsApp = async (item: InventoryItem) => {
    const phone = item.distributor_phone
    const digits = digitsForWhatsApp(phone)

    const cfg = await getConfigs(['clinic_name'])
    const clinic = cfg.clinic_name || (isAr ? 'عيادة الأسنان' : 'Dental Clinic')

    const reorderQuantity = Math.max(1, Math.round(item.min_threshold * 2))
    const message = isAr
      ? `السلام عليكم ورحمة الله وبركاته،\nنود تقديم طلب توريد لـ (${clinic}):\n- المادة: ${item.name}${item.specification ? ` [${item.specification}]` : ''}\n- الكمية المطلوبة: ${reorderQuantity} ${item.unit}\nيرجى التكرم بتأكيد التوفر وموعد التوصيل. شاكرين تعاونكم.`
      : `Hello, we would like to place a supply order for (${clinic}):\n- Item: ${item.name}${item.specification ? ` [${item.specification}]` : ''}\n- Quantity requested: ${reorderQuantity} ${item.unit}\nPlease confirm availability and delivery time. Thank you.`

    if (digits) {
      const url = buildWhatsAppUrl(digits, message)
      await openExternalUrl(url)
    } else {
      push(
        isAr
          ? 'الموزع المرتبط لا يحتوي على رقم هاتف صالح للواتساب. يرجى تحديث بيانات الموزع.'
          : 'No valid phone number found for this distributor.',
        'error',
      )
    }
  }

  return (
    <div className="space-y-6 pb-10 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <Boxes className="size-8 text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
              {isAr ? 'إدارة مخزون العيادة والمستهلكات السنية' : 'Dental Stock & Inventory'}
            </h1>
            <p className="mt-1 text-xs text-teal-200/90 sm:text-sm">
              {isAr
                ? 'متابعة كميات المواد الحساسة، ألوان الكمبوزيت، إبر البنج، الصلاحية وإعادة الطلب بنقرة واحدة'
                : 'Monitor critical consumables, composite shades, anesthesia, expiry & 1-click supplier reorder'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 text-xs font-bold text-teal-950 shadow-md transition hover:bg-teal-300 active:scale-95"
        >
          <PackagePlus className="size-4.5 stroke-[2.5]" />
          <span>{isAr ? 'إضافة مادة للمخزون' : 'Add New Item'}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total SKU */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isAr ? 'إجمالي الأصناف' : 'Total Items'}</span>
            <Package className="size-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl font-black text-slate-900">{stats.totalItems}</strong>
            <span className="text-xs text-slate-400">{isAr ? 'صنف مسجل' : 'SKUs'}</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => {
            setFilterLowStock((prev) => !prev)
            setFilterExpiring(false)
          }}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition hover:shadow-xs ${
            filterLowStock
              ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300'
              : stats.lowStockCount > 0
              ? 'border-rose-200 bg-rose-50/50'
              : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isAr ? 'مواد منخفضة الكمية' : 'Low Stock'}</span>
            <AlertCircle className="size-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {stats.lowStockCount}
            </strong>
            <span className="text-xs text-rose-600">{isAr ? 'بحاجة للطلب' : 'items'}</span>
          </div>
        </div>

        {/* Expiring Alert */}
        <div
          onClick={() => {
            setFilterExpiring((prev) => !prev)
            setFilterLowStock(false)
          }}
          className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition hover:shadow-xs ${
            filterExpiring
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
              : stats.expiringCount > 0
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isAr ? 'اقتراب الصلاحية' : 'Expiring Soon'}</span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className={`text-2xl font-black ${stats.expiringCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {stats.expiringCount}
            </strong>
            <span className="text-xs text-amber-600">{isAr ? 'صنف (≤60 يوم)' : 'items'}</span>
          </div>
        </div>

        {/* Estimated Value */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isAr ? 'قيمة المخزون الإجمالية' : 'Total Stock Value'}</span>
            <Tag className="size-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <strong className="text-2xl font-black text-teal-950 font-mono">
              {formatNumber(stats.totalEstimatedValue)}
            </strong>
            <span className="text-xs font-semibold text-slate-500">{currency}</span>
          </div>
        </div>
      </div>

      {/* Categories Bar & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 font-bold transition active:scale-95 ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            )
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم، المواصفة (A2/A3)، رقم التشغيلة، الموزع...' : 'Search items, shade, batch, supplier...'}
              className="da-input ps-9 pe-3 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            {filterLowStock && (
              <button
                type="button"
                onClick={() => setFilterLowStock(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 font-bold text-rose-800 hover:bg-rose-200 transition"
              >
                <span>{isAr ? 'تصفية: منخفض الكمية' : 'Low stock filtered'}</span>
                <X className="size-3" />
              </button>
            )}

            {filterExpiring && (
              <button
                type="button"
                onClick={() => setFilterExpiring(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 font-bold text-amber-800 hover:bg-amber-200 transition"
              >
                <span>{isAr ? 'تصفية: قريب الصلاحية' : 'Expiring filtered'}</span>
                <X className="size-3" />
              </button>
            )}

            <span className="text-slate-400 font-semibold">
              {items.length} {isAr ? 'مادة مطابقة' : 'matching items'}
            </span>
          </div>
        </div>
      </div>

      {/* Inventory Items List / Table */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          {isAr ? 'جاري تحميل سجل المخزون والمستهلكات...' : 'Loading inventory...'}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Package className="size-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            {isAr ? 'لم يتم العثور على مواد مطابقة في المخزون' : 'No matching inventory items found'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'يمكنك إضافة أصناف جديدة وتحديد الحد الأدنى للتنبيه وإعادة الطلب بنقرة واحدة عبر الواتساب'
              : 'Add new clinical items, set alert thresholds, and reorder from suppliers in one click.'}
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800"
          >
            <Plus className="size-4" />
            <span>{isAr ? 'إضافة مادة جديدة' : 'Add Item'}</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isLow = item.quantity <= item.min_threshold
            const isExpired = Boolean(item.is_expired)
            const isNearExpiry = Boolean(item.is_near_expiry)
            const catMeta = CATEGORIES.find((c) => c.id === item.category)

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4.5 shadow-2xs transition hover:shadow-xs ${
                  isExpired
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : isLow
                    ? 'border-amber-300/90 ring-1 ring-amber-200/80'
                    : 'border-slate-200/90 hover:border-teal-300'
                }`}
              >
                <div>
                  {/* Top Bar: Category badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border ${catMeta?.color || 'bg-slate-100 text-slate-700'}`}>
                      {isAr ? catMeta?.labelAr : catMeta?.labelEn}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Specs */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.name}
                  </h4>
                  {item.specification && (
                    <p className="mt-0.5 text-xs font-semibold text-teal-800">
                      {item.specification}
                    </p>
                  )}

                  {/* Location & Batch */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {item.location && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 border border-slate-100">
                        <MapPin className="size-3 text-slate-400" />
                        <span>{item.location}</span>
                      </span>
                    )}
                    {item.batch_number && (
                      <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-700">
                        {item.batch_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Stock Level, Expiry & WhatsApp Reorder */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  {/* Quantity Counter */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {isAr ? 'الكمية المتوفرة' : 'Current Stock'}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <strong className={`text-xl font-black ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                          {item.quantity}
                        </strong>
                        <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                      </div>
                    </div>

                    {/* Quick +/- Buttons */}
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => void onQuickAdjust(item, -1)}
                        className="flex size-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-700 transition active:scale-95"
                        title={isAr ? 'استهلاك قطعة (-1)' : 'Deduct 1'}
                      >
                        <Minus className="size-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onQuickAdjust(item, 1)}
                        className="flex size-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs hover:bg-teal-50 hover:text-teal-700 transition active:scale-95"
                        title={isAr ? 'إضافة قطعة (+1)' : 'Add 1'}
                      >
                        <Plus className="size-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Badges: Low stock & Expiry */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {isLow && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700 border border-rose-200">
                        <AlertCircle className="size-3" />
                        <span>{isAr ? `نقص المخزون (الحد ${item.min_threshold})` : `Low stock (<${item.min_threshold})`}</span>
                      </span>
                    )}

                    {isExpired && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                        <Clock className="size-3" />
                        <span>{isAr ? 'منتهية الصلاحية!' : 'Expired!'}</span>
                      </span>
                    )}

                    {!isExpired && isNearExpiry && item.expiry_date && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 border border-amber-200">
                        <Clock className="size-3" />
                        <span>{isAr ? `تنتهي: ${item.expiry_date}` : `Exp: ${item.expiry_date}`}</span>
                      </span>
                    )}

                    {!isExpired && !isNearExpiry && item.expiry_date && (
                      <span className="text-slate-400 text-[10px]">
                        {isAr ? 'الصلاحية: ' : 'Exp: '}{item.expiry_date}
                      </span>
                    )}
                  </div>

                  {/* Distributor & 1-Click WhatsApp Reorder */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-100">
                    <div className="truncate text-[11px] text-slate-500">
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'المورد المسجل' : 'Supplier'}</span>
                      <strong className="text-slate-700 font-semibold truncate block">
                        {item.distributor_name || item.distributor_company || (isAr ? 'غير محدد' : 'Not set')}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onReorderViaWhatsApp(item)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-100 active:scale-95"
                      title={isAr ? 'إعادة طلب فوري عبر الواتساب' : '1-Click WhatsApp Reorder'}
                    >
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      <span>{isAr ? 'طلب توريد' : 'Reorder'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <Package className="size-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId
                    ? (isAr ? 'تعديل مادة بالمخزون' : 'Edit Inventory Item')
                    : (isAr ? 'إضافة مادة / مستهلك جديد للمخزون' : 'Add Inventory Item')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              {/* Name & Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'اسم المادة / المستهلك' : 'Item Name'} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={isAr ? 'مثال: بنج أرتيكائين 4%، كمبوزيت 3M Filtek، قفازات نيتريل...' : 'e.g. Articaine 4%, Composite Z350, Nitrile Gloves...'}
                  className="da-input w-full font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'التصنيف السريري' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as InventoryCategory)}
                    className="da-input w-full font-semibold"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.labelAr : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'المواصفة / اللون / المقاس' : 'Specification / Shade / Size'}
                  </label>
                  <input
                    type="text"
                    value={formSpecification}
                    onChange={(e) => setFormSpecification(e.target.value)}
                    placeholder={isAr ? 'مثال: لون A2، مقاس M، 25mm 04...' : 'e.g. Shade A2, Size M, 25mm...'}
                    className="da-input w-full"
                  />
                </div>
              </div>

              {/* Quantity, Unit, Min Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'الكمية المتوفرة الحالية' : 'Current Quantity'} *
                  </label>
                  <input
                    type="number"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="da-input w-full font-bold text-teal-900 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'وحدة القياس' : 'Unit'}
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="da-input w-full font-semibold"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-amber-900 block mb-1">
                    {isAr ? 'الحد الأدنى للتنبيه' : 'Alert Min Threshold'} *
                  </label>
                  <input
                    type="number"
                    value={formMinThreshold}
                    onChange={(e) => setFormMinThreshold(e.target.value ? Number(e.target.value) : '')}
                    placeholder="5"
                    className="da-input w-full border-amber-300 bg-amber-50/30 font-bold"
                  />
                </div>
              </div>

              {/* Cost & Distributor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'سعر التكلفة للوحدة' : 'Cost Per Unit'} ({currency})
                  </label>
                  <input
                    type="number"
                    value={formCostPerUnit}
                    onChange={(e) => setFormCostPerUnit(e.target.value ? Number(e.target.value) : '')}
                    className="da-input w-full font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'المورد / الموزع المعتمد' : 'Linked Distributor'}
                  </label>
                  <select
                    value={formDistributorId}
                    onChange={(e) => setFormDistributorId(e.target.value ? Number(e.target.value) : '')}
                    className="da-input w-full font-semibold"
                  >
                    <option value="">{isAr ? 'بدون موزع محدد' : 'No distributor'}</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.company ? `(${d.company})` : ''} {d.phone ? ` - ${d.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expiry Date, Batch & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="da-input w-full font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'رقم التشغيلة (Batch/Lot)' : 'Batch / Lot'}
                  </label>
                  <input
                    type="text"
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    placeholder="LOT-9921"
                    className="da-input w-full font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'مكان التخزين بالعيادة' : 'Storage Location'}
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder={isAr ? 'خزانة 1، ثلاجة التخدير، درج 2...' : 'Cabinet 1, fridge, drawer 2...'}
                    className="da-input w-full"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="da-input w-full"
                  placeholder={isAr ? 'تعليمات التخزين أو ملاحظات التوريد...' : 'Storage instructions...'}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="da-btn-secondary !px-4 !py-2 text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSave()}
                className="da-btn-primary !px-5 !py-2 text-xs font-bold"
              >
                {busy
                  ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                  : editingId
                  ? (isAr ? 'حفظ التعديلات' : 'Save Changes')
                  : (isAr ? 'إضافة إلى المخزون' : 'Add to Stock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
