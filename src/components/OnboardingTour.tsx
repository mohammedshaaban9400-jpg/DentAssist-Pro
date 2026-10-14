import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layout,
  Users,
  Activity,
  Receipt,
  Settings,
  Smartphone,
  Menu,
} from 'lucide-react'

type TourStep = {
  target: string
  titleKey: string
  bodyKey: string
  icon: React.ElementType
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

function padRect(rect: DOMRect, px = 8): SpotlightRect {
  const left = Math.max(4, Math.min(rect.left - px, window.innerWidth - 20))
  const top = Math.max(4, Math.min(rect.top - px, window.innerHeight - 20))
  const maxWidth = Math.max(16, window.innerWidth - left - 4)
  const maxHeight = Math.max(16, window.innerHeight - top - 4)
  const width = Math.min(maxWidth, rect.width + px * 2)
  const height = Math.min(maxHeight, rect.height + px * 2)
  return { top, left, width, height }
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || window.matchMedia(MOBILE_MQ).matches
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
    try {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel))
      const visibleNode = nodes.find(isVisible)
      if (visibleNode) return visibleNode
    } catch {
      // ignore selector errors
    }
  }
  return null
}

export function OnboardingTour({ open, onClose, onComplete }: OnboardingTourProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [stepIndex, setStepIndex] = useState(0)
  const [mobile, setMobile] = useState<boolean>(() => isMobileViewport())
  const [spot, setSpot] = useState<SpotlightRect | null>(null)

  const desktopSteps = useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="sidebar"]',
        titleKey: 'tour.steps.sidebar.title',
        bodyKey: 'tour.steps.sidebar.body',
        icon: Layout,
      },
      {
        target: '[data-tour="nav-patients"]',
        titleKey: 'tour.steps.patients.title',
        bodyKey: 'tour.steps.patients.body',
        icon: Users,
      },
      {
        target: '[data-tour="nav-appointments"]',
        titleKey: 'tour.steps.appointments.title',
        bodyKey: 'tour.steps.appointments.body',
        icon: Activity,
      },
      {
        target: '[data-tour="nav-invoices"]',
        titleKey: 'tour.steps.invoices.title',
        bodyKey: 'tour.steps.invoices.body',
        icon: Receipt,
      },
      {
        target: '[data-tour="nav-settings"]',
        titleKey: 'tour.steps.settings.title',
        bodyKey: 'tour.steps.settings.body',
        icon: Settings,
      },
      {
        target: '[data-tour="main-content"]',
        titleKey: 'tour.steps.main.title',
        bodyKey: 'tour.steps.main.body',
        icon: Sparkles,
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
        icon: Smartphone,
      },
      {
        target: '[data-tour="nav-patients"]',
        titleKey: 'tour.steps.patients.title',
        bodyKey: 'tour.steps.patients.body',
        icon: Users,
      },
      {
        target: '[data-tour="nav-appointments"]',
        titleKey: 'tour.steps.appointments.title',
        bodyKey: 'tour.steps.appointments.body',
        icon: Activity,
      },
      {
        target: '[data-tour="nav-invoices"]',
        titleKey: 'tour.steps.invoices.title',
        bodyKey: 'tour.steps.invoices.body',
        icon: Receipt,
      },
      {
        target: '[data-tour="mobile-menu-more"]',
        titleKey: 'tour.steps.settings.title',
        bodyKey: 'tour.steps.settingsMobile.body',
        icon: Menu,
      },
      {
        target: '[data-tour="main-content"]',
        titleKey: 'tour.steps.main.title',
        bodyKey: 'tour.steps.main.body',
        icon: Sparkles,
      },
    ],
    [],
  )

  // Strictly sync mobile detection on mount, open, and resize
  useEffect(() => {
    const update = () => {
      setMobile(isMobileViewport())
    }
    update()

    const mq = window.matchMedia(MOBILE_MQ)
    if (mq.addEventListener) {
      mq.addEventListener('change', update)
    } else {
      mq.addListener(update)
    }
    window.addEventListener('resize', update, { passive: true })
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', update)
      } else {
        mq.removeListener(update)
      }
      window.removeEventListener('resize', update)
    }
  }, [open])

  const currentIsMobile = mobile || (typeof window !== 'undefined' && window.innerWidth < 768)
  const steps = currentIsMobile ? mobileSteps : desktopSteps

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!open) {
      setStepIndex(0)
      setSpot(null)
    }
  }, [open])

  const updateSpotlight = useCallback(() => {
    const step = steps[stepIndex] ?? steps[0]
    if (!step) {
      setSpot(null)
      return
    }

    const fallbacks =
      step.target === '[data-tour="sidebar"]'
        ? ['[data-tour="mobile-bottom-nav"]']
        : step.target === '[data-tour="mobile-bottom-nav"]'
        ? ['[data-tour="sidebar"]']
        : []

    const node = resolveTarget(step.target, fallbacks)
    if (!node) {
      setSpot(null)
      return
    }

    const r = node.getBoundingClientRect()
    const inView =
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom <= window.innerHeight &&
      r.right <= window.innerWidth
    const isFixed =
      step.target === '[data-tour="sidebar"]' ||
      step.target === '[data-tour="mobile-bottom-nav"]' ||
      step.target === '[data-tour="main-content"]'
    if (!isFixed && !inView) {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }

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

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight') {
        if (isRtl) {
          // In RTL, right is previous
          setStepIndex((p) => Math.max(0, p - 1))
        } else {
          setStepIndex((p) => Math.min(steps.length - 1, p + 1))
        }
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) {
          // In RTL, left is next
          setStepIndex((p) => Math.min(steps.length - 1, p + 1))
        } else {
          setStepIndex((p) => Math.max(0, p - 1))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isRtl, steps.length, onClose])

  if (!open) return null

  const activeStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const StepIcon = activeStep.icon

  const ui = (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      {/* SVG Mask Cutout — soft, elegant tint without dark blackout */}
      <svg className="pointer-events-none fixed inset-0 z-[200] size-full">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Gentle 38% slate tint — keeps app content clear and welcoming */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.38)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* High-definition Glowing Spotlight Ring around active element */}
      {spot && (
        <div
          className="pointer-events-none fixed z-[201] rounded-2xl transition-all duration-300 ease-out"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            border: '2px solid var(--color-primary, #0d9488)',
            boxShadow:
              '0 0 0 4px var(--color-primary-light, rgba(13, 148, 136, 0.2)), 0 0 25px var(--color-primary-glow, rgba(13, 148, 136, 0.35))',
          }}
        />
      )}

      {/* Interactive Tour Guide Card */}
      <div
        className={`pointer-events-auto fixed z-[205] transition-all duration-300 ease-out ${
          currentIsMobile
            ? 'inset-x-3 sm:inset-x-4 mx-auto w-auto max-w-md'
            : isRtl
            ? 'start-10 end-auto w-[420px] max-w-[calc(100vw-5rem)]'
            : 'end-10 start-auto w-[420px] max-w-[calc(100vw-5rem)]'
        }`}
        style={
          currentIsMobile
            ? {
                bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px) + 0.5rem)',
                left: '0.75rem',
                right: '0.75rem',
                maxWidth: '28rem',
                margin: '0 auto',
                width: 'auto',
                minWidth: 'min(calc(100vw - 1.5rem), 280px)',
              }
            : {
                bottom: '2.5rem',
                ...(isRtl
                  ? { left: '2.5rem', right: 'auto' }
                  : { right: '2.5rem', left: 'auto' }),
                width: 'min(420px, calc(100vw - 5rem))',
                maxWidth: 'calc(100vw - 5rem)',
                minWidth: '320px',
              }
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:border-slate-800">
          {/* Top accent line styled with active primary theme color */}
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background: 'linear-gradient(90deg, var(--color-primary, #0d9488), #6366f1)',
            }}
          />

          {/* Card Header: Progress & Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold"
                style={{ color: 'var(--color-primary, #0d9488)' }}
              >
                {t('tour.step', {
                  current: stepIndex + 1,
                  total: steps.length,
                  defaultValue: isRtl
                    ? `الخطوة ${stepIndex + 1} من ${steps.length}`
                    : `Step ${stepIndex + 1} of ${steps.length}`,
                })}
              </span>
              {/* Visual Progress Dots */}
              <div className="flex items-center gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === stepIndex ? '1.25rem' : '0.35rem',
                      background:
                        i === stepIndex
                          ? 'var(--color-primary, #0d9488)'
                          : i < stepIndex
                          ? 'var(--color-primary, #0d9488)'
                          : '#e2e8f0',
                      opacity: i === stepIndex ? 1 : i < stepIndex ? 0.4 : 1,
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStepIndex(0)
                onClose()
              }}
              className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={t('tour.skip')}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Title & Step Icon */}
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary, #0d9488), var(--color-primary-hover, #0f766e))',
              }}
            >
              <StepIcon className="size-5" />
            </div>
            <h3
              id="onboarding-tour-title"
              className="text-base font-bold text-slate-900 sm:text-lg dark:text-white"
            >
              {t(activeStep.titleKey)}
            </h3>
          </div>

          {/* Description */}
          <p className="mt-2.5 max-h-[25vh] overflow-y-auto text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
            {t(activeStep.bodyKey)}
          </p>

          {!spot ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{t('tour.targetMissing')}</p>
          ) : null}

          {/* Action Buttons */}
          <div className="mt-4 sm:mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setStepIndex(0)
                onClose()
              }}
              className="cursor-pointer text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t('tour.skip')}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={stepIndex === 0}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isRtl ? <ArrowRight className="size-3.5" /> : <ArrowLeft className="size-3.5" />}
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
                className="da-btn-primary inline-flex cursor-pointer items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-sm"
              >
                {isLast ? (
                  t('tour.finish')
                ) : (
                  <>
                    {t('tour.next')}
                    {isRtl ? (
                      <ArrowLeft className="size-3.5" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(ui, document.body)
}
