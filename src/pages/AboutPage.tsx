import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Award,
  BookOpen,
  Code2,
  Heart,
  Phone,
  Scale,
  Shield,
} from 'lucide-react'
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
  const isAr = lang === 'ar'
  const [searchParams, setSearchParams] = useSearchParams()

  const tab: AboutTab = useMemo(() => {
    const raw = searchParams.get('tab')
    if (raw && isAboutTab(raw)) return raw
    return 'about'
  }, [searchParams])

  useEffect(() => {
    document.title =
      tab === 'about'
        ? isAr
          ? 'حول النظام — DentAssist Pro'
          : 'About — DentAssist Pro'
        : `${t(`aboutDocs.tab.${tab}`)} — DentAssist Pro`
  }, [tab, isAr, t])

  const setTab = (next: AboutTab) => {
    if (next === 'about') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: next }, { replace: true })
  }

  const docSections = tab !== 'about' ? getDocumentationSections(tab) : []

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t('aboutDocs.pageTitle', isAr ? 'حول النظام والتوثيق' : 'About DentAssist Pro')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {t('aboutDocs.pageSubtitle', isAr ? 'معلومات الإصدار، المطور، والتراخيص الطبية' : 'System details & documentation')}
          </p>
        </div>
        <p className="text-[11px] font-bold text-slate-400 tabular-nums">
          {t('aboutDocs.lastUpdated', { date: DOC_LAST_UPDATED })}
        </p>
      </div>

      {/* ─── Tab Bar ─── */}
      <div
        className="flex flex-wrap gap-1 rounded-2xl p-1 bg-slate-100/80 ring-1 ring-slate-200/60"
        role="tablist"
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
              className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                active
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              <span>{t(`aboutDocs.tab.${id}`)}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content ─── */}
      {tab === 'about' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          {/* App Header Banner */}
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-2xs"
            >
              <img
                src={defaultAppLogoSrc()}
                alt=""
                className="size-11 object-contain p-1"
                onError={(e) => applyAppLogoFallback(e.currentTarget)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">DentAssist Pro</h2>
                <span className="rounded-full bg-teal-50 border border-teal-200/80 px-2 py-0.2 text-[10px] font-bold text-teal-800 font-mono">
                  v{packageJson.version}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                {t('aboutDocs.tagline', isAr ? 'نظام الإدارة السريرية الشامل لعيادات طب وجراحة الأسنان' : 'Next-Generation Dental Practice Software')}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {/* Developer Card */}
            <div className="relative overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/70 via-cyan-50/50 to-white p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">
                    {t('aboutDocs.developerLabel', isAr ? 'المطور والمهندس المسؤول' : 'Software Architect')}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-slate-900">
                    {t('aboutDocs.developerName', isAr ? 'المهندس محمد شعبان ريمه' : 'Eng. Muhammad Sha\'ban Rima')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {isAr ? 'تطوير حلول البرمجيات الطبية المتقدمة والأنظمة السريرية' : 'Advanced Clinical Software Engineering'}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Phone className="size-3.5 text-teal-600 shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                      00963981061026
                    </span>
                  </div>
                </div>

                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
                  <Award className="size-5.5" />
                </div>
              </div>
            </div>

            {/* Quick Document Links */}
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/about?tab=privacy"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition no-underline"
              >
                <Shield className="size-3.5 text-teal-600" />
                <span>{t('aboutDocs.tab.privacy')}</span>
              </Link>
              <Link
                to="/about?tab=terms"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition no-underline"
              >
                <Scale className="size-3.5 text-teal-600" />
                <span>{t('aboutDocs.tab.terms')}</span>
              </Link>
              <Link
                to="/about?tab=guide"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900 transition no-underline"
              >
                <BookOpen className="size-3.5 text-teal-600" />
                <span>{t('aboutDocs.tab.guide')}</span>
              </Link>
            </div>

            {/* Footer Copyright */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Heart className="size-3.5 text-rose-500" fill="currentColor" />
                <span>{t('aboutDocs.copyright', { year: new Date().getFullYear() })}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400 font-medium">
                {t('aboutDocs.copyNotice')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">{t(`aboutDocs.tab.${tab}`)}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 font-medium">
              {t(`aboutDocs.intro.${tab}`)}
            </p>
          </div>
          <div className="p-6">
            <DocsArticle sections={docSections} lang={lang} />
            <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs font-medium leading-relaxed text-amber-950">
              {t('aboutDocs.legalDisclaimer')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
