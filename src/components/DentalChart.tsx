import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Maximize2, Minimize2, Sparkles, X } from 'lucide-react'
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

type Morph = 'central_incisor' | 'incisor' | 'canine' | 'premolar' | 'molar'

function toothMorph(n: number): Morph {
  const v = n % 10
  if (v === 1) return 'central_incisor'
  if (v === 2) return 'incisor'
  if (v === 3) return 'canine'
  if (v === 4 || v === 5) return 'premolar'
  return 'molar'
}

function isUpperTooth(n: number): boolean {
  return n >= 11 && n <= 28
}

function getToothAnatomicalName(n: number, isArabic: boolean): string {
  const q = Math.floor(n / 10)
  const v = n % 10
  if (isArabic) {
    const types = ['', 'قاطع مركزي', 'قاطع جانبي', 'ناب', 'ضاحك أول', 'ضاحك ثانٍ', 'ضرس أول', 'ضرس ثانٍ', 'ضرس عقل (ثالث)']
    const quads = ['', 'علوي أيمن (Q1)', 'علوي أيسر (Q2)', 'سفلي أيسر (Q3)', 'سفلي أيمن (Q4)']
    return `${types[v] || 'سن'} — ${quads[q] || ''}`
  } else {
    const types = ['', 'Central Incisor', 'Lateral Incisor', 'Canine', 'First Premolar', 'Second Premolar', 'First Molar', 'Second Molar', 'Third Molar (Wisdom)']
    const quads = ['', 'Upper Right (Q1)', 'Upper Left (Q2)', 'Lower Left (Q3)', 'Lower Right (Q4)']
    return `${types[v] || 'Tooth'} — ${quads[q] || ''}`
  }
}

function statusBadgeClasses(status: string): string {
  switch (status as ToothClinicalStatus) {
    case 'sound':              return 'border-emerald-200/90 bg-emerald-50 text-emerald-900'
    case 'caries':             return 'border-amber-200/90 bg-amber-50 text-amber-950'
    case 'filled':             return 'border-sky-200/90 bg-sky-50 text-sky-950'
    case 'missing':            return 'border-dashed border-slate-300 bg-slate-100 text-slate-500'
    case 'crown':              return 'border-violet-200/90 bg-violet-50 text-violet-950'
    case 'root_canal':         return 'border-cyan-200/90 bg-cyan-50 text-cyan-950'
    case 'implant':            return 'border-zinc-300 bg-zinc-100 text-zinc-900'
    case 'extraction_planned': return 'border-rose-200/90 bg-rose-50 text-rose-950'
    default:                   return 'border-slate-200 bg-white text-slate-800'
  }
}

// -------------------------------------------------------------
// Anatomical Dental Arch Geometry (Horseshoe Arch Model)
// -------------------------------------------------------------
type AnatomicalSlot = {
  n: number
  x: number
  y: number
  rot: number
  morph: Morph
}

const ANATOMICAL_UPPER_SLOTS: readonly AnatomicalSlot[] = [
  { n: 18, x: 88,  y: 315, rot: -88, morph: 'molar' },
  { n: 17, x: 99,  y: 272, rot: -82, morph: 'molar' },
  { n: 16, x: 114, y: 228, rot: -76, morph: 'molar' },
  { n: 15, x: 135, y: 186, rot: -68, morph: 'premolar' },
  { n: 14, x: 158, y: 147, rot: -56, morph: 'premolar' },
  { n: 13, x: 186, y: 112, rot: -38, morph: 'canine' },
  { n: 12, x: 215, y: 83,  rot: -18, morph: 'incisor' },
  { n: 11, x: 239, y: 64,  rot: -5,  morph: 'central_incisor' },
  { n: 21, x: 261, y: 64,  rot: 5,   morph: 'central_incisor' },
  { n: 22, x: 285, y: 83,  rot: 18,  morph: 'incisor' },
  { n: 23, x: 314, y: 112, rot: 38,  morph: 'canine' },
  { n: 24, x: 342, y: 147, rot: 56,  morph: 'premolar' },
  { n: 25, x: 365, y: 186, rot: 68,  morph: 'premolar' },
  { n: 26, x: 386, y: 228, rot: 76,  morph: 'molar' },
  { n: 27, x: 401, y: 272, rot: 82,  morph: 'molar' },
  { n: 28, x: 412, y: 315, rot: 88,  morph: 'molar' },
]

const ANATOMICAL_LOWER_SLOTS: readonly AnatomicalSlot[] = [
  { n: 48, x: 94,  y: 385, rot: 88,  morph: 'molar' },
  { n: 47, x: 104, y: 428, rot: 82,  morph: 'molar' },
  { n: 46, x: 118, y: 472, rot: 76,  morph: 'molar' },
  { n: 45, x: 137, y: 514, rot: 68,  morph: 'premolar' },
  { n: 44, x: 160, y: 554, rot: 56,  morph: 'premolar' },
  { n: 43, x: 187, y: 589, rot: 38,  morph: 'canine' },
  { n: 42, x: 216, y: 618, rot: 18,  morph: 'incisor' },
  { n: 41, x: 240, y: 636, rot: 5,   morph: 'central_incisor' },
  { n: 31, x: 260, y: 636, rot: -5,  morph: 'central_incisor' },
  { n: 32, x: 284, y: 618, rot: -18, morph: 'incisor' },
  { n: 33, x: 313, y: 589, rot: -38, morph: 'canine' },
  { n: 34, x: 340, y: 554, rot: -56, morph: 'premolar' },
  { n: 35, x: 363, y: 514, rot: -68, morph: 'premolar' },
  { n: 36, x: 382, y: 472, rot: -76, morph: 'molar' },
  { n: 37, x: 396, y: 428, rot: -82, morph: 'molar' },
  { n: 38, x: 406, y: 385, rot: -88, morph: 'molar' },
]

// -------------------------------------------------------------
// Schematic Arch Layout (Optional secondary view)
// -------------------------------------------------------------
const CHART_CX = 450
const SLOT_W   = 50
const TOOTH_X  = Array.from({ length: 16 }, (_, i) => 75 + i * SLOT_W)
const UPPER_CY = 115
const UPPER_EY = 210
const LOWER_IY = 295
const LOWER_MY = 390

type SchematicSlot = { n: number; x: number; y: number }

function schematicSlotY(slotIndex: number, upper: boolean): number {
  const dx = TOOTH_X[slotIndex] - CHART_CX
  const t  = (dx / 375) ** 2
  return upper ? UPPER_CY + (UPPER_EY - UPPER_CY) * t : LOWER_IY + (LOWER_MY - LOWER_IY) * t
}

function layoutSchematicArch(teeth: readonly number[], upper: boolean): SchematicSlot[] {
  return teeth.map((n, i) => ({ n, x: TOOTH_X[i], y: schematicSlotY(i, upper) }))
}

function flipPathY(d: string): string {
  return d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) => `${x},${String(-parseFloat(y))}`)
}

function schematicCrownPath(n: number): string {
  const m = toothMorph(n)
  const isCentral = (n % 10) === 1
  let d: string
  switch (m) {
    case 'central_incisor':
    case 'incisor': {
      const w = isCentral ? 8.2 : 7.0
      d = `M ${-w},-15 C ${-w},-18 ${-w * 0.35},-19 0,-18.5 C ${w * 0.35},-19 ${w},-18 ${w},-15 C ${w},-8 ${w * 0.55},6 0,14 C ${-w * 0.55},6 ${-w},-8 ${-w},-15 Z`
      break
    }
    case 'canine':
      d = 'M -8.5,-14 C -9,-18 -4,-19.5 0,-18.5 C 5,-19.5 9.5,-15 9,-9 L 6,5 L 0,17 L -4,4 C -8.5,-2 -8.5,-8 -8.5,-14 Z'
      break
    case 'premolar':
      d = 'M -13,-12 C -13,-17 -7,-19.5 0,-18.8 C 7,-19.5 13,-17 13,-12 C 13,-5 11,2 7,9 C 4,15 0,17.5 -4,15 C -8,12 -11,5 -12.5,-2 C -13,-5 -13,-8 -13,-12 Z'
      break
    default:
      d = 'M -16,-11 C -17,-16 -9,-20 0,-19.2 C 9,-20 17,-16 16,-10 C 15.5,-4 14,4 11,11 C 8,16 4,18.5 0,18.2 C -4,18.5 -8,16 -11,11 C -14,4 -15.5,-4 -16,-11 Z'
  }
  return isUpperTooth(n) ? d : flipPathY(d)
}

function schematicGumPath(upper: boolean): string {
  const x0 = TOOTH_X[0]
  const x1 = TOOTH_X[15]
  const ey = upper ? UPPER_EY : LOWER_MY
  const cy = upper ? UPPER_CY : LOWER_IY
  const cp = 2 * cy - ey
  return `M ${x0},${ey} Q ${CHART_CX},${cp} ${x1},${ey}`
}

// -------------------------------------------------------------
// Occlusal Anatomy Crown Geometry
// -------------------------------------------------------------
function getOcclusalCrownPath(morph: Morph): string {
  switch (morph) {
    case 'molar':
      return 'M -14,-15 C -8,-16.5 8,-16.5 14,-15 C 17.5,-8 17.5,8 14,15 C 8,16.5 -8,16.5 -14,15 C -17.5,8 -17.5,-8 -14,-15 Z'
    case 'premolar':
      return 'M -11,-13 C -5,-14.5 5,-14.5 11,-13 C 15,-6 15,6 11,13 C 5,14.5 -5,14.5 -11,13 C -15,6 -15,-6 -11,-13 Z'
    case 'canine':
      return 'M -9,-12 C -3,-14.5 3,-14.5 9,-12 C 13,-4 13,5 9,13 C 2,15 -2,15 -9,13 C -13,5 -13,-4 -9,-12 Z'
    case 'central_incisor':
      return 'M -12,-9 C -5,-10.5 5,-10.5 12,-9 C 13.5,-3 13.5,3 12,9 C 5,10.5 -5,10.5 -12,9 C -13.5,3 -13.5,-3 -12,-9 Z'
    default:
      return 'M -10,-8 C -4,-9.5 4,-9.5 10,-8 C 11.5,-3 11.5,3 10,8 C 4,9.5 -4,9.5 -10,8 C -11.5,3 -11.5,-3 -10,-8 Z'
  }
}

function getOcclusalFissurePath(morph: Morph): string {
  switch (morph) {
    case 'molar':
      return 'M -8,-6 Q 0,0 8,-6 M 0,-8 L 0,8 M -7,7 Q 0,0 7,7'
    case 'premolar':
      return 'M -8,0 L 8,0 M 0,-4 L 0,4'
    case 'canine':
      return 'M 0,-7 L 0,7'
    case 'central_incisor':
      return 'M -8,0 L 8,0'
    default:
      return 'M -7,0 L 7,0'
  }
}

function getOcclusalBadgeRadius(morph: Morph): number {
  switch (morph) {
    case 'molar': return 9.2
    case 'premolar': return 8.6
    case 'canine': return 8.2
    case 'central_incisor': return 8.0
    default: return 7.6
  }
}

type Props = { patientId: number; patientName: string }

export function DentalChart({ patientId, patientName }: Props) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const push = useToastStore((s) => s.push)

  const [rows, setRows] = useState<TeethStatusRow[]>([])
  const [paint, setPaint] = useState<ToothClinicalStatus>('sound')
  const [viewMode, setViewMode] = useState<'anatomical' | 'schematic'>('anatomical')
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected tooth for side panel / direct inspection
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

  // Inline note state (right-click)
  const [noteTooth, setNoteTooth] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  // Full detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailTooth, setDetailTooth] = useState<number | null>(null)
  const [detailStatus, setDetailStatus] = useState<ToothClinicalStatus>('sound')
  const [detailNote, setDetailNote] = useState('')
  const [detailPrepDepth, setDetailPrepDepth] = useState('')
  const [invAdd, setInvAdd] = useState(false)
  const [invDesc, setInvDesc] = useState('')
  const [invPrice, setInvPrice] = useState('')
  const [detailBusy, setDetailBusy] = useState(false)

  const schematicUpperSlots = useMemo(() => layoutSchematicArch(FDI_ARCH_UPPER, true), [])
  const schematicLowerSlots = useMemo(() => layoutSchematicArch(FDI_ARCH_LOWER, false), [])

  const byTooth = useMemo(() => {
    const m = new Map<number, TeethStatusRow>()
    for (const r of rows) m.set(r.tooth_number, r)
    return m
  }, [rows])

  // Count by status for summary
  const statusCounts = useMemo(() => {
    const c: Record<ToothClinicalStatus, number> = {
      sound: 0,
      caries: 0,
      filled: 0,
      missing: 0,
      crown: 0,
      root_canal: 0,
      implant: 0,
      extraction_planned: 0,
    }
    const allTeeth = [...FDI_ARCH_UPPER, ...FDI_ARCH_LOWER]
    for (const n of allTeeth) {
      const st = (byTooth.get(n)?.status as ToothClinicalStatus) ?? 'sound'
      if (STATUSES.includes(st)) c[st]++
      else c.sound++
    }
    return c
  }, [byTooth])

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

  const handleSelectTooth = (n: number) => {
    setSelectedTooth(n)
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

  const openFullModalForTooth = (n: number) => {
    handleSelectTooth(n)
    setDetailModalOpen(true)
  }

  const closeToothDetail = () => {
    setSelectedTooth(null)
    setDetailTooth(null)
    setDetailModalOpen(false)
    setDetailPrepDepth('')
    setInvAdd(false)
    setInvDesc('')
    setInvPrice('')
  }

  // Quick paint or update status on click
  const quickApplyStatusToTooth = async (toothNumber: number, newStatus: ToothClinicalStatus) => {
    setError(null)
    try {
      const prev = byTooth.get(toothNumber)
      const row = await upsertTeethStatus(
        patientId,
        toothNumber,
        newStatus,
        prev?.notes ?? null,
        allowsPreparationDepth(newStatus) ? (prev?.preparation_depth_mm ?? null) : null,
      )
      setRows(prevRows => [...prevRows.filter(r => r.tooth_number !== toothNumber), row])
      setDetailStatus(newStatus)
      push(t('chart.toothSaved'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
      setDetailModalOpen(false)
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
      push(t('chart.toothSaved'), 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // Visual status shader resolver
  const getStatusStyling = (st: ToothClinicalStatus) => {
    switch (st) {
      case 'caries':
        return { fill: 'url(#enamelCaries)', stroke: '#b45309', badgeStroke: '#f59e0b', textFill: '#78350f' }
      case 'filled':
        return { fill: 'url(#enamelFilled)', stroke: '#0284c7', badgeStroke: '#38bdf8', textFill: '#0369a1' }
      case 'crown':
        return { fill: 'url(#enamelCrown)', stroke: '#7c3aed', badgeStroke: '#a855f7', textFill: '#6d28d9' }
      case 'root_canal':
        return { fill: 'url(#enamelRootCanal)', stroke: '#0891b2', badgeStroke: '#06b6d4', textFill: '#0e7490' }
      case 'implant':
        return { fill: 'url(#enamelImplant)', stroke: '#475569', badgeStroke: '#64748b', textFill: '#1e293b' }
      case 'missing':
        return { fill: 'url(#enamelMissing)', stroke: '#64748b', badgeStroke: '#94a3b8', textFill: '#64748b', isMissing: true }
      case 'extraction_planned':
        return { fill: 'url(#enamelExtraction)', stroke: '#e11d48', badgeStroke: '#f43f5e', textFill: '#be123c' }
      default:
        return { fill: 'url(#enamelRealistic)', stroke: '#b89b72', badgeStroke: '#cbd5e1', textFill: '#1e293b' }
    }
  }

  // -------------------------------------------------------------
  // Render Tooth Glyph: Anatomical Realistic
  // -------------------------------------------------------------
  const renderAnatomicalTooth = (slot: AnatomicalSlot) => {
    const row = byTooth.get(slot.n)
    const st = (row?.status ?? 'sound') as ToothClinicalStatus
    const hasNote = !!(row?.notes?.trim())
    const styling = getStatusStyling(st)
    const isSelected = selectedTooth === slot.n
    const crownPath = getOcclusalCrownPath(slot.morph)
    const fissurePath = getOcclusalFissurePath(slot.morph)
    const badgeR = getOcclusalBadgeRadius(slot.morph)

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault()
        handleSelectTooth(slot.n)
      }
    }

    return (
      <g
        key={slot.n}
        transform={`translate(${slot.x}, ${slot.y}) rotate(${slot.rot})`}
        className="cursor-pointer outline-none transition-all duration-150 ease-out hover:scale-[1.08] focus-visible:scale-[1.06]"
        role="button"
        tabIndex={0}
        aria-label={`FDI ${slot.n}, ${t(`chart.status.${st}`)}`}
        onClick={() => handleSelectTooth(slot.n)}
        onDoubleClick={() => openFullModalForTooth(slot.n)}
        onKeyDown={onKeyDown}
        onContextMenu={ev => {
          ev.preventDefault()
          setNoteTooth(slot.n)
          setNoteDraft(byTooth.get(slot.n)?.notes ?? '')
        }}
      >
        <title>{`${slot.n} — ${t(`chart.status.${st}`)}${row?.preparation_depth_mm ? ` (${row.preparation_depth_mm}mm)` : ''}`}</title>

        {/* Selected Highlight Ring */}
        {isSelected && (
          <path
            d={crownPath}
            fill="none"
            stroke="#0d9488"
            strokeWidth={4.5}
            transform="scale(1.22)"
            className="animate-pulse"
            opacity={0.9}
          />
        )}

        {/* Socket background recess / depth */}
        <path d={crownPath} fill="#991b1b" opacity={0.3} transform="scale(1.12)" />

        {/* Tooth Crown Body */}
        <path
          d={crownPath}
          fill={styling.fill}
          stroke={styling.stroke}
          strokeWidth={styling.isMissing ? 1.5 : 1.2}
          strokeDasharray={styling.isMissing ? '3.5 2.5' : undefined}
          filter="url(#toothShadow)"
          opacity={styling.isMissing ? 0.65 : 1}
        />

        {/* Subtle glossy crown highlight */}
        {!styling.isMissing && (
          <path d={crownPath} fill="url(#enamelGloss)" opacity={0.65} className="pointer-events-none" />
        )}

        {/* Occlusal Fissures */}
        {!styling.isMissing && (
          <path
            d={fissurePath}
            stroke={st === 'sound' ? '#a89078' : styling.stroke}
            strokeWidth={1.1}
            fill="none"
            opacity={0.5}
            strokeLinecap="round"
            className="pointer-events-none"
          />
        )}

        {/* Special visual indicators per status */}
        {st === 'root_canal' && (
          <circle cx={0} cy={0} r={badgeR + 2.5} fill="none" stroke="#06b6d4" strokeWidth={1.5} opacity={0.8} />
        )}
        {st === 'crown' && (
          <circle cx={0} cy={0} r={badgeR + 2.2} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.85} />
        )}
        {st === 'implant' && (
          <polygon points="-4,-4 0,-7 4,-4 4,4 0,7 -4,4" fill="none" stroke="#475569" strokeWidth={1.2} opacity={0.9} />
        )}

        {/* Note indicator dot */}
        {hasNote && (
          <circle
            cx={slot.morph === 'molar' ? 12 : 9}
            cy={-10}
            r={3.8}
            className="pointer-events-none fill-teal-500 stroke-white"
            strokeWidth={1.5}
          />
        )}

        {/* FDI Number Badge (Counter-rotated so text is always right-side up!) */}
        <g transform={`rotate(${-slot.rot})`} className="pointer-events-none">
          <circle
            cx={0}
            cy={0}
            r={badgeR}
            fill="#ffffff"
            stroke={isSelected ? '#0d9488' : styling.badgeStroke}
            strokeWidth={isSelected ? 1.8 : 1.2}
            filter="url(#badgeShadow)"
          />
          <circle cx={0} cy={0} r={badgeR - 1.5} fill="#f8fafc" opacity={0.9} />
          <text
            x={0}
            y={3.6}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight={800}
            fontSize={badgeR > 8.5 ? 11 : 10}
            fill={styling.textFill}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {slot.n}
          </text>
        </g>
      </g>
    )
  }

  // -------------------------------------------------------------
  // Render Tooth Glyph: Schematic View
  // -------------------------------------------------------------
  const renderSchematicTooth = (slot: SchematicSlot) => {
    const row = byTooth.get(slot.n)
    const st = (row?.status ?? 'sound') as ToothClinicalStatus
    const styling = getStatusStyling(st)
    const isSelected = selectedTooth === slot.n
    const d = schematicCrownPath(slot.n)
    const upper = isUpperTooth(slot.n)
    const badgeY = upper ? -28 : 28

    return (
      <g
        key={slot.n}
        transform={`translate(${slot.x},${slot.y})`}
        className="cursor-pointer outline-none transition-transform duration-150 ease-out hover:scale-[1.05]"
        role="button"
        tabIndex={0}
        onClick={() => handleSelectTooth(slot.n)}
        onDoubleClick={() => openFullModalForTooth(slot.n)}
      >
        <title>{`${slot.n} — ${t(`chart.status.${st}`)}`}</title>
        {isSelected && (
          <path d={d} fill="none" stroke="#0d9488" strokeWidth={4.5} className="animate-pulse" />
        )}
        <path
          d={d}
          fill={styling.fill}
          stroke={styling.stroke}
          strokeWidth={1.8}
          filter="url(#toothShadow)"
        />
        <g transform={`translate(0,${badgeY})`}>
          <rect
            x={-14} y={-9} width={28} height={18} rx={9}
            fill="#ffffff" stroke={isSelected ? '#0d9488' : '#cbd5e1'} strokeWidth={1.2}
          />
          <text
            x={0} y={1}
            textAnchor="middle" dominantBaseline="middle"
            fill={styling.textFill}
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            {slot.n}
          </text>
        </g>
      </g>
    )
  }

  const selectedRow = selectedTooth != null ? byTooth.get(selectedTooth) : null
  const selectedStatus = (selectedRow?.status as ToothClinicalStatus) ?? 'sound'

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-[75] bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <section
        id="patient-odontogram"
        className={
          isExpanded
            ? 'fixed inset-3 z-[80] overflow-y-auto rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl sm:inset-6 md:p-8'
            : 'da-card scroll-mt-24 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50'
        }
      >
        {/* Header & Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{t('chart.title')}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-600/20">
                <Sparkles className="size-3" aria-hidden />
                FDI ISO 3950
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('chart.archLegend')}</p>
          </div>

          {/* View mode toggle & Expand toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200/90 bg-slate-100/80 p-0.5 text-xs font-medium text-slate-600 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('anatomical')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  viewMode === 'anatomical'
                    ? 'bg-white font-semibold text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="size-3.5 text-teal-600" aria-hidden />
                {t('chart.viewModeAnatomical')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('schematic')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  viewMode === 'schematic'
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="size-3.5" aria-hidden />
                {t('chart.viewModeSchematic')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              title={isExpanded ? 'تصغير' : 'ملء الشاشة'}
            >
              {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              <span>{isExpanded ? (isArabic ? 'تصغير' : 'Collapse') : (isArabic ? 'ملء الشاشة' : 'Expand')}</span>
            </button>
          </div>
        </div>

        {/* Status palette bar (Quick Paint) */}
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2 shadow-inner">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('chart.palette')}</p>
            <span className="text-[11px] text-slate-400">
              {t('chart.hint')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
            {STATUSES.map(s => (
              <button
                key={s}
                type="button"
                title={t(`chart.status.${s}`)}
                onClick={() => {
                  setPaint(s)
                  if (selectedTooth != null) {
                    void quickApplyStatusToTooth(selectedTooth, s)
                  }
                }}
                className={`flex min-h-[3rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-center transition-all duration-150 ${
                  paint === s
                    ? 'border-teal-400 bg-white text-teal-900 shadow-sm ring-2 ring-teal-500/25'
                    : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className={`size-3 shrink-0 rounded-full border shadow-sm ${statusBadgeClasses(s)}`} aria-hidden />
                <span className="line-clamp-1 w-full text-[11px] font-semibold leading-snug">
                  {t(`chart.status.${s}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">{error}</p>}
        {loading && <p className="mt-3 text-xs text-slate-500">{t('common.loading')}</p>}

        {/* Main Interactive Stage: Side Action Panel + Central Anatomical Jaws */}
        <div className={`mt-6 flex flex-col gap-6 ${isExpanded ? 'lg:grid lg:grid-cols-12 lg:items-start' : '2xl:grid 2xl:grid-cols-12 2xl:items-start'}`}>
          {/* Left / Side Card: "نوع العمل لكل سن — اضغط لتحديد الحالة" (Matching the screenshot!) */}
          <div className={`${isExpanded ? 'lg:col-span-5' : '2xl:col-span-5'} w-full flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {t('chart.toothWorkTypeTitle')}
              </h3>
              {selectedTooth != null && (
                <button
                  type="button"
                  onClick={closeToothDetail}
                  className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  title={t('chart.clearSelection')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>

            {selectedTooth == null ? (
              /* When no tooth is selected yet (Matching screenshot state) */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-xs">
                  <Sparkles className="size-7" aria-hidden />
                </div>
                <p className="mt-4 max-w-[280px] text-xs leading-relaxed text-slate-500">
                  {t('chart.noToothSelected')}
                </p>
              </div>
            ) : (
              /* Selected Tooth Active Details */
              <div className="mt-4 space-y-4">
                {/* Tooth Banner Card */}
                <div className="rounded-xl border border-teal-100/90 bg-gradient-to-br from-teal-50/70 via-white to-slate-50/80 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-teal-600 px-2.5 py-0.5 text-xs font-black tracking-wide text-white shadow-2xs">
                        FDI {selectedTooth}
                      </span>
                      <span className="text-[11px] font-bold text-teal-800/80">
                        {isUpperTooth(selectedTooth) ? t('chart.upperArch') : t('chart.lowerArch')}
                      </span>
                    </div>
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold shadow-2xs ${statusBadgeClasses(selectedStatus)}`}>
                      {t(`chart.status.${selectedStatus}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-800 leading-snug">
                    {getToothAnatomicalName(selectedTooth, isArabic)}
                  </p>
                </div>

                {/* Quick Status Buttons (2-column responsive layout preventing overflow) */}
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-700">
                    {t('chart.palette')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDetailStatus(s)}
                        className={`flex min-h-[2.5rem] cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                          detailStatus === s
                            ? 'border-teal-500 bg-teal-50/90 text-teal-950 shadow-xs ring-2 ring-teal-500/20'
                            : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`size-2.5 shrink-0 rounded-full border shadow-2xs ${statusBadgeClasses(s)}`} />
                        <span className="truncate leading-tight">{t(`chart.status.${s}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preparation depth if applicable */}
                {allowsPreparationDepth(detailStatus) && (
                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{t('chart.prepDepthLabel')}</span>
                      <span className="text-[11px] font-normal text-slate-400">مم (0–25)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={detailPrepDepth}
                        onChange={(e) => setDetailPrepDepth(e.target.value)}
                        placeholder={t('chart.prepDepthPlaceholder')}
                        className="da-input font-mono text-xs tabular-nums !py-2"
                      />
                    </div>
                  </div>
                )}

                {/* Clinical note */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    {t('chart.clinicalNote')}
                  </label>
                  <textarea
                    value={detailNote}
                    onChange={e => setDetailNote(e.target.value)}
                    rows={2}
                    className="da-input min-h-[4.25rem] text-xs resize-none"
                    placeholder="اكتب ملاحظة للسن..."
                  />
                </div>

                {/* Add invoice line */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition-colors hover:bg-slate-50">
                  <label className="flex cursor-pointer items-center gap-2.5 select-none">
                    <input
                      type="checkbox"
                      checked={invAdd}
                      onChange={e => setInvAdd(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-bold text-slate-800">{t('chart.addInvoiceLine')}</span>
                  </label>
                  {invAdd && (
                    <div className="mt-3 grid gap-2 border-t border-slate-200/60 pt-3">
                      <input
                        value={invDesc}
                        onChange={e => setInvDesc(e.target.value)}
                        placeholder={t('invoices.lineDesc')}
                        className="da-input text-xs !py-1.5"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={invPrice}
                        onChange={e => setInvPrice(e.target.value)}
                        placeholder={t('invoices.linePrice')}
                        className="da-input font-mono text-xs tabular-nums !py-1.5"
                      />
                    </div>
                  )}
                </div>

                {/* Save / Apply Actions */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={detailBusy}
                    onClick={() => void saveToothDetail()}
                    className="da-btn-primary flex-1 justify-center !py-2.5 text-xs font-bold shadow-sm disabled:opacity-60"
                  >
                    {detailBusy ? t('common.loading') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={closeToothDetail}
                    className="da-btn-secondary !py-2.5 px-4 text-xs font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Center: The Upper and Lower Jaw Anatomical Dental Chart */}
        <div
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
          className={`${isExpanded ? 'lg:col-span-7' : '2xl:col-span-7'} w-full flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/30 to-white p-3 shadow-inner`}
        >
          {viewMode === 'anatomical' ? (
            /* =======================================================
               Realistic Anatomical Dual Jaw View (Matching screenshot!)
               ======================================================= */
            <svg
              viewBox="0 0 500 710"
              className="h-auto w-full max-w-[460px] select-none"
              preserveAspectRatio="xMidYMid meet"
              aria-label={t('chart.svgAria')}
              data-allow-contextmenu
            >
              <defs>
                {/* Palate Realistic Radial Gradient */}
                <radialGradient id="palateGrad" cx="50%" cy="38%" r="58%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="30%" stopColor="#f47280" />
                  <stop offset="65%" stopColor="#e05364" />
                  <stop offset="88%" stopColor="#c5384a" />
                  <stop offset="100%" stopColor="#a32837" />
                </radialGradient>

                {/* Upper Gingival Arch Realistic Gradient */}
                <radialGradient id="upperGumGrad" cx="50%" cy="25%" r="70%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="35%" stopColor="#f06877" />
                  <stop offset="70%" stopColor="#db4b5d" />
                  <stop offset="90%" stopColor="#be3244" />
                  <stop offset="100%" stopColor="#991f2f" />
                </radialGradient>

                {/* Lower Gingival Arch Gradient */}
                <radialGradient id="lowerGumGrad" cx="50%" cy="75%" r="70%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="35%" stopColor="#f06877" />
                  <stop offset="70%" stopColor="#db4b5d" />
                  <stop offset="90%" stopColor="#be3244" />
                  <stop offset="100%" stopColor="#991f2f" />
                </radialGradient>

                {/* Tongue 3D Gradient */}
                <radialGradient id="tongueGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fda4af" />
                  <stop offset="35%" stopColor="#f46f7f" />
                  <stop offset="75%" stopColor="#dc485c" />
                  <stop offset="95%" stopColor="#b92d3f" />
                  <stop offset="100%" stopColor="#941d2c" />
                </radialGradient>

                {/* Tooth Realistic Enamel Gradient */}
                <radialGradient id="enamelRealistic" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#fffef9" />
                  <stop offset="75%" stopColor="#fef8eb" />
                  <stop offset="92%" stopColor="#f5e6ce" />
                  <stop offset="100%" stopColor="#e4cfb0" />
                </radialGradient>

                {/* Clinical Status Gradients */}
                <radialGradient id="enamelCaries" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="45%" stopColor="#fef3c7" />
                  <stop offset="85%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#d97706" />
                </radialGradient>

                <radialGradient id="enamelFilled" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#f0f9ff" />
                  <stop offset="45%" stopColor="#bae6fd" />
                  <stop offset="85%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>

                <radialGradient id="enamelCrown" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#faf5ff" />
                  <stop offset="45%" stopColor="#ede9fe" />
                  <stop offset="85%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </radialGradient>

                <radialGradient id="enamelRootCanal" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ecfeff" />
                  <stop offset="45%" stopColor="#a5f3fc" />
                  <stop offset="85%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0891b2" />
                </radialGradient>

                <radialGradient id="enamelImplant" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="45%" stopColor="#e2e8f0" />
                  <stop offset="85%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#475569" />
                </radialGradient>

                <radialGradient id="enamelMissing" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                </radialGradient>

                <radialGradient id="enamelExtraction" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fff1f2" />
                  <stop offset="45%" stopColor="#fecdd3" />
                  <stop offset="85%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#e11d48" />
                </radialGradient>

                {/* Glossy Highlight Gradient */}
                <linearGradient id="enamelGloss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                <filter id="toothShadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#4c0519" floodOpacity="0.4" />
                </filter>

                <filter id="badgeShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#0f172a" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Arch Titles / Quadrants */}
              <text x="250" y="24" textAnchor="middle" fill="#64748b" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                {isArabic ? 'الفك العلوي • Maxilla' : 'Upper Arch • Maxilla'}
              </text>
              <text x="250" y="692" textAnchor="middle" fill="#64748b" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                {isArabic ? 'الفك السفلي • Mandible' : 'Lower Arch • Mandible'}
              </text>

              {/* Upper Outer Gums */}
              <path
                d="M 55,338 C 50,195 90,40 250,35 C 410,40 450,195 445,338 C 395,344 362,332 355,302 C 362,175 328,88 250,84 C 172,88 138,175 145,302 C 138,332 105,344 55,338 Z"
                fill="url(#upperGumGrad)"
                filter="url(#toothShadow)"
              />

              {/* Upper Hard Palate Dome (سقف الحلق) */}
              <path
                d="M 145,302 C 138,175 172,88 250,84 C 328,88 362,175 355,302 C 310,320 190,320 145,302 Z"
                fill="url(#palateGrad)"
              />

              {/* Palatine Rugae & Median Raphe */}
              <path d="M 250,92 L 250,285" stroke="#fecdd3" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <path d="M 250,92 L 250,285" stroke="#881337" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
              <ellipse cx="250" cy="90" rx="4.5" ry="6.5" fill="#fecdd3" stroke="#9f1239" strokeWidth="1" opacity="0.8" />

              <g stroke="#fecdd3" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55">
                <path d="M 248,110 C 230,108 205,116 185,120" />
                <path d="M 252,110 C 270,108 295,116 315,120" />
                <path d="M 248,134 C 226,131 195,143 170,148" />
                <path d="M 252,134 C 274,131 305,143 330,148" />
                <path d="M 248,162 C 222,159 188,174 160,181" />
                <path d="M 252,162 C 278,159 312,174 340,181" />
                <path d="M 248,194 C 220,193 180,209 155,218" />
                <path d="M 252,194 C 280,193 320,209 345,218" />
              </g>
              <g stroke="#881337" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.25">
                <path d="M 248,111 C 230,109 205,117 185,121" />
                <path d="M 252,111 C 270,109 295,117 315,121" />
                <path d="M 248,135 C 226,132 195,144 170,149" />
                <path d="M 252,135 C 274,132 305,144 330,149" />
                <path d="M 248,163 C 222,160 188,175 160,182" />
                <path d="M 252,163 C 278,160 312,175 340,182" />
                <path d="M 248,195 C 220,194 180,210 155,219" />
                <path d="M 252,195 C 280,194 320,210 345,219" />
              </g>

              {/* Lower Outer Gums */}
              <path
                d="M 60,362 C 55,505 95,660 250,665 C 405,660 445,505 440,362 C 390,356 358,368 350,398 C 358,525 322,612 250,616 C 178,612 142,525 150,398 C 142,368 110,356 60,362 Z"
                fill="url(#lowerGumGrad)"
                filter="url(#toothShadow)"
              />

              {/* Lower Anatomical Tongue (اللسان) */}
              <path
                d="M 158,394 C 172,368 212,352 250,352 C 288,352 328,368 342,394 C 358,446 358,546 332,586 C 296,610 204,610 168,586 C 142,546 142,446 158,394 Z"
                fill="url(#tongueGrad)"
                filter="url(#toothShadow)"
              />

              {/* Tongue Median Sulcus & 3D Contours */}
              <path d="M 250,362 C 250,420 250,510 250,578" stroke="#881337" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              <path d="M 250.8,362 C 250.8,420 250.8,510 250.8,578" stroke="#fecdd3" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

              <path d="M 198,426 C 224,410 276,410 302,426" stroke="#fecdd3" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
              <path d="M 188,468 C 218,452 282,452 312,468" stroke="#fecdd3" strokeWidth="2.5" fill="none" opacity="0.35" strokeLinecap="round" />
              <path d="M 182,512 C 215,496 285,496 318,512" stroke="#fecdd3" strokeWidth="2.5" fill="none" opacity="0.3" strokeLinecap="round" />

              {/* Upper Teeth Group */}
              <g>{ANATOMICAL_UPPER_SLOTS.map(s => renderAnatomicalTooth(s))}</g>

              {/* Lower Teeth Group */}
              <g>{ANATOMICAL_LOWER_SLOTS.map(s => renderAnatomicalTooth(s))}</g>
            </svg>
          ) : (
            /* =======================================================
               Classic Schematic Parabolic Arch View
               ======================================================= */
            <svg
              viewBox="0 0 900 510"
              className="h-auto w-full select-none"
              style={{ minHeight: 320, maxHeight: 'min(70vh, 580px)' }}
              preserveAspectRatio="xMidYMid meet"
              aria-label={t('chart.svgAria')}
            >
              <defs>
                <linearGradient id="gumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fdf2f8" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#fbcfe8" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#fdf2f8" stopOpacity={0.4} />
                </linearGradient>
              </defs>

              <text x="450" y="44" textAnchor="middle" className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                {t('chart.upperArch')}
              </text>
              <text x="450" y="470" textAnchor="middle" className="fill-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                {t('chart.lowerArch')}
              </text>

              <path d={schematicGumPath(true)} fill="none" stroke="url(#gumGrad)" strokeWidth={24} strokeLinecap="round" />
              <g>{schematicUpperSlots.map(s => renderSchematicTooth(s))}</g>

              <line x1="450" y1="220" x2="450" y2="282" stroke="#cbd5e1" strokeWidth={1.2} strokeDasharray="5 6" />

              <path d={schematicGumPath(false)} fill="none" stroke="url(#gumGrad)" strokeWidth={24} strokeLinecap="round" />
              <g>{schematicLowerSlots.map(s => renderSchematicTooth(s))}</g>
            </svg>
          )}
        </div>
      </div>

      {/* Clinical Status Legend & Tooth Counts */}
      <div className="mt-6 border-t border-slate-100 bg-slate-50/70 p-4 rounded-2xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('chart.legendCaption')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {STATUSES.map(s => {
            const count = statusCounts[s]
            return (
              <div
                key={s}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-sm"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={`size-3 shrink-0 rounded-full border ${statusBadgeClasses(s)}`} aria-hidden />
                  <span className="truncate text-[11px] font-semibold text-slate-700">
                    {t(`chart.status.${s}`)}
                  </span>
                </div>
                {count > 0 && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Edit Modal (if explicitly opened or double-clicked) */}
      {detailModalOpen && detailTooth != null && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="thin-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('chart.toothModalTitle', { tooth: detailTooth })}
            </h3>
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
                <textarea
                  value={detailNote}
                  onChange={e => setDetailNote(e.target.value)}
                  rows={3}
                  className="da-input min-h-[5rem] cursor-text text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input type="checkbox" checked={invAdd} onChange={e => setInvAdd(e.target.checked)} />
                {t('chart.addInvoiceLine')}
              </label>
              {invAdd && (
                <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                    {t('invoices.lineDesc')}
                    <input
                      value={invDesc}
                      onChange={e => setInvDesc(e.target.value)}
                      className="da-input cursor-text text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                    {t('invoices.linePrice')}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={invPrice}
                      onChange={e => setInvPrice(e.target.value)}
                      className="da-input cursor-text font-mono text-sm tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeToothDetail}
                className="da-btn-secondary !px-5 !py-2.5"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={detailBusy}
                onClick={() => void saveToothDetail()}
                className="da-btn-primary !px-5 !py-2.5 disabled:opacity-60"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click quick note editor */}
      {noteTooth != null && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{t('chart.noteFor', { tooth: noteTooth })}</p>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            rows={3}
            className="da-input mt-3 min-h-[5rem] cursor-text"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveNote()}
              className="da-btn-primary !px-5 !py-2.5"
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => { setNoteTooth(null); setNoteDraft('') }}
              className="da-btn-secondary !px-5 !py-2.5"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  </>
)
}
