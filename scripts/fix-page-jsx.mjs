import fs from 'fs'

const CD = '</' + 'div>'

function fixCloses(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  for (const [from, to] of pairs) {
    if (s.includes(from)) s = s.replace(from, to)
  }
  fs.writeFileSync(file, s)
  console.log('fixed', file)
}

fixCloses('src/pages/CashboxPage.tsx', [
  ['      </div>\n\n      <div className="list-page-kpi-grid">', '      </ListPageHeader>\n\n      <div className="list-page-kpi-grid">'],
  ['      </div>\n\n      <ListPageToolbar>', '      </div>\n\n      <ListPageToolbar>'],
  ['      </div>\n\n      {/* Toolbar */}\n      <ListPageToolbar>', '      </div>\n\n      <ListPageToolbar>'],
  ['      </div>\n\n      <h2 className="font-semibold', '      </ListPageToolbar>\n\n      <h2 className="font-semibold'],
  ['      </div>\n\n      {/* Table Section */}', '      </ListPageToolbar>\n\n      {/* Table Section */}'],
  [`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
])

fixCloses('src/pages/ReportsPage.tsx', [
  ['      </motion.div>\n\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'.replace('motion.div', 'div')],
  ['      </div>\n\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'],
  ['      </div>\n\n      {/* Toolbar */}\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'],
  [`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
])

fixCloses('src/pages/DentalLabPage.tsx', [
  ['      </div>\n\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'],
  ['      </motion.div>\n\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'.replace('motion.div', 'motion.div')],
  [`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
])

fixCloses('src/pages/DistributorsPage.tsx', [
  ['      </div>\n\n      <ListPageToolbar>', '      </ListPageHeader>\n\n      <ListPageToolbar>'],
  [`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
])
