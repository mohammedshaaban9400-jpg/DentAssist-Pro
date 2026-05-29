import fs from 'fs'

const p = 'src/pages/AppointmentsPage.tsx'
let s = fs.readFileSync(p, 'utf8')

s = s.replace('        </motion.div>\n      </ListPageHeader>', '        </div>\n      </ListPageHeader>')
s = s.replace(
  '\n      </div>\n\n      {/* Due WhatsApp reminders */}',
  '\n      </ListPageToolbar>\n\n      {/* Due WhatsApp reminders */}',
)

if (!s.includes('MobileCardList')) {
  const mobile = `
      {error ? <motion.div className="list-page-error">{error}</motion.div> : null}

      <MobileCardList>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <MobileCard key={i}>
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </MobileCard>
          ))
        ) : filteredRows.length === 0 ? (
          <MobileEmptyState icon={CalendarDays}>
            {t('appointments.empty', isAr ? 'لا توجد عمليات/مواعيد' : 'No operations')}
          </MobileEmptyState>
        ) : (
          filteredRows.map((a) => {
            const statusLabel = ['scheduled', 'completed', 'cancelled', 'no_show'].includes(a.status)
              ? t(\`appointments.status.\${a.status}\` as 'appointments.status.scheduled')
              : a.status
            const st = STATUS_CONFIG[a.status as StatusKey] ?? STATUS_CONFIG.no_show
            const d = parseISO(a.start_time)
            return (
              <MobileCard key={a.id} className={isToday(d) ? 'ring-1 ring-teal-200' : ''}>
                <p className="text-xs font-semibold text-slate-600">{format(d, 'PPp', { locale: loc })}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {a.patient_first_name} {a.patient_last_name}
                </p>
                <span
                  className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: st.bg, color: st.text, boxShadow: \`0 0 0 1px \${st.ring}\` }}
                >
                  {statusLabel}
                </span>
                <MobileCardActions>
                  {a.status === 'scheduled' && a.patient_phone?.trim() ? (
                    <button
                      type="button"
                      onClick={() => void sendManualWhatsAppForAppointment(a)}
                      disabled={sendingManualWaId === a.id}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"
                    >
                      <MessageCircle className="size-4" />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => openEdit(a)} className="flex size-8 items-center justify-center rounded-lg bg-slate-100">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => void remove(a.id)} disabled={busy} className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-rose-600">
                    <Trash2 className="size-4" />
                  </button>
                </MobileCardActions>
              </MobileCard>
            )
          })
        )}
      </MobileCardList>

      <DesktopTablePane>
`
    .replaceAll('motion.div', 'motion.div')
    .replaceAll('<motion.div', '<div')
    .replaceAll('</motion.div>', '</' + 'div>')

  s = s.replace(
    `{error ? (
        <div className="m-6 rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="flex-1 overflow-auto">`,
    mobile.trimStart(),
  )
}

s = s.replace(
  `        </table>
      </motion.div>
    </motion.div>`,
  `        </table>
      </DesktopTablePane>
    </ListPageLayout>`,
)
s = s.replace(
  `        </table>
      </div>
    </motion.div>`,
  `        </table>
      </DesktopTablePane>
    </ListPageLayout>`,
)
s = s.replace(
  `        </table>
      </div>
    </div>`,
  `        </table>
      </DesktopTablePane>
    </ListPageLayout>`,
)

fs.writeFileSync(p, s)
console.log('appointments jsx fixed')
