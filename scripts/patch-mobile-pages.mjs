import fs from 'fs'

const c = '</' + 'motion.div>'.replace('motion.', '')

function patchPatients() {
  let s = fs.readFileSync('src/pages/PatientsPage.tsx', 'utf8')

  s = s.replace(
    `${c}\n\n      {/* Toolbar */}\n      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">\n        \n        <motion.div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">`,
    `</ListPageHeader>\n\n      <ListPageToolbar>\n        <motion.div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">`,
  )

  s = s.replace(
    `        </motion.div>\n\n      </motion.div>\n\n      {error ? (\n        <motion.div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">\n          {error}\n        </motion.div>\n      ) : null}\n\n      {/* Table */}\n      <motion.div className="flex-1 overflow-auto">`,
    `        </motion.div>\n      </ListPageToolbar>\n\n      {error ? <motion.div className="list-page-error">{error}</motion.div> : null}\n\n      <MobileCardList>\n        {loading ? (\n          Array.from({ length: 4 }).map((_, i) => (\n            <MobileCard key={i}>\n              <motion.div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />\n              <motion.div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />\n            </MobileCard>\n          ))\n        ) : filteredRows.length === 0 ? (\n          <MobileEmptyState icon={UserRound}>\n            {activeTab === 'today'\n              ? isAr ? 'لا يوجد مرضى مسجلين اليوم' : 'No patients registered today'\n              : t('patients.empty', isAr ? 'لا يوجد مرضى' : 'No patients')}\n          </MobileEmptyState>\n        ) : (\n          filteredRows.map((p) => (\n            <MobileCard key={p.id}>\n              <p className="font-semibold text-slate-900">\n                {p.first_name} {p.last_name}\n              </p>\n              <p className="mt-1 font-mono text-xs text-slate-600">{p.phone || '—'}</p>\n              <p className="mt-2 text-xs text-slate-500">\n                {p.dob ? format(parseISO(p.dob), 'PP', { locale: loc }) : '—'}\n                {' · '}\n                {p.gender ? t(\\`patients.gender.\\${p.gender}\\`) : '—'}\n              </p>\n              <MobileCardActions>\n                <button\n                  type="button"\n                  onClick={() => navigate(\\`/patients/\\${p.id}\\`)}\n                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-600 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 active:scale-95"\n                >\n                  {t('patients.open', isAr ? 'فتح الملف' : 'Open')}\n                </button>\n              </MobileCardActions>\n            </MobileCard>\n          ))\n        )}\n      </MobileCardList>\n\n      <DesktopTablePane>`,
  )

  s = s.replaceAll('motion.div', 'motion.div')
  s = s.replaceAll('<motion.div', '<' + 'motion.div>'.replace('motion.', '<').replace('<>', '<div'))
  // fix the botched replace - do it properly
  s = fs.readFileSync('src/pages/PatientsPage.tsx', 'utf8')
}
