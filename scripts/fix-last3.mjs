import fs from 'fs'

const c = '</' + 'div>'

const fixes = [
  [
    'src/pages/DentalLabPage.tsx',
    `        ${c}\n      ${c}\n      \n      {/* Table Section */}`,
    `        ${c}\n      </ListPageToolbar>\n\n      {/* Table Section */}`,
  ],
  [
    'src/pages/ReportsPage.tsx',
    `        ${c}\n      ${c}\n      \n      {/* Table Section (printable) */}`,
    `        ${c}\n      </ListPageToolbar>\n\n      {/* Table Section (printable) */}`,
  ],
  [
    'src/pages/DistributorsPage.tsx',
    `        ${c}\n      ${c}\n      \n      {/* Table Section */}\n      <div className="flex-1 overflow-auto thin-scrollbar">`,
    `        ${c}\n      </ListPageToolbar>\n\n      {/* Table Section */}\n      <DesktopTableScroll>`,
  ],
]

for (const [file, a, b] of fixes) {
  let s = fs.readFileSync(file, 'utf8')
  if (!s.includes(a)) {
    console.warn('miss', file, JSON.stringify(a.slice(0, 50)))
    continue
  }
  s = s.replace(a, b)
  fs.writeFileSync(file, s)
  console.log('ok', file)
}
