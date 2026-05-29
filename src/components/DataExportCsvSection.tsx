import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet } from 'lucide-react'
import { formatCsvTable, withUtf8Bom } from '@/lib/csvFormat'
import {
  getDailyReports,
  listInvoiceLinesForExport,
  listInvoices,
  listPatients,
  saveTextFileWithDialog,
} from '@/services/dbService'
import type { ReportRow } from '@/services/dbService'
import type { InvoiceLineExportRow, InvoiceListRow, Patient } from '@/types/clinical'
import { useToastStore } from '@/stores/toastStore'

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DataExportCsvSection() {
  const { t } = useTranslation()
  const push = useToastStore((s) => s.push)
  const [busy, setBusy] = useState(false)

  const run = async (kind: 'patients' | 'invoices' | 'invoiceLines' | 'reports') => {
    setBusy(true)
    try {
      let defaultName: string
      let csv: string
      switch (kind) {
        case 'patients': {
          const patients = await listPatients('')
          defaultName = `dentassist-patients-${stamp()}.csv`
          csv = formatCsvTable(
            [
              t('settings.exportCsvColPatientId'),
              t('settings.exportCsvColFirstName'),
              t('settings.exportCsvColLastName'),
              t('settings.exportCsvColDob'),
              t('settings.exportCsvColGender'),
              t('settings.exportCsvColPhone'),
              t('settings.exportCsvColMedicalHistory'),
              t('settings.exportCsvColCreatedAt'),
            ],
            patients.map((p: Patient) => [
              p.id,
              p.first_name,
              p.last_name,
              p.dob ?? '',
              p.gender ?? '',
              p.phone ?? '',
              p.medical_history ?? '',
              p.created_at,
            ]),
          )
          break
        }
        case 'invoices': {
          const invoices = await listInvoices(100_000, null)
          defaultName = `dentassist-invoices-${stamp()}.csv`
          csv = formatCsvTable(
            [
              t('settings.exportCsvColInvoiceId'),
              t('settings.exportCsvColPatientId'),
              t('settings.exportCsvColPatientName'),
              t('settings.exportCsvColInvoiceDate'),
              t('settings.exportCsvColTotal'),
              t('settings.exportCsvColStatus'),
            ],
            invoices.map((i: InvoiceListRow) => [
              i.id,
              i.patient_id,
              `${i.patient_first_name} ${i.patient_last_name}`.trim(),
              i.date,
              i.total_amount,
              i.status,
            ]),
          )
          break
        }
        case 'invoiceLines': {
          const lines = await listInvoiceLinesForExport()
          defaultName = `dentassist-invoice-lines-${stamp()}.csv`
          csv = formatCsvTable(
            [
              t('settings.exportCsvColInvoiceId'),
              t('settings.exportCsvColInvoiceDate'),
              t('settings.exportCsvColInvoiceStatus'),
              t('settings.exportCsvColInvoiceTotal'),
              t('settings.exportCsvColPatientId'),
              t('settings.exportCsvColPatientName'),
              t('settings.exportCsvColLineId'),
              t('settings.exportCsvColLineDesc'),
              t('settings.exportCsvColTooth'),
              t('settings.exportCsvColLinePrice'),
            ],
            lines.map((r: InvoiceLineExportRow) => [
              r.invoice_id,
              r.invoice_date,
              r.invoice_status,
              r.invoice_total,
              r.patient_id,
              `${r.patient_first_name} ${r.patient_last_name}`.trim(),
              r.line_id,
              r.description,
              r.tooth_number ?? '',
              r.line_price,
            ]),
          )
          break
        }
        case 'reports': {
          const reports = await getDailyReports()
          defaultName = `dentassist-daily-reports-${stamp()}.csv`
          csv = formatCsvTable(
            [
              t('settings.exportCsvColReportId'),
              t('settings.exportCsvColReportDate'),
              t('settings.exportCsvColPatientsCount'),
              t('settings.exportCsvColIncome'),
              t('settings.exportCsvColExpense'),
              t('settings.exportCsvColNet'),
            ],
            reports.map((r: ReportRow) => [
              r.id,
              r.date,
              r.patientsCount,
              r.income,
              r.expense,
              r.profit,
            ]),
          )
          break
        }
      }
      const r = await saveTextFileWithDialog(defaultName, withUtf8Bom(csv))
      if (r.ok) push(t('settings.exportCsvDone', { path: r.filePath }), 'success')
      else push(t('settings.exportCsvCancelled'), 'info')
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const btnClass =
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 disabled:pointer-events-none disabled:opacity-50'

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-500">{t('settings.exportCsvHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy} className={btnClass} onClick={() => void run('patients')}>
          <FileSpreadsheet className="size-4 shrink-0 text-teal-600" aria-hidden />
          {t('settings.exportCsvPatients')}
        </button>
        <button type="button" disabled={busy} className={btnClass} onClick={() => void run('invoices')}>
          <FileSpreadsheet className="size-4 shrink-0 text-teal-600" aria-hidden />
          {t('settings.exportCsvInvoices')}
        </button>
        <button type="button" disabled={busy} className={btnClass} onClick={() => void run('invoiceLines')}>
          <FileSpreadsheet className="size-4 shrink-0 text-teal-600" aria-hidden />
          {t('settings.exportCsvInvoiceLines')}
        </button>
        <button type="button" disabled={busy} className={btnClass} onClick={() => void run('reports')}>
          <FileSpreadsheet className="size-4 shrink-0 text-teal-600" aria-hidden />
          {t('settings.exportCsvReports')}
        </button>
      </div>
    </div>
  )
}
