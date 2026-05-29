/** RFC-style CSV cell escaping for Excel compatibility. */
export function csvEscapeCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[\r\n",]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function formatCsvTable(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscapeCell).join(',')
  const body = rows.map((row) => row.map(csvEscapeCell).join(',')).join('\r\n')
  return body ? `${head}\r\n${body}` : head
}

/** UTF-8 BOM so Excel on Windows opens Arabic columns correctly. */
export function withUtf8Bom(csv: string): string {
  return `\uFEFF${csv}`
}
