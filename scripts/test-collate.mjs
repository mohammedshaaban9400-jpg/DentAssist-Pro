import initSqlJs from 'sql.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const wasm = path.join(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/sql.js/dist/sql-wasm.wasm')
const SQL = await initSqlJs({ locateFile: () => wasm })
const db = new SQL.Database()
db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, pin_hash TEXT)`)
db.run(`INSERT INTO users (username, pin_hash) VALUES ('doctor', 'test')`)

try {
  const s = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
  s.bind(['DOCTOR'])
  const ok = s.step()
  console.log('COLLATE NOCASE step', ok, s.getAsObject())
  s.free()
} catch (e) {
  console.error('COLLATE NOCASE failed', e.message)
}

try {
  const s2 = db.prepare('SELECT id FROM users WHERE username = ?')
  s2.bind(['doctor'])
  const ok2 = s2.step()
  console.log('plain step', ok2, s2.getAsObject())
  s2.free()
} catch (e) {
  console.error('plain failed', e.message)
}
