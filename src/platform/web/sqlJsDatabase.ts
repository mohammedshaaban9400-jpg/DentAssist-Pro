import initSqlJs, { type Database } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { wrapSqlJs } from '@/shared/db/adapters/sqlJs'
import {
  attachDatabase,
  detachDatabase,
  handleDbRequest,
  setCredentialCrypto,
  setMachineIdProvider,
} from '@/shared/db/core'
import { nobleCredentialCrypto } from '@/shared/db/cryptoNoble'
import type { DbInvokePayload } from '@/vite-env'
import { clearSqliteBlob, loadSqliteBlob, saveSqliteBlob } from '@/platform/web/sqlitePersist'

const MACHINE_KEY = 'dentassist-pro-machine-id'

let nativeDb: Database | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null
let initPromise: Promise<void> | null = null

function computeWebMachineId(): string {
  try {
    const existing = localStorage.getItem(MACHINE_KEY)
    if (existing?.trim()) return existing.trim()
  } catch {
    /* ignore */
  }
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    localStorage.setItem(MACHINE_KEY, id)
  } catch {
    /* ignore */
  }
  return id
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void persistDatabase()
  }, 350)
}

async function persistDatabase(): Promise<void> {
  if (!nativeDb) return
  try {
    await saveSqliteBlob(nativeDb.export())
  } catch (e) {
    console.warn('[DentAssist] Failed to persist SQLite', e)
  }
}

export async function initSqlJsDatabase(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
    const existing = await loadSqliteBlob()
    nativeDb = existing?.length ? new SQL.Database(existing) : new SQL.Database()
    const adapter = wrapSqlJs(nativeDb, schedulePersist)
    setCredentialCrypto(nobleCredentialCrypto)
    setMachineIdProvider(computeWebMachineId)
    attachDatabase(adapter)
    await persistDatabase()
  })()
  return initPromise
}

export function exportDatabaseBytes(): Uint8Array {
  if (!nativeDb) throw new Error('Database not initialized')
  return nativeDb.export()
}

export async function importDatabaseBytes(bytes: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  if (nativeDb) {
    nativeDb.close()
    detachDatabase()
  }
  nativeDb = new SQL.Database(bytes)
  const adapter = wrapSqlJs(nativeDb, schedulePersist)
  attachDatabase(adapter)
  await persistDatabase()
}

const MUTATING_OPS = new Set([
  'setConfig',
  'createUser',
  'updateUserPin',
  'updateUsername',
  'deleteUser',
  'setLicenseActive',
  'createPatient',
  'updatePatient',
  'deletePatient',
  'upsertTeethStatus',
  'createAppointment',
  'updateAppointment',
  'deleteAppointment',
  'markAppointmentReminderSent',
  'createTreatmentPlan',
  'updateTreatmentPlan',
  'acceptTreatmentPlan',
  'deleteTreatmentPlan',
  'createTreatmentPlanStage',
  'updateTreatmentPlanStage',
  'deleteTreatmentPlanStage',
  'createInvoice',
  'updateInvoiceStatus',
  'updateInvoiceWithItems',
  'deleteInvoice',
  'createPrescription',
  'updatePrescription',
  'deletePrescription',
  'createPatientImage',
  'deletePatientImage',
  'createDistributor',
  'updateDistributor',
  'deleteDistributor',
  'createTransaction',
  'deleteTransaction',
  'createLabOrder',
  'updateLabOrderStatus',
  'deleteLabOrder',
])

export async function flushSqlitePersist(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await persistDatabase()
}

export async function handleWebDb(payload: DbInvokePayload): Promise<unknown> {
  if (!nativeDb) await initSqlJsDatabase()
  const result = handleDbRequest(payload)
  if (MUTATING_OPS.has(payload.op)) {
    await flushSqlitePersist()
  } else {
    schedulePersist()
  }
  return result
}

export async function resetLocalDatabase(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (nativeDb) {
    nativeDb.close()
    nativeDb = null
  }
  detachDatabase()
  await clearSqliteBlob()
  initPromise = null
  await initSqlJsDatabase()
}
