import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { TreatmentCatalogItem } from '@/types/clinical'
import {
  createTreatmentCatalogItem,
  deleteTreatmentCatalogItem,
  listTreatmentCatalog,
  updateTreatmentCatalogItem,
} from '@/services/dbService'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'

const CATEGORIES = [
  { id: 'all', labelAr: 'كافة الأقسام', labelEn: 'All Categories' },
  { id: 'restorative', labelAr: 'حشوات وترميم', labelEn: 'Restorative' },
  { id: 'endodontics', labelAr: 'علاج عصب وجذور', labelEn: 'Endodontics' },
  { id: 'prosthetics', labelAr: 'تعويضات وتيجان', labelEn: 'Prosthetics' },
  { id: 'implants', labelAr: 'زراعة الأسنان', labelEn: 'Implants' },
  { id: 'surgery', labelAr: 'جراحة وقلع', labelEn: 'Oral Surgery' },
  { id: 'periodontics', labelAr: 'لثة وتنظيف', labelEn: 'Periodontics' },
  { id: 'cosmetic', labelAr: 'تجميل وتبييض', labelEn: 'Cosmetics' },
  { id: 'preventive', labelAr: 'وقاية وأطفال', labelEn: 'Preventive' },
  { id: 'other', labelAr: 'إجراءات أخرى', labelEn: 'Other' },
]

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onItemUpdated?: () => void
}

export function TreatmentCatalogModal({ isOpen, onClose, onItemUpdated }: Props) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { currency } = useSettingsStore()
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()

  const [items, setItems] = useState<TreatmentCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState('all')

  // Edit/Add Submodal State
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formCategory, setFormCategory] = useState('restorative')
  const [formCode, setFormCode] = useState('')
  const [formNameAr, setFormNameAr] = useState('')
  const [formNameEn, setFormNameEn] = useState('')
  const [formCost, setFormCost] = useState<number | ''>(150000)
  const [formDescription, setFormDescription] = useState('')
  const [formDuration, setFormDuration] = useState<number | ''>(30)
  const [formActive, setFormActive] = useState(1)
  const [busy, setBusy] = useState(false)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTreatmentCatalog({
        category: selectedCat === 'all' ? undefined : selectedCat,
        query: query.trim() || undefined,
        activeOnly: false,
      })
      setItems(data)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedCat, query, push])

  useEffect(() => {
    if (isOpen) {
      void loadCatalog()
    }
  }, [isOpen, loadCatalog])

  const openAddSubModal = () => {
    setEditingId(null)
    setFormCategory(selectedCat !== 'all' ? selectedCat : 'restorative')
    setFormCode('')
    setFormNameAr('')
    setFormNameEn('')
    setFormCost(150000)
    setFormDescription('')
    setFormDuration(30)
    setFormActive(1)
    setSubModalOpen(true)
  }

  const openEditSubModal = (it: TreatmentCatalogItem) => {
    setEditingId(it.id)
    setFormCategory(it.category)
    setFormCode(it.code || '')
    setFormNameAr(it.name_ar)
    setFormNameEn(it.name_en)
    setFormCost(it.default_cost)
    setFormDescription(it.description || '')
    setFormDuration(it.duration_minutes)
    setFormActive(it.is_active)
    setSubModalOpen(true)
  }

  const onSaveItem = async () => {
    const nameAr = formNameAr.trim()
    const nameEn = formNameEn.trim() || nameAr
    if (!nameAr) {
      push(isAr ? 'يرجى إدخال اسم الإجراء العلاجي.' : 'Procedure name is required.', 'error')
      return
    }

    setBusy(true)
    try {
      const payload = {
        category: formCategory,
        code: formCode.trim() || null,
        nameAr,
        nameEn,
        defaultCost: Number(formCost || 0),
        description: formDescription.trim() || null,
        durationMinutes: Number(formDuration || 30),
        isActive: formActive,
      }

      if (editingId) {
        await updateTreatmentCatalogItem(editingId, payload)
        push(isAr ? 'تم تحديث الإجراء وقائمته بنجاح.' : 'Procedure updated.', 'success')
      } else {
        await createTreatmentCatalogItem(payload)
        push(isAr ? 'تمت إضافة الإجراء إلى قائمة الأسعار.' : 'Procedure added to fee catalog.', 'success')
      }

      setSubModalOpen(false)
      await loadCatalog()
      onItemUpdated?.()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDeleteItem = async (it: TreatmentCatalogItem) => {
    const ok = await confirm(
      isAr
        ? `هل أنت متأكد من حذف الإجراء "${it.name_ar}" من قائمة الأسعار؟`
        : `Delete "${it.name_ar}" from fee catalog?`,
      { title: isAr ? 'حذف إجراء علاجي' : 'Delete Procedure', danger: true },
    )
    if (!ok) return

    try {
      await deleteTreatmentCatalogItem(it.id)
      push(isAr ? 'تم حذف الإجراء.' : 'Procedure deleted.', 'success')
      await loadCatalog()
      onItemUpdated?.()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/90 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs">
              <Receipt className="size-5.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'قائمة الإجراءات والأسعار الموحدة بالعيادة (Fee Schedule)' : 'Clinic Treatment Catalog & Fee Schedule'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'تعريف الأسعار الافتراضية للإجراءات ليتم تنزيلها تلقائياً عند إنشاء الخطة العلاجية للمريض'
                  : 'Define standard procedure fees for 1-click automatic fill in patient treatment plans'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="border-b border-slate-100 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الكود، الوصف...' : 'Search procedure name, code...'}
                className="da-input ps-9 pe-3 text-xs w-full"
              />
            </div>

            <button
              type="button"
              onClick={openAddSubModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition active:scale-95"
            >
              <Plus className="size-4" />
              <span>{isAr ? 'إضافة إجراء جديد' : 'Add Procedure'}</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`shrink-0 rounded-lg px-3 py-1 font-bold transition active:scale-95 ${
                  selectedCat === cat.id
                    ? 'bg-teal-800 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Procedures Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {isAr ? 'جاري تحميل قائمة الأسعار...' : 'Loading fee catalog...'}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-700">
                {isAr ? 'لا توجد إجراءات مطابقة' : 'No procedures found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 font-mono text-xs font-bold">
                      {it.code || 'PR'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{it.name_ar}</strong>
                        {it.name_en && it.name_en !== it.name_ar && (
                          <span className="text-xs text-slate-500 font-medium">({it.name_en})</span>
                        )}
                        {!it.is_active && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-500">
                            {isAr ? 'غير مفعّل' : 'Inactive'}
                          </span>
                        )}
                      </div>
                      {it.description && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{it.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{it.category}</span>
                        <span>•</span>
                        <span>{it.duration_minutes} {isAr ? 'دقيقة تقريباً' : 'mins'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-end">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {isAr ? 'السعر الافتراضي' : 'Default Cost'}
                      </span>
                      <strong className="text-sm font-bold font-mono text-teal-900">
                        {formatNumber(it.default_cost)} <span className="text-xs font-normal text-slate-500">{currency}</span>
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditSubModal(it)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title={isAr ? 'تعديل السعر أو البيانات' : 'Edit'}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteItem(it)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
          <span>{items.length} {isAr ? 'إجراء مسجل في قائمة أسعار العيادة' : 'catalog items'}</span>
          <button
            type="button"
            onClick={onClose}
            className="da-btn-secondary !px-4 !py-1.5 font-semibold"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* Add / Edit Submodal */}
      {subModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId
                  ? (isAr ? 'تعديل الإجراء والسعر في القائمة' : 'Edit Procedure')
                  : (isAr ? 'إضافة إجراء جديد لقائمة أسعار العيادة' : 'Add Procedure')}
              </h3>
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'القسم / التصنيف' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
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
                    {isAr ? 'كود الإجراء (اختياري)' : 'Code (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="REST-01, ENDO-01..."
                    className="da-input w-full font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'اسم الإجراء بالعربية' : 'Arabic Name'} *
                </label>
                <input
                  type="text"
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder={isAr ? 'مثال: حشوة ضوئية كمبوزيت سطحين...' : 'e.g. Composite 2 surfaces...'}
                  className="da-input w-full font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'اسم الإجراء بالإنجليزية' : 'English Name'}
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="Composite Restoration - 2 surfaces..."
                  className="da-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-teal-900 block mb-1">
                    {isAr ? 'السعر الافتراضي المحدد' : 'Default Cost'} ({currency}) *
                  </label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value ? Number(e.target.value) : '')}
                    className="da-input w-full font-bold text-teal-900 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'المدة التقديرية (بالدقائق)' : 'Duration (Minutes)'}
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value ? Number(e.target.value) : '')}
                    className="da-input w-full font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'الوصف والتفاصيل السريرية' : 'Description'}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder={isAr ? 'وصف الإجراء، المواد المستخدمة، الخطوات...' : 'Procedure description...'}
                  className="da-input w-full"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSubModalOpen(false)}
                className="da-btn-secondary !px-4 !py-1.5 text-xs font-semibold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSaveItem()}
                className="da-btn-primary !px-5 !py-1.5 text-xs font-bold"
              >
                {busy ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإجراء' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
