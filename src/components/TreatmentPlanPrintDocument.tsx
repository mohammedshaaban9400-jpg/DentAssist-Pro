import { forwardRef } from 'react'
import type { TreatmentPlan, TreatmentPlanStage } from '@/types/clinical'

export type TreatmentPlanPrintDocumentProps = {
  clinicName: string
  clinicPhone: string
  clinicAddress: string
  logoDataUrl: string | null
  patientName: string
  patientPhone: string | null
  printedAtLabel: string
  plan: TreatmentPlan
  stages: TreatmentPlanStage[]
  labels: {
    title: string
    diagnosis: string
    notes: string
    status: string
    acceptedBy: string
    acceptedAt: string
    signature: string
    stage: string
    estimated: string
    paid: string
    remaining: string
    linkedAppointment: string
    dueDate: string
  }
}

export const TreatmentPlanPrintDocument = forwardRef<HTMLDivElement, TreatmentPlanPrintDocumentProps>(
  function TreatmentPlanPrintDocument(
    { clinicName, clinicPhone, clinicAddress, logoDataUrl, patientName, patientPhone, printedAtLabel, plan, stages, labels },
    ref,
  ) {
    const totalEstimated = stages.reduce((s, x) => s + (Number.isFinite(x.estimated_cost) ? x.estimated_cost : 0), 0)
    const totalPaid = stages.reduce((s, x) => s + (Number.isFinite(x.paid_amount) ? x.paid_amount : 0), 0)
    return (
      <div
        ref={ref}
        className="bg-white p-10 text-slate-900"
        style={{ width: '190mm', minHeight: '260mm', fontFamily: 'system-ui, sans-serif' }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-300 pb-4">
          <div className="flex items-start gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="" className="h-16 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">
                Logo
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-teal-800">{clinicName}</h1>
              {clinicPhone ? <p className="text-sm text-slate-600">{clinicPhone}</p> : null}
              {clinicAddress ? <p className="max-w-sm text-sm text-slate-600">{clinicAddress}</p> : null}
            </div>
          </div>
          <div className="text-end text-sm text-slate-600">
            <p className="font-semibold text-slate-800">{labels.title}</p>
            <p>{printedAtLabel}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-2 text-sm">
          <p><span className="font-semibold">Patient / المريض:</span> {patientName}</p>
          {patientPhone ? <p><span className="font-semibold">Tel / هاتف:</span> {patientPhone}</p> : null}
          <p><span className="font-semibold">{labels.status}:</span> {plan.status}</p>
          {plan.diagnosis ? <p><span className="font-semibold">{labels.diagnosis}:</span> {plan.diagnosis}</p> : null}
          {plan.notes ? <p className="whitespace-pre-wrap"><span className="font-semibold">{labels.notes}:</span> {plan.notes}</p> : null}
          {plan.accepted_by_name ? <p><span className="font-semibold">{labels.acceptedBy}:</span> {plan.accepted_by_name}</p> : null}
          {plan.accepted_at ? <p><span className="font-semibold">{labels.acceptedAt}:</span> {plan.accepted_at}</p> : null}
          {plan.signature_text ? <p><span className="font-semibold">{labels.signature}:</span> {plan.signature_text}</p> : null}
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.stage}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.estimated}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.paid}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.remaining}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.linkedAppointment}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{labels.dueDate}</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id} className="odd:bg-slate-50">
                <td className="border border-slate-300 px-2 py-2">
                  {s.stage_order}. {s.title}
                </td>
                <td className="border border-slate-300 px-2 py-2">{s.estimated_cost}</td>
                <td className="border border-slate-300 px-2 py-2">{s.paid_amount}</td>
                <td className="border border-slate-300 px-2 py-2">{Math.max(0, s.estimated_cost - s.paid_amount)}</td>
                <td className="border border-slate-300 px-2 py-2">{s.appointment_start_time ?? '—'}</td>
                <td className="border border-slate-300 px-2 py-2">{s.due_date ?? '—'}</td>
              </tr>
            ))}
            {stages.length === 0 ? (
              <tr>
                <td className="border border-slate-300 px-2 py-2 text-center text-slate-500" colSpan={6}>—</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold">
              <td className="border border-slate-300 px-2 py-2">Total</td>
              <td className="border border-slate-300 px-2 py-2">{totalEstimated}</td>
              <td className="border border-slate-300 px-2 py-2">{totalPaid}</td>
              <td className="border border-slate-300 px-2 py-2">{Math.max(0, totalEstimated - totalPaid)}</td>
              <td className="border border-slate-300 px-2 py-2">—</td>
              <td className="border border-slate-300 px-2 py-2">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  },
)
