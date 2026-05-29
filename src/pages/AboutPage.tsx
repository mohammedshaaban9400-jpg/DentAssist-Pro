import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Code2, FileText, Heart, Phone, Scale, Shield } from 'lucide-react'
import { DocsArticle } from '@/components/DocsArticle'
import { DOC_LAST_UPDATED, getDocumentationSections, type DocId } from '@/legal/clinicDocumentation'
import packageJson from '../../package.json'
import { applyAppLogoFallback, defaultAppLogoSrc } from '@/lib/appBrand'

type AboutTab = 'about' | DocId

const TAB_IDS: AboutTab[] = ['about', 'privacy', 'terms', 'guide']

function isAboutTab(v: string | null): v is AboutTab {
  return v === 'about' || v === 'privacy' || v === 'terms' || v === 'guide'
}

export function AboutPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const [searchParams, setSearchParams] = useSearchParams()

  const tab: AboutTab = useMemo(() => {
    const raw = searchParams.get('tab')
    if (raw && isAboutTab(raw)) return raw
    return 'about'
  }, [searchParams])

  useEffect(() => {
    document.title =
      tab === 'about'
        ? lang === 'ar'
          ? 'حول — DentAssist Pro'
          : 'About — DentAssist Pro'
        : `${t(`aboutDocs.tab.${tab}`)} — DentAssist Pro`
  }, [tab, lang, t])

  const setTab = (next: AboutTab) => {
    if (next === 'about') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: next }, { replace: true })
  }

  const docSections = tab !== 'about' ? getDocumentationSections(tab) : []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('aboutDocs.pageTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('aboutDocs.pageSubtitle')}</p>
        </div>
        <p className="text-xs font-medium text-slate-400 tabular-nums">
          {t('aboutDocs.lastUpdated', { date: DOC_LAST_UPDATED })}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-wrap gap-1 rounded-2xl p-1 shadow-sm ring-1 ring-slate-200/80"
        style={{ background: '#f8fafc' }}
        role="tablist"
        aria-label={t('aboutDocs.pageTitle')}
      >
        {TAB_IDS.map((id) => {
          const active = tab === id
          const Icon =
            id === 'about'
              ? Code2
              : id === 'privacy'
                ? Shield
                : id === 'terms'
                  ? Scale
                  : BookOpen
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={[
                'inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                active
                  ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/90'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
              ].join(' ')}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {t(`aboutDocs.tab.${id}`)}
            </button>
          )
        })}
      </div>

      {tab === 'about' ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0d1424, #1e3a5f)' }}
            >
              <Code2 className="size-5 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t('aboutDocs.cardAppTitle')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t('aboutDocs.cardAppSubtitle')}</p>
            </div>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="flex items-center gap-4">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                <img
                  src={defaultAppLogoSrc()}
                  alt=""
                  className="size-9"
                  onError={(e) => applyAppLogoFallback(e.currentTarget)}
                />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">DentAssist Pro</p>
                <p className="text-xs text-slate-500">{t('aboutDocs.tagline')}</p>
                <p className="mt-0.5 text-xs font-mono text-teal-600">v{packageJson.version}</p>
              </div>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(135deg, #f0fdfa, #e0f2fe)', border: '1px solid #a5f3fc' }}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">
                {t('aboutDocs.developerLabel')}
              </p>
              <p className="text-base font-bold text-slate-900">{t('aboutDocs.developerName')}</p>
              <div className="mt-3 flex items-center gap-2.5">
                <Phone className="size-3.5 shrink-0 text-teal-600" />
                <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">00963981061026</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/about?tab=privacy"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-900"
              >
                <Shield className="size-3.5 shrink-0" aria-hidden />
                {t('aboutDocs.tab.privacy')}
              </Link>
              <Link
                to="/about?tab=terms"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-900"
              >
                <FileText className="size-3.5 shrink-0" aria-hidden />
                {t('aboutDocs.tab.terms')}
              </Link>
              <Link
                to="/about?tab=guide"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-900"
              >
                <BookOpen className="size-3.5 shrink-0" aria-hidden />
                {t('aboutDocs.tab.guide')}
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Heart className="size-3.5 shrink-0 text-rose-400" fill="currentColor" />
                <span>{t('aboutDocs.copyright', { year: new Date().getFullYear() })}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{t('aboutDocs.copyNotice')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50/80 to-white px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">{t(`aboutDocs.tab.${tab}`)}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(`aboutDocs.intro.${tab}`)}</p>
          </div>
          <div className="px-6 py-8">
            <DocsArticle sections={docSections} lang={lang} />
            <div className="mt-10 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950/90">
              {t('aboutDocs.legalDisclaimer')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
