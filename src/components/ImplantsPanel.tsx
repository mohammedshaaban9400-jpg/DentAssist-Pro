import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link2,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import type { DentalImplant, ImplantStatus } from '@/types/clinical'
import {
  getConfigs,
  readUserDataFileDataUrl,
  listDentalImplants,
  createDentalImplant,
  updateDentalImplant,
  deleteDentalImplant,
} from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { ImplantPassportDocument, type ImplantPassportDocumentProps } from '@/components/ImplantPassportDocument'

const COMMON_BRANDS = [
  'Straumann',
  'Osstem',
  'Dentium',
  'MegaGen',
  'Nobel Biocare',
  'Zimmer Biomet',
  'Neodent',
  'BioHorizons',
  'DIO',
  'MIS',
  'Bicon',
] as const

const DIAMETER_PRESETS = [3.0, 3.3, 3.5, 3.8, 4.0, 4.3, 4.5, 4.8, 5.0, 5.5, 6.0]
const LENGTH_PRESETS = [7.0, 8.0, 8.5, 10.0, 11.5, 12.0, 13.0, 14.0, 15.0]

const FDI_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const FDI_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const FDI_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
const FDI_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]

type Props = {
  patientId: number
  patientDisplayName: string
  patientPhone: string | null
  onImplantsChange?: (count: number) => void
  requestOpenNewModal?: boolean
  onRequestOpenHandled?: () => void
}

export function ImplantsPanel({
  patientId,
  patientDisplayName,
  patientPhone,
  onImplantsChange,
  requestOpenNewModal,
  onRequestOpenHandled,
}: Props) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()

  const [implants, setImplants] = useState<DentalImplant[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // Form State
  const [toothNumber, setToothNumber] = useState(16)
  const [brand, setBrand] = useState('Straumann')
  const [customBrand, setCustomBrand] = useState('')
  const [model, setModel] = useState('')
  const [diameterMm, setDiameterMm] = useState(4.0)
  const [lengthMm, setLengthMm] = useState(10.0)
  const [lotNumber, setLotNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [insertionTorqueNcm, setInsertionTorqueNcm] = useState<number | ''>(35)
  const [isqValue, setIsqValue] = useState<number | ''>('')
  const [boneGraftType, setBoneGraftType] = useState('None')
  const [membraneUsed, setMembraneUsed] = useState(false)
  const [sinusLift, setSinusLift] = useState('None')
  const [placementDate, setPlacementDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [healingPeriodMonths, setHealingPeriodMonths] = useState(3)
  const [targetLoadingDate, setTargetLoadingDate] = useState('')
  const [healingAbutmentDate, setHealingAbutmentDate] = useState('')
  const [healingAbutmentSize, setHealingAbutmentSize] = useState('')
  const [finalLoadingDate, setFinalLoadingDate] = useState('')
  const [prostheticType, setProstheticType] = useState('Screw-retained Zirconia')
  const [status, setStatus] = useState<ImplantStatus>('healing')
  const [notes, setNotes] = useState('')

  // Printing state
  const printRef = useRef<HTMLDivElement>(null)
  const [printSnap, setPrintSnap] = useState<ImplantPassportDocumentProps | null>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: isAr ? `Implant-Passport-${patientDisplayName}` : `Implant-Passport-${patientDisplayName}`,
    onAfterPrint: () => setPrintSnap(null),
  })

  // Auto-compute target loading date from placement date and healing months
  useEffect(() => {
    if (!placementDate) return
    try {
      const d = new Date(placementDate)
      d.setMonth(d.getMonth() + Number(healingPeriodMonths || 3))
      setTargetLoadingDate(d.toISOString().slice(0, 10))
    } catch {
      // ignore
    }
  }, [placementDate, healingPeriodMonths])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listDentalImplants(patientId)
      setImplants(list)
      onImplantsChange?.(list.length)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [patientId, push, onImplantsChange])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (requestOpenNewModal) {
      openNewModal()
      onRequestOpenHandled?.()
    }
  }, [requestOpenNewModal, onRequestOpenHandled])

  const openNewModal = () => {
    setEditingId(null)
    setToothNumber(16)
    setBrand('Straumann')
    setCustomBrand('')
    setModel('BLX Roxolid')
    setDiameterMm(4.0)
    setLengthMm(10.0)
    setLotNumber(`LOT-${Math.floor(100000 + Math.random() * 900000)}`)
    setSerialNumber('')
    setInsertionTorqueNcm(35)
    setIsqValue(68)
    setBoneGraftType('None')
    setMembraneUsed(false)
    setSinusLift('None')
    const today = new Date().toISOString().slice(0, 10)
    setPlacementDate(today)
    setHealingPeriodMonths(3)
    const target = new Date(today)
    target.setMonth(target.getMonth() + 3)
    setTargetLoadingDate(target.toISOString().slice(0, 10))
    setHealingAbutmentDate('')
    setHealingAbutmentSize('')
    setFinalLoadingDate('')
    setProstheticType('Screw-retained Zirconia')
    setStatus('healing')
    setNotes('')
    setModalOpen(true)
  }

  const openEditModal = (imp: DentalImplant) => {
    setEditingId(imp.id)
    setToothNumber(imp.tooth_number)
    if (COMMON_BRANDS.includes(imp.brand as any)) {
      setBrand(imp.brand)
      setCustomBrand('')
    } else {
      setBrand('Other')
      setCustomBrand(imp.brand)
    }
    setModel(imp.model || '')
    setDiameterMm(imp.diameter_mm)
    setLengthMm(imp.length_mm)
    setLotNumber(imp.lot_number || '')
    setSerialNumber(imp.serial_number || '')
    setInsertionTorqueNcm(imp.insertion_torque_ncm ?? '')
    setIsqValue(imp.isq_value ?? '')
    setBoneGraftType(imp.bone_graft_type || 'None')
    setMembraneUsed(Boolean(imp.membrane_used))
    setSinusLift(imp.sinus_lift || 'None')
    setPlacementDate(imp.placement_date)
    setHealingPeriodMonths(imp.healing_period_months)
    setTargetLoadingDate(imp.target_loading_date || '')
    setHealingAbutmentDate(imp.healing_abutment_date || '')
    setHealingAbutmentSize(imp.healing_abutment_size || '')
    setFinalLoadingDate(imp.final_loading_date || '')
    setProstheticType(imp.prosthetic_type || 'Screw-retained Zirconia')
    setStatus(imp.status)
    setNotes(imp.notes || '')
    setModalOpen(true)
  }

  const onSave = async () => {
    const finalBrand = (brand === 'Other' ? customBrand.trim() : brand) || 'Generic'
    if (!finalBrand) {
      push(isAr ? 'يرجى تحديد الشركة المصنعة للزرعة.' : 'Specify implant brand.', 'error')
      return
    }
    if (!toothNumber) {
      push(isAr ? 'يرجى تحديد رقم السن.' : 'Select tooth number.', 'error')
      return
    }

    setBusy(true)
    try {
      const payload = {
        toothNumber,
        brand: finalBrand,
        model: model.trim() || null,
        diameterMm: Number(diameterMm),
        lengthMm: Number(lengthMm),
        lotNumber: lotNumber.trim() || null,
        serialNumber: serialNumber.trim() || null,
        insertionTorqueNcm: insertionTorqueNcm === '' ? null : Number(insertionTorqueNcm),
        isqValue: isqValue === '' ? null : Number(isqValue),
        boneGraftType: boneGraftType === 'None' ? null : boneGraftType,
        membraneUsed: membraneUsed ? 1 : 0,
        sinusLift: sinusLift === 'None' ? null : sinusLift,
        placementDate,
        healingPeriodMonths: Number(healingPeriodMonths),
        targetLoadingDate: targetLoadingDate || null,
        healingAbutmentDate: healingAbutmentDate || null,
        healingAbutmentSize: healingAbutmentSize.trim() || null,
        finalLoadingDate: finalLoadingDate || null,
        prostheticType: prostheticType.trim() || null,
        status,
        notes: notes.trim() || null,
      }

      if (editingId) {
        await updateDentalImplant(editingId, payload)
        push(isAr ? 'تم تحديث بيانات الزرعة بنجاح.' : 'Implant updated successfully.', 'success')
      } else {
        await createDentalImplant({
          patientId,
          ...payload,
        })
        push(isAr ? 'تم تسجيل الزرعة السنية بنجاح.' : 'Dental implant recorded successfully.', 'success')
      }

      setModalOpen(false)
      await load()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (imp: DentalImplant) => {
    const ok = await confirm(
      isAr
        ? `هل أنت متأكد من حذف الزرعة السنية للسن #${imp.tooth_number} (${imp.brand})؟`
        : `Delete implant for tooth #${imp.tooth_number} (${imp.brand})?`,
      { title: isAr ? 'حذف الزرعة السنية' : 'Delete Dental Implant', isDestructive: true },
    )
    if (!ok) return

    try {
      await deleteDentalImplant(imp.id)
      push(isAr ? 'تم حذف الزرعة.' : 'Implant deleted.', 'success')
      await load()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const onPrintPassport = async (imp: DentalImplant) => {
    try {
      const cfg = await getConfigs(['clinic_name', 'clinic_phone', 'clinic_address', 'doctor_name', 'clinic_logo_rel_path'])
      let logoDataUrl: string | null = null
      if (cfg.clinic_logo_rel_path) {
        logoDataUrl = await readUserDataFileDataUrl(cfg.clinic_logo_rel_path)
      }
      setPrintSnap({
        clinicName: cfg.clinic_name || 'عيادة طب وزراعة الأسنان',
        clinicPhone: cfg.clinic_phone || '',
        clinicAddress: cfg.clinic_address || '',
        doctorName: cfg.doctor_name || '',
        logoDataUrl,
        patientName: patientDisplayName,
        patientPhone,
        implant: imp,
        isAr,
      })
      setTimeout(() => {
        handlePrint()
      }, 100)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  // Quick stats
  const stats = useMemo(() => {
    const total = implants.length
    const healing = implants.filter((i) => i.status === 'healing' || i.status === 'placed').length
    const restored = implants.filter((i) => i.status === 'restored').length
    const torques = implants.map((i) => i.insertion_torque_ncm).filter((t): t is number => typeof t === 'number')
    const avgTorque = torques.length > 0 ? Math.round(torques.reduce((a, b) => a + b, 0) / torques.length) : null
    return { total, healing, restored, avgTorque }
  }, [implants])

  return (
    <div className="space-y-4">
      {/* Header & Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200/80 bg-linear-to-r from-teal-900 via-teal-800 to-cyan-900 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs ring-1 ring-white/20">
            <ShieldCheck className="size-6 text-teal-300" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>{isAr ? 'سجل زراعة الأسنان والجراحة' : 'Implantology Tracker'}</span>
              <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-xs font-semibold text-teal-200">
                {implants.length} {isAr ? 'زرعة' : 'implants'}
              </span>
            </h3>
            <p className="text-xs text-teal-200/80">
              {isAr
                ? 'توثيق مواصفات الزرعات، قوة الشد، أرقام الدفعات، وجواز سفر الضمان'
                : 'Implant specifications, torque, batch traceability & patient passport'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-400 px-4 py-2 text-xs font-bold text-teal-950 shadow-md transition hover:bg-teal-300 active:scale-95"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>{isAr ? 'إضافة زرعة سنية جديدة' : 'Add New Implant'}</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            {isAr ? 'إجمالي الزرعات' : 'Total Implants'}
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-bold text-slate-900">{stats.total}</strong>
            <span className="text-[11px] text-slate-400">{isAr ? 'زرعة مسجلة' : 'units'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 block mb-1">
            {isAr ? 'قيد الاندماج العظمي' : 'Osseointegrating'}
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-bold text-amber-900">{stats.healing}</strong>
            <span className="text-[11px] text-amber-700">{isAr ? 'قيد الشفاء' : 'healing'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 block mb-1">
            {isAr ? 'تم التحميل والتاج النهائي' : 'Restored / Loaded'}
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-bold text-emerald-900">{stats.restored}</strong>
            <span className="text-[11px] text-emerald-700">{isAr ? 'مكتملة' : 'completed'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/50 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-cyan-800 block mb-1">
            {isAr ? 'متوسط قوة الشد (Torque)' : 'Average Torque'}
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-bold text-cyan-900">
              {stats.avgTorque ? `${stats.avgTorque}` : '—'}
            </strong>
            <span className="text-[11px] text-cyan-700">{stats.avgTorque ? 'N.cm' : ''}</span>
          </div>
        </div>
      </div>

      {/* Implants List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {isAr ? 'جاري تحميل سجل الزرعات...' : 'Loading implants...'}
        </div>
      ) : implants.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <ShieldCheck className="size-6" />
          </div>
          <p className="font-semibold text-slate-800">
            {isAr ? 'لا توجد زرعات سنية مسجلة لهذا المريض بعد' : 'No dental implants recorded for this patient yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isAr
              ? 'يمكنك تسجيل الزرعات السنية بدقة ومتابعة مواعيد الاندماج العظمي وطباعة جواز سفر الضمان'
              : 'Add implants to track diameter, length, lot number, stability torque and print passports.'}
          </p>
          <button
            type="button"
            onClick={openNewModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800"
          >
            <Plus className="size-3.5" />
            <span>{isAr ? 'تسجيل أول زرعة للمريض' : 'Record First Implant'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {implants.map((imp) => {
            const isRestored = imp.status === 'restored'
            const isHealing = imp.status === 'healing' || imp.status === 'placed'
            const isHighTorque = (imp.insertion_torque_ncm ?? 0) >= 35

            return (
              <div
                key={imp.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-teal-300 hover:shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-teal-800 text-white font-black text-base shadow-xs">
                      #{imp.tooth_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold text-base">{imp.brand}</strong>
                        {imp.model && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {imp.model}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isRestored
                              ? 'bg-emerald-100 text-emerald-800'
                              : isHealing
                              ? 'bg-amber-100 text-amber-800'
                              : imp.status === 'uncovered'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {imp.status === 'planned' && (isAr ? 'مخطط لها' : 'Planned')}
                          {imp.status === 'placed' && (isAr ? 'تمت الزراعة' : 'Placed')}
                          {imp.status === 'healing' && (isAr ? 'قيد الاندماج العظمي' : 'Healing')}
                          {imp.status === 'uncovered' && (isAr ? 'كشف الزرعة ودعامة الشفاء' : 'Uncovered')}
                          {imp.status === 'restored' && (isAr ? 'تم تركيب التاج النهائي' : 'Restored')}
                          {imp.status === 'failed' && (isAr ? 'فشلت' : 'Failed')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isAr ? 'تاريخ العملية:' : 'Placement:'} {imp.placement_date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onPrintPassport(imp)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition shadow-2xs"
                      title={isAr ? 'طباعة جواز سفر الزرعة السنية وشهادة الضمان' : 'Print Implant Passport'}
                    >
                      <Printer className="size-3.5 text-teal-700" />
                      <span>{isAr ? 'جواز سفر الزرعة' : 'Passport'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(imp)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Link2 className="size-3.5" />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(imp)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specs chips */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">{isAr ? 'القياسات' : 'Dimensions'}</span>
                    <strong className="text-slate-800 font-mono">
                      Ø {imp.diameter_mm} × {imp.length_mm} mm
                    </strong>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">{isAr ? 'رقم التشغيلة (Lot)' : 'Lot Number'}</span>
                    <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {imp.lot_number || '—'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">{isAr ? 'قوة الشد (Torque)' : 'Stability'}</span>
                    <strong className={isHighTorque ? 'text-emerald-700 font-bold' : 'text-slate-800'}>
                      {imp.insertion_torque_ncm ? `${imp.insertion_torque_ncm} N.cm` : '—'}
                      {imp.isq_value ? ` | ISQ ${imp.isq_value}` : ''}
                    </strong>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">{isAr ? 'تاريخ الاندماج المقدر' : 'Loading Date'}</span>
                    <strong className="text-teal-900 font-semibold">
                      {imp.target_loading_date || `${imp.healing_period_months} أشهر`}
                    </strong>
                  </div>
                </div>

                {/* Surgical & Prosthetic info */}
                {(imp.bone_graft_type || imp.membrane_used || imp.sinus_lift || imp.prosthetic_type || imp.notes) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    {imp.bone_graft_type && (
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-800 border border-teal-200">
                        {isAr ? 'طعم عظمي: ' : 'Graft: '}{imp.bone_graft_type}
                      </span>
                    )}
                    {imp.membrane_used ? (
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-800 border border-teal-200">
                        {isAr ? 'غشاء كولاجين' : 'Collagen Membrane'}
                      </span>
                    ) : null}
                    {imp.sinus_lift && imp.sinus_lift !== 'None' && (
                      <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-cyan-800 border border-cyan-200">
                        {isAr ? 'رفع جيب فكي: ' : 'Sinus Lift: '}{imp.sinus_lift}
                      </span>
                    )}
                    {imp.prosthetic_type && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700 font-medium">
                        {imp.prosthetic_type}
                      </span>
                    )}
                    {imp.notes && <span className="italic text-slate-500">"{imp.notes}"</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Implant Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-teal-800 text-white">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId
                    ? (isAr ? 'تعديل بيانات الزرعة السنية' : 'Edit Dental Implant')
                    : (isAr ? 'تسجيل زرعة سنية جديدة' : 'Add New Dental Implant')}
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

            <div className="mt-4 space-y-4 text-xs">
              {/* Tooth Picker (FDI) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isAr ? 'رقم السن (نظام ترقيم FDI الدولي):' : 'Tooth Number (FDI):'} #{toothNumber}
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{isAr ? 'الفك العلوي (يمين المريض)' : 'Upper Right'}</span>
                    <span>{isAr ? 'الفك العلوي (يسار المريض)' : 'Upper Left'}</span>
                  </div>
                  <div className="flex justify-between gap-1 overflow-x-auto pb-1">
                    <div className="flex gap-1">
                      {FDI_UPPER_RIGHT.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setToothNumber(t)}
                          className={`size-7 rounded-lg text-xs font-bold transition ${
                            toothNumber === t
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {FDI_UPPER_LEFT.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setToothNumber(t)}
                          className={`size-7 rounded-lg text-xs font-bold transition ${
                            toothNumber === t
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 border-t border-slate-200">
                    <span>{isAr ? 'الفك السفلي (يمين المريض)' : 'Lower Right'}</span>
                    <span>{isAr ? 'الفك السفلي (يسار المريض)' : 'Lower Left'}</span>
                  </div>
                  <div className="flex justify-between gap-1 overflow-x-auto pb-1">
                    <div className="flex gap-1">
                      {FDI_LOWER_RIGHT.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setToothNumber(t)}
                          className={`size-7 rounded-lg text-xs font-bold transition ${
                            toothNumber === t
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {FDI_LOWER_LEFT.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setToothNumber(t)}
                          className={`size-7 rounded-lg text-xs font-bold transition ${
                            toothNumber === t
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'الشركة المصنعة للزرعة (Brand)' : 'Implant Brand'}
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="da-input w-full font-semibold"
                  >
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="Other">{isAr ? 'شركة أخرى (تحديد يدوي)' : 'Other brand...'}</option>
                  </select>
                  {brand === 'Other' && (
                    <input
                      type="text"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder={isAr ? 'اكتب اسم الشركة المصنعة' : 'Manufacturer name'}
                      className="da-input w-full mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'الموديل / النظام (Model/System)' : 'System / Model'}
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="BLX, TS III, SuperLine, AnyRidge..."
                    className="da-input w-full"
                  />
                </div>
              </div>

              {/* Dimensions: Diameter & Length */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'قطر الزرعة (Diameter mm)' : 'Diameter (mm)'}: Ø {diameterMm} mm
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {DIAMETER_PRESETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiameterMm(d)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          diameterMm === d ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={diameterMm}
                    onChange={(e) => setDiameterMm(Number(e.target.value))}
                    className="da-input w-full"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'طول الزرعة (Length mm)' : 'Length (mm)'}: {lengthMm} mm
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {LENGTH_PRESETS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLengthMm(l)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          lengthMm === l ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    value={lengthMm}
                    onChange={(e) => setLengthMm(Number(e.target.value))}
                    className="da-input w-full"
                  />
                </div>
              </div>

              {/* Lot / Batch & Stability */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-amber-900 block mb-1">
                    {isAr ? 'رقم التشغيلة / الدفعة (Lot/Batch)' : 'Lot / Batch Number'} *
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="LOT-123456"
                    className="da-input w-full border-amber-300 bg-amber-50/30 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'قوة الشد الأولي (Torque N.cm)' : 'Insertion Torque (N.cm)'}
                  </label>
                  <input
                    type="number"
                    value={insertionTorqueNcm}
                    onChange={(e) => setInsertionTorqueNcm(e.target.value ? Number(e.target.value) : '')}
                    placeholder="35, 45 N.cm"
                    className="da-input w-full font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'ثبات ISQ (Implant Stability)' : 'ISQ Stability'}
                  </label>
                  <input
                    type="number"
                    value={isqValue}
                    onChange={(e) => setIsqValue(e.target.value ? Number(e.target.value) : '')}
                    placeholder="65, 72..."
                    className="da-input w-full font-semibold"
                  />
                </div>
              </div>

              {/* Surgical Extras */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'التطعيم العظمي (Bone Graft)' : 'Bone Graft'}
                  </label>
                  <select
                    value={boneGraftType}
                    onChange={(e) => setBoneGraftType(e.target.value)}
                    className="da-input w-full"
                  >
                    <option value="None">{isAr ? 'بدون طعم عظمي' : 'None'}</option>
                    <option value="Bio-Oss (Xenograft)">Bio-Oss (Xenograft)</option>
                    <option value="Autogenous">{isAr ? 'طعم ذاتي (Autogenous)' : 'Autogenous'}</option>
                    <option value="Allograft">{isAr ? 'طعم متجانس (Allograft)' : 'Allograft'}</option>
                    <option value="Synthetic (Beta-TCP)">Synthetic (Beta-TCP)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'رفع الجيب الفكي (Sinus Lift)' : 'Sinus Lift'}
                  </label>
                  <select
                    value={sinusLift}
                    onChange={(e) => setSinusLift(e.target.value)}
                    className="da-input w-full"
                  >
                    <option value="None">{isAr ? 'لا يوجد' : 'None'}</option>
                    <option value="Crestal">{isAr ? 'رفع قمي مغلق (Crestal)' : 'Crestal (Closed)'}</option>
                    <option value="Lateral">{isAr ? 'رفع جانبي مفتوح (Lateral)' : 'Lateral (Open)'}</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={membraneUsed}
                      onChange={(e) => setMembraneUsed(e.target.checked)}
                      className="size-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>{isAr ? 'تم استخدام غشاء كولاجين' : 'Collagen Membrane Used'}</span>
                  </label>
                </div>
              </div>

              {/* Timeline & Phase */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'تاريخ الزراعة (Placement)' : 'Placement Date'}
                  </label>
                  <input
                    type="date"
                    value={placementDate}
                    onChange={(e) => setPlacementDate(e.target.value)}
                    className="da-input w-full font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'فترة الالتئام بالأشهر' : 'Healing Months'}
                  </label>
                  <select
                    value={healingPeriodMonths}
                    onChange={(e) => setHealingPeriodMonths(Number(e.target.value))}
                    className="da-input w-full font-semibold"
                  >
                    <option value="2">2 {isAr ? 'شهرين (الفك السفلي عالي الكثافة)' : 'months'}</option>
                    <option value="3">3 {isAr ? 'أشهر (الافتراضي القياسي)' : 'months (Standard)'}</option>
                    <option value="4">4 {isAr ? 'أشهر' : 'months'}</option>
                    <option value="6">6 {isAr ? 'أشهر (الفك العلوي أو بعد تطعيم)' : 'months (Maxilla / Graft)'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'موعد الاندماج والتحميل' : 'Target Loading Date'}
                  </label>
                  <input
                    type="date"
                    value={targetLoadingDate}
                    onChange={(e) => setTargetLoadingDate(e.target.value)}
                    className="da-input w-full font-semibold text-teal-900"
                  />
                </div>
              </div>

              {/* Status & Prosthetics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'الحالة الحالية للزرعة' : 'Implant Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ImplantStatus)}
                    className="da-input w-full font-bold text-teal-900"
                  >
                    <option value="planned">{isAr ? 'مخطط لها (Planned)' : 'Planned'}</option>
                    <option value="placed">{isAr ? 'تمت الزراعة (Placed)' : 'Placed'}</option>
                    <option value="healing">{isAr ? 'قيد الاندماج العظمي (Healing)' : 'Healing'}</option>
                    <option value="uncovered">{isAr ? 'كشف الزرعة ودعامة الشفاء' : 'Uncovered / Gingival former'}</option>
                    <option value="restored">{isAr ? 'تم تركيب التاج النهائي (Restored)' : 'Restored / Loaded'}</option>
                    <option value="failed">{isAr ? 'فشلت (Failed)' : 'Failed'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'التعويض النهائي (Prosthetic)' : 'Final Prosthetic'}
                  </label>
                  <input
                    type="text"
                    value={prostheticType}
                    onChange={(e) => setProstheticType(e.target.value)}
                    placeholder="Screw-retained Zirconia, Cement-retained..."
                    className="da-input w-full"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'تاريخ التاج النهائي' : 'Crown Delivery Date'}
                  </label>
                  <input
                    type="date"
                    value={finalLoadingDate}
                    onChange={(e) => setFinalLoadingDate(e.target.value)}
                    className="da-input w-full"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isAr ? 'ملاحظات سريرية وجراحية' : 'Clinical / Surgical Notes'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={isAr ? 'ملاحظات حول كثافة العظم D1-D4، نوع الخياطة، الأشعة المرافقة...' : 'Bone density D1-D4, suture details, radiograph notes...'}
                  className="da-input w-full"
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
                  : (isAr ? 'تسجيل الزرعة' : 'Record Implant')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for printing passport */}
      <div className="fixed start-[-12000px] top-0 -z-10" aria-hidden>
        {printSnap ? <ImplantPassportDocument ref={printRef} {...printSnap} /> : null}
      </div>

      {confirmModal}
    </div>
  )
}
