import fs from 'fs'

const CD = '</' + 'div>'
const file = 'src/pages/InvoicesPage.tsx'
let s = fs.readFileSync(file, 'utf8')

if (!s.includes('ListPageLayout')) {
  const layoutImport = `import {
  DesktopTablePane,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
  MobileCard,
  MobileCardActions,
  MobileCardList,
  MobileEmptyState,
} from '@/components/layout/ListPageLayout'
`
  const end = s.indexOf('\n', s.lastIndexOf('import '))
  s = s.slice(0, end + 1) + layoutImport + s.slice(end + 1)
  s = s.replace(
    '<motion.div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">'.replace('motion.div', 'motion.div'),
    '<ListPageLayout>',
  )
  s = s.replace(
    '<div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">',
    '<ListPageLayout>',
  )
  s = s.replace(
    '<div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageHeader>',
  )
  s = s.replace(
    '<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">',
    '<h1>',
  )
}

const headerCloseOld = [
  '        </motion.div>',
  '      ' + CD,
  '',
  '      {/* Patient filter banner */}',
].join('\n').replace('<motion.div', '<div')

const headerCloseNew = ['      </ListPageHeader>', '', '      {/* Patient filter banner */}'].join('\n')

if (s.includes(headerCloseOld) && !s.includes('</ListPageHeader>')) {
  s = s.replace(headerCloseOld, headerCloseNew)
}

if (s.includes('</ListPageHeader>') && s.includes('/* Toolbar */')) {
  const toolbarOld = [
    '      {/* Toolbar */}',
    '      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
  ].join('\n')
  s = s.replace(toolbarOld, '      <ListPageToolbar>')
}

const tableOld = [
  '      ' + CD,
  '',
  '      {error ? (',
  '        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">',
  '          {error}',
  '        ' + CD,
  '      ) : null}',
  '',
  '      {/* Table */}',
  '      <div className="flex-1 overflow-auto">',
].join('\n')

const mobileBlock = [
  '      </ListPageToolbar>',
  '',
  '      {error ? <div className="list-page-error">{error}</motion.div> : null}',
  '',
  '      <MobileCardList>',
  '        {loading ? (',
  '          Array.from({ length: 3 }).map((_, i) => (',
  '            <MobileCard key={i}><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" /></MobileCard>',
  '          ))',
  '        ) : filteredRows.length === 0 ? (',
  '          <MobileEmptyState icon={FileText}>{t("invoices.empty")}</MobileEmptyState>',
  '        ) : (',
  '          filteredRows.map((r) => (',
  '            <MobileCard key={r.id}>',
  '              <div className="flex items-start justify-between gap-2">',
  '                <div>',
  '                  <p className="font-mono text-xs text-slate-500">#{r.id}</p>',
  '                  <p className="mt-1 font-semibold text-slate-900">',
  '                    <Link to={`/patients/${r.patient_id}`} className="text-teal-700 no-underline">',
  '                      {r.patient_first_name} {r.patient_last_name}',
  '                    </Link>',
  '                  </p>',
  '                  <p className="mt-1 text-xs text-slate-500">{format(parseISO(r.date), "PP", { locale: loc })}</p>',
  '                </motion.div>',
  '                <p className="shrink-0 font-bold tabular-nums text-slate-900">',
  '                  {r.total_amount.toLocaleString(locNum, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}',
  '                </p>',
  '              </motion.div>',
  '              <MobileCardActions>',
  '                <button type="button" disabled={busy} onClick={() => void togglePaid(r)} className="rounded-lg px-2 py-1 text-xs font-semibold">',
  '                  {t(`invoices.payStatus.${r.status}`)}',
  '                </button>',
  '                <button type="button" onClick={() => void openEdit(r.id)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100"><Pencil className="size-4" /></button>',
  '                <button type="button" onClick={() => void remove(r.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600"><Trash2 className="size-4" /></button>',
  '              </MobileCardActions>',
  '            </MobileCard>',
  '          ))',
  '        )}',
  '      </MobileCardList>',
  '',
  '      <DesktopTablePane>',
]
  .join('\n')
  .replaceAll('</motion.div>', CD)
  .replaceAll('<motion.div', '<div')
  .replace('{error ? <motion.div className="list-page-error">{error}</motion.div> : null}', '{error ? <div className="list-page-error">{error}</div> : null}')

// invoices: header has button inside - close before filter banner
const invHeaderOld = [
  '        </motion.div>',
  '      ' + CD,
  '',
  '      {filterPatientId != null ? (',
].join('\n').replace('<motion.div', '<div')

if (s.includes(invHeaderOld) && !s.includes('</ListPageHeader>')) {
  s = s.replace(invHeaderOld, ['      </ListPageHeader>', '', '      {filterPatientId != null ? ('].join('\n'))
}

if (!s.includes('MobileCardList') && s.includes(tableOld)) {
  // close toolbar before table - find toolbar end
  const tbClose = [
    '        </motion.div>',
    '      ' + CD,
    '',
    '      {error ? (',
  ].join('\n').replace('<motion.div', '<div')
  if (s.includes(tbClose)) {
    s = s.replace(tbClose, ['      </ListPageToolbar>', '', '      {error ? ('].join('\n'))
  }
  s = s.replace(tableOld, mobileBlock.replace('      </ListPageToolbar>\n\n', ''))
}

if (!s.includes('</ListPageLayout>')) {
  s = s.replace(
    ['        </table>', '      ' + CD, '    ' + CD].join('\n'),
    ['        </table>', '      </DesktopTablePane>', '    </ListPageLayout>'].join('\n'),
  )
}

fs.writeFileSync(file, s)
console.log('invoices ok')
