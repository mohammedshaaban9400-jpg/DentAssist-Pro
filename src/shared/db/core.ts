import { SCHEMA_SQL } from '@/shared/db/schema'
import type { CredentialCrypto } from '@/shared/db/cryptoApi'
import type { SqlDatabase } from '@/shared/db/sqlTypes'

export { SCHEMA_SQL }

export type UserRole = 'doctor' | 'receptionist'

export type DbUser = {
  id: number
  username: string
  role: UserRole
  mustChangePin?: boolean
}

let db: SqlDatabase | null = null
let credentialCrypto: CredentialCrypto | null = null
let machineIdProvider: (() => string) | null = null
let patientImageDeletedHandler: ((relativePath: string) => void) | null = null

export function setPatientImageDeletedHandler(handler: ((relativePath: string) => void) | null): void {
  patientImageDeletedHandler = handler
}

export function setCredentialCrypto(crypto: CredentialCrypto): void {
  credentialCrypto = crypto
}

export function setMachineIdProvider(fn: () => string): void {
  machineIdProvider = fn
}

export function attachDatabase(instance: SqlDatabase): void {
  db = instance
  instance.exec('PRAGMA foreign_keys = ON')
  bootstrapSchema(instance)
  ensureBootstrapConfig()
}

export function detachDatabase(): void {
  db = null
}


function hashCredential(secret: string): string {
  if (!credentialCrypto) throw new Error('Credential crypto not initialized')
  return credentialCrypto.hashCredential(secret)
}

function verifyCredential(secret: string, stored: string): boolean {
  if (!credentialCrypto) throw new Error('Credential crypto not initialized')
  return credentialCrypto.verifyCredential(secret, stored)
}

function computeMachineIdInternal(): string {
  if (!machineIdProvider) throw new Error('Machine id provider not initialized')
  return machineIdProvider()
}

export function bootstrapSchema(instance: SqlDatabase): void {
  instance.exec(SCHEMA_SQL)
  migrateTeethStatusSchema(instance)
}

function migrateTeethStatusSchema(instance: SqlDatabase): void {
  const cols = instance.prepare(`PRAGMA table_info(teeth_status)`).all() as { name: string }[]
  if (!cols.some((c) => c.name === 'preparation_depth_mm')) {
    instance.exec(`ALTER TABLE teeth_status ADD COLUMN preparation_depth_mm REAL`)
  }
}

function getDb(): SqlDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}

function ensureBootstrapConfig(): void {
  const d = getDb()
  const get = d.prepare('SELECT value FROM app_config WHERE key = ?')
  const set = d.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)')

  if (!get.get('machine_id')) {
    set.run('machine_id', computeMachineIdInternal())
  }
  if (!get.get('first_launch_date')) {
    set.run('first_launch_date', new Date().toISOString())
  }
  if (!get.get('license_status')) {
    set.run('license_status', 'trial')
  }
  if (!get.get('language')) {
    set.run('language', 'ar')
  }
  if (!get.get('clinic_name')) {
    set.run('clinic_name', 'DentAssist Pro')
  }
  if (!get.get('clinic_phone')) {
    set.run('clinic_phone', '')
  }
  if (!get.get('clinic_address')) {
    set.run('clinic_address', '')
  }
  migrateLegacyDefaultUsersForSecurity()
}

function getForcedPinResetUsers(): string[] {
  const raw = getConfig('force_pin_reset_users')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

function setForcedPinResetUsers(usernames: string[]): void {
  const unique = Array.from(new Set(usernames.map((u) => u.trim()).filter(Boolean)))
  setConfig('force_pin_reset_users', JSON.stringify(unique))
}

function migrateLegacyDefaultUsersForSecurity(): void {
  const defaults: Array<{ username: string; pin: string }> = [
    { username: 'doctor', pin: '1234' },
    { username: 'reception', pin: '5678' },
  ]
  const rows = getDb()
    .prepare('SELECT username, pin_hash FROM users WHERE username IN (?, ?)')
    .all('doctor', 'reception') as { username: string; pin_hash: string }[]
  const force = getForcedPinResetUsers()
  let changed = false
  for (const row of rows) {
    const matchingDefault = defaults.find((d) => d.username === row.username)
    if (!matchingDefault) continue
    if (verifyCredential(matchingDefault.pin, row.pin_hash) && !force.includes(row.username)) {
      force.push(row.username)
      changed = true
    }
  }
  if (changed) setForcedPinResetUsers(force)
}

export function getConfig(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM app_config WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setConfig(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run(key, value)
}

export function verifyCredentials(username: string, password: string): DbUser | null {
  const user = username.trim()
  const secret = password.trim()
  if (!user || !secret) return null
  const row = getDb()
    .prepare('SELECT id, username, role, pin_hash FROM users WHERE username = ? COLLATE NOCASE')
    .get(user) as Record<string, unknown> | undefined
  if (!row) return null
  const pinHash = row.pin_hash ?? row.PIN_HASH
  if (typeof pinHash !== 'string' || !verifyCredential(secret, pinHash)) return null
  const forcedUsers = getForcedPinResetUsers()
  return {
    id: Number(row.id),
    username: String(row.username),
    role: row.role as UserRole,
    mustChangePin: forcedUsers.includes(String(row.username)),
  }
}

export function listUsers(): DbUser[] {
  return getDb()
    .prepare('SELECT id, username, role FROM users ORDER BY id')
    .all() as DbUser[]
}

export type PatientRow = {
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
  preparation_depth_mm: number | null
  updated_at: string
}

export type AppointmentRow = {
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

export type DueReminderRow = {
  appointment_id: number
  patient_id: number
  patient_name: string
  patient_phone: string | null
  start_time: string
  reminder_type: '24h' | '2h'
}

export type TreatmentPlanRow = {
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

export type TreatmentPlanStageRow = {
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

function deleteUserImpl(id: number): void {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
}

function createUserImpl(username: string, role: UserRole, pin: string): number {
  const d = getDb()
  const user = username.trim()
  const secret = pin.trim()
  if (!user) throw new Error('Username is required')
  if (secret.length < 4) throw new Error('PIN must be at least 4 characters')
  const exists = d.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(user)
  if (exists) throw new Error('Username already exists')
  const info = d
    .prepare('INSERT INTO users (username, role, pin_hash) VALUES (?, ?, ?)')
    .run(user, role, hashCredential(secret))
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(user)) {
    setForcedPinResetUsers(forcedUsers.filter((u) => u !== user))
  }
  return info.lastInsertRowid as number
}

function updateUserPinImpl(id: number, pin: string): void {
  const d = getDb()
  d.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashCredential(pin), id)
  const row = d.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined
  if (!row) return
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(row.username)) {
    setForcedPinResetUsers(forcedUsers.filter((u) => u !== row.username))
  }
}

function updateUsernameImpl(id: number, username: string): void {
  const d = getDb()
  const before = d.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined
  const exists = d.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
  if (exists) throw new Error('Username already exists')
  d.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id)
  if (!before) return
  const forcedUsers = getForcedPinResetUsers()
  if (forcedUsers.includes(before.username)) {
    setForcedPinResetUsers(forcedUsers.map((u) => (u === before.username ? username : u)))
  }
}

function listPatientsImpl(query: string): PatientRow[] {
  const q = (query ?? '').trim()
  const d = getDb()
  if (!q) {
    return d
      .prepare(
        `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at
         FROM patients ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
      )
      .all() as PatientRow[]
  }
  const like = `%${q}%`
  return d
    .prepare(
      `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at
       FROM patients
       WHERE first_name LIKE ? OR last_name LIKE ? OR IFNULL(phone,'') LIKE ?
       ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
    )
    .all(like, like, like) as PatientRow[]
}

function getPatientImpl(id: number): PatientRow | null {
  const row = getDb()
    .prepare(
      `SELECT id, first_name, last_name, dob, gender, phone, medical_history, created_at FROM patients WHERE id = ?`,
    )
    .get(id) as PatientRow | undefined
  return row ?? null
}

function createPatientImpl(input: {
  firstName: string
  lastName: string
  dob: string | null
  gender: string | null
  phone: string | null
  medicalHistory: string | null
}): number {
  const r = getDb()
    .prepare(
      `INSERT INTO patients (first_name, last_name, dob, gender, phone, medical_history)
       VALUES (@first_name, @last_name, @dob, @gender, @phone, @medical_history)`,
    )
    .run({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      dob: input.dob,
      gender: input.gender,
      phone: input.phone?.trim() || null,
      medical_history: input.medicalHistory,
    })
  return Number(r.lastInsertRowid)
}

function updatePatientImpl(
  id: number,
  input: {
    firstName: string
    lastName: string
    dob: string | null
    gender: string | null
    phone: string | null
    medicalHistory: string | null
  },
): void {
  getDb()
    .prepare(
      `UPDATE patients SET first_name=@first_name, last_name=@last_name, dob=@dob, gender=@gender,
       phone=@phone, medical_history=@medical_history WHERE id=@id`,
    )
    .run({
      id,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      dob: input.dob,
      gender: input.gender,
      phone: input.phone?.trim() || null,
      medical_history: input.medicalHistory,
    })
}

function deletePatientImpl(id: number): void {
  getDb().prepare('DELETE FROM patients WHERE id = ?').run(id)
}

function listTeethStatusesImpl(patientId: number): TeethStatusRow[] {
  return getDb()
    .prepare(
      `SELECT id, patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at
       FROM teeth_status WHERE patient_id = ?`,
    )
    .all(patientId) as TeethStatusRow[]
}

function upsertTeethStatusImpl(
  patientId: number,
  toothNumber: number,
  status: string,
  notes: string | null,
  preparationDepthMm: number | null,
): TeethStatusRow {
  getDb()
    .prepare(
      `INSERT INTO teeth_status (patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at)
       VALUES (@patient_id, @tooth_number, @status, @notes, @preparation_depth_mm, datetime('now'))
       ON CONFLICT(patient_id, tooth_number) DO UPDATE SET
         status = excluded.status,
         notes = excluded.notes,
         preparation_depth_mm = excluded.preparation_depth_mm,
         updated_at = datetime('now')`,
    )
    .run({
      patient_id: patientId,
      tooth_number: toothNumber,
      status,
      notes,
      preparation_depth_mm: preparationDepthMm,
    })
  const row = getDb()
    .prepare(
      `SELECT id, patient_id, tooth_number, status, notes, preparation_depth_mm, updated_at FROM teeth_status
       WHERE patient_id = ? AND tooth_number = ?`,
    )
    .get(patientId, toothNumber) as TeethStatusRow
  return row
}

function listAppointmentsImpl(fromIso: string | null, toIso: string | null): AppointmentRow[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.patient_id, a.start_time, a.end_time, a.status, a.notes,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name,
              p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE (? IS NULL OR a.start_time >= ?) AND (? IS NULL OR a.start_time <= ?)
       ORDER BY a.start_time ASC`,
    )
    .all(fromIso, fromIso, toIso, toIso) as AppointmentRow[]
}

function createAppointmentImpl(
  patientId: number,
  startTime: string,
  endTime: string,
  status: string,
  notes: string | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO appointments (patient_id, start_time, end_time, status, notes)
       VALUES (@patient_id, @start_time, @end_time, @status, @notes)`,
    )
    .run({ patient_id: patientId, start_time: startTime, end_time: endTime, status, notes })
  return Number(r.lastInsertRowid)
}

function updateAppointmentImpl(
  id: number,
  patientId: number,
  startTime: string,
  endTime: string,
  status: string,
  notes: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE appointments SET patient_id=@patient_id, start_time=@start_time, end_time=@end_time,
       status=@status, notes=@notes WHERE id=@id`,
    )
    .run({ id, patient_id: patientId, start_time: startTime, end_time: endTime, status, notes })
}

function deleteAppointmentImpl(id: number): void {
  getDb().prepare('DELETE FROM appointments WHERE id = ?').run(id)
}

function listTreatmentPlansImpl(patientId: number): TreatmentPlanRow[] {
  return getDb()
    .prepare(
      `SELECT
         id, patient_id, title, diagnosis, notes, status,
         accepted_by_name, signature_text, accepted_at, created_at, updated_at
       FROM treatment_plans
       WHERE patient_id = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .all(patientId) as TreatmentPlanRow[]
}

function createTreatmentPlanImpl(
  patientId: number,
  title: string,
  diagnosis: string | null,
  notes: string | null,
): number {
  const info = getDb()
    .prepare(
      `INSERT INTO treatment_plans (patient_id, title, diagnosis, notes, status, updated_at)
       VALUES (?, ?, ?, ?, 'draft', datetime('now'))`,
    )
    .run(patientId, title.trim(), diagnosis, notes)
  return Number(info.lastInsertRowid)
}

function updateTreatmentPlanImpl(
  id: number,
  title: string,
  diagnosis: string | null,
  notes: string | null,
  status: TreatmentPlanRow['status'],
): void {
  getDb()
    .prepare(
      `UPDATE treatment_plans
       SET title = ?, diagnosis = ?, notes = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(title.trim(), diagnosis, notes, status, id)
}

function acceptTreatmentPlanImpl(id: number, acceptedByName: string, signatureText: string): void {
  getDb()
    .prepare(
      `UPDATE treatment_plans
       SET status = 'accepted',
           accepted_by_name = ?,
           signature_text = ?,
           accepted_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(acceptedByName.trim(), signatureText.trim(), id)
}

function deleteTreatmentPlanImpl(id: number): void {
  getDb().prepare('DELETE FROM treatment_plans WHERE id = ?').run(id)
}

function listTreatmentPlanStagesImpl(planId: number): TreatmentPlanStageRow[] {
  return getDb()
    .prepare(
      `SELECT
         s.id, s.plan_id, s.stage_order, s.title, s.description,
         s.estimated_cost, s.paid_amount, s.status, s.appointment_id, s.due_date,
         s.created_at, s.updated_at,
         a.start_time AS appointment_start_time
       FROM treatment_plan_stages s
       LEFT JOIN appointments a ON a.id = s.appointment_id
       WHERE s.plan_id = ?
       ORDER BY s.stage_order ASC, s.id ASC`,
    )
    .all(planId) as TreatmentPlanStageRow[]
}

function createTreatmentPlanStageImpl(input: {
  planId: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStageRow['status']
  appointmentId: number | null
  dueDate: string | null
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO treatment_plan_stages
       (plan_id, stage_order, title, description, estimated_cost, paid_amount, status, appointment_id, due_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(
      input.planId,
      input.stageOrder,
      input.title.trim(),
      input.description,
      input.estimatedCost,
      input.paidAmount,
      input.status,
      input.appointmentId,
      input.dueDate,
    )
  return Number(info.lastInsertRowid)
}

function updateTreatmentPlanStageImpl(input: {
  id: number
  stageOrder: number
  title: string
  description: string | null
  estimatedCost: number
  paidAmount: number
  status: TreatmentPlanStageRow['status']
  appointmentId: number | null
  dueDate: string | null
}): void {
  getDb()
    .prepare(
      `UPDATE treatment_plan_stages
       SET stage_order = ?, title = ?, description = ?, estimated_cost = ?, paid_amount = ?,
           status = ?, appointment_id = ?, due_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.stageOrder,
      input.title.trim(),
      input.description,
      input.estimatedCost,
      input.paidAmount,
      input.status,
      input.appointmentId,
      input.dueDate,
      input.id,
    )
}

function deleteTreatmentPlanStageImpl(id: number): void {
  getDb().prepare('DELETE FROM treatment_plan_stages WHERE id = ?').run(id)
}

function listDueWhatsAppRemindersImpl(nowIso: string): DueReminderRow[] {
  const d = getDb()
  const nowMs = Date.parse(nowIso)
  if (!Number.isFinite(nowMs)) return []

  const MIN = 60_000
  /** Appointments stored as ISO strings from the UI; compare windows in JS to avoid SQLite vs ISO text mismatches. */
  const minStartMs = nowMs + 50 * MIN // just under 1h — lower bound for the 2h-style window
  const maxStartMs = nowMs + 26 * 60 * MIN + 10 * MIN // upper bound for the 24h-style window (~26h10m)
  const minIso = new Date(minStartMs).toISOString()
  const maxIso = new Date(maxStartMs).toISOString()

  const rows = d
    .prepare(
      `SELECT
         a.id AS appointment_id,
         a.patient_id AS patient_id,
         (p.first_name || ' ' || p.last_name) AS patient_name,
         p.phone AS patient_phone,
         a.start_time AS start_time
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.status = 'scheduled'
         AND p.phone IS NOT NULL
         AND TRIM(p.phone) != ''
         AND a.start_time >= ?
         AND a.start_time <= ?
       ORDER BY a.start_time ASC`,
    )
    .all(minIso, maxIso) as Array<{
      appointment_id: number
      patient_id: number
      patient_name: string
      patient_phone: string
      start_time: string
    }>

  function reminderTypeFor(startMs: number): '24h' | '2h' | null {
    if (!Number.isFinite(startMs) || startMs <= nowMs) return null
    // Wide bands so manual WhatsApp strip is usable without opening the app in a 10-minute slot only.
    const t24Lo = nowMs + 22 * 60 * MIN
    const t24Hi = nowMs + 26 * 60 * MIN
    if (startMs >= t24Lo && startMs <= t24Hi) return '24h'
    const t2Lo = nowMs + 1 * 60 * MIN
    const t2Hi = nowMs + 3 * 60 * MIN
    if (startMs >= t2Lo && startMs <= t2Hi) return '2h'
    return null
  }

  return rows
    .map((r) => ({
      ...r,
      reminder_type: reminderTypeFor(Date.parse(r.start_time)),
    }))
    .filter((r): r is typeof r & { reminder_type: '24h' | '2h' } => r.reminder_type === '24h' || r.reminder_type === '2h')
    .filter((r) => {
      const exists = d
        .prepare(
          `SELECT 1 FROM appointment_reminders
           WHERE appointment_id = ? AND reminder_type = ?
           LIMIT 1`,
        )
        .get(r.appointment_id, r.reminder_type)
      return !exists
    })
    .map((r) => ({
      appointment_id: r.appointment_id,
      patient_id: r.patient_id,
      patient_name: r.patient_name,
      patient_phone: r.patient_phone,
      start_time: r.start_time,
      reminder_type: r.reminder_type,
    }))
}

function markAppointmentReminderSentImpl(appointmentId: number, reminderType: '24h' | '2h'): void {
  getDb()
    .prepare(
      `INSERT INTO appointment_reminders (appointment_id, reminder_type, sent_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(appointment_id, reminder_type) DO NOTHING`,
    )
    .run(appointmentId, reminderType)
}

function listInvoicesImpl(limit: number, patientId?: number | null): InvoiceListRow[] {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100_000) : 100
  const d = getDb()
  if (patientId != null && Number.isFinite(patientId)) {
    return d
      .prepare(
        `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
                p.first_name AS patient_first_name, p.last_name AS patient_last_name
         FROM invoices i
         JOIN patients p ON p.id = i.patient_id
         WHERE i.patient_id = ?
         ORDER BY i.date DESC, i.id DESC
         LIMIT ?`,
      )
      .all(patientId, lim) as InvoiceListRow[]
  }
  return d
    .prepare(
      `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       ORDER BY i.date DESC, i.id DESC
       LIMIT ?`,
    )
    .all(lim) as InvoiceListRow[]
}

type InvoiceLineExportRowDb = {
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

function listInvoiceLinesExportImpl(): InvoiceLineExportRowDb[] {
  return getDb()
    .prepare(
      `SELECT
         i.id AS invoice_id,
         i.date AS invoice_date,
         i.status AS invoice_status,
         i.total_amount AS invoice_total,
         i.patient_id AS patient_id,
         p.first_name AS patient_first_name,
         p.last_name AS patient_last_name,
         ii.id AS line_id,
         ii.description AS description,
         ii.tooth_number AS tooth_number,
         ii.price AS line_price
       FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id
       INNER JOIN patients p ON p.id = i.patient_id
       ORDER BY i.date DESC, i.id ASC, ii.id ASC`,
    )
    .all() as InvoiceLineExportRowDb[]
}

function getInvoiceImpl(id: number): { invoice: InvoiceListRow; items: InvoiceItemRow[] } | null {
  const inv = getDb()
    .prepare(
      `SELECT i.id, i.patient_id, i.date, i.total_amount, i.status,
              p.first_name AS patient_first_name, p.last_name AS patient_last_name
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.id = ?`,
    )
    .get(id) as InvoiceListRow | undefined
  if (!inv) return null
  const items = getDb()
    .prepare(
      `SELECT id, invoice_id, description, tooth_number, price FROM invoice_items WHERE invoice_id = ? ORDER BY id`,
    )
    .all(id) as InvoiceItemRow[]
  return { invoice: inv, items }
}

function createInvoiceImpl(
  patientId: number,
  date: string,
  status: 'paid' | 'pending',
  items: { description: string; toothNumber: number | null; price: number }[],
): number {
  const d = getDb()
  const total = items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
  return d.transaction(() => {
    const r = d
      .prepare(
        `INSERT INTO invoices (patient_id, date, total_amount, status) VALUES (@patient_id, @date, @total, @status)`,
      )
      .run({ patient_id: patientId, date, total, status })
    const invId = Number(r.lastInsertRowid)
    const ins = d.prepare(
      `INSERT INTO invoice_items (invoice_id, description, tooth_number, price) VALUES (?, ?, ?, ?)`,
    )
    for (const it of items) {
      ins.run(invId, it.description.trim(), it.toothNumber ?? null, it.price)
    }
    return invId
  })()
}

function updateInvoiceStatusImpl(id: number, status: 'paid' | 'pending'): void {
  getDb().prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id)
}

function updateInvoiceWithItemsImpl(
  id: number,
  date: string,
  status: 'paid' | 'pending',
  items: { description: string; toothNumber: number | null; price: number }[],
): void {
  const d = getDb()
  const total = items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
  d.transaction(() => {
    d.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
    d.prepare('UPDATE invoices SET date = ?, total_amount = ?, status = ? WHERE id = ?').run(
      date,
      total,
      status,
      id,
    )
    const ins = d.prepare(
      `INSERT INTO invoice_items (invoice_id, description, tooth_number, price) VALUES (?, ?, ?, ?)`,
    )
    for (const it of items) {
      ins.run(id, it.description.trim(), it.toothNumber ?? null, it.price)
    }
  })()
}

function deleteInvoiceImpl(id: number): void {
  getDb().prepare('DELETE FROM invoices WHERE id = ?').run(id)
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

function listPrescriptionsImpl(patientId: number): PrescriptionRow[] {
  return getDb()
    .prepare(
      `SELECT pr.id, pr.patient_id, pr.doctor_id, pr.date, pr.medications_json, pr.notes,
              u.username AS doctor_username
       FROM prescriptions pr
       JOIN users u ON u.id = pr.doctor_id
       WHERE pr.patient_id = ?
       ORDER BY pr.date DESC, pr.id DESC`,
    )
    .all(patientId) as PrescriptionRow[]
}

function createPrescriptionImpl(
  patientId: number,
  doctorId: number,
  date: string,
  medicationsJson: string,
  notes: string | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO prescriptions (patient_id, doctor_id, date, medications_json, notes)
       VALUES (@patient_id, @doctor_id, @date, @medications_json, @notes)`,
    )
    .run({
      patient_id: patientId,
      doctor_id: doctorId,
      date,
      medications_json: medicationsJson,
      notes,
    })
  return Number(r.lastInsertRowid)
}

function updatePrescriptionImpl(
  id: number,
  patientId: number,
  doctorId: number,
  date: string,
  medicationsJson: string,
  notes: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE prescriptions SET patient_id=@patient_id, doctor_id=@doctor_id, date=@date,
       medications_json=@medications_json, notes=@notes WHERE id=@id`,
    )
    .run({
      id,
      patient_id: patientId,
      doctor_id: doctorId,
      date,
      medications_json: medicationsJson,
      notes,
    })
}

function deletePrescriptionImpl(id: number): void {
  getDb().prepare('DELETE FROM prescriptions WHERE id = ?').run(id)
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

function listPatientImagesImpl(patientId: number): PatientImageRow[] {
  return getDb()
    .prepare(
      `SELECT id, patient_id, image_path, type, date, notes, tooth_number
       FROM patient_images WHERE patient_id = ? ORDER BY date DESC, id DESC`,
    )
    .all(patientId) as PatientImageRow[]
}

function createPatientImageImpl(
  patientId: number,
  imagePath: string,
  type: 'before' | 'after',
  date: string,
  notes: string | null,
  toothNumber: number | null,
): number {
  const r = getDb()
    .prepare(
      `INSERT INTO patient_images (patient_id, image_path, type, date, notes, tooth_number)
       VALUES (@patient_id, @image_path, @type, @date, @notes, @tooth_number)`,
    )
    .run({
      patient_id: patientId,
      image_path: imagePath,
      type,
      date,
      notes,
      tooth_number: toothNumber,
    })
  return Number(r.lastInsertRowid)
}

function deletePatientImageImpl(id: number): void {
  const row = getDb().prepare('SELECT image_path FROM patient_images WHERE id = ?').get(id) as
    | { image_path: string }
    | undefined
  if (row?.image_path) patientImageDeletedHandler?.(row.image_path)
  getDb().prepare('DELETE FROM patient_images WHERE id = ?').run(id)
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

export type ReportRow = {
  id: string
  date: string
  patientsCount: number
  income: number
  expense: number
  profit: number
}

function getDailyReportsImpl(): ReportRow[] {
  const d = getDb()
  const rows = d.prepare(`
    SELECT 
      substr(date, 1, 10) as date_val,
      COUNT(DISTINCT patient_id) as patients_count,
      SUM(total_amount) as income
    FROM invoices 
    WHERE status = 'paid'
    GROUP BY substr(date, 1, 10)
    ORDER BY date_val DESC
    LIMIT 100
  `).all() as { date_val: string; patients_count: number; income: number }[]

  return rows.map((r, i) => {
    const inc = r.income || 0
    const exp = 0 // Add expense table if needed later
    return {
      id: `REP-${(i + 1).toString().padStart(3, '0')}`,
      date: r.date_val,
      patientsCount: r.patients_count,
      income: inc,
      expense: exp,
      profit: inc - exp
    }
  })
}

function getDashboardStatsImpl(): DashboardStats {
  const d = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const monthKey = new Date().toISOString().slice(0, 7)

  const revenueToday = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE substr(date,1,10) = ?`).get(today) as {
      s: number
    }
  ).s

  const revenueMonth = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE substr(date,1,7) = ?`).get(monthKey) as {
      s: number
    }
  ).s

  const pendingDebt = (
    d.prepare(`SELECT COALESCE(SUM(total_amount), 0) AS s FROM invoices WHERE status = 'pending'`).get() as { s: number }
  ).s

  const aptRows = d
    .prepare(
      `SELECT status, COUNT(*) AS c FROM appointments
       WHERE start_time >= datetime('now', '-90 days') GROUP BY status`,
    )
    .all() as { status: string; c: number }[]

  let appointmentsCompleted = 0
  let appointmentsCancelled = 0
  let appointmentsScheduled = 0
  for (const r of aptRows) {
    if (r.status === 'completed') appointmentsCompleted += r.c
    else if (r.status === 'cancelled') appointmentsCancelled += r.c
    else if (r.status === 'scheduled') appointmentsScheduled += r.c
  }

  const topProcedures = d
    .prepare(
      `SELECT ii.description AS description, COUNT(*) AS count
       FROM invoice_items ii
       INNER JOIN invoices i ON i.id = ii.invoice_id
       GROUP BY ii.description
       ORDER BY count DESC
       LIMIT 8`,
    )
    .all() as { description: string; count: number }[]

  return {
    revenueToday,
    revenueMonth,
    appointmentsCompleted,
    appointmentsCancelled,
    appointmentsScheduled,
    pendingDebt,
    topProcedures,
  }
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

function listDistributorsImpl(query: string = ''): DistributorRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM distributors ORDER BY id DESC').all() as DistributorRow[]
  return d
    .prepare('SELECT * FROM distributors WHERE name LIKE ? OR company LIKE ? OR items LIKE ? ORDER BY id DESC')
    .all(`%${query}%`, `%${query}%`, `%${query}%`) as DistributorRow[]
}

function createDistributorImpl(req: {
  name: string
  company: string
  phone: string
  address: string
  items: string
  paymentAmount: number
  remainingAmount: number
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO distributors (name, company, phone, address, items, payment_amount, remaining_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.name, req.company, req.phone, req.address, req.items, req.paymentAmount, req.remainingAmount)
  return info.lastInsertRowid as number
}

function updateDistributorImpl(
  id: number,
  req: {
    name: string
    company: string
    phone: string
    address: string
    items: string
    paymentAmount: number
    remainingAmount: number
  }
): void {
  getDb()
    .prepare(
      `UPDATE distributors 
       SET name = ?, company = ?, phone = ?, address = ?, items = ?, payment_amount = ?, remaining_amount = ? 
       WHERE id = ?`
    )
    .run(req.name, req.company, req.phone, req.address, req.items, req.paymentAmount, req.remainingAmount, id)
}

function deleteDistributorImpl(id: number): void {
  getDb().prepare('DELETE FROM distributors WHERE id = ?').run(id)
}

function listTransactionsImpl(query: string = ''): TransactionRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC').all() as TransactionRow[]
  return d
    .prepare('SELECT * FROM transactions WHERE description LIKE ? OR trx_id LIKE ? ORDER BY date DESC, id DESC')
    .all(`%${query}%`, `%${query}%`) as TransactionRow[]
}

function createTransactionImpl(req: {
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
}): number {
  const d = getDb()
  return d.transaction(() => {
    // Generate a simple ID like TRX-0001
    const countRow = d.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }
    const nextNum = countRow.c + 1
    const trxId = `TRX-${String(nextNum).padStart(4, '0')}`
    
    const info = d.prepare(
      `INSERT INTO transactions (trx_id, date, description, type, amount, currency)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(trxId, req.date, req.description, req.type, req.amount, req.currency)
    return info.lastInsertRowid as number
  })()
}

function deleteTransactionImpl(id: number): void {
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

function listLabOrdersImpl(query: string = ''): LabOrderRow[] {
  const d = getDb()
  if (!query) return d.prepare('SELECT * FROM lab_orders ORDER BY sent_date DESC, id DESC').all() as LabOrderRow[]
  return d
    .prepare('SELECT * FROM lab_orders WHERE patient_name LIKE ? OR lab_name LIKE ? OR order_id LIKE ? ORDER BY sent_date DESC, id DESC')
    .all(`%${query}%`, `%${query}%`, `%${query}%`) as LabOrderRow[]
}

function createLabOrderImpl(req: {
  patientName: string
  labName: string
  workType: string
  sentDate: string
  status: 'progress' | 'received' | 'delayed'
}): number {
  const d = getDb()
  return d.transaction(() => {
    const countRow = d.prepare('SELECT COUNT(*) as c FROM lab_orders').get() as { c: number }
    const nextNum = countRow.c + 1
    const orderId = `LAB-${String(nextNum).padStart(4, '0')}`
    
    const info = d.prepare(
      `INSERT INTO lab_orders (order_id, patient_name, lab_name, work_type, sent_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(orderId, req.patientName, req.labName, req.workType, req.sentDate, req.status)
    return info.lastInsertRowid as number
  })()
}

function updateLabOrderStatusImpl(id: number, status: 'progress' | 'received' | 'delayed'): void {
  getDb().prepare('UPDATE lab_orders SET status = ? WHERE id = ?').run(status, id)
}

function deleteLabOrderImpl(id: number): void {
  getDb().prepare('DELETE FROM lab_orders WHERE id = ?').run(id)
}

export type DbRequest =
  | { op: 'getConfig'; key: string }
  | { op: 'setConfig'; key: string; value: string }
  | { op: 'getConfigs'; keys: string[] }
  | { op: 'verifyCredentials'; username: string; password: string }
  | { op: 'listUsers' }
  | { op: 'createUser'; username: string; role: UserRole; pin: string }
  | { op: 'updateUserPin'; id: number; pin: string }
  | { op: 'updateUsername'; id: number; username: string }
  | { op: 'deleteUser'; id: number }
  | { op: 'setLicenseActive' }
  | { op: 'listPatients'; query?: string }
  | { op: 'getPatient'; id: number }
  | {
      op: 'createPatient'
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | {
      op: 'updatePatient'
      id: number
      firstName: string
      lastName: string
      dob: string | null
      gender: string | null
      phone: string | null
      medicalHistory: string | null
    }
  | { op: 'deletePatient'; id: number }
  | { op: 'listTeethStatuses'; patientId: number }
  | {
      op: 'upsertTeethStatus'
      patientId: number
      toothNumber: number
      status: string
      notes: string | null
      preparationDepthMm: number | null
    }
  | { op: 'listAppointments'; fromIso: string | null; toIso: string | null }
  | {
      op: 'createAppointment'
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | {
      op: 'updateAppointment'
      id: number
      patientId: number
      startTime: string
      endTime: string
      status: string
      notes: string | null
    }
  | { op: 'deleteAppointment'; id: number }
  | { op: 'listDueWhatsAppReminders'; nowIso: string }
  | { op: 'markAppointmentReminderSent'; appointmentId: number; reminderType: '24h' | '2h' }
  | { op: 'listTreatmentPlans'; patientId: number }
  | { op: 'createTreatmentPlan'; patientId: number; title: string; diagnosis: string | null; notes: string | null }
  | { op: 'updateTreatmentPlan'; id: number; title: string; diagnosis: string | null; notes: string | null; status: TreatmentPlanRow['status'] }
  | { op: 'acceptTreatmentPlan'; id: number; acceptedByName: string; signatureText: string }
  | { op: 'deleteTreatmentPlan'; id: number }
  | { op: 'listTreatmentPlanStages'; planId: number }
  | {
      op: 'createTreatmentPlanStage'
      planId: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: TreatmentPlanStageRow['status']
      appointmentId: number | null
      dueDate: string | null
    }
  | {
      op: 'updateTreatmentPlanStage'
      id: number
      stageOrder: number
      title: string
      description: string | null
      estimatedCost: number
      paidAmount: number
      status: TreatmentPlanStageRow['status']
      appointmentId: number | null
      dueDate: string | null
    }
  | { op: 'deleteTreatmentPlanStage'; id: number }
  | { op: 'listInvoices'; limit?: number; patientId?: number | null }
  | { op: 'listInvoiceLinesExport' }
  | { op: 'getInvoice'; id: number }
  | {
      op: 'createInvoice'
      patientId: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'updateInvoiceStatus'; id: number; status: 'paid' | 'pending' }
  | {
      op: 'updateInvoiceWithItems'
      id: number
      date: string
      status: 'paid' | 'pending'
      items: { description: string; toothNumber: number | null; price: number }[]
    }
  | { op: 'deleteInvoice'; id: number }
  | { op: 'listPrescriptions'; patientId: number }
  | {
      op: 'createPrescription'
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | {
      op: 'updatePrescription'
      id: number
      patientId: number
      doctorId: number
      date: string
      medicationsJson: string
      notes: string | null
    }
  | { op: 'deletePrescription'; id: number }
  | { op: 'listPatientImages'; patientId: number }
  | {
      op: 'createPatientImage'
      patientId: number
      imagePath: string
      type: 'before' | 'after'
      date: string
      notes: string | null
      toothNumber: number | null
    }
  | { op: 'deletePatientImage'; id: number }
  | { op: 'getDashboardStats' }
  | { op: 'getDailyReports' }
  | { op: 'listDistributors'; query?: string }
  | {
      op: 'createDistributor'
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | {
      op: 'updateDistributor'
      id: number
      name: string
      company: string
      phone: string
      address: string
      items: string
      paymentAmount: number
      remainingAmount: number
    }
  | { op: 'deleteDistributor'; id: number }

  | { op: 'listTransactions'; query?: string }
  | {
      op: 'createTransaction'
      date: string
      description: string
      type: 'income' | 'expense'
      amount: number
      currency: string
    }
  | { op: 'deleteTransaction'; id: number }
  | { op: 'listLabOrders'; query?: string }
  | {
      op: 'createLabOrder'
      patientName: string
      labName: string
      workType: string
      sentDate: string
      status: 'progress' | 'received' | 'delayed'
    }
  | { op: 'updateLabOrderStatus'; id: number; status: 'progress' | 'received' | 'delayed' }
  | { op: 'deleteLabOrder'; id: number }

export function handleDbRequest(req: DbRequest): unknown {
  switch (req.op) {
    case 'getConfig':
      return getConfig(req.key)
    case 'setConfig':
      setConfig(req.key, req.value)
      return true
    case 'getConfigs': {
      if (req.keys.length === 0) return {}
      const stmt = getDb().prepare(
        'SELECT key, value FROM app_config WHERE key IN (' + req.keys.map(() => '?').join(',') + ')',
      )
      const rows = stmt.all(...req.keys) as { key: string; value: string }[]
      const map: Record<string, string> = {}
      for (const r of rows) map[r.key] = r.value
      return map
    }
    case 'verifyCredentials':
      return verifyCredentials(req.username, req.password)
    case 'listUsers':
      return listUsers()
    case 'createUser':
      return createUserImpl(req.username, req.role, req.pin)
    case 'updateUserPin':
      updateUserPinImpl(req.id, req.pin)
      return true
    case 'updateUsername':
      updateUsernameImpl(req.id, req.username)
      return true
    case 'deleteUser':
      deleteUserImpl(req.id)
      return true
    case 'setLicenseActive':
      setConfig('license_status', 'active')
      return true
    case 'listPatients':
      return listPatientsImpl(req.query ?? '')
    case 'getPatient':
      return getPatientImpl(req.id)
    case 'createPatient':
      return createPatientImpl({
        firstName: req.firstName,
        lastName: req.lastName,
        dob: req.dob,
        gender: req.gender,
        phone: req.phone,
        medicalHistory: req.medicalHistory,
      })
    case 'updatePatient':
      updatePatientImpl(req.id, {
        firstName: req.firstName,
        lastName: req.lastName,
        dob: req.dob,
        gender: req.gender,
        phone: req.phone,
        medicalHistory: req.medicalHistory,
      })
      return true
    case 'deletePatient':
      deletePatientImpl(req.id)
      return true
    case 'listTeethStatuses':
      return listTeethStatusesImpl(req.patientId)
    case 'upsertTeethStatus':
      return upsertTeethStatusImpl(
        req.patientId,
        req.toothNumber,
        req.status,
        req.notes,
        req.preparationDepthMm,
      )
    case 'listAppointments':
      return listAppointmentsImpl(req.fromIso, req.toIso)
    case 'createAppointment':
      return createAppointmentImpl(req.patientId, req.startTime, req.endTime, req.status, req.notes)
    case 'updateAppointment':
      updateAppointmentImpl(req.id, req.patientId, req.startTime, req.endTime, req.status, req.notes)
      return true
    case 'deleteAppointment':
      deleteAppointmentImpl(req.id)
      return true
    case 'listDueWhatsAppReminders':
      return listDueWhatsAppRemindersImpl(req.nowIso)
    case 'markAppointmentReminderSent':
      markAppointmentReminderSentImpl(req.appointmentId, req.reminderType)
      return true
    case 'listTreatmentPlans':
      return listTreatmentPlansImpl(req.patientId)
    case 'createTreatmentPlan':
      return createTreatmentPlanImpl(req.patientId, req.title, req.diagnosis, req.notes)
    case 'updateTreatmentPlan':
      updateTreatmentPlanImpl(req.id, req.title, req.diagnosis, req.notes, req.status)
      return true
    case 'acceptTreatmentPlan':
      acceptTreatmentPlanImpl(req.id, req.acceptedByName, req.signatureText)
      return true
    case 'deleteTreatmentPlan':
      deleteTreatmentPlanImpl(req.id)
      return true
    case 'listTreatmentPlanStages':
      return listTreatmentPlanStagesImpl(req.planId)
    case 'createTreatmentPlanStage':
      return createTreatmentPlanStageImpl({
        planId: req.planId,
        stageOrder: req.stageOrder,
        title: req.title,
        description: req.description,
        estimatedCost: req.estimatedCost,
        paidAmount: req.paidAmount,
        status: req.status,
        appointmentId: req.appointmentId,
        dueDate: req.dueDate,
      })
    case 'updateTreatmentPlanStage':
      updateTreatmentPlanStageImpl({
        id: req.id,
        stageOrder: req.stageOrder,
        title: req.title,
        description: req.description,
        estimatedCost: req.estimatedCost,
        paidAmount: req.paidAmount,
        status: req.status,
        appointmentId: req.appointmentId,
        dueDate: req.dueDate,
      })
      return true
    case 'deleteTreatmentPlanStage':
      deleteTreatmentPlanStageImpl(req.id)
      return true
    case 'listInvoices':
      return listInvoicesImpl(req.limit ?? 100, req.patientId)
    case 'listInvoiceLinesExport':
      return listInvoiceLinesExportImpl()
    case 'getInvoice':
      return getInvoiceImpl(req.id)
    case 'createInvoice':
      return createInvoiceImpl(req.patientId, req.date, req.status, req.items)
    case 'updateInvoiceStatus':
      updateInvoiceStatusImpl(req.id, req.status)
      return true
    case 'updateInvoiceWithItems':
      updateInvoiceWithItemsImpl(req.id, req.date, req.status, req.items)
      return true
    case 'deleteInvoice':
      deleteInvoiceImpl(req.id)
      return true
    case 'listPrescriptions':
      return listPrescriptionsImpl(req.patientId)
    case 'createPrescription':
      return createPrescriptionImpl(
        req.patientId,
        req.doctorId,
        req.date,
        req.medicationsJson,
        req.notes,
      )
    case 'updatePrescription':
      updatePrescriptionImpl(
        req.id,
        req.patientId,
        req.doctorId,
        req.date,
        req.medicationsJson,
        req.notes,
      )
      return true
    case 'deletePrescription':
      deletePrescriptionImpl(req.id)
      return true
    case 'listPatientImages':
      return listPatientImagesImpl(req.patientId)
    case 'createPatientImage':
      return createPatientImageImpl(
        req.patientId,
        req.imagePath,
        req.type,
        req.date,
        req.notes,
        req.toothNumber,
      )
    case 'deletePatientImage':
      deletePatientImageImpl(req.id)
      return true
    case 'getDashboardStats':
      return getDashboardStatsImpl()
    case 'getDailyReports':
      return getDailyReportsImpl()
    case 'listDistributors':
      return listDistributorsImpl(req.query ?? '')
    case 'createDistributor':
      return createDistributorImpl({
        name: req.name,
        company: req.company,
        phone: req.phone,
        address: req.address,
        items: req.items,
        paymentAmount: req.paymentAmount,
        remainingAmount: req.remainingAmount,
      })
    case 'updateDistributor':
      updateDistributorImpl(req.id, {
        name: req.name,
        company: req.company,
        phone: req.phone,
        address: req.address,
        items: req.items,
        paymentAmount: req.paymentAmount,
        remainingAmount: req.remainingAmount,
      })
      return true
    case 'deleteDistributor':
      deleteDistributorImpl(req.id)
      return true
    case 'listTransactions':
      return listTransactionsImpl(req.query ?? '')
    case 'createTransaction':
      return createTransactionImpl({
        date: req.date,
        description: req.description,
        type: req.type,
        amount: req.amount,
        currency: req.currency
      })
    case 'deleteTransaction':
      deleteTransactionImpl(req.id)
      return true
    case 'listLabOrders':
      return listLabOrdersImpl(req.query ?? '')
    case 'createLabOrder':
      return createLabOrderImpl({
        patientName: req.patientName,
        labName: req.labName,
        workType: req.workType,
        sentDate: req.sentDate,
        status: req.status,
      })
    case 'updateLabOrderStatus':
      updateLabOrderStatusImpl(req.id, req.status)
      return true
    case 'deleteLabOrder':
      deleteLabOrderImpl(req.id)
      return true
    default:
      throw new Error('Unknown db operation')
  }
}
