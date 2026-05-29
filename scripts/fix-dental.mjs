import fs from 'fs'

const p = 'src/pages/DentalLabPage.tsx'
const CD = '</' + 'div>'
let s = fs.readFileSync(p, 'utf8')

s = s.replace(
  `        </button>\n      ${CD}\n\n      {/* KPI Cards */}`,
  `        </button>\n      </ListPageHeader>\n\n      {/* KPI Cards */}`,
)

s = s.replace(
  `        </div>\n      </ListPageHeader>\n\n      <ListPageToolbar>`,
  `        </div>\n      </motion.div>\n\n      <ListPageToolbar>`.replace('</motion.div>', CD),
)

s = s.replace(
  `          />\n        </motion.div>\n      ${CD}\n      \n      {/* Table Section */}`.replace('<motion.div>', '<div'),
  `          />\n        </motion.div>\n      </ListPageToolbar>\n\n      {/* Table Section */}`.replace('<motion.div>', '<div').replace('</motion.div>', CD),
)

// read end of file for ListPageLayout close
if (!s.includes('</ListPageLayout>')) {
  s = s.replace(`    ${CD}\n  )\n}`, `    </ListPageLayout>\n  )\n}`)
}

fs.writeFileSync(p, s)
console.log('dental ok')
