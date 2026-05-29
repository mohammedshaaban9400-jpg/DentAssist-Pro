import fs from 'fs'

const CD = '</' + 'div>'

function patch(file, rules) {
  let s = fs.readFileSync(file, 'utf8')
  for (const [a, b] of rules) {
    if (s.includes(a)) s = s.replace(a, b)
  }
  fs.writeFileSync(file, s)
  console.log('ok', file)
}

const mobileAppt = `      {error ? <div className="list-page-error">{error}</motion.div> : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /></MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={CalendarDays}>
            {t('appointments.empty', isAr ? 'لا توجد عمليات/مواعيد' : 'No operations')}
          </MobileEmptyState>
        ) : (
          filteredRows.map((a) => {
            const statusLabel = ['scheduled', 'completed', 'cancelled', 'no_show'].includes(a.status)
              ? t(\\`appointments.status.\\${a.status}\\` as 'appointments.status.scheduled')
              : a.status
            const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
            const d = parseISO(a.start_time)
            return (
              <MobileCard key={a.id} className={isToday(d) ? 'ring-1 ring-teal-200' : ''}>
                <p className="text-xs font-semibold text-slate-600">{format(d, 'PPp', { locale: loc })}</p>
                <p className="mt-1 font-semibold text-slate-900">{a.patient_first_name} {a.patient_last_name}</p>
                <span className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: st.bg, color: st.text, boxShadow: \\`0 0 0 1px \\${st.ring}\\` }}>{statusLabel}</span>
                <MobileCardActions>
                  <button type="button" onClick={() => openEdit(a)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100"><Pencil className="size-4" /></button>
                  <button type="button" onClick={() => void remove(a.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600"><Trash2 className="size-4" /></button>
                </MobileCardActions>
              </MobileCard>
            )
          })
        )}
      </MobileCardList>

      <DesktopTablePane>
`.replaceAll('motion.div', 'div')

patch('src/pages/AppointmentsPage.tsx', [
  [
    `{error ? (
        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          {error}
        </motion.div>
      ) : null}

      {/* Table */}
      <motion.div className="flex-1 overflow-auto">`.replaceAll('motion.div', 'div'),
    mobileAppt,
  ],
  [`        </table>\n      ${CD}`, `        </table>\n      </DesktopTablePane>`],
  [`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`],
])

patch('src/pages/CashboxPage.tsx', [
  [`        </table>\n      ${CD}`, `        </table>\n      </DesktopTableScroll>`],
  [`      )}\n    ${CD}\n  )`, `      )}\n    </ListPageLayout>\n  )`],
])

patch('src/pages/InvoicesPage.tsx', [
  [`      ${CD}\n\n      {error ? (`, `      </ListPageToolbar>\n\n      {error ? (`],
  [
    `      ${CD}\n\n      {error ? (`,
    `      </ListPageToolbar>\n\n      {error ? (`,
  ],
])

// invoices mobile + table - run separately if needed
{
  let s = fs.readFileSync('src/pages/InvoicesPage.tsx', 'utf8')
  if (!s.includes('MobileCardList')) {
    const block = `      </ListPageToolbar>

      {error ? <div className="list-page-error">{error}</motion.div> : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /></MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={FileText}>{t('invoices.empty')}</MobileEmptyState>
        ) : (
          filteredRows.map((r) => (
            <MobileCard key={r.id}>
              <p className="font-mono text-xs text-slate-500">#{r.id}</p>
              <p className="mt-1 font-semibold text-slate-900">{r.patient_first_name} {r.patient_last_name}</p>
              <p className="mt-1 text-xs text-slate-500">{format(parseISO(r.date), 'PP', { locale: loc })}</p>
              <p className="mt-2 font-bold tabular-nums">{r.total_amount.toLocaleString(locNum)}</p>
              <MobileCardActions>
                <button type="button" disabled={busy} onClick={() => void togglePaid(r)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{t(\`invoices.payStatus.\${r.status}\`)}</button>
                <button type="button" onClick={() => void openEdit(r.id)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100"><Pencil className="size-4" /></button>
                <button type="button" onClick={() => void remove(r.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600"><Trash2 className="size-4" /></button>
              </MobileCardActions>
            </MobileCard>
          ))
        )}
      </MobileCardList>

      <DesktopTablePane>
`.replace('{error ? <div className="list-page-error">{error}</motion.div> : null}', '{error ? <motion.div className="list-page-error">{error}</motion.div> : null}'.replaceAll('motion.div', 'div'))

    s = s.replace(
      `      <ListPageToolbar>
        <motion.div className="relative w-full max-w-md">`.replace('<motion.div', '<div'),
      `      <ListPageToolbar>
        <div className="relative w-full max-w-md">`,
    )
    s = s.replace(
      `        </motion.div>
      ${CD}

      {error ? (`.replaceAll('motion.div', 'div'),
      block,
    )
  }
  s = s.replace(`        </table>\n      ${CD}`, `        </table>\n      </DesktopTablePane>`)
  s = s.replace(`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`)
  s = s.replace(`      ${CD}\n\n      {error ? (`, `      </ListPageToolbar>\n\n      {error ? (`)
  fs.writeFileSync('src/pages/InvoicesPage.tsx', s)
  console.log('invoices2')
}

// dental, distributors, reports - header/toolbar closes
for (const file of ['src/pages/DentalLabPage.tsx', 'src/pages/DistributorsPage.tsx', 'src/pages/ReportsPage.tsx']) {
  let s = fs.readFileSync(file, 'utf8')
  if (!s.includes('</ListPageHeader>')) {
    s = s.replace(`      ${CD}\n\n      <ListPageToolbar>`, `      </ListPageHeader>\n\n      <ListPageToolbar>`)
    s = s.replace(`      ${CD}\n\n      {/* Toolbar */}\n      <ListPageToolbar>`, `      </ListPageHeader>\n\n      <ListPageToolbar>`)
    s = s.replace(`      ${CD}\n\n      {/* Toolbar */}`, `      </ListPageHeader>\n\n      {/* Toolbar */}`)
    s = s.replace(
      '      {/* Toolbar */}\n      <ListPageToolbar>',
      '      </ListPageHeader>\n\n      <ListPageToolbar>',
    )
  }
  s = s.replace(`      ${CD}\n\n      {/* Table`, `      </ListPageToolbar>\n\n      {/* Table`)
  s = s.replace(`      ${CD}\n\n      <DesktopTableScroll>`, `      </ListPageToolbar>\n\n      <DesktopTableScroll>`)
  s = s.replace(`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`)
  s = s.replace(`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`)
  fs.writeFileSync(file, s)
  console.log('fixed', file)
}

console.log('all done')
