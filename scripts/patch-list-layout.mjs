import fs from 'fs'

const CD = '</' + 'div>'

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

const outerOld = '<motion.div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">'.replace(
  'motion.div',
  'motion.div',
)
const outerOld2 = '<div className="-m-5 flex h-[calc(100%+2.5rem)] flex-col bg-white md:-m-8 md:h-[calc(100%+4rem)]">'

function ensureImport(content) {
  if (content.includes("from '@/components/layout/ListPageLayout'")) return content
  const lines = content.split('\n')
  let lastImport = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i
  }
  lines.splice(lastImport + 1, 0, layoutImport)
  return lines.join('\n')
}

function patchLayout(file, { pane = false, band = false } = {}) {
  let s = fs.readFileSync(file, 'utf8')
  if (s.includes('<ListPageLayout>')) {
    console.log('skip', file)
    return
  }
  s = ensureImport(s)
  s = s.replace(outerOld2, '<ListPageLayout>')
  s = s.replace(
    '<motion.div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageHeader>',
  )
  s = s.replace(
    '<div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageHeader>',
  )
  s = s.replace(
    '<motion.div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageToolbar>',
  )
  s = s.replace(
    '<div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageToolbar>',
  )
  s = s.replace(
    /<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">/g,
    '<h1>',
  )

  // First header section close before toolbar or band or toolbar-like
  s = s.replace(
    /(<ListPageHeader>[\s\S]*?)(\n      )<\/motion.div>(\n\n      <ListPageToolbar>)/,
    '$1$2</ListPageHeader>$3',
  )
  s = s.replace(
    /(<ListPageHeader>[\s\S]*?)(\n      )<\/motion.div>(\n\n      <div className="border-b border-slate-100 bg-emerald)/,
    '$1$2</ListPageHeader>$3',
  )
  s = s.replace(
    /(<ListPageHeader>[\s\S]*?)(\n      )<\/motion.div>(\n        <button)/,
    '$1$2</ListPageHeader>\n\n      <ListPageToolbar>\n        <button',
  )

  s = s.replace(
    /(<ListPageToolbar>[\s\S]*?)(\n      )<\/motion.div>(\n\n      ({error|{filter|<div className="border-b|<Mobile|<Desktop))/,
    '$1$2</ListPageToolbar>$3',
  )

  if (band) {
    s = s.replace(
      '<div className="border-b border-slate-100 bg-emerald-50/40 px-6 py-3">',
      '<ListPageBand className="bg-emerald-50/40">',
    )
    s = s.replace(
      /(<ListPageBand[\s\S]*?)(\n      )<\/motion.div>(\n\n      {error)/,
      '$1$2</ListPageBand>$3',
    )
  }

  s = s.replace(
    '{error ? (\n        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">\n          {error}\n        </motion.div>\n      ) : null}',
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
  )
  s = s.replace(
    '{error ? <div className="list-page-error">{error}</motion.div> : null}',
    '{error ? <motion.div className="list-page-error">{error}</motion.div> : null}',
  )
  s = s.replace(
    '{error ? <motion.div className="list-page-error">{error}</motion.div> : null}',
    '{error ? <div className="list-page-error">{error}</div> : null}',
  )

  const wrapOpen = pane ? '<DesktopTablePane>' : '<DesktopTableScroll>'
  const wrapClose = pane ? '</DesktopTablePane>' : '</DesktopTableScroll>'
  s = s.replace('<div className="flex-1 overflow-auto">', wrapOpen)
  if (file.includes('ReportsPage')) {
    s = s.replace('<div className="flex-1 overflow-auto" ref={printRef}>', '<DesktopTableScroll ref={printRef}>')
  }
  s = s.replace(`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      ${wrapClose}\n    </ListPageLayout>`)

  // cashbox kpi grid
  if (file.includes('CashboxPage')) {
    s = s.replace(
      '<div className="grid gap-4 border-b border-slate-100 bg-slate-50/30 p-6 sm:grid-cols-3">',
      '<div className="list-page-kpi-grid">',
    )
    s = s.replace(
      /(<ListPageHeader>[\s\S]*?)(\n      )<\/motion.div>(\n\n      <div className="list-page-kpi-grid">)/,
      '$1$2</ListPageHeader>$3',
    )
    s = s.replace(
      /(<div className="list-page-kpi-grid">[\s\S]*?)(\n      )<\/motion.div>(\n\n      <ListPageToolbar>)/,
      '$1$2</motion.div>\n\n      <ListPageToolbar>',
    )
  }

  fs.writeFileSync(file, s)
  console.log('ok', file)
}

const pages = [
  { file: 'src/pages/AppointmentsPage.tsx', pane: true, band: true },
  { file: 'src/pages/InvoicesPage.tsx', pane: true },
  { file: 'src/pages/CashboxPage.tsx', pane: false },
  { file: 'src/pages/ReportsPage.tsx', pane: false },
  { file: 'src/pages/DentalLabPage.tsx', pane: false },
  { file: 'src/pages/DistributorsPage.tsx', pane: false },
]

for (const p of pages) patchLayout(p.file, p)
