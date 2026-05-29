import fs from 'fs'

const CD = '</' + 'div>'

const patches = {
  'src/pages/AppointmentsPage.tsx': [
    [`        </table>\n      ${CD}\n\n      {/* Modal */}`, `        </table>\n      </DesktopTablePane>\n\n      {/* Modal */}`],
    [`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`],
  ],
  'src/pages/CashboxPage.tsx': [
    [`        </table>\n      ${CD}\n\n      {modal &&`, `        </table>\n      </DesktopTableScroll>\n\n      {modal &&`],
    [`      )}\n    ${CD}\n  )`, `      )}\n    </ListPageLayout>\n  )`],
  ],
  'src/pages/InvoicesPage.tsx': [
    [`        </div>\n      ${CD}\n\n      {error ?`, `        </div>\n      </ListPageToolbar>\n\n      {error ?`],
    [`        </table>\n      ${CD}\n\n      {/* Modal */}`, `        </table>\n      </DesktopTablePane>\n\n      {/* Modal */}`],
    [`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`],
  ],
  'src/pages/DentalLabPage.tsx': [
    [`        </table>\n      ${CD}\n\n      {modal`, `        </table>\n      </DesktopTableScroll>\n\n      {modal`],
    [`      ) : null}\n    ${CD}\n  )`, `      ) : null}\n    </ListPageLayout>\n  )`],
  ],
  'src/pages/DistributorsPage.tsx': [
    [`        </table>\n      ${CD}\n\n      {modal`, `        </table>\n      </DesktopTableScroll>\n\n      {modal`],
    [`      {confirmModal}\n    ${CD}`, `      {confirmModal}\n    </ListPageLayout>`],
  ],
  'src/pages/ReportsPage.tsx': [
    [`        </table>\n      ${CD}\n    ${CD}`, `        </table>\n      </DesktopTableScroll>\n    </ListPageLayout>`],
  ],
}

for (const [file, rules] of Object.entries(patches)) {
  let s = fs.readFileSync(file, 'utf8')
  for (const [a, b] of rules) {
    if (s.includes(a)) s = s.replace(a, b)
    else console.warn('miss', file, a.slice(0, 40))
  }
  fs.writeFileSync(file, s)
}

// Header closes: first </motion.div> after ListPageHeader content before ListPageToolbar
for (const file of Object.keys(patches)) {
  let s = fs.readFileSync(file, 'utf8')
  if (s.includes('<ListPageHeader>') && !s.includes('</ListPageHeader>')) {
    s = s.replace(
      /(<ListPageHeader>[\s\S]*?)\n      <\/motion.div>\n\n      (<ListPageToolbar>|{\/\* Toolbar)/,
      '$1\n      </ListPageHeader>\n\n      $2',
    )
    s = s.replace(
      /(<ListPageHeader>[\s\S]*?)\n      <\/motion.div>\n\n      (<ListPageToolbar>|{\/\* Toolbar)/,
      '$1\n      </ListPageHeader>\n\n      $2',
    )
  }
  if (s.includes('<ListPageToolbar>') && s.includes('</ListPageToolbar>') === false) {
    // close toolbar before table or error section
    s = s.replace(
      /(<ListPageToolbar>[\s\S]*?)\n      <\/motion.div>\n\n      ({error|{\/\* Table|<DesktopTableScroll|<div className="flex-1)/,
      '$1\n      </ListPageToolbar>\n\n      $2',
    )
  }
  fs.writeFileSync(file, s)
}

console.log('done')
