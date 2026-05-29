import initSqlJs from 'sql.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrypt } from '@noble/hashes/scrypt.js'
import { randomBytes } from '@noble/hashes/utils.js'

const wasm = path.join(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/sql.js/dist/sql-wasm.wasm')

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, 'hex')).join('')
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
  return d === 0
}
function hashCredential(secret) {
  const salt = randomBytes(16)
  const derived = scrypt(new TextEncoder().encode(secret), salt, { N: 16384, r: 8, p: 1, dkLen: 64 })
  const out = `${bytesToHex(salt)}:${bytesToHex(derived)}`
  console.log('hash derived type', derived?.constructor?.name, 'len', derived?.length, 'hex len', bytesToHex(derived).length)
  return out
}
function verifyCredential(secret, stored) {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [saltHex, hashHex] = parts
  const salt = hexToBytes(saltHex)
  const expected = hexToBytes(hashHex)
  const derived = scrypt(new TextEncoder().encode(secret), salt, { N: 16384, r: 8, p: 1, dkLen: 64 })
  if (derived.length !== expected.length) {
    console.log('len mismatch', derived.length, expected.length)
    return false
  }
  return timingSafeEqual(derived, expected)
}

// Minimal wrapSqlJs run/get like adapter
function prepare(db, sql) {
  return {
    run(...params) {
      const stmt = db.prepare(sql)
      try {
        if (params.length) stmt.run(params)
        else stmt.run()
      } finally {
        stmt.free()
      }
    },
    get(...params) {
      const stmt = db.prepare(sql)
      try {
        if (params.length) stmt.bind(params)
        return stmt.step() ? stmt.getAsObject() : undefined
      } finally {
        stmt.free()
      }
    },
  }
}

const pin = 'M12345678'
const hOnly = hashCredential(pin)
console.log('before sql init', verifyCredential(pin, hOnly), 'parts', hOnly.split(':').length)

const SQL = await initSqlJs({ locateFile: () => wasm })
const db = new SQL.Database()
db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, role TEXT NOT NULL, pin_hash TEXT NOT NULL)`)

const h = hashCredential(pin)
prepare(db, 'INSERT INTO users (username, role, pin_hash) VALUES (?, ?, ?)').run('doctor', 'doctor', h)
console.log('immediate verify', verifyCredential(pin, h))
const row = prepare(db, 'SELECT id, username, role, pin_hash FROM users WHERE username = ? COLLATE NOCASE').get('doctor')
console.log('row found', !!row, 'hash len', row?.pin_hash?.length, 'hash eq', row?.pin_hash === h)
console.log('verify same', verifyCredential(pin, row.pin_hash))
console.log('verify wrong case', verifyCredential('m12345678', row.pin_hash))
