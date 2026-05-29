import type { DocSection } from '@/legal/clinicDocumentation'

type Lang = 'ar' | 'en'

export function DocsArticle({ sections, lang }: { sections: DocSection[]; lang: Lang }) {
  return (
    <article className="space-y-8 text-start">
      {sections.map((s, i) => (
        <section key={i} className="scroll-mt-4">
          <h3 className="mb-3 border-s-4 border-teal-500 ps-3 text-sm font-bold text-slate-900">
            {s.title[lang]}
          </h3>
          <div className="space-y-3 ps-1">
            {s.paragraphs[lang].map((p, j) => (
              <p key={j} className="text-sm leading-[1.75] text-slate-600">
                {p}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
