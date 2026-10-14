import { forwardRef } from 'react'
import type { DentalImplant } from '@/types/clinical'
import { ShieldCheck, Award, CheckCircle } from 'lucide-react'

export type ImplantPassportDocumentProps = {
  clinicName: string
  clinicPhone: string
  clinicAddress: string
  doctorName?: string
  logoDataUrl: string | null
  patientName: string
  patientPhone: string | null
  implant: DentalImplant
  isAr?: boolean
}

export const ImplantPassportDocument = forwardRef<HTMLDivElement, ImplantPassportDocumentProps>(
  function ImplantPassportDocument(
    { clinicName, clinicPhone, clinicAddress, doctorName, logoDataUrl, patientName, patientPhone, implant, isAr = true },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="bg-white p-8 text-slate-900 print:p-8"
        style={{ width: '210mm', minHeight: '290mm', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Certificate Outer Border */}
        <div className="relative h-full rounded-2xl border-4 border-double border-teal-800/40 p-8 shadow-sm">
          {/* Watermark Emblem */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
            <ShieldCheck className="size-96 text-teal-900" />
          </div>

          {/* Header */}
          <header className="relative flex items-center justify-between border-b-2 border-teal-700/30 pb-6">
            <div className="flex items-center gap-4">
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Clinic Logo" className="h-16 w-auto max-w-[130px] object-contain" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-xl bg-teal-800 text-white shadow-md">
                  <Award className="size-8" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-teal-950">{clinicName || 'عيادة طب وزراعة الأسنان'}</h1>
                {doctorName && <p className="text-xs font-semibold text-teal-800">{doctorName}</p>}
                {clinicPhone && <p className="text-xs text-slate-600">{clinicPhone}</p>}
                {clinicAddress && <p className="text-xs text-slate-500">{clinicAddress}</p>}
              </div>
            </div>

            <div className="text-end">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-900">
                <ShieldCheck className="size-4 text-teal-700" />
                {isAr ? 'وثيقة طبية معتمدة' : 'Official Medical Certificate'}
              </span>
              <p className="mt-1 text-[11px] font-mono text-slate-400">
                REF #{implant.id.toString().padStart(6, '0')}
              </p>
            </div>
          </header>

          {/* Certificate Title */}
          <div className="my-6 text-center">
            <h2 className="text-2xl font-black tracking-wide text-teal-900 uppercase">
              {isAr ? 'جواز سفر الزرعة السنية وبطاقة الضمان' : 'Dental Implant Passport & Warranty Certificate'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {isAr
                ? 'شهادة توثيق جراحة الزراعة السنية والمواصفات المصنعية ورقم التشغيلة للضمان'
                : 'Official surgical placement documentation, manufacturer traceability & warranty specifications'}
            </p>
          </div>

          {/* Patient Card */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              {isAr ? 'بيانات المريض' : 'Patient Information'}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">{isAr ? 'اسم المريض' : 'Patient Name'}:</span>
                <strong className="text-slate-900 text-base">{patientName}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">{isAr ? 'رقم الهاتف' : 'Phone'}:</span>
                <span className="font-mono text-slate-800">{patientPhone || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">{isAr ? 'تاريخ الجراحة' : 'Surgery Date'}:</span>
                <span className="font-semibold text-slate-800">{implant.placement_date}</span>
              </div>
            </div>
          </div>

          {/* Implant Specifications Grid */}
          <div className="mb-6 overflow-hidden rounded-xl border border-teal-900/20">
            <div className="bg-teal-900 px-4 py-2.5 text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                {isAr ? 'المواصفات الفنية للزرعة السنية' : 'Implant Technical Specifications'}
              </span>
              <span className="text-xs font-semibold bg-teal-800/80 px-2 py-0.5 rounded">
                {isAr ? `السن FDI: #${implant.tooth_number}` : `Tooth FDI: #${implant.tooth_number}`}
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 bg-white text-sm">
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'الشركة المصنعة للزرعة' : 'Manufacturer Brand'}:</span>
                <span className="font-bold text-teal-950 text-base">{implant.brand}</span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'موديل / نظام الزرعة' : 'System / Model'}:</span>
                <span className="font-semibold text-slate-800">{implant.model || 'Standard'}</span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'قطر الزرعة (Diameter)' : 'Diameter'}:</span>
                <span className="font-bold font-mono text-slate-900">Ø {implant.diameter_mm} mm</span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'طول الزرعة (Length)' : 'Length'}:</span>
                <span className="font-bold font-mono text-slate-900">{implant.length_mm} mm</span>
              </div>
              <div className="p-3.5 flex justify-between items-center bg-amber-50/40">
                <span className="text-amber-900 text-xs font-semibold">{isAr ? 'رقم التشغيلة / الدفعة (Lot/Batch)' : 'Lot / Batch Number'}:</span>
                <span className="font-mono font-bold text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                  {implant.lot_number || 'LOT-VERIFIED'}
                </span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'الرقم التسلسلي (Serial/Ref)' : 'Serial / Ref'}:</span>
                <span className="font-mono text-slate-700">{implant.serial_number || '—'}</span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'قوة الشد الأولي (Primary Stability)' : 'Insertion Torque'}:</span>
                <span className="font-bold font-mono text-emerald-800">
                  {implant.insertion_torque_ncm ? `${implant.insertion_torque_ncm} N.cm` : '—'}
                  {implant.isq_value ? ` (ISQ: ${implant.isq_value})` : ''}
                </span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-slate-500 text-xs">{isAr ? 'التطعيم العظمي والغشاء' : 'Bone Graft & Membrane'}:</span>
                <span className="text-xs font-medium text-slate-700">
                  {implant.bone_graft_type ? implant.bone_graft_type : (isAr ? 'بدون طعم عظمي' : 'None')}
                  {implant.membrane_used ? ` + ${isAr ? 'غشاء كولاجين' : 'Membrane'}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Prosthetic & Loading Timeline */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase">
              {isAr ? 'جدول الاندماج والتعويض النهائي' : 'Loading & Prosthetic Timeline'}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'تاريخ الاندماج العظمي المقدر' : 'Target Loading Date'}</span>
                <strong className="text-slate-800">{implant.target_loading_date || `${implant.healing_period_months} أشهر`}</strong>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'دعامة الشفاء (Healing Abutment)' : 'Healing Abutment'}</span>
                <strong className="text-slate-800">
                  {implant.healing_abutment_date || (isAr ? 'حسب التئام اللثة' : 'Pending')}
                  {implant.healing_abutment_size ? ` (${implant.healing_abutment_size})` : ''}
                </strong>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="text-slate-400 block mb-0.5">{isAr ? 'التعويض النهائي (Crown/Prosthesis)' : 'Final Prosthetic'}</span>
                <strong className="text-slate-800">
                  {implant.prosthetic_type || (isAr ? 'تاج زيركون' : 'Zirconia Crown')}
                </strong>
              </div>
            </div>
            {implant.notes && (
              <p className="mt-3 text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200 italic">
                {isAr ? 'ملاحظات سريرية: ' : 'Clinical notes: '}{implant.notes}
              </p>
            )}
          </div>

          {/* Official Warranty Clause */}
          <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="size-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="text-xs text-teal-950 leading-relaxed">
                <p className="font-bold text-teal-900 mb-1">
                  {isAr ? 'تعهد الجودة والضمان المصنعي للزرعة السنية' : 'Quality Assurance & Manufacturer Warranty Guarantee'}
                </p>
                <p>
                  {isAr
                    ? 'تشهد العيادة بأن هذه الزرعة السنية من مادة التيتانيوم الطبي عالية النقاوة، معقمة ومطابقة لمعايير الجودة الدولية (ISO / CE / FDA)، ومسجلة برقم التشغيلة المعتمد للضمان السريري. يُنصح المريض بالحفاظ على هذا الجواز لمتابعة الفحص الدوري والعناية الفموية.'
                    : 'The clinic certifies that this dental implant is manufactured from high-purity medical-grade titanium, sterile, and conforms to international quality standards (ISO/CE/FDA) with a registered Lot number for clinical tracking. Please keep this passport for routine dental checkups.'}
                </p>
              </div>
            </div>
          </div>

          {/* Signatures & Stamp */}
          <footer className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500 mb-8">{isAr ? 'توقيع الطبيب المعالج / جراح الفم والفكين' : 'Surgeon Signature'}</p>
              <div className="border-b border-dashed border-slate-400 w-44 mx-auto mb-1"></div>
              <p className="font-bold text-slate-800">{doctorName || clinicName}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-8">{isAr ? 'خاتم العيادة الرسمي' : 'Official Clinic Stamp'}</p>
              <div className="border border-dashed border-slate-300 rounded-lg size-20 mx-auto flex items-center justify-center text-[10px] text-slate-400">
                {isAr ? 'الخاتم الرسمي' : 'Clinic Seal'}
              </div>
            </div>
          </footer>
        </div>
      </div>
    )
  },
)
