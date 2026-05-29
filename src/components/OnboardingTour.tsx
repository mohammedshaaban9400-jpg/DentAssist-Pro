import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type TourStep = {
  target: string
  titleKey: string
  bodyKey: string
}

type OnboardingTourProps = {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const MOBILE_MQ = '(max-width: 767px)'

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 || rect.height > 0
}

function resolveTarget(selector: string, fallbacks: string[] = []): HTMLElement | null {
  const candidates = [selector, ...fallbacks]
  for (const sel of candidates) {
    const node = document.querySelector(sel) as HTMLElement | null
    if (node && isVisible(node)) return node
  }
  return null
}

function padRect(rect: DOMRect, px: number): SpotlightRect {
  return {
    top: Math.max(8, rect.top - px),
    left: Math.max(8, rect.left - px),
    width: rect.width + px * 2,
    height: rect.height + px * 2,
  }
}

export function OnboardingTour({ open, onClose, onComplete }: OnboardingTourProps) {
  const { t } = useTranslation()
  const [stepIndex, setStepIndex] = useState(0)
  const [mobile, setMobile] = useState(isMobileViewport)
  const [spot, setSpot] = useState<SpotlightRect | null>(null)

  const desktopSteps = useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="sidebar"]',
        titleKey: 'tour.steps.sidebar.title',
        bodyKey: 'tour.steps.sidebar.body',
      },
      {
        target: '[data-tour="nav-patients"]',
        titleKey: 'tour.steps.patients.title',
        bodyKey: 'tour.steps.patients.body',
      },
      {
        target: '[data-tour="nav-appointments"]',
        titleKey: 'tour.steps.appointments.title',
        bodyKey: 'tour.steps.appointments.body',
      },
      {
        target: '[data-tour="nav-invoices"]',
        titleKey: 'tour.steps.invoices.title',
        bodyKey: 'tour.steps.invoices.body',
      },
      {
        target: '[data-tour="nav-settings"]',
        titleKey: 'tour.steps.settings.title',
        bodyKey: 'tour.steps.settings.body',
      },
      {
        target: '[data-tour="main-content"]',
        titleKey: 'tour.steps.main.title',
        bodyKey: 'tour.steps.main.body',
      },
    ],
    [],
  )

  const mobileSteps = useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="mobile-bottom-nav"]',
        titleKey: 'tour.steps.mobileNav.title',
        bodyKey: 'tour.steps.mobileNav.body',
      },
      {
        target: '[data-tour="nav-patients"]',
        titleKey: 'tour.steps.patients.title',
        bodyKey: 'tour.steps.patients.body',
      },
      {
        target: '[data-tour="nav-appointments"]',
        titleKey: 'tour.steps.appointments.title',
        bodyKey: 'tour.steps.appointments.body',
      },
      {
        target: '[data-tour="nav-invoices"]',
        titleKey: 'tour.steps.invoices.title',
        bodyKey: 'tour.steps.invoices.body',
      },
      {
        target: '[data-tour="mobile-menu-more"]',
        titleKey: 'tour.steps.settings.title',
        bodyKey: 'tour.steps.settingsMobile.body',
      },
      {
        target: '[data-tour="main-content"]',
        titleKey: 'tour.steps.main.title',
        bodyKey: 'tour.steps.main.body',
      },
    ],
    [],
  )

  const steps = mobile ? mobileSteps : desktopSteps

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [open])

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      setSpot(null)
    }
  }, [open])

  const updateSpotlight = useCallback(() => {
    const step = steps[stepIndex]
    if (!step) {
      setSpot(null)
      return
    }

    const fallbacks =
      step.target === '[data-tour="sidebar"]' ? ['[data-tour="mobile-bottom-nav"]'] : []

    const node = resolveTarget(step.target, fallbacks)
    if (!node) {
      setSpot(null)
      return
    }
    node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    setSpot(padRect(node.getBoundingClientRect(), 6))
  }, [stepIndex, steps])

  useEffect(() => {
    if (!open) return
    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [open, updateSpotlight])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const activeStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const progress = `${stepIndex + 1} / ${steps.length}`

  const ui = (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      {/* Dimmed backdrop + spotlight cutout */}
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-teal-400 ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-slate-950/62" aria-hidden />
      )}

      {/* Explanation card — above mobile bottom bar + safe area */}
      <div
        className="pointer-events-auto mt-auto w-full max-w-lg px-4"
        style={{
          paddingBottom: mobile
            ? 'calc(4.75rem + env(safe-area-inset-bottom, 0px) + 0.75rem)'
            : 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{progress}</p>
          <h3 id="onboarding-tour-title" className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
            {t(activeStep.titleKey)}
          </h3>
          <p className="mt-2 max-h-[28vh] overflow-y-auto text-sm leading-relaxed text-slate-600">
            {t(activeStep.bodyKey)}
          </p>
          {!spot ? (
            <p className="mt-2 text-xs text-amber-700">{t('tour.targetMissing')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setStepIndex(0)
                onClose()
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {t('tour.skip')}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={stepIndex === 0}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('tour.prev')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    setStepIndex(0)
                    onComplete()
                    return
                  }
                  setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
                }}
                className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {isLast ? t('tour.finish') : t('tour.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(ui, document.body)
}
