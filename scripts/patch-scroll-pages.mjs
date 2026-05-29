import fs from 'fs'

const CD = '</' + 'div>'
const layoutImport = `import {
  DesktopTableScroll,
  ListPageHeader,
  ListPageLayout,
  ListPageToolbar,
} from '@/components/layout/ListPageLayout'
`

function patch(file) {
  let s = fs.readFileSync(file, 'utf8')
  if (s.includes('<ListPageLayout>')) {
    console.log('skip', file)
    return
  }
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
    '<div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">',
    '<ListPageToolbar>',
  )
  s = s.replace(
    /<h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">/g,
    '<h1>',
  )
  if (file.includes('Cashbox')) {
    s = s.replace(
      '<div className="grid gap-4 border-b border-slate-100 bg-slate-50/30 p-6 sm:grid-cols-3">',
      '<div className="list-page-kpi-grid">',
    )
    s = s.replace(
      ['        </motion.div>', '      ' + CD, '', '      <div className="list-page-kpi-grid">'].join('\n').replace(
        '<motion.div',
        '<div',
      ),
      ['      </ListPageHeader>', '', '<div className="list-page-kpi-grid">'].join('\n'),
    )
    s = s.replace(
      ['      ' + CD, '', '      {/* Toolbar */}', '      <ListPageToolbar>'].join('\n'),
      ['      </motion.div>', '', '      <ListPageToolbar>'].join('\n').replace('</motion.div>', CD),
    )
  } else {
    s = s.replace(
      ['        </motion.div>', '      ' + CD, '', '      <ListPageToolbar>'].join('\n').replace('<motion.div', '<div'),
      ['      </ListPageHeader>', '', '      <ListPageToolbar>'].join('\n'),
    )
  }
  s = s.replace(
    ['      ' + CD, '', '      {/* Toolbar */}', '      <ListPageToolbar>'].join('\n'),
    ['      </ListPageHeader>', '', '      <ListPageToolbar>'].join('\n'),
  )
  s = s.replace(
    ['        </motion.div>', '      ' + CD, '', '      <ListPageToolbar>'].join('\n').replace('<motion.div', '<div'),
    ['      </ListPageToolbar>', '', '<ListPageToolbar>'].join('\n'),
  )
  const tbEnd = ['        </motion.div>', '      ' + CD, '', '      {/* Table'].join('\n').replace('<motion.div', '<motion.div>')
  s = s.replace(
    ['        </motion.div>', '      ' + CD, '', '      <h2 className="font-semibold'].join('\n').replace('<motion.div', '<div'),
    ['      </ListPageToolbar>', '', '<h2 className="font-semibold'].join('\n'),
  )
  s = s.replace(
    ['        </motion.div>', '      ' + CD, '', '      {/* Table Section'].join('\n').replace('<motion.div', '<div'),
    ['      </ListPageToolbar>', '', '{/* Table Section'].join('\n'),
  )
  s = s.replace(
    ['        </motion.div>', '      ' + CD, '', '      {/* Table Section (printable) */}'].join('\n').replace('<motion.div', '<div'),
    ['      </ListPageToolbar>', '', '      {/* Table Section (printable) */}'].join('\n'),
  )
  if (file.includes('Reports')) {
    s = s.replace('<div className="flex-1 overflow-auto" ref={printRef}>', '<DesktopTableScroll ref={printRef}>')
  } else {
    s = s.replace('<motion.div className="flex-1 overflow-auto">', '<DesktopTableScroll>').replace(
      '<div className="flex-1 overflow-auto">',
      '<DesktopTableScroll>',
    )
  }
  s = s.replace(
    ['        </table>', '      ' + CD, '    ' + CD].join('\n'),
    ['        </table>', '      </DesktopTableScroll>', '    </ListPageLayout>'].join('\n'),
  )
  fs.writeFileSync(file, s)
  console.log('ok', file)
}

patch('src/pages/CashboxPage.tsx')
patch('src/pages/ReportsPage.tsx')
patch('src/pages/DentalLabPage.tsx')
patch('src/pages/DistributorsPage.tsx')
