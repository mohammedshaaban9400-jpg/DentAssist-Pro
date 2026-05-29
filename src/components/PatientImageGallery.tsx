import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { Camera, Trash2, X } from 'lucide-react'
import type { PatientImageRow } from '@/types/clinical'
import {
  createPatientImage,
  deletePatientImage,
  listPatientImages,
  readUserDataFileDataUrl,
  savePatientImageFile,
} from '@/services/dbService'
import { useToastStore } from '@/stores/toastStore'
import { useConfirm } from '@/hooks/useConfirm'

type Props = {
  patientId: number
}

export function PatientImageGallery({ patientId }: Props) {
  const { t, i18n } = useTranslation()
  const loc = i18n.language === 'ar' ? arSA : enUS
  const push = useToastStore((s) => s.push)
  const { confirm, confirmModal } = useConfirm()
  const [rows, setRows] = useState<PatientImageRow[]>([])
  const [urls, setUrls] = useState<Record<number, string>>({})
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<PatientImageRow | null>(null)
  const [imgType, setImgType] = useState<'before' | 'after'>('before')
  const [tooth, setTooth] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listPatientImages(patientId)
      setRows(list)
      const next: Record<number, string> = {}
      for (const r of list) {
        try {
          next[r.id] = await readUserDataFileDataUrl(r.image_path)
        } catch {
          next[r.id] = ''
        }
      }
      setUrls(next)
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [patientId, push])

  useEffect(() => {
    void load()
  }, [load])

  const onPickFile = async (file: File | null) => {
    if (!file) return
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      push(t('patientImages.badType'), 'error')
      return
    }
    setUploading(true)
    try {
      const buf = await file.arrayBuffer()
      const rel = await savePatientImageFile(patientId, buf, ext)
      await createPatientImage({
        patientId,
        imagePath: rel,
        type: imgType,
        date: new Date().toISOString(),
        notes: notes.trim() || null,
        toothNumber: tooth.trim() ? Number(tooth) : null,
      })
      setNotes('')
      setTooth('')
      push(t('patientImages.saved'), 'success')
      await load()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id: number) => {
    if (!await confirm(t('patientImages.confirmDelete'))) return
    try {
      await deletePatientImage(id)
      push(t('patientImages.deleted'), 'success')
      await load()
    } catch (e) {
      push(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('patientImages.title')}</h2>
          <p className="text-sm text-slate-600">{t('patientImages.subtitle')}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50">
          <Camera className="size-4" aria-hidden />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          {uploading ? t('common.loading') : t('patientImages.upload')}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          {t('patientImages.type')}
          <select
            value={imgType}
            onChange={(e) => setImgType(e.target.value as 'before' | 'after')}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="before">{t('patientImages.before')}</option>
            <option value="after">{t('patientImages.after')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          {t('patientImages.toothOptional')}
          <input
            value={tooth}
            onChange={(e) => setTooth(e.target.value)}
            placeholder="FDI"
            className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="min-w-[12rem] flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
          {t('patientImages.notesOptional')}
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">{t('patientImages.empty')}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setLightbox(r)}
                className="block w-full text-start"
              >
                {urls[r.id] && !failedIds.has(r.id) ? (
                  <img
                    src={urls[r.id]}
                    alt=""
                    className="aspect-square w-full object-cover"
                    onError={() =>
                      setFailedIds((prev) => { const next = new Set(prev); next.add(r.id); return next })
                    }
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-400">
                    {t('patientImages.noPreview')}
                  </div>
                )}
              </button>
              <div className="border-t border-slate-200 bg-white p-2 text-xs text-slate-700">
                <span className="font-semibold text-teal-800">
                  {r.type === 'before' ? t('patientImages.before') : t('patientImages.after')}
                </span>
                {r.tooth_number != null ? (
                  <span className="ms-1 text-slate-500">· {r.tooth_number}</span>
                ) : null}
                <p className="text-slate-500">{format(parseISO(r.date), 'PP', { locale: loc })}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(r.id)}
                className="absolute end-1 top-1 rounded-lg bg-white/90 p-1.5 text-rose-600 shadow hover:bg-rose-50"
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute end-3 top-3 rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
              aria-label={t('common.close')}
            >
              <X className="size-5" />
            </button>
            {urls[lightbox.id] ? (
              <img
                src={urls[lightbox.id]}
                alt=""
                className="max-h-[75vh] w-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : null}
            <p className="mt-3 text-sm text-slate-600">{lightbox.notes}</p>
          </div>
        </div>
      ) : null}
      {confirmModal}
    </section>
  )
}
