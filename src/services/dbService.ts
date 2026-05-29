import type {
  Appointment,
  DashboardStats,
  DueWhatsAppReminder,
  InvoiceItemRow,
  InvoiceLineExportRow,
  InvoiceListRow,
  Patient,
  PatientImageRow,
  PrescriptionRow,
  TeethStatusRow,
  TreatmentPlan,
  TreatmentPlanStage,
} from '@/types/clinical'
import type { DbUser } from '@/types/user'

export type { DbInvokePayload } from '../vite-env'

/** Canonical SQLite schema (shared with desktop Electron build). */
export { SCHEMA_SQL as SQLITE_SCHEMA } from '@/shared/db/schema'

export function isDentAssistBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.dentassist
}

function api(): NonNullable<Window['dentassist']> {
  const d = window.dentassist
  if (!d) throw new Error('DentAssist bridge unavailable (not running in Electron?)')
  return d
}

export async function getConfig(key: string): Promise<string | null> {
  return (await api().db({ op: 'getConfig', key })) as string | null
}

export async function setConfig(key: string, value: string): Promise<void> {
  await api().db({ op: 'setConfig', key, value })
}

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  return (await api().db({ op: 'getConfigs', keys })) as Record<string, string>
}

export async function verifyCredentials(username: string, password: string): Promise<DbUser | null> {
  return (await api().db({ op: 'verifyCredentials', username, password })) as DbUser | null
}

export async function listUsers(): Promise<DbUser[]> {
  return (await api().db({ op: 'listUsers' })) as DbUser[]
}

export async function createUser(username: string, role: 'doctor' | 'receptionist', pin: string): Promise<number> {
  return (await api().db({ op: 'createUser', username, role, pin })) as number
}

export async function updateUserPin(id: number, pin: string): Promise<void> {
  await api().db({ op: 'updateUserPin', id, pin })
}

export async function updateUsername(id: number, username: string): Promise<void> {
  await api().db({ op: 'updateUsername', id, username })
}

export async function deleteUser(id: number): Promise<void> {
  await api().db({ op: 'deleteUser', id })
}

export async function setLicenseActive(): Promise<void> {
  await api().db({ op: 'setLicenseActive' })
}

export async function getMachineId(): Promise<string> {
  return api().getMachineId()
}

export async function listPatients(query?: string): Promise<Patient[]> {
  return (await api().db({ op: 'listPatients', query: query ?? '' })) as Patient[]
}

export async function getPatient(id: number): Promise<Patient | null> {
  return (await api().db({ op: 'getPatient', id })) as Patient | null
}

export async function createPatient(input: {
  firstName: string
  lastName: string
  dob: string | null
  gender: string | null
  phone: string | null
  medicalHistory: string | null
}): Promise<number> {
  return (await api().db({
    op: 'createPatient',
    firstName: input.firstName,
    lastName: input.lastName,
    dob: input.dob,
    gender: input.gender,
    phone: input.phone,
    medicalHistory: input.medicalHistory,
  })) as number
}

export async function updatePatient(
  id: number,
  input: {
    firstName: string
    lastName: string
    dob: string | null
    gender: string | null
    phone: string | null
    medicalHistory: string | null
  },
): Promise<void> {
  await api().db({
    op: 'updatePatient',
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    dob: input.dob,
    gender: input.gender,
    phone: input.phone,
    medicalHistory: input.medicalHistory,
  })
}

export async function deletePatient(id: number): Promise<void> {
  await api().db({ op: 'deletePatient', id })
}

export async function listTeethStatuses(patientId: number): Promise<TeethStatusRow[]> {
  return (await api().db({ op: 'listTeethStatuses', patientId })) as TeethStatusRow[]
}

export async function upsertTeethStatus(
  patientId: number,
  toothNumber: number,
  status: string,
  notes: string | null,
  preparationDepthMm: number | null = null,
): Promise<TeethStatusRow> {
  return (await api().db({
    op: 'upsertTeethStatus',
    patientId,
    toothNumber,
    status,
    notes,
    preparationDepthMm,
  })) as TeethStatusRow
}

export async function listAppointments(fromIso: string | null, toIso: string | null): Promise<Appointment[]> {
  return (await api().db({ op: 'listAppointments', fromIso, toIso })) as Appointment[]
}

export async function createAppointment(input: {
  patientId: number
  startTime: string
  endTime: string
  status: string
  notes: string | null
}): Promise<number> {
  return (await api().db({
    op: 'createAppointment',
    patientId: input.patientId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status,
    notes: input.notes,
  })) as number
}

export async function updateAppointment(
  id: number,
  input: {
    patientId: number
    startTime: string
    endTime: string
    status: string
    notes: string | null
  },
): Promise<void> {
  await api().db({
    op: 'updateAppointment',
    id,
    patientId: input.patientId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status,
    notes: input.notes,
  })
}

export async function deleteAppointment(id: number): Promise<void> {
  await api().db({ op: 'deleteAppointment', id })
}

export async function listDueWhatsAppReminders(nowIso: string): Promise<DueWhatsAppReminder[]> {
  return (await api().db({ op: 'listDueWhatsAppReminders', nowIso })) as DueWhatsAppReminder[]
}

export async function markAppointmentReminderSent(
  appointmentId: number,
  reminderType: '24h' | '2h',
): Promise<void> {
  await api().db({ op: 'markAppointmentReminderSent', appointmentId, reminderType })
}

export async function listTreatmentPlans(patientId: number): Promise<TreatmentPlan[]> {
  return (await api().db({ op: 'listTreatmentPlans', patientId })) as TreatmentPlan[]
}

export async function createTreatmentPlan(input: {
  patientId: number
  title: string
  diagnosis: string | null
  notes: string | null
}): Promise<number> {
  return (await api().db({
    op: 'createTreatmentPlan',
    patientId: input.patientId,
    title: input.title,
    diagnosis: input.diagnosis,
    notes: input.notes,
  })) as number
}

export async function updateTreatmentPlan(input: {
  id: number
  title: string
  diagnosis: string | null
  notes: string | null
  status: TreatmentPlan['status']
}): Promise<void> {
  await api().db({
    op: 'updateTreatmentPlan',
    id: input.id,
    title: input.title,
    diagnosis: input.diagnosis,
    notes: input.notes,
    status: input.status,
  })
}

export async function acceptTreatmentPlan(id: number, acceptedByName: string, signatureText: string): Promise<void> {
  await api().db({ op: 'acceptTreatmentPlan', id, acceptedByName, signatureText })
}

export async function deleteTreatmentPlan(id: number): Promise<void> {
  await api().db({ op: 'deleteTreatmentPlan', id })
}

export async function listTreatmentPlanStages(planId: number): Promise<TreatmentPlanStage[]> {
  return (await api().db({ op: 'listTreatmentPlanStages', planId })) as TreatmentPlanStage[]
}

export async function createTreatmentPlanStage(input: {
  planId: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStage['status']
  appointmentId: number | null
  dueDate: string | null
}): Promise<number> {
  return (await api().db({
    op: 'createTreatmentPlanStage',
    planId: input.planId,
    stageOrder: input.stageOrder,
    title: input.title,
    description: input.description,
    estimatedCost: input.estimatedCost,
    paidAmount: input.paidAmount,
    status: input.status,
    appointmentId: input.appointmentId,
    dueDate: input.dueDate,
  })) as number
}

export async function updateTreatmentPlanStage(input: {
  id: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStage['status']
  appointmentId: number | null
  dueDate: string | null
}): Promise<void> {
  await api().db({
    op: 'updateTreatmentPlanStage',
    id: input.id,
    stageOrder: input.stageOrder,
    title: input.title,
    description: input.description,
    estimatedCost: input.estimatedCost,
    paidAmount: input.paidAmount,
    status: input.status,
    appointmentId: input.appointmentId,
    dueDate: input.dueDate,
  })
}

export async function deleteTreatmentPlanStage(id: number): Promise<void> {
  await api().db({ op: 'deleteTreatmentPlanStage', id })
}

export async function listInvoices(limit?: number, patientId?: number | null): Promise<InvoiceListRow[]> {
  return (await api().db({ op: 'listInvoices', limit, patientId: patientId ?? undefined })) as InvoiceListRow[]
}

export async function getInvoice(
  id: number,
): Promise<{ invoice: InvoiceListRow; items: InvoiceItemRow[] } | null> {
  return (await api().db({ op: 'getInvoice', id })) as {
    invoice: InvoiceListRow
    items: InvoiceItemRow[]
  } | null
}

export async function createInvoice(input: {
  patientId: number
  date: string
  status: 'paid' | 'pending'
  items: { description: string; toothNumber: number | null; price: number }[]
}): Promise<number> {
  return (await api().db({
    op: 'createInvoice',
    patientId: input.patientId,
    date: input.date,
    status: input.status,
    items: input.items,
  })) as number
}

export async function updateInvoiceStatus(id: number, status: 'paid' | 'pending'): Promise<void> {
  await api().db({ op: 'updateInvoiceStatus', id, status })
}

export async function updateInvoiceWithItems(
  id: number,
  input: {
    date: string
    status: 'paid' | 'pending'
    items: { description: string; toothNumber: number | null; price: number }[]
  },
): Promise<void> {
  await api().db({
    op: 'updateInvoiceWithItems',
    id,
    date: input.date,
    status: input.status,
    items: input.items,
  })
}

export async function deleteInvoice(id: number): Promise<void> {
  await api().db({ op: 'deleteInvoice', id })
}

export async function listPrescriptions(patientId: number): Promise<PrescriptionRow[]> {
  return (await api().db({ op: 'listPrescriptions', patientId })) as PrescriptionRow[]
}

export async function createPrescription(input: {
  patientId: number
  doctorId: number
  date: string
  medicationsJson: string
  notes: string | null
}): Promise<number> {
  return (await api().db({
    op: 'createPrescription',
    patientId: input.patientId,
    doctorId: input.doctorId,
    date: input.date,
    medicationsJson: input.medicationsJson,
    notes: input.notes,
  })) as number
}

export async function updatePrescription(
  id: number,
  input: {
    patientId: number
    doctorId: number
    date: string
    medicationsJson: string
    notes: string | null
  },
): Promise<void> {
  await api().db({
    op: 'updatePrescription',
    id,
    patientId: input.patientId,
    doctorId: input.doctorId,
    date: input.date,
    medicationsJson: input.medicationsJson,
    notes: input.notes,
  })
}

export async function deletePrescription(id: number): Promise<void> {
  await api().db({ op: 'deletePrescription', id })
}

export async function listPatientImages(patientId: number): Promise<PatientImageRow[]> {
  return (await api().db({ op: 'listPatientImages', patientId })) as PatientImageRow[]
}

export async function createPatientImage(input: {
  patientId: number
  imagePath: string
  type: 'before' | 'after'
  date: string
  notes: string | null
  toothNumber: number | null
}): Promise<number> {
  return (await api().db({
    op: 'createPatientImage',
    patientId: input.patientId,
    imagePath: input.imagePath,
    type: input.type,
    date: input.date,
    notes: input.notes,
    toothNumber: input.toothNumber,
  })) as number
}

export async function deletePatientImage(id: number): Promise<void> {
  await api().db({ op: 'deletePatientImage', id })
}

export type ReportRow = {
  id: string
  date: string
  patientsCount: number
  income: number
  expense: number
  profit: number
}

export async function getDailyReports(): Promise<ReportRow[]> {
  return (await api().db({ op: 'getDailyReports' })) as ReportRow[]
}

export async function listInvoiceLinesForExport(): Promise<InvoiceLineExportRow[]> {
  return (await api().db({ op: 'listInvoiceLinesExport' })) as InvoiceLineExportRow[]
}

export async function saveTextFileWithDialog(
  defaultFileName: string,
  content: string,
): Promise<{ ok: true; filePath: string } | { ok: false }> {
  const d = window.dentassist
  if (d?.saveTextFile) {
    return d.saveTextFile(defaultFileName, content)
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { ok: true, filePath: defaultFileName }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return (await api().db({ op: 'getDashboardStats' })) as DashboardStats
}

export async function savePatientImageFile(
  patientId: number,
  fileBuffer: ArrayBuffer,
  ext: string,
): Promise<string> {
  const d = window.dentassist
  if (!d?.savePatientImage) throw new Error('savePatientImage unavailable')
  return d.savePatientImage(patientId, fileBuffer, ext)
}

/** Data URL suitable for `<img src={…}>` (Electron only; path must be under `app_data/`). */
export async function readUserDataFileDataUrl(relativePath: string): Promise<string> {
  const d = window.dentassist
  if (!d?.readUserDataFileBase64) throw new Error('readUserDataFileBase64 unavailable')
  const raw = await d.readUserDataFileBase64(relativePath)
  // Older builds returned "image/jpeg;base64,…" without the required "data:" scheme prefix.
  // Normalise here so the renderer always receives a valid data URL regardless of build version.
  if (raw && !raw.startsWith('data:')) return `data:${raw}`
  return raw
}

export async function exportDatabaseBackupEncrypted(
  passphrase: string,
): Promise<{ ok: true; filePath: string } | { ok: false }> {
  const d = window.dentassist
  if (!d?.exportEncryptedBackup) throw new Error('exportEncryptedBackup unavailable')
  return d.exportEncryptedBackup(passphrase)
}

export async function importDatabaseBackupEncrypted(
  passphrase: string,
): Promise<{ ok: true } | { ok: false }> {
  const d = window.dentassist
  if (!d?.importEncryptedBackup) throw new Error('importEncryptedBackup unavailable')
  return d.importEncryptedBackup(passphrase)
}

export async function importDatabaseBackupEncryptedFromFile(
  file: File,
  passphrase: string,
): Promise<{ ok: true }> {
  const d = window.dentassist
  if (d?.importEncryptedBackupFromFile) {
    return d.importEncryptedBackupFromFile(file, passphrase)
  }
  throw new Error('importEncryptedBackupFromFile unavailable')
}

export function supportsEncryptedBackupExport(): boolean {
  return !!window.dentassist?.exportEncryptedBackup
}

export function supportsEncryptedBackupImport(): boolean {
  return !!window.dentassist?.importEncryptedBackup
}

export type DistributorRow = {
  id: number
  name: string
  company: string
  phone: string
  address: string
  items: string
  payment_amount: number
  remaining_amount: number
  created_at: string
}

export async function listDistributors(query?: string): Promise<DistributorRow[]> {
  return (await api().db({ op: 'listDistributors', query })) as DistributorRow[]
}

export async function createDistributor(input: {
  name: string
  company: string
  phone: string
  address: string
  items: string
  paymentAmount: number
  remainingAmount: number
}): Promise<number> {
  return (await api().db({ op: 'createDistributor', ...input })) as number
}

export async function updateDistributor(
  id: number,
  input: {
    name: string
    company: string
    phone: string
    address: string
    items: string
    paymentAmount: number
    remainingAmount: number
  },
): Promise<void> {
  await api().db({ op: 'updateDistributor', id, ...input })
}

export async function deleteDistributor(id: number): Promise<void> {
  await api().db({ op: 'deleteDistributor', id })
}

export type TransactionRow = {
  id: number
  trx_id: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  created_at: string
}

export async function listTransactions(query?: string): Promise<TransactionRow[]> {
  return (await api().db({ op: 'listTransactions', query })) as TransactionRow[]
}

export async function createTransaction(input: {
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
}): Promise<number> {
  return (await api().db({ op: 'createTransaction', ...input })) as number
}

export async function deleteTransaction(id: number): Promise<void> {
  await api().db({ op: 'deleteTransaction', id })
}

export type LabOrderRow = {
  id: number
  order_id: string
  patient_name: string
  lab_name: string
  work_type: string
  sent_date: string
  status: 'progress' | 'received' | 'delayed'
  created_at: string
}

export async function listLabOrders(query?: string): Promise<LabOrderRow[]> {
  return (await api().db({ op: 'listLabOrders', query })) as LabOrderRow[]
}

export async function createLabOrder(input: {
  patientName: string
  labName: string
  workType: string
  sentDate: string
  status: 'progress' | 'received' | 'delayed'
}): Promise<number> {
  return (await api().db({ op: 'createLabOrder', ...input })) as number
}

export async function updateLabOrderStatus(id: number, status: 'progress' | 'received' | 'delayed'): Promise<void> {
  await api().db({ op: 'updateLabOrderStatus', id, status })
}

export async function deleteLabOrder(id: number): Promise<void> {
  await api().db({ op: 'deleteLabOrder', id })
}

/** Opens http(s) URLs in the system browser (Electron) or a new tab (browser). */
export async function openExternalUrl(url: string): Promise<boolean> {
  const d = window.dentassist
  if (d?.openExternal) return d.openExternal(url)
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
