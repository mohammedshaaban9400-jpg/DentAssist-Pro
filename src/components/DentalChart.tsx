import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import type { TeethStatusRow, ToothClinicalStatus } from '@/types/clinical'
import { FDI_ARCH_LOWER, FDI_ARCH_UPPER } from '@/types/clinical'
import { createInvoice, listTeethStatuses, upsertTeethStatus } from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'

const STATUSES: ToothClinicalStatus[] = [
  'sound',
  'caries',
  'filled',
  'missing',
  'crown',
  'root_canal',
  'implant',
  'extraction_planned',
]

function allowsPreparationDepth(s: ToothClinicalStatus): boolean {
  return s === 'caries' || s === 'filled' || s === 'crown' || s === 'root_canal'
}

const ENAMEL: Record<
  ToothClinicalStatus,
  { top: string; mid: string; bot: string; rim: string }
> = {
  sound:              { top: '#ffffff', mid: '#f8fafc', bot: '#e2e8f0', rim: '#94a3b8' },
  caries:             { top: '#fffbeb', mid: '#fef3c7', bot: '#fcd34d', rim: '#b45309' },
  filled:             { top: '#f0f9ff', mid: '#e0f2fe', bot: '#bae6fd', rim: '#0369a1' },
  missing:            { top: '#f8fafc', mid: '#f1f5f9', bot: '#e2e8f0', rim: '#64748b' },
  crown:              { top: '#f5f3ff', mid: '#ede9fe', bot: '#ddd6fe', rim: '#6d28d9' },
  root_canal:         { top: '#ecfeff', mid: '#cffafe', bot: '#a5f3fc', rim: '#0e7490' },
  implant:            { top: '#fafafa', mid: '#e4e4e7', bot: '#d4d4d8', rim: '#3f3f46' },
  extraction_planned: { top: '#fff1f2', mid: '#ffe4e6', bot: '#fecdd3', rim: '#be123c' },
}

function toothSurface(st: ToothClinicalStatus) {
  const k = (STATUSES.includes(st) ? st : 'sound') as ToothClinicalStatus
  return {
    fill: `url(#tooth-enamel-${k})`,
    stroke: ENAMEL[k].rim,
    strokeWidth: k === 'missing' ? 1.75 : 2.15,
    dash: k === 'missing' ? '5.5 4' : undefined,
  }
}

function statusClasses(status: string): string {
  switch (status as ToothClinicalStatus) {
    case 'sound':              return 'border-slate-200/90 bg-gradient-to-b from-white to-slate-100 text-slate-700'
    case 'caries':             return 'border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950'
    case 'filled':             return 'border-sky-200/90 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-950'
    case 'missing':            return 'border border-dashed border-slate-300 bg-slate-100/90 text-slate-500'
    case 'crown':              return 'border-violet-200/90 bg-gradient-to-b from-violet-50 to-violet-100 text-violet-950'
    case 'root_canal':         return 'border-cyan-200/90 bg-gradient-to-b from-cyan-50 to-cyan-100 text-cyan-950'
    case 'implant':            return 'border-zinc-300/90 bg-gradient-to-b from-zinc-100 to-zinc-200 text-zinc-900'
    case 'extraction_planned': return 'border-rose-200/90 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-950'
    default:                   return 'border-slate-200 bg-white text-slate-800'
  }
}

type Morph = 'incisor' | 'canine' | 'premolar' | 'molar'

function toothMorph(n: number): Morph {
  const q = Math.floor(n / 10)
  const v = n % 10
  if (q < 1 || q > 4) return 'molar'
  if (v === 1 || v === 2) return 'incisor'
  if (v === 3) return 'canine'
  if (v === 4 || v === 5) return 'premolar'
  return 'molar'
}

function isCentralIncisor(n: number): boolean {
  return n === 11 || n === 21 || n === 31 || n === 41
}

function isUpperTooth(n: number): boolean {
  return n >= 11 && n <= 28
}

/**
 * Flip all y-coordinates in an SVG path string (negate y values).
 * Used so lower-arch teeth can use rot=0 while still having the
 * occlusal surface face upward (toward the midline) and gum face down.
 */
function flipPathY(d: string): string {
  return d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) => `${x},${String(-parseFloat(y))}`)
}

/**
 * Crown path in local space.
 * Upper teeth: gum at negative-y (top), occlusal at positive-y (bottom).
 * Lower teeth: path is y-flipped so gum is at positive-y (bottom) and
 *              occlusal at negative-y (top) – correct anatomy with rot=0.
 */
function crownPath(n: number): string {
  const m = toothMorph(n)
  const wc = isCentralIncisor(n)
  let d: string

  switch (m) {
    case 'incisor': {
      const w = wc ? 8.2 : 7.0
      d = [
        `M ${-w},-15`,
        `C ${-w},-18 ${-w * 0.35},-19 0,-18.5`,
        `C ${w * 0.35},-19 ${w},-18 ${w},-15`,
        `C ${w},-8 ${w * 0.55},6 0,14`,
        `C ${-w * 0.55},6 ${-w},-8 ${-w},-15`,
        'Z',
      ].join(' ')
      break
    }
    case 'canine':
      d = [
        'M -8.5,-14',
        'C -9,-18 -4,-19.5 0,-18.5',
        'C 5,-19.5 9.5,-15 9,-9',
        'L 6,5',
        'L 0,17',
        'L -4,4',
        'C -8.5,-2 -8.5,-8 -8.5,-14',
        'Z',
      ].join(' ')
      break
    case 'premolar':
      d = [
        'M -13,-12',
        'C -13,-17 -7,-19.5 0,-18.8',
        'C 7,-19.5 13,-17 13,-12',
        'C 13,-5 11,2 7,9',
        'C 4,15 0,17.5 -4,15',
        'C -8,12 -11,5 -12.5,-2',
        'C -13,-5 -13,-8 -13,-12',
        'Z',
      ].join(' ')
      break
    default:
      d = [
        'M -16,-11',
        'C -17,-16 -9,-20 0,-19.2',
        'C 9,-20 17,-16 16,-10',
        'C 15.5,-4 14,4 11,11',
        'C 8,16 4,18.5 0,18.2',
        'C -4,18.5 -8,16 -11,11',
        'C -14,4 -15.5,-4 -16,-11',
        'Z',
      ].join(' ')
  }

  return isUpperTooth(n) ? d : flipPathY(d)
}

/**
 * Parabolic arch layout — 16 evenly-spaced x positions per arch.
 *
 * Both upper and lower teeth use rot = 0 (no SVG rotation).
 * Lower teeth have their crown paths pre-flipped (see crownPath) so the
 * occlusal surface faces upward and the gum faces downward — correct anatomy.
 *
 * Upper arch:  incisors at y = 115 (top/front), molars at y = 210 (lower/back).
 * Lower arch:  incisors at y = 295 (top/front, near midline), molars at y = 390.
 * Midline gap: ~85 px between y = 210 and y = 295.
 */
const CHART_CX = 450
const SLOT_W   = 50
/** 16 x-positions: 75, 125, 175 … 825 px (50 px apart, centered at 450). */
const TOOTH_X  = Array.from({ length: 16 }, (_, i) => 75 + i * SLOT_W)

const UPPER_CY = 115   // upper incisor y
const UPPER_EY = 210   // upper molar y
const LOWER_IY = 295   // lower incisor y  (close to midline)
const LOWER_MY = 390   // lower molar y    (far from midline)

type ArchSlot = { n: number; x: number; y: number }

function archSlotY(slotIndex: number, upper: boolean): number {
  const dx = TOOTH_X[slotIndex] - CHART_CX
  const t  = (dx / 375) ** 2    // 0 at centre, 1 at ends
  return upper
    ? UPPER_CY + (UPPER_EY - UPPER_CY) * t
    : LOWER_IY + (LOWER_MY - LOWER_IY) * t
}

function layoutArch(teeth: readonly number[], upper: boolean): ArchSlot[] {
  return teeth.map((n, i) => ({ n, x: TOOTH_X[i], y: archSlotY(i, upper) }))
}

/**
 * Quadratic-bezier gum band path.
 * Control point chosen so the bezier passes through archCY (incisor y) at t = 0.5.
 *
 * Upper:  M 75,210  Q 450, 20 825,210   passes through y = 115 at centre
 * Lower:  M 75,390  Q 450,200 825,390   passes through y = 295 at centre
 */
function gumPath(upper: boolean): string {
  const x0 = TOOTH_X[0]
  const x1 = TOOTH_X[15]
  const ey = upper ? UPPER_EY : LOWER_MY         // y at molar ends
  const cy = upper ? UPPER_CY : LOWER_IY         // y at incisor centre
  const cp = 2 * cy - ey                         // bezier control-point y
  return `M ${x0},${ey} Q ${CHART_CX},${cp} ${x1},${ey}`
}

type Props = { patientId: number; patientName: string }

export function DentalChart({ patientId, patientName }: Props) {
  const { t }  = useTranslation()
  const push   = useToastStore((s) => s.push)

  const [rows,        setRows]        = useState<TeethStatusRow[]>([])
  const [paint,       setPaint]       = useState<ToothClinicalStatus>('sound')
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [noteTooth,   setNoteTooth]   = useState<number | null>(null)
  const [noteDraft,   setNoteDraft]   = useState('')
  const [detailTooth,  setDetailTooth]  = useState<number | null>(null)
  const [detailStatus, setDetailStatus] = useState<ToothClinicalStatus>('sound')
  const [detailNote,   setDetailNote]   = useState('')
  const [detailPrepDepth, setDetailPrepDepth] = useState('')
  const [invAdd,      setInvAdd]      = useState(false)
  const [invDesc,     setInvDesc]     = useState('')
  const [invPrice,    setInvPrice]    = useState('')
  const [detailBusy,  setDetailBusy]  = useState(false)

  const upperSlots = useMemo(() => layoutArch(FDI_ARCH_UPPER, true),  [])
  const lowerSlots = useMemo(() => layoutArch(FDI_ARCH_LOWER, false), [])

  const byTooth = useMemo(() => {
    const m = new Map<number, TeethStatusRow>()
    for (const r of rows) m.set(r.tooth_number, r)
    return m
  }, [rows])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listTeethStatuses(patientId))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { void refresh() }, [refresh])

  const openToothDetail = (n: number) => {
    const row = byTooth.get(n)
    setDetailTooth(n)
    setDetailStatus((row?.status as ToothClinicalStatus) ?? paint)
    setDetailNote(row?.notes ?? '')
    const mm = row?.preparation_depth_mm
    setDetailPrepDepth(mm != null && Number.isFinite(mm) ? String(mm) : '')
    setInvAdd(false)
    setInvDesc(`${t('chart.invoiceLinePrefix')} FDI ${n} - ${patientName}`.trim())
    setInvPrice('')
  }

  const closeToothDetail = () => {
    setDetailTooth(null)
    setDetailPrepDepth('')
    setInvAdd(false)
    setInvDesc('')
    setInvPrice('')
  }

  const saveToothDetail = async () => {
    if (detailTooth == null) return
    setDetailBusy(true)
    setError(null)
    try {
      let preparationDepthMm: number | null = null
      if (allowsPreparationDepth(detailStatus)) {
        const raw = detailPrepDepth.trim().replace(',', '.')
        if (raw !== '') {
          const v = Number(raw)
          if (!Number.isFinite(v) || v < 0 || v > 25) {
            setError(t('chart.prepDepthInvalid'))
            setDetailBusy(false)
            return
          }
          preparationDepthMm = v
        }
      }

      const row = await upsertTeethStatus(
        patientId,
        detailTooth,
        detailStatus,
        detailNote.trim() || null,
        allowsPreparationDepth(detailStatus) ? preparationDepthMm : null,
      )
      setRows(prev => [...prev.filter(r => r.tooth_number !== detailTooth), row])
      if (invAdd) {
        if (!invDesc.trim()) { setError(t('chart.invoiceNeedDesc')); setDetailBusy(false); return }
        const price = Number(invPrice)
        if (!Number.isFinite(price) || price < 0) { setError(t('chart.invoiceNeedPrice')); setDetailBusy(false); return }
        await createInvoice({
          patientId, date: new Date().toISOString(), status: 'pending',
          items: [{ description: invDesc.trim(), toothNumber: detailTooth, price }],
        })
        push(t('chart.invoiceCreated'), 'success')
      } else {
        push(t('chart.toothSaved'), 'success')
      }
      closeToothDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDetailBusy(false)
    }
  }

  const saveNote = async () => {
    if (noteTooth == null) return
    const status = ((byTooth.get(noteTooth)?.status) ?? 'sound') as ToothClinicalStatus
    setError(null)
    try {
      const prev = byTooth.get(noteTooth)
      const row = await upsertTeethStatus(
        patientId,
        noteTooth,
        status,
        noteDraft.trim() || null,
        prev?.preparation_depth_mm ?? null,
      )
      setRows(prev => [...prev.filter(r => r.tooth_number !== noteTooth), row])
      setNoteTooth(null)
      setNoteDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const renderToothGlyph = (slot: ArchSlot) => {
    const st      = (byTooth.get(slot.n)?.status ?? 'sound') as ToothClinicalStatus
    const surface = toothSurface(st)
    const d       = crownPath(slot.n)
    const morph   = toothMorph(slot.n)
    const row     = byTooth.get(slot.n)
    const hasNote = !!(row?.notes?.trim())
    const label   = t(`chart.status.${st}`)
    const depthMm = row?.preparation_depth_mm
    const depthSuffix =
      depthMm != null && Number.isFinite(depthMm)
        ? ` — ${t('chart.prepDepthShort', { mm: depthMm })}`
        : ''
    const upper   = isUpperTooth(slot.n)

    /**
     * Badge placed outside the arch (away from midline).
     * rot = 0 for all teeth, so translate(0, badgeY) is in world coords.
     * Upper: badge ABOVE the slot (negative y = toward gum / away from midline).
     * Lower: badge BELOW the slot (positive y = toward chin / away from midline).
     */
    const badgeY = upper ? -28 : 28

    /**
     * Shine ellipse near the gum attachment.
     * Upper tooth: gum is at negative-y locally → shineCy = -8.5.
     * Lower tooth: path is pre-flipped, so gum is at positive-y locally → shineCy = +8.5.
     */
    const shineCy = upper ? -8.5 : 8.5

    const shineRx = morph === 'molar' ? 10.5 : morph === 'premolar' ? 8.5 : morph === 'canine' ? 5.5 : 5

    const noteCx = morph === 'molar' ? 12 : morph === 'premolar' ? 10 : morph === 'canine' ? 7 : 6
    const noteCy = upper ? -12 : 12

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openToothDetail(slot.n) }
    }

    return (
      <g
        key={slot.n}
        transform={`translate(${slot.x},${slot.y})`}
        className="cursor-pointer outline-none transition-transform duration-150 ease-out hover:scale-[1.04] focus-visible:scale-[1.02]"
        role="button"
        tabIndex={0}
        aria-label={`FDI ${slot.n}, ${label}`}
        onClick={() => openToothDetail(slot.n)}
        onKeyDown={onKeyDown}
        onContextMenu={ev => {
          ev.preventDefault()
          setNoteTooth(slot.n)
          setNoteDraft(byTooth.get(slot.n)?.notes ?? '')
        }}
      >
        <title>{`${slot.n} - ${label}${depthSuffix}`}</title>
        <path
          d={d}
          fill={surface.fill}
          stroke={surface.stroke}
          strokeWidth={surface.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={surface.dash}
          filter="url(#toothShadow)"
        />
        {st !== 'missing' && (
          <ellipse cx={0} cy={shineCy} rx={shineRx} ry={3.4}
            fill="#ffffff" opacity={0.3} className="pointer-events-none" />
        )}
        {hasNote && (
          <circle cx={noteCx} cy={noteCy} r={3.5}
            className="pointer-events-none fill-teal-500 stroke-white" strokeWidth={1.35} />
        )}
        {/* Badge: counter-translate to place in world coords, then offset by badgeY */}
        <g transform={`translate(0,${badgeY})`}>
          <rect x={-13} y={-8} width={26} height={16} rx={8}
            fill="rgba(255,255,255,0.94)" stroke="rgba(148,163,184,0.55)" strokeWidth={1}
            className="pointer-events-none" />
          <text
            x={0} y={0.5}
            textAnchor="middle" dominantBaseline="middle"
            paintOrder="stroke fill"
            stroke="rgba(255,255,255,0.9)" strokeWidth={2.5}
            fill="#334155"
            className="pointer-events-none select-none"
            style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
          >
            {slot.n}
          </text>
        </g>
      </g>
    )
  }

  const gumUpperD = gumPath(true)
  const gumLowerD = gumPath(false)

  return (
    <section id="patient-odontogram" className="da-card scroll-mt-24 bg-gradient-to-b from-slate-50/60 to-white">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{t('chart.title')}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t('chart.subtitle')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('chart.archLegend')}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">{t('chart.fdiVerify')}</p>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          {t('chart.hint')}
        </p>
      </div>

      {/* Status palette */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('chart.palette')}</p>
        <div className="mt-2 rounded-2xl border border-slate-200/90 bg-slate-50 p-2 shadow-inner">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {STATUSES.map(s => (
              <button key={s} type="button" title={t(`chart.status.${s}`)} onClick={() => setPaint(s)}
                className={`flex min-h-[3.25rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
                  paint === s
                    ? 'border-teal-300/80 bg-white text-teal-900 shadow-sm ring-2 ring-teal-500/25'
                    : 'border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                }`}>
                <span className={`size-3 shrink-0 rounded-full border shadow-sm ${statusClasses(s)}`} aria-hidden />
                <span className="line-clamp-2 w-full text-[11px] font-semibold leading-snug sm:text-xs">
                  {t(`chart.status.${s}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error   && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">{t('common.loading')}</p>}

      {/* SVG chart */}
      <div
        className="mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(15,23,42,0.04)]"
        dir="ltr" style={{ unicodeBidi: 'isolate' }} data-allow-contextmenu
      >
        <svg
          viewBox="0 0 900 510"
          className="h-auto w-full"
          style={{ minHeight: 320, maxHeight: 'min(70vh, 580px)' }}
          preserveAspectRatio="xMidYMid meet"
          aria-label={t('chart.svgAria')}
        >
          <defs>
            {STATUSES.map(s => {
              const c = ENAMEL[s]
              return (
                <linearGradient key={s} id={`tooth-enamel-${s}`}
                  x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                  <stop offset="0%"   stopColor={c.top} />
                  <stop offset="44%"  stopColor={c.mid} />
                  <stop offset="100%" stopColor={c.bot} />
                </linearGradient>
              )
            })}
            <linearGradient id="gumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#fdf2f8" stopOpacity={0.4} />
              <stop offset="50%"  stopColor="#fbcfe8" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#fdf2f8" stopOpacity={0.4} />
            </linearGradient>
            <filter id="toothShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.09" />
            </filter>
          </defs>

          {/* Arch titles */}
          <text x="450" y="44" textAnchor="middle"
            className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
            {t('chart.upperArch')}
          </text>
          <text x="450" y="470" textAnchor="middle"
            className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
            {t('chart.lowerArch')}
          </text>

          {/* Quadrant labels */}
          <text x="190" y="236" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold uppercase tracking-wide">{t('chart.q1Band')}</text>
          <text x="710" y="236" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold uppercase tracking-wide">{t('chart.q2Band')}</text>
          <text x="190" y="270" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold uppercase tracking-wide">{t('chart.q4Band')}</text>
          <text x="710" y="270" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold uppercase tracking-wide">{t('chart.q3Band')}</text>

          {/* Upper gum band (behind teeth) */}
          <path d={gumUpperD} fill="none" stroke="url(#gumGrad)" strokeWidth={24} strokeLinecap="round" className="pointer-events-none" />
          <path d={gumUpperD} fill="none" stroke="#fda4af" strokeOpacity={0.3} strokeWidth={1.5} className="pointer-events-none" />

          {/* Upper teeth */}
          <g>{upperSlots.map(s => renderToothGlyph(s))}</g>

          {/* Midline */}
          <line x1="450" y1="220" x2="450" y2="282" stroke="#cbd5e1" strokeWidth={1.2} strokeDasharray="5 6" opacity={0.9} />
          <text x="450" y="254" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold tracking-wide">{t('chart.midline')}</text>

          {/* Lower gum band (behind teeth) */}
          <path d={gumLowerD} fill="none" stroke="url(#gumGrad)" strokeWidth={24} strokeLinecap="round" className="pointer-events-none" />
          <path d={gumLowerD} fill="none" stroke="#fda4af" strokeOpacity={0.3} strokeWidth={1.5} className="pointer-events-none" />

          {/* Lower teeth */}
          <g>{lowerSlots.map(s => renderToothGlyph(s))}</g>
        </svg>

        {/* Legend */}
        <div className="border-t border-slate-100 bg-slate-50/90 px-4 py-3.5 md:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('chart.legendCaption')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {STATUSES.map(s => (
              <div key={s} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100/90 bg-white px-2 py-2.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <span className={`inline-block size-4 shrink-0 rounded-md border ${statusClasses(s)}`} aria-hidden />
                <span className="w-full text-[10px] font-semibold leading-snug text-slate-700 sm:text-[11px]">
                  {t(`chart.status.${s}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooth detail modal */}
      {detailTooth != null && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="thin-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-dent-card)]">
            <h3 className="text-lg font-semibold text-slate-900">{t('chart.toothModalTitle', { tooth: detailTooth })}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('chart.toothModalHint')}</p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
                {t('chart.palette')}
                <select
                  value={detailStatus}
                  onChange={(e) => {
                    const s = e.target.value as ToothClinicalStatus
                    setDetailStatus(s)
                    if (!allowsPreparationDepth(s)) setDetailPrepDepth('')
                  }}
                  className="da-input cursor-pointer text-base"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{t(`chart.status.${s}`)}</option>)}
                </select>
              </label>
              {allowsPreparationDepth(detailStatus) && (
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
                  {t('chart.prepDepthLabel')}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={detailPrepDepth}
                    onChange={(e) => setDetailPrepDepth(e.target.value)}
                    placeholder={t('chart.prepDepthPlaceholder')}
                    className="da-input cursor-text font-mono text-sm tabular-nums"
                  />
                  <span className="text-xs font-normal text-slate-500">{t('chart.prepDepthHint')}</span>
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
                {t('chart.clinicalNote')}
                <textarea value={detailNote} onChange={e => setDetailNote(e.target.value)}
                  rows={3} className="da-input min-h-[5rem] cursor-text text-sm" />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input type="checkbox" checked={invAdd} onChange={e => setInvAdd(e.target.checked)} />
                {t('chart.addInvoiceLine')}
              </label>
              {invAdd && (
                <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                    {t('invoices.lineDesc')}
                    <input value={invDesc} onChange={e => setInvDesc(e.target.value)} className="da-input cursor-text text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                    {t('invoices.linePrice')}
                    <input type="number" min={0} step="0.01" value={invPrice}
                      onChange={e => setInvPrice(e.target.value)}
                      className="da-input cursor-text font-mono text-sm tabular-nums" />
                  </label>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={closeToothDetail} className="da-btn-secondary !px-5 !py-2.5">{t('common.cancel')}</button>
              <button type="button" disabled={detailBusy} onClick={() => void saveToothDetail()}
                className="da-btn-primary !px-5 !py-2.5 disabled:opacity-60">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline note editor */}
      {noteTooth != null && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-[var(--shadow-dent-card)]">
          <p className="text-sm font-semibold text-slate-900">{t('chart.noteFor', { tooth: noteTooth })}</p>
          <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
            rows={3} className="da-input mt-3 min-h-[5rem] cursor-text" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void saveNote()} className="da-btn-primary !px-5 !py-2.5">{t('common.save')}</button>
            <button type="button" onClick={() => { setNoteTooth(null); setNoteDraft('') }}
              className="da-btn-secondary !px-5 !py-2.5">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
