import { forwardRef } from 'react'
import type { MedicationLineDraft } from '@/types/clinical'

export type PrescriptionPrintDocumentProps = {
  clinicName: string
  clinicPhone: string
  clinicAddress: string
  logoDataUrl: string | null
  doctorName: string
  patientName: string
  patientPhone: string | null
  dateLabel: string
  medications: MedicationLineDraft[]
  notes: string | null
  title: string
  colDrug: string
  colDose: string
  colDuration: string
  colNotes: string
}

export const PrescriptionPrintDocument = forwardRef<HTMLDivElement, PrescriptionPrintDocumentProps>(
  function PrescriptionPrintDocument(
    {
      clinicName,
      clinicPhone,
      clinicAddress,
      logoDataUrl,
      doctorName,
      patientName,
      patientPhone,
      dateLabel,
      medications,
      notes,
      title,
      colDrug,
      colDose,
      colDuration,
      colNotes,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="bg-white p-10 text-slate-900"
        style={{ width: '190mm', minHeight: '148mm', fontFamily: 'system-ui, sans-serif' }}
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
            <p className="font-semibold text-slate-800">{title}</p>
            <p>{dateLabel}</p>
            <p className="mt-2">
              <span className="font-medium">{doctorName}</span>
            </p>
          </div>
        </header>

        <section className="mt-6 text-sm">
          <p>
            <span className="font-semibold">Patient / المريض:</span> {patientName}
          </p>
          {patientPhone ? (
            <p className="mt-1">
              <span className="font-semibold">Tel / هاتف:</span> {patientPhone}
            </p>
          ) : null}
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="border border-teal-800 px-2 py-2 text-start">{colDrug}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{colDose}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{colDuration}</th>
              <th className="border border-teal-800 px-2 py-2 text-start">{colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((m, i) => (
              <tr key={i} className="odd:bg-slate-50">
                <td className="border border-slate-300 px-2 py-2">{m.name}</td>
                <td className="border border-slate-300 px-2 py-2">{m.dose}</td>
                <td className="border border-slate-300 px-2 py-2">{m.duration}</td>
                <td className="border border-slate-300 px-2 py-2">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {notes ? (
          <section className="mt-6 text-sm">
            <p className="font-semibold text-slate-800">Notes / ملاحظات</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{notes}</p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          DentAssist Pro — prescription archive
        </footer>
      </div>
    )
  },
)
