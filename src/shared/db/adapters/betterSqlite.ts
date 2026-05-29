import type Database from 'better-sqlite3'
import { normalizeSqlParams } from '@/shared/db/sqlParams'
import type { RunResult, SqlDatabase, SqlStatement } from '@/shared/db/sqlTypes'

function wrapStatement(native: Database.Database, sql: string): SqlStatement {
  const stmt = native.prepare(sql)
  return {
    run(...params: unknown[]): RunResult {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const runner = q === sql ? stmt : native.prepare(q)
      const info = runner.run(...(p as never[]))
      return { lastInsertRowid: Number(info.lastInsertRowid), changes: info.changes }
    },
    get(...params: unknown[]) {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const runner = q === sql ? stmt : native.prepare(q)
      return runner.get(...(p as never[])) as Record<string, unknown> | undefined
    },
    all(...params: unknown[]) {
      const { sql: q, params: p } = normalizeSqlParams(sql, params)
      const runner = q === sql ? stmt : native.prepare(q)
      return runner.all(...(p as never[])) as Record<string, unknown>[]
    },
  }
}

export function wrapBetterSqlite(native: Database.Database): SqlDatabase {
  return {
    exec(sql: string) {
      native.exec(sql)
    },
    prepare(sql: string) {
      return wrapStatement(native, sql)
    },
    transaction<T>(fn: () => T): () => T {
      return native.transaction(fn)
    },
  }
}
