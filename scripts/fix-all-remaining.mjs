import fs from 'fs'

const CD = '</' + 'motion.div>'.replace('motion.', 'motion.div>'.replace('motion.', 'div'))

// fix CD properly
const closeDiv = '</' + 'div>'

function fix(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  for (const [a, b] of pairs) {
    if (s.includes(a)) s = s.replace(a, b)
  }
  fs.writeFileSync(file, s)
  console.log('fixed', file)
}

fix('src/pages/DistributorsPage.tsx', [
  [`        </motion.div>\n      ${closeDiv}\n      \n      {/* Table`, `        </motion.div>\n      </ListPageToolbar>\n\n      {/* Table`.replace('<motion.div>', '<div').replace('</motion.div>', closeDiv)],
  [`        </table>\n      ${closeDiv}\n\n      {modal`, `        </table>\n      </DesktopTableScroll>\n\n      {modal`],
  [`    ${closeDiv}\n  )`, `    </ListPageLayout>\n  )`],
])

fix('src/pages/ReportsPage.tsx', [
  [`        </motion.div>\n      ${closeDiv}\n\n      {/* Table`, `        </motion.div>\n      </ListPageToolbar>\n\n      {/* Table`.replace('<motion.div>', '<div').replace('</motion.div>', closeDiv)],
  [`        </table>\n      ${closeDiv}\n    ${closeDiv}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
])

// invoices header
fix('src/pages/InvoicesPage.tsx', [
  [`          {t('invoices.new')}\n        </button>\n      ${closeDiv}\n\n      {/* Patient filter`, `          {t('invoices.new')}\n        </button>\n      </ListPageHeader>\n\n      {/* Patient filter`],
])
