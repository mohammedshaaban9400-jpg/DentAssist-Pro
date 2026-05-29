import initSqlJs from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrypt } from '@noble/hashes/scrypt.js'
import { randomBytes } from '@noble/hashes/utils.js'
import { scryptSync, randomBytes as nodeRandomBytes, timingSafeEqual } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wasm = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')

function hashNoble(pin) {
  const salt = randomBytes(16)
  const derived = scrypt(new TextEncoder().encode(pin), salt, { N: 16384, r: 8, p: 1, dkLen: 64 })
  return `${Buffer.from(salt).toString('hex')}:${Buffer.from(derived).toString('hex')}`
}

function verifyNoble(pin, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = scrypt(new TextEncoder().encode(pin), salt, { N: 16384, r: 8, p: 1, dkLen: 64 })
  return timingSafeEqual(Buffer.from(derived), expected)
}

function hashNode(pin) {
  const salt = nodeRandomBytes(16)
  const derived = scryptSync(pin, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyNode(pin, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = scryptSync(pin, salt, 64)
  return timingSafeEqual(derived, expected)
}

const SQL = await initSqlJs({ locateFile: () => wasm })
const db = new SQL.Database()
db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, pin_hash TEXT)`)
const pin = '5678'
const h = hashNoble(pin)
const stmt = db.prepare('INSERT INTO users (username, pin_hash) VALUES (?, ?)')
stmt.run(['doctor', h])
stmt.free()

const get = db.prepare('SELECT id, username, pin_hash FROM users WHERE username = ?')
get.bind(['doctor'])
get.step()
const row = get.getAsObject()
get.free()

console.log('row keys', Object.keys(row))
console.log('row', row)
console.log('pin_hash type', typeof row.pin_hash)
console.log('verify noble', verifyNoble(pin, row.pin_hash))
console.log('verify node on noble hash', verifyNode(pin, row.pin_hash))

const pin2 = '1234'
const h2 = hashNode(pin2)
console.log('node hash verify node', verifyNode(pin2, h2))
console.log('node hash verify noble', verifyNoble(pin2, h2))
