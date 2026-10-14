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

/** Orthodontic Angle malocclusion classifications */
export type OrthodonticClassification =
  | 'class_1'
  | 'class_2_div_1'
  | 'class_2_div_2'
  | 'class_3'
  | 'open_bite'
  | 'crossbite'
  | 'other'

/** Orthodontic Appliance Types */
export type OrthodonticApplianceType =
  | 'metal'
  | 'ceramic'
  | 'self_ligating'
  | 'clear_aligner'
  | 'lingual'
  | 'functional'
  | 'retainer_only'

export type OrthodonticCaseStatus = 'active' | 'retention' | 'completed' | 'suspended'

export type OrthodonticCase = {
  id: number
  patient_id: number
  case_number: string
  start_date: string
  estimated_duration_months: number
  status: OrthodonticCaseStatus
  classification: OrthodonticClassification
  appliance_type: OrthodonticApplianceType
  arch_type: 'upper' | 'lower' | 'both'
  extraction_plan: string | null
  chief_complaint: string | null
  diagnosis_notes: string | null
  total_cost: number
  down_payment: number
  monthly_installment: number
  retainer_type: string | null
  created_at: string
  updated_at: string
  // Virtual / joined fields
  patient_first_name?: string
  patient_last_name?: string
  patient_phone?: string | null
  visits_count?: number
  last_visit_date?: string | null
  total_paid?: number
  remaining_balance?: number
}

export type OrthodonticVisit = {
  id: number
  case_id: number
  visit_number: number
  visit_date: string
  upper_wire: string | null
  lower_wire: string | null
  elastic_prescription: string | null
  actions_json: string | null
  broken_brackets_count: number
  oral_hygiene_rating: number
  pain_level: number
  amount_paid: number
  notes: string | null
  next_appointment_date: string | null
  created_at: string
}

export type OrthodonticStats = {
  activeCases: number
  retentionCases: number
  completedCases: number
  suspendedCases: number
  upcomingVisitsCount: number
  totalRevenue: number
  totalDebt: number
}

/** Dental Implantology Types */
export type ImplantStatus = 'planned' | 'placed' | 'healing' | 'uncovered' | 'restored' | 'failed'

export type DentalImplant = {
  id: number
  patient_id: number
  tooth_number: number
  brand: string
  model: string | null
  diameter_mm: number
  length_mm: number
  lot_number: string | null
  serial_number: string | null
  insertion_torque_ncm: number | null
  isq_value: number | null
  bone_graft_type: string | null
  membrane_used: number
  sinus_lift: string | null
  placement_date: string
  healing_period_months: number
  target_loading_date: string | null
  healing_abutment_date: string | null
  healing_abutment_size: string | null
  final_loading_date: string | null
  prosthetic_type: string | null
  status: ImplantStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Virtual / joined fields
  patient_name?: string
  patient_phone?: string | null
}

/** Dental Stock & Inventory Types */
export type InventoryCategory =
  | 'anesthesia'
  | 'composite'
  | 'endodontics'
  | 'surgery_implants'
  | 'impression'
  | 'sterilization'
  | 'disposables'
  | 'other'

export type InventoryItem = {
  id: number
  name: string
  category: InventoryCategory
  specification: string | null
  quantity: number
  unit: string
  min_threshold: number
  cost_per_unit: number
  distributor_id: number | null
  expiry_date: string | null
  batch_number: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Virtual / joined fields
  distributor_name?: string
  distributor_company?: string
  distributor_phone?: string
  is_low_stock?: boolean
  is_expired?: boolean
  is_near_expiry?: boolean
}

export type InventoryStats = {
  totalItems: number
  lowStockCount: number
  expiringCount: number
  totalEstimatedValue: number
}

/** Treatment Catalog / Fee Schedule Types */
export type TreatmentCatalogItem = {
  id: number
  category: string
  code: string | null
  name_ar: string
  name_en: string
  default_cost: number
  description: string | null
  duration_minutes: number
  is_active: number
  created_at: string
}

