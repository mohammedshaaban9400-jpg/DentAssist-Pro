import initSqlJs from 'sql.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const wasm = path.join(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/sql.js/dist/sql-wasm.wasm')
const SQL = await initSqlJs({ locateFile: () => wasm })
const db = new SQL.Database()
db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, pin_hash TEXT)`)

// pattern A: run()
const s1 = db.prepare('INSERT INTO users (username, pin_hash) VALUES (?, ?)')
s1.run(['alice', 'hash-a'])
s1.free()

// pattern B: bind + step (our adapter)
const s2 = db.prepare('INSERT INTO users (username, pin_hash) VALUES (?, ?)')
s2.bind(['bob', 'hash-b'])
while (s2.step()) {}
s2.free()

const all = db.exec('SELECT username, pin_hash FROM users ORDER BY username')
console.log(all[0].values)
