import fs from 'fs'

const CD = '</' + 'motion.div>'.replace('motion.', 'div')
const layoutImport = `import {
  DesktopTablePane,
  DesktopTableScroll,
  ListPageBand,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
  MobileCard,
  MobileCardActions,
  MobileCardList,
  MobileEmptyState,
} from '@/components/layout/ListPageLayout'`

function addImport(s) {
  if (s.includes('ListPageLayout')) return s
  const i = s.lastIndexOf('import ')
  const end = s.indexOf('\n', i)
  return s.slice(0, end + 1) + layoutImport + '\n' + s.slice(end + 1)
}

function baseLayout(s, file) {
  s = addImport(s)
  s = s.replace(
    '<div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">',
    '<ListPageLayout>',
  )
  s = s.replace(
    '<div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageHeader>',
  )
  s = s.replace(
    '<div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageToolbar>',
  )
  s = s.replace(
    /<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">/g,
    '<h1>',
  )
  s = s.replace(
    '{error ? (\n        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">\n          {error}\n        </motion.div>\n      ) : null}'.replaceAll(
      'motion.div',
      'motion.div',
    ),
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
  )
  s = s.replace(
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
  )
  s = s.replace(
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
    '{error ? <div className="list-page-error">{error}</div> : null}',
  )
  return s
}

function closeFile(s, wrapClose) {
  return s.replace(`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      ${wrapClose}\n    </ListPageLayout>`)
}

function patchScrollOnly(file) {
  if (fs.readFileSync(file, 'utf8').includes('<ListPageLayout>')) {
    console.log('skip', file)
    return
  }
  let s = baseLayout(fs.readFileSync(file, 'utf8'), file)
  if (file.includes('CashboxPage')) {
    s = s.replace(
      '<motion.div className="grid gap-4 border-b border-slate-100 bg-slate-50/30 p-6 sm:grid-cols-3">'.replace('motion.div', 'motion.div'),
      '<motion.div className="list-page-kpi-grid">'.replace('motion.div', 'motion.div'),
    )
    s = s.replace(
      '<div className="grid gap-4 border-b border-slate-100 bg-slate-50/30 p-6 sm:grid-cols-3">',
      '<div className="list-page-kpi-grid">',
    )
  }
  if (file.includes('ReportsPage')) {
    s = s.replace('<div className="flex-1 overflow-auto" ref={printRef}>', '<DesktopTableScroll ref={printRef}>')
  } else {
    s = s.replace('<div className="flex-1 overflow-auto">', '<DesktopTableScroll>')
  }
  // header closes - first </motion.div> before toolbar
  s = s.replace(/(<ListPageHeader>[\s\S]*?)\n      <\/motion.div>\n\n      <ListPageToolbar>/, '$1\n      </ListPageHeader>\n\n      <ListPageToolbar>'.replaceAll('motion.div', 'motion.div'))
  s = s.replace(/(<ListPageHeader>[\s\S]*?)\n      <\/motion.div>\n\n      <div className="list-page-kpi-grid">/, '$1\n      </ListPageHeader>\n\n      <div className="list-page-kpi-grid">'.replaceAll('motion.div', 'motion.div'))
  s = s.replace(/(<ListPageToolbar>[\s\S]*?)\n      <\/motion.div>\n\n      /, '$1\n      </ListPageToolbar>\n\n      ')
  s = closeFile(s, '</DesktopTableScroll>')
  fs.writeFileSync(file, s)
  console.log('scroll', file)
}

// Fix CD replacements in regex - use actual div
function fixDiv(s) {
  return s.replaceAll('</motion.div>', CD).replaceAll('<motion.div', '<' + 'motion.div>'.replace('motion.', 'div').replace('<>', '<div'))
}

patchScrollOnly('src/pages/CashboxPage.tsx')
patchScrollOnly('src/pages/ReportsPage.tsx')
patchScrollOnly('src/pages/DentalLabPage.tsx')
patchScrollOnly('src/pages/DistributorsPage.tsx')

console.log('done scroll pages')
