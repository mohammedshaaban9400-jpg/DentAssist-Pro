import fs from 'node:fs'
import path from 'node:path'

const corePath = path.join(process.cwd(), 'src/shared/db/core.ts')
let s = fs.readFileSync(corePath, 'utf8')

const schemaEnd = s.indexOf('export type UserRole')
if (schemaEnd < 0) throw new Error('schema marker not found')

const header = `import { SCHEMA_SQL } from '@/shared/db/schema'
import type { CredentialCrypto } from '@/shared/db/cryptoApi'
import type { SqlDatabase } from '@/shared/db/sqlTypes'

export { SCHEMA_SQL }

`

s = header + s.slice(schemaEnd)

s = s.replace(
  `let db: Database.Database | null = null

function hashCredential(secret: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(secret, salt, 64)
  return \`\${salt.toString('hex')}:\${derived.toString('hex')}\`
}

function verifyCredential(secret: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = scryptSync(secret, salt, 64)
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

/** Stable per Windows user + hostname (license binding). */
export function computeMachineId(): string {
  const raw = \`\${os.hostname()}|\${os.userInfo().username}|dentassist-pro-v1\`
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function closeDatabase(): void {
  if (db) {
    try { db.close() } catch { /* ignore */ }
    db = null
  }
}

/**
 * Create a consistent backup of the live database using better-sqlite3's
 * built-in online backup API. This correctly handles WAL mode by flushing
 * all pending WAL frames to the destination file. Never use fs.readFileSync
 * on the live .sqlite file directly — WAL data would be missing.
 */
export async function exportDatabase(destPath: string): Promise<void> {
  const instance = getDb()
  await instance.backup(destPath)
}

export function openDatabase(dbFilePath: string): Database.Database {
  if (db) {
    db.close()
    db = null
  }
  const dir = path.dirname(dbFilePath)
  fs.mkdirSync(dir, { recursive: true })
  const instance = new Database(dbFilePath)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  instance.exec(SCHEMA_SQL)
  migrateTeethStatusSchema(instance)
  db = instance
  ensureBootstrapConfig()
  return instance
}

function migrateTeethStatusSchema(instance: Database.Database): void {
  const cols = instance.prepare(\`PRAGMA table_info(teeth_status)\`).all() as { name: string }[]
  if (!cols.some((c) => c.name === 'preparation_depth_mm')) {
    instance.exec(\`ALTER TABLE teeth_status ADD COLUMN preparation_depth_mm REAL\`)
  }
}

function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}`,
  `let db: SqlDatabase | null = null
let credentialCrypto: CredentialCrypto | null = null
let machineIdProvider: (() => string) | null = null

export function configureDbCore(crypto: CredentialCrypto, getMachineId: () => string): void {
  credentialCrypto = crypto
  machineIdProvider = getMachineId
}

function hashCredential(secret: string): string {
  if (!credentialCrypto) throw new Error('DB core not configured')
  return credentialCrypto.hashCredential(secret)
}

function verifyCredential(secret: string, stored: string): boolean {
  if (!credentialCrypto) throw new Error('DB core not configured')
  return credentialCrypto.verifyCredential(secret, stored)
}

export function attachDatabase(instance: SqlDatabase): void {
  db = instance
  instance.exec('PRAGMA foreign_keys = ON')
  instance.exec(SCHEMA_SQL)
  migrateTeethStatusSchema(instance)
  ensureBootstrapConfig()
}

export function detachDatabase(): void {
  db = null
}

function migrateTeethStatusSchema(instance: SqlDatabase): void {
  const cols = instance.prepare(\`PRAGMA table_info(teeth_status)\`).all() as { name: string }[]
  if (!cols.some((c) => c.name === 'preparation_depth_mm')) {
    instance.exec(\`ALTER TABLE teeth_status ADD COLUMN preparation_depth_mm REAL\`)
  }
}

function getDb(): SqlDatabase {
  if (!db) throw new Error('Database not initialized')
  return db
}`,
)

s = s.replace(
  `if (!get.get('machine_id')) {
    set.run('machine_id', computeMachineId())
  }`,
  `if (!get.get('machine_id')) {
    const mid = machineIdProvider?.() ?? 'unknown-device'
    set.run('machine_id', mid)
  }`,
)

s = s.replace(
  'export async function handleDbInvoke(_e: IpcMainInvokeEvent, req: DbRequest): Promise<unknown> {',
  'export function handleDbRequest(req: DbRequest): unknown {',
)

s = s.replace('export type DbRequest =', 'export type DbRequest =')

fs.writeFileSync(corePath, s)
console.log('patched core.ts')
