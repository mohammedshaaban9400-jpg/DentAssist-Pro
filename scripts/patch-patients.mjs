import fs from 'fs'

const CD = '</' + 'div>'

let s = fs.readFileSync('src/pages/PatientsPage.tsx', 'utf8')

const toolbarOld = [
  '      ' + CD,
  '',
  '      {/* Toolbar */}',
  '      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
  '        ',
  '        <motion.div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">',
].join('\n').replace('<motion.div', '<div')

const toolbarNew = [
  '      </ListPageHeader>',
  '',
  '      <ListPageToolbar>',
  '        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">',
].join('\n')

if (!s.includes(toolbarOld)) {
  console.error('toolbarOld not found')
  process.exit(1)
}
s = s.replace(toolbarOld, toolbarNew)

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
  '          Array.from({ length: 4 }).map((_, i) => (',
  '            <MobileCard key={i}>',
  '              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />',
  '              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />',
  '            </MobileCard>',
  '          ))',
  '        ) : filteredRows.length === 0 ? (',
  '          <MobileEmptyState icon={UserRound}>',
  "            {activeTab === 'today'",
  "              ? isAr ? 'لا يوجد مرضى مسجلين اليوم' : 'No patients registered today'",
  "              : t('patients.empty', isAr ? 'لا يوجد مرضى' : 'No patients')}",
  '          </MobileEmptyState>',
  '        ) : (',
  '          filteredRows.map((p) => (',
  '            <MobileCard key={p.id}>',
  '              <p className="font-semibold text-slate-900">',
  '                {p.first_name} {p.last_name}',
  '              </p>',
  '              <p className="mt-1 font-mono text-xs text-slate-600">{p.phone || \'—\'}</p>',
  '              <p className="mt-2 text-xs text-slate-500">',
  "                {p.dob ? format(parseISO(p.dob), 'PP', { locale: loc }) : '—'}",
  "                {' · '}",
  '                {p.gender ? t(`patients.gender.${p.gender}`) : \'—\'}',
  '              </p>',
  '              <MobileCardActions>',
  '                <button',
  '                  type="button"',
  '                  onClick={() => navigate(`/patients/${p.id}`)}',
  '                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 active:scale-95"',
  '                >',
  "                  {t('patients.open', isAr ? 'فتح الملف' : 'Open')}",
  '                </button>',
  '              </MobileCardActions>',
  '            </MobileCard>',
  '          ))',
  '        )}',
  '      </MobileCardList>',
  '',
  '      <DesktopTablePane>',
].join('\n').replace('{error ? <div className="list-page-error">{error}</motion.div> : null}', `{error ? <div className="list-page-error">{error}</div> : null}`)

if (!s.includes(tableOld)) {
  console.error('tableOld not found')
  process.exit(1)
}
s = s.replace(tableOld, mobileBlock)

const endOld = ['        </table>', '      ' + CD, '    ' + CD].join('\n')
const endNew = ['        </table>', '      </DesktopTablePane>', '    </ListPageLayout>'].join('\n')
if (!s.includes(endOld)) {
  console.error('endOld not found')
  process.exit(1)
}
s = s.replace(endOld, endNew)

fs.writeFileSync('src/pages/PatientsPage.tsx', s)
console.log('patients ok')
