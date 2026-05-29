import fs from 'fs'

const CD = '</' + 'div>'
const file = 'src/pages/AppointmentsPage.tsx'
let s = fs.readFileSync(file, 'utf8')

if (!s.includes('ListPageLayout')) {
  const layoutImport = `import {
  DesktopTablePane,
  ListPageBand,
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
  s = s.replace(
    [
      '        </motion.div>',
      '      ' + CD,
      '',
      '      {/* Toolbar */}',
      '      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
    ].join('\n').replace('<motion.div', '<div'),
    ['        </motion.div>', '      </ListPageHeader>', '', '      <ListPageToolbar>'].join('\n').replace(
      '<motion.div',
      '<div',
    ),
  )
  s = s.replace(
    [
      '        </motion.div>',
      '      ' + CD,
      '',
      '      {/* Due WhatsApp reminders */}',
      '      <div className="border-b border-slate-100 bg-emerald-50/40 px-6 py-3">',
    ].join('\n').replace('<motion.div', '<div'),
    [
      '        </motion.div>',
      '      </ListPageToolbar>',
      '',
      '      <ListPageBand className="bg-emerald-50/40">',
    ].join('\n').replace('<motion.div', '<motion.div>'.replace('motion.', '<').replace('<>', '<motion.div')),
  )
  s = s.replace(
    ['        )}', '      ' + CD, '', '      {error ? ('].join('\n'),
    ['        )}', '      </ListPageBand>', '', '      {error ? ('].join('\n'),
  )
  s = s.replace(
    '<div className="border-b border-slate-100 bg-emerald-50/40 px-6 py-3">',
    '<ListPageBand className="bg-emerald-50/40">',
  )
  s = s.replace(
    '<div className="flex items-center gap-2 px-2 min-w-[200px] justify-center">',
    '<div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1 sm:min-w-[200px] sm:px-2">',
  )
}

const tableOld = [
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
  '      {error ? <motion.div className="list-page-error">{error}</motion.div> : null}',
  '',
  '      <MobileCardList>',
  '        {loading ? (',
  '          Array.from({ length: 3 }).map((_, i) => (',
  '            <MobileCard key={i}>',
  '              <motion.div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />',
  '              <motion.div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />',
  '            </MobileCard>',
  '          ))',
  '        ) : filteredRows.length === 0 ? (',
  '          <MobileEmptyState icon={CalendarDays}>',
  "            {t('appointments.empty', isAr ? 'لا توجد عمليات/مواعيد' : 'No operations')}",
  '          </MobileEmptyState>',
  '        ) : (',
  '          filteredRows.map((a) => {',
  "            const statusLabel = ['scheduled', 'completed', 'cancelled', 'no_show'].includes(a.status)",
  "              ? t(`appointments.status.${a.status}` as 'appointments.status.scheduled')",
  '              : a.status',
  '            const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show',
  '            const d = parseISO(a.start_time)',
  '            return (',
  '              <MobileCard key={a.id} className={isToday(d) ? "ring-1 ring-teal-200" : ""}>',
  '                <p className="text-xs font-semibold text-slate-600">{format(d, "PPp", { locale: loc })}</p>',
  '                <p className="mt-1 font-semibold text-slate-900">',
  '                  {a.patient_first_name} {a.patient_last_name}',
  '                </p>',
  '                {a.patient_phone ? (',
  '                  <p className="mt-0.5 font-mono text-xs text-slate-500">{a.patient_phone}</p>',
  '                ) : null}',
  '                <span',
  '                  className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"',
  '                  style={{ background: st.bg, color: st.text, boxShadow: `0 0 0 1px ${st.ring}` }}',
  '                >',
  '                  {statusLabel}',
  '                </span>',
  '                {a.notes ? (',
  '                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{a.notes}</p>',
  '                ) : null}',
  '                <MobileCardActions>',
  '                  {a.status === "scheduled" && a.patient_phone?.trim() ? (',
  '                    <button',
  '                      type="button"',
  '                      onClick={() => void sendManualWhatsAppForAppointment(a)}',
  '                      disabled={sendingManualWaId === a.id}',
  '                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"',
  '                    >',
  '                      <MessageCircle className="size-4" />',
  '                    </button>',
  '                  ) : null}',
  '                  <button type="button" onClick={() => openEdit(a)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600">',
  '                    <Pencil className="size-4" />',
  '                  </button>',
  '                  <button type="button" onClick={() => void remove(a.id)} disabled={busy} className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-rose-600 disabled:opacity-50">',
  '                    <Trash2 className="size-4" />',
  '                  </button>',
  '                </MobileCardActions>',
  '              </MobileCard>',
  '            )',
  '          })',
  '        )}',
  '      </MobileCardList>',
  '',
  '      <DesktopTablePane>',
]
  .join('\n')
  .replaceAll('<motion.div', '<div')
  .replaceAll('</motion.div>', CD)
  .replace(
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
    '{error ? <div className="list-page-error">{error}</div> : null}',
  )

if (!s.includes(tableOld) && !s.includes('MobileCardList')) {
  console.error('tableOld not found', file)
  process.exit(1)
}
if (!s.includes('MobileCardList')) {
  s = s.replace(tableOld, mobileBlock)
  const endOld = ['        </table>', '      ' + CD, '    ' + CD].join('\n')
  s = s.replace(endOld, ['        </table>', '      </DesktopTablePane>', '    </ListPageLayout>'].join('\n'))
}

fs.writeFileSync(file, s)
console.log('appointments ok')
