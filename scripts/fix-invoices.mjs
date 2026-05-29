import fs from 'fs'

const p = 'src/pages/InvoicesPage.tsx'
let s = fs.readFileSync(p, 'utf8')

s = s.replace('      </motion.div>\n\n      {/* Patient filter banner */}', '      </ListPageHeader>\n\n      {/* Patient filter banner */}')
s = s.replace('      </motion.div>\n\n      {/* Patient filter banner */}', '      </ListPageHeader>\n\n      {/* Patient filter banner */}')
s = s.replace('      </motion.div>\n\n      {/* Patient filter banner */}', '      </ListPageHeader>\n\n      {/* Patient filter banner */}')

// actual div close
s = s.replace('      </motion.div>\n\n      {/* Patient filter banner */}', '      </ListPageHeader>\n\n      {/* Patient filter banner */}')

const CD = '</' + 'div>'
s = s.replace(
  '      {/* Toolbar */}\n      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
  '      <ListPageToolbar>',
)

if (!s.includes('MobileCardList')) {
  const mobile = `      </ListPageToolbar>

      {error ? <div className="list-page-error">{error}</div> : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}><motion.div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /></MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={FileText}>{t('invoices.empty')}</MobileEmptyState>
        ) : (
          filteredRows.map((r) => (
            <MobileCard key={r.id}>
              <p className="font-mono text-xs text-slate-500">#{r.id}</p>
              <p className="mt-1 font-semibold text-slate-900">
                <Link to={\`/patients/\${r.patient_id}\`} className="text-teal-700 no-underline">
                  {r.patient_first_name} {r.patient_last_name}
                </Link>
              </p>
              <p className="mt-1 text-xs text-slate-500">{format(parseISO(r.date), 'PP', { locale: loc })}</p>
              <p className="mt-2 font-bold tabular-nums">{r.total_amount.toLocaleString(locNum)}</p>
              <MobileCardActions>
                <button type="button" disabled={busy} onClick={() => void togglePaid(r)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">
                  {t(\`invoices.payStatus.\${r.status}\`)}
                </button>
                <button type="button" onClick={() => void openEdit(r.id)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100"><Pencil className="size-4" /></button>
                <button type="button" onClick={() => void remove(r.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600"><Trash2 className="size-4" /></button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      <DesktopTablePane>
`.replaceAll('<motion.div', '<div').replaceAll('</motion.div>', CD)

  s = s.replace(
    `      ${CD}\n\n      {error ? (`,
    mobile,
  )
}

s = s.replace(`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTablePane>\n    </ListPageLayout>`)

fs.writeFileSync(p, s)
console.log('invoices fixed')
