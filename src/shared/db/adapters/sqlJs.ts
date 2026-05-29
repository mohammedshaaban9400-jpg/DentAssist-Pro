import type { Database } from 'sql.js'
import { normalizeSqlParams } from '@/shared/db/sqlParams'
import type { RunResult, SqlDatabase, SqlStatement } from '@/shared/db/sqlTypes'

export type PersistHook = () => void

function bindParams(stmt: ReturnType<Database['prepare']>, params: unknown[]): void {
  if (params.length === 0) return
  stmt.bind(params as (string | number | null | Uint8Array)[])
}

function wrapStatement(nativeDb: Database, sql: string, onMutate: PersistHook): SqlStatement {
  return {
    run(...params: unknown[]): RunResult {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const stmt = nativeDb.prepare(q)
      try {
        if (p.length > 0) stmt.run(p as (string | number | null | Uint8Array)[])
        else stmt.run()
        const changes = nativeDb.getRowsModified()
        const idRow = nativeDb.exec('SELECT last_insert_rowid() AS id')
        const lastInsertRowid = Number(idRow[0]?.values[0]?.[0] ?? 0)
        onMutate()
        return { lastInsertRowid, changes }
      } finally {
        stmt.free()
      }
    },
    get(...params: unknown[]) {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const stmt = nativeDb.prepare(q)
      try {
        bindParams(stmt, p)
        if (stmt.step()) return stmt.getAsObject() as Record<string, unknown>
        return undefined
      } finally {
        stmt.free()
      }
    },
    all(...params: unknown[]) {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const stmt = nativeDb.prepare(q)
      const rows: Record<string, unknown>[] = []
      try {
        bindParams(stmt, p)
        while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>)
        return rows
      } finally {
        stmt.free()
      }
    },
  }
}

export function wrapSqlJs(nativeDb: Database, onMutate: PersistHook): SqlDatabase {
  return {
    exec(sql: string) {
      nativeDb.run(sql)
      onMutate()
    },
    prepare(sql: string) {
      return wrapStatement(nativeDb, sql, onMutate)
    },
    transaction<T>(fn: () => T): () => T {
      return () => {
        nativeDb.run('BEGIN')
        try {
          const result = fn()
          nativeDb.run('COMMIT')
          onMutate()
          return result
        } catch (e) {
          try {
            nativeDb.run('ROLLBACK')
          } catch {
            /* ignore */
          }
          throw e
        }
      }
    },
  }
}
