import type { DentAssistApi, DbInvokePayload } from '@/vite-env'
import type {
  Appointment,
  DashboardStats,
  InvoiceItemRow,
  InvoiceLineExportRow,
  InvoiceListRow,
  Patient,
  PatientImageRow,
  PrescriptionRow,
  TeethStatusRow,
} from '@/types/clinical'

const STORAGE_KEY = 'dentassist-pro-browser-mock-config'
const CLINICAL_KEY = 'dentassist-pro-browser-mock-clinical'

const MOCK_USERS: { id: number; username: string; role: 'doctor' | 'receptionist'; password: string }[] = [
  { id: 1, username: 'doctor', role: 'doctor', password: '1234' },
  { id: 2, username: 'reception', role: 'receptionist', password: '5678' },
]

type MockClinical = {
  patients: Patient[]
  nextPatientId: number
  teeth: TeethStatusRow[]
  nextToothId: number
  appointments: Appointment[]
  nextApptId: number
  invoices: InvoiceListRow[]
  invoiceItems: InvoiceItemRow[]
  nextInvId: number
  nextItemId: number
  prescriptions: PrescriptionRow[]
  nextRxId: number
  patientImages: PatientImageRow[]
  nextImgId: number
}

function emptyClinical(): MockClinical {
  return {
    patients: [],
    nextPatientId: 1,
    teeth: [],
    nextToothId: 1,
    appointments: [],
    nextApptId: 1,
    invoices: [],
    invoiceItems: [],
    nextInvId: 1,
    nextItemId: 1,
    prescriptions: [],
    nextRxId: 1,
    patientImages: [],
    nextImgId: 1,
  }
}

function readClinical(): MockClinical {
  try {
    const raw = localStorage.getItem(CLINICAL_KEY)
    if (raw) {
      const p = JSON.parse(raw) as MockClinical
      if (!Array.isArray(p.prescriptions)) p.prescriptions = []
      if (typeof p.nextRxId !== 'number') {
        p.nextRxId =
          (p.prescriptions.length ? Math.max(...p.prescriptions.map((x) => x.id), 0) : 0) + 1
      }
      if (!Array.isArray(p.patientImages)) p.patientImages = []
      if (typeof p.nextImgId !== 'number') {
        p.nextImgId =
          (p.patientImages.length ? Math.max(...p.patientImages.map((x) => x.id), 0) : 0) + 1
      }
      for (const a of p.appointments) {
        const row = a as Appointment & { patient_phone?: string | null }
        if (row.patient_phone === undefined) {
          const pt = p.patients.find((x) => x.id === row.patient_id)
          row.patient_phone = pt?.phone ?? null
        }
      }
      for (const t of p.teeth) {
        if ((t as TeethStatusRow).preparation_depth_mm === undefined) {
          ;(t as TeethStatusRow).preparation_depth_mm = null
        }
      }
      return p
    }
  } catch {
    /* ignore */
  }
  const db = emptyClinical()
  const now = new Date().toISOString()
  db.patients.push({
    id: db.nextPatientId++,
    first_name: 'أحمد',
    last_name: 'تجريبي',
    dob: '1990-01-15',
    gender: 'male',
    phone: '0500000000',
    medical_history: '',
    created_at: now,
  })
  localStorage.setItem(CLINICAL_KEY, JSON.stringify(db))
  return db
}

function writeClinical(c: MockClinical): void {
  localStorage.setItem(CLINICAL_KEY, JSON.stringify(c))
}

function patientName(pt: Patient): { first: string; last: string } {
  return { first: pt.first_name, last: pt.last_name }
}

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, string>
  } catch {
    /* ignore */
  }
  const machineId = `browser-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())}`
  const initial: Record<string, string> = {
    machine_id: machineId,
    first_launch_date: new Date().toISOString(),
    license_status: 'active',
    language: 'ar',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

function writeStore(store: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function handleClinical(payload: DbInvokePayload, c: MockClinical): unknown {
  switch (payload.op) {
    case 'listPatients': {
      const q = (payload.query ?? '').trim().toLowerCase()
      let rows = [...c.patients]
      if (q) {
        rows = rows.filter(
          (p) =>
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            (p.phone ?? '').toLowerCase().includes(q),
        )
      }
      rows.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
      return rows
    }
    case 'getPatient':
      return c.patients.find((p) => p.id === payload.id) ?? null
    case 'createPatient': {
      const now = new Date().toISOString()
      const id = c.nextPatientId++
      c.patients.push({
        id,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        dob: payload.dob,
        gender: payload.gender,
        phone: payload.phone?.trim() || null,
        medical_history: payload.medicalHistory,
        created_at: now,
      })
      writeClinical(c)
      return id
    }
    case 'updatePatient': {
      const p = c.patients.find((x) => x.id === payload.id)
      if (!p) throw new Error('Patient not found')
      p.first_name = payload.firstName.trim()
      p.last_name = payload.lastName.trim()
      p.dob = payload.dob
      p.gender = payload.gender
      p.phone = payload.phone?.trim() || null
      p.medical_history = payload.medicalHistory
      writeClinical(c)
      return true
    }
    case 'deletePatient': {
      c.patients = c.patients.filter((p) => p.id !== payload.id)
      c.teeth = c.teeth.filter((t) => t.patient_id !== payload.id)
      c.appointments = c.appointments.filter((a) => a.patient_id !== payload.id)
      const invIds = c.invoices.filter((i) => i.patient_id === payload.id).map((i) => i.id)
      c.invoices = c.invoices.filter((i) => i.patient_id !== payload.id)
      c.invoiceItems = c.invoiceItems.filter((it) => !invIds.includes(it.invoice_id))
      c.prescriptions = c.prescriptions.filter((pr) => pr.patient_id !== payload.id)
      c.patientImages = c.patientImages.filter((im) => im.patient_id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listTeethStatuses':
      return c.teeth.filter((t) => t.patient_id === payload.patientId)
    case 'upsertTeethStatus': {
      const now = new Date().toISOString()
      const depth = payload.preparationDepthMm
      const idx = c.teeth.findIndex(
        (t) => t.patient_id === payload.patientId && t.tooth_number === payload.toothNumber,
      )
      if (idx >= 0) {
        c.teeth[idx] = {
          ...c.teeth[idx],
          status: payload.status,
          notes: payload.notes,
          preparation_depth_mm: depth,
          updated_at: now,
        }
      } else {
        c.teeth.push({
          id: c.nextToothId++,
          patient_id: payload.patientId,
          tooth_number: payload.toothNumber,
          status: payload.status,
          notes: payload.notes,
          preparation_depth_mm: depth,
          updated_at: now,
        })
      }
      writeClinical(c)
      return c.teeth.find((t) => t.patient_id === payload.patientId && t.tooth_number === payload.toothNumber)!
    }
    case 'listAppointments': {
      let rows = c.appointments.slice()
      if (payload.fromIso) rows = rows.filter((a) => a.start_time >= payload.fromIso!)
      if (payload.toIso) rows = rows.filter((a) => a.start_time <= payload.toIso!)
      rows.sort((a, b) => a.start_time.localeCompare(b.start_time))
      return rows
    }
    case 'createAppointment': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      const id = c.nextApptId++
      c.appointments.push({
        id,
        patient_id: payload.patientId,
        start_time: payload.startTime,
        end_time: payload.endTime,
        status: payload.status,
        notes: payload.notes,
        patient_first_name: first,
        patient_last_name: last,
        patient_phone: pt.phone ?? null,
      })
      writeClinical(c)
      return id
    }
    case 'updateAppointment': {
      const a = c.appointments.find((x) => x.id === payload.id)
      if (!a) throw new Error('Appointment not found')
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      a.patient_id = payload.patientId
      a.start_time = payload.startTime
      a.end_time = payload.endTime
      a.status = payload.status
      a.notes = payload.notes
      a.patient_first_name = first
      a.patient_last_name = last
      a.patient_phone = pt.phone ?? null
      writeClinical(c)
      return true
    }
    case 'deleteAppointment': {
      c.appointments = c.appointments.filter((a) => a.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listInvoices': {
      const lim = Math.min(payload.limit ?? 100, 100_000)
      let list = [...c.invoices]
      if (payload.patientId != null && Number.isFinite(payload.patientId)) {
        list = list.filter((i) => i.patient_id === payload.patientId)
      }
      return list.sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id).slice(0, lim)
    }
    case 'listInvoiceLinesExport': {
      const list = [...c.invoices].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      const out: InvoiceLineExportRow[] = []
      for (const inv of list) {
        const items = c.invoiceItems.filter((it) => it.invoice_id === inv.id).sort((a, b) => a.id - b.id)
        for (const ii of items) {
          out.push({
            invoice_id: inv.id,
            invoice_date: inv.date,
            invoice_status: inv.status,
            invoice_total: inv.total_amount,
            patient_id: inv.patient_id,
            patient_first_name: inv.patient_first_name,
            patient_last_name: inv.patient_last_name,
            line_id: ii.id,
            description: ii.description,
            tooth_number: ii.tooth_number,
            line_price: ii.price,
          })
        }
      }
      return out
    }
    case 'getInvoice': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) return null
      const items = c.invoiceItems.filter((it) => it.invoice_id === inv.id).sort((a, b) => a.id - b.id)
      return { invoice: inv, items }
    }
    case 'createInvoice': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const { first, last } = patientName(pt)
      const total = payload.items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
      const id = c.nextInvId++
      c.invoices.push({
        id,
        patient_id: payload.patientId,
        date: payload.date,
        total_amount: total,
        status: payload.status,
        patient_first_name: first,
        patient_last_name: last,
      })
      for (const it of payload.items) {
        c.invoiceItems.push({
          id: c.nextItemId++,
          invoice_id: id,
          description: it.description.trim(),
          tooth_number: it.toothNumber ?? null,
          price: it.price,
        })
      }
      writeClinical(c)
      return id
    }
    case 'updateInvoiceStatus': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) throw new Error('Invoice not found')
      inv.status = payload.status
      writeClinical(c)
      return true
    }
    case 'updateInvoiceWithItems': {
      const inv = c.invoices.find((i) => i.id === payload.id)
      if (!inv) throw new Error('Invoice not found')
      c.invoiceItems = c.invoiceItems.filter((it) => it.invoice_id !== payload.id)
      const total = payload.items.reduce((s, it) => s + (Number.isFinite(it.price) ? it.price : 0), 0)
      inv.date = payload.date
      inv.status = payload.status
      inv.total_amount = total
      for (const it of payload.items) {
        c.invoiceItems.push({
          id: c.nextItemId++,
          invoice_id: payload.id,
          description: it.description.trim(),
          tooth_number: it.toothNumber ?? null,
          price: it.price,
        })
      }
      writeClinical(c)
      return true
    }
    case 'deleteInvoice': {
      c.invoices = c.invoices.filter((i) => i.id !== payload.id)
      c.invoiceItems = c.invoiceItems.filter((it) => it.invoice_id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listPrescriptions': {
      return [...c.prescriptions]
        .filter((pr) => pr.patient_id === payload.patientId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    }
    case 'createPrescription': {
      const u = MOCK_USERS.find((x) => x.id === payload.doctorId)
      if (!u) throw new Error('User not found')
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const id = c.nextRxId++
      c.prescriptions.push({
        id,
        patient_id: payload.patientId,
        doctor_id: payload.doctorId,
        date: payload.date,
        medications_json: payload.medicationsJson,
        notes: payload.notes,
        doctor_username: u.username,
      })
      writeClinical(c)
      return id
    }
    case 'updatePrescription': {
      const pr = c.prescriptions.find((x) => x.id === payload.id)
      if (!pr) throw new Error('Prescription not found')
      const u = MOCK_USERS.find((x) => x.id === payload.doctorId)
      if (!u) throw new Error('User not found')
      pr.patient_id = payload.patientId
      pr.doctor_id = payload.doctorId
      pr.date = payload.date
      pr.medications_json = payload.medicationsJson
      pr.notes = payload.notes
      pr.doctor_username = u.username
      writeClinical(c)
      return true
    }
    case 'deletePrescription': {
      c.prescriptions = c.prescriptions.filter((p) => p.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'listPatientImages': {
      return [...c.patientImages]
        .filter((im) => im.patient_id === payload.patientId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    }
    case 'createPatientImage': {
      const pt = c.patients.find((x) => x.id === payload.patientId)
      if (!pt) throw new Error('Patient not found')
      const id = c.nextImgId++
      c.patientImages.push({
        id,
        patient_id: payload.patientId,
        image_path: payload.imagePath,
        type: payload.type,
        date: payload.date,
        notes: payload.notes,
        tooth_number: payload.toothNumber,
      })
      writeClinical(c)
      return id
    }
    case 'deletePatientImage': {
      c.patientImages = c.patientImages.filter((im) => im.id !== payload.id)
      writeClinical(c)
      return true
    }
    case 'getDailyReports': {
      const byDay = new Map<string, { patients: Set<number>; income: number }>()
      for (const inv of c.invoices.filter((i) => i.status === 'paid')) {
        const day = inv.date.slice(0, 10)
        const cur = byDay.get(day) ?? { patients: new Set<number>(), income: 0 }
        cur.patients.add(inv.patient_id)
        cur.income += inv.total_amount
        byDay.set(day, cur)
      }
      const rows = [...byDay.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 100)
        .map(([date, v], i) => ({
          id: `REP-${String(i + 1).padStart(3, '0')}`,
          date,
          patientsCount: v.patients.size,
          income: v.income,
          expense: 0,
          profit: v.income,
        }))
      return rows
    }
    case 'getDashboardStats': {
      const today = new Date().toISOString().slice(0, 10)
      const month = new Date().toISOString().slice(0, 7)
      let revenueToday = 0
      let revenueMonth = 0
      let pendingDebt = 0
      for (const inv of c.invoices) {
        if (inv.date.slice(0, 10) === today) revenueToday += inv.total_amount
        if (inv.date.slice(0, 7) === month) revenueMonth += inv.total_amount
        if (inv.status === 'pending') pendingDebt += inv.total_amount
      }
      const apt = { completed: 0, cancelled: 0, scheduled: 0 }
      for (const a of c.appointments) {
        if (a.status === 'completed') apt.completed++
        else if (a.status === 'cancelled') apt.cancelled++
        else if (a.status === 'scheduled') apt.scheduled++
      }
      const counts = new Map<string, number>()
      for (const it of c.invoiceItems) {
        const d = it.description.trim() || '—'
        counts.set(d, (counts.get(d) ?? 0) + 1)
      }
      const topProcedures = [...counts.entries()]
        .map(([description, count]) => ({ description, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 8)
      const out: DashboardStats = {
        revenueToday,
        revenueMonth,
        appointmentsCompleted: apt.completed,
        appointmentsCancelled: apt.cancelled,
        appointmentsScheduled: apt.scheduled,
        pendingDebt,
        topProcedures,
      }
      return out
    }
    default:
      return undefined
  }
}

function handleDb(payload: DbInvokePayload): unknown {
  switch (payload.op) {
    case 'getConfig':
      return readStore()[payload.key] ?? null
    case 'setConfig': {
      const store = readStore()
      store[payload.key] = payload.value
      writeStore(store)
      return true
    }
    case 'getConfigs': {
      const store = readStore()
      const out: Record<string, string> = {}
      for (const key of payload.keys) {
        const v = store[key]
        if (v !== undefined) out[key] = v
      }
      return out
    }
    case 'listUsers':
      return MOCK_USERS.map(({ id, username, role }) => ({ id, username, role }))
    case 'verifyCredentials': {
      const u = MOCK_USERS.find(
        (x) => x.username === payload.username.trim() && x.password === payload.password,
      )
      return u ? { id: u.id, username: u.username, role: u.role } : null
    }
    case 'setLicenseActive': {
      const store = readStore()
      store.license_status = 'active'
      writeStore(store)
      return true
    }
    case 'listDueWhatsAppReminders':
      return []
    case 'markAppointmentReminderSent':
      return true
    case 'listTreatmentPlans':
      return []
    case 'createTreatmentPlan':
      return Date.now()
    case 'updateTreatmentPlan':
      return true
    case 'acceptTreatmentPlan':
      return true
    case 'deleteTreatmentPlan':
      return true
    case 'listTreatmentPlanStages':
      return []
    case 'createTreatmentPlanStage':
      return Date.now()
    case 'updateTreatmentPlanStage':
      return true
    case 'deleteTreatmentPlanStage':
      return true
    default: {
      const c = readClinical()
      const r = handleClinical(payload, c)
      if (r !== undefined) return r
      throw new Error(`Unknown db op: ${(payload as { op: string }).op}`)
    }
  }
}

const mockApi: DentAssistApi = {
  isElectronShell: false,
  getMachineId: async () => readStore().machine_id ?? 'browser-dev',
  getPaths: async () => ({
    userData: '/mock/userData',
    imagesDir: '/mock/images',
    logosDir: '/mock/logos',
    dbPath: '/mock/dentassist.sqlite',
  }),
  db: async (payload) => handleDb(payload),
  openExternal: async (url: string) => {
    if (!url.startsWith('https://') && !url.startsWith('http://')) return false
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  },
  saveClinicLogo: async () => '/mock/clinic-logo.png',
  resolveAssetPath: async (relativePath) => relativePath,
  readUserDataFileBase64: async () =>
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  savePatientImage: async (patientId: number, _buf: ArrayBuffer, ext: string) => {
    const e = (ext || 'jpg').replace(/^\./, '')
    return `app_data/images/mock-${patientId}-${Date.now()}.${e}`
  },
  exportEncryptedBackup: async () => ({ ok: false as const }),
  importEncryptedBackup: async () => ({ ok: false as const }),
  saveTextFile: async (defaultFileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultFileName.endsWith('.csv') ? defaultFileName : `${defaultFileName}.csv`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { ok: true as const, filePath: a.download }
  },
  windowMinimize: async () => {},
  windowToggleMaximize: async () => ({ maximized: false }),
  windowClose: async () => {},
}

export function installBrowserMockBridge(): void {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  if (window.dentassist) return
  window.dentassist = mockApi
  console.info('[DentAssist] Browser dev mock: SQLite is simulated in localStorage. Use Electron for real data.')
}

installBrowserMockBridge()
