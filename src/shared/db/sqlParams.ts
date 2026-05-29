/** Map better-sqlite3-style @named params to positional ? for sql.js. */
export function normalizeSqlParams(
  sql: string,
  params: unknown[],
): { sql: string; params: unknown[] } {
  if (params.length !== 1 || params[0] === null || typeof params[0] !== 'object' || Array.isArray(params[0])) {
    return { sql, params }
  }
  const obj = params[0] as Record<string, unknown>
  const names: string[] = []
  const converted = sql.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name: string) => {
    names.push(name)
    return '?'
  })
  if (names.length === 0) return { sql, params }
  return { sql: converted, params: names.map((n) => obj[n] ?? null) }
}
