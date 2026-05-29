/** Matches SQLite `patients` rows (snake_case). */
export type Patient = {
  id: number
  first_name: string
  last_name: string
  dob: string | null
  gender: string | null
  phone: string | null
  medical_history: string | null
  created_at: string
}

export type TeethStatusRow = {
  id: number
  patient_id: number
  tooth_number: number
  status: string
  notes: string | null
  /** Optional cavity / preparation depth in millimetres (clinical odontogram). */
  preparation_depth_mm: number | null
  updated_at: string
}

export type Appointment = {
  id: number
  patient_id: number
  start_time: string
  end_time: string
  status: string
  notes: string | null
  patient_first_name: string
  patient_last_name: string
  patient_phone: string | null
}

export type DueWhatsAppReminder = {
  appointment_id: number
  patient_id: number
  patient_name: string
  patient_phone: string | null
  start_time: string
  reminder_type: '24h' | '2h'
}

export type TreatmentPlan = {
  id: number
  patient_id: number
  title: string
  diagnosis: string | null
  notes: string | null
  status: 'draft' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  accepted_by_name: string | null
  signature_text: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type TreatmentPlanStage = {
  id: number
  plan_id: number
  stage_order: number
  title: string
  description: string | null
  estimated_cost: number
  paid_amount: number
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  appointment_id: number | null
  appointment_start_time: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type InvoiceListRow = {
  id: number
  patient_id: number
  date: string
  total_amount: number
  status: string
  patient_first_name: string
  patient_last_name: string
}

export type InvoiceItemRow = {
  id: number
  invoice_id: number
  description: string
  tooth_number: number | null
  price: number
}

/** Flat row for CSV export (invoice header + line item). */
export type InvoiceLineExportRow = {
  invoice_id: number
  invoice_date: string
  invoice_status: string
  invoice_total: number
  patient_id: number
  patient_first_name: string
  patient_last_name: string
  line_id: number
  description: string
  tooth_number: number | null
  line_price: number
}

/** Stored in DB `teeth_status.status` — FDI chart palette. */
export type ToothClinicalStatus =
  | 'sound'
  | 'caries'
  | 'filled'
  | 'missing'
  | 'crown'
  | 'root_canal'
  | 'implant'
  | 'extraction_planned'

/** Permanent dentition FDI (ISO 3950), one quadrant per array, visual order. */
export const FDI_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const
export const FDI_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const
export const FDI_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const
export const FDI_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const

export const FDI_ARCH_UPPER: readonly number[] = [...FDI_UPPER_RIGHT, ...FDI_UPPER_LEFT]
export const FDI_ARCH_LOWER: readonly number[] = [...FDI_LOWER_RIGHT, ...FDI_LOWER_LEFT]

export type InvoiceLineDraft = {
  description: string
  toothNumber: number | null
  price: number
}

/** One line inside `prescriptions.medications_json` (JSON array). */
export type MedicationLineDraft = {
  name: string
  dose: string
  duration: string
  notes: string
}

export type PrescriptionRow = {
  id: number
  patient_id: number
  doctor_id: number
  date: string
  medications_json: string
  notes: string | null
  doctor_username: string
}

export type PatientImageRow = {
  id: number
  patient_id: number
  image_path: string
  type: 'before' | 'after'
  date: string
  notes: string | null
  tooth_number: number | null
}

export type DashboardStats = {
  revenueToday: number
  revenueMonth: number
  appointmentsCompleted: number
  appointmentsCancelled: number
  appointmentsScheduled: number
  pendingDebt: number
  topProcedures: { description: string; count: number }[]
}
