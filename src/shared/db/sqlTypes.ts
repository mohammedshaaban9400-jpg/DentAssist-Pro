export type RunResult = { lastInsertRowid: number; changes: number }

export type SqlStatement = {
  run: (...params: unknown[]) => RunResult
  get: (...params: unknown[]) => Record<string, unknown> | undefined
  all: (...params: unknown[]) => Record<string, unknown>[]
}

/** Matches better-sqlite3: `db.transaction(fn)()` */
export type SqlDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => SqlStatement
  transaction: <T>(fn: () => T) => () => T
}
