import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Loader2, Phone, ShieldCheck } from 'lucide-react'
import { getSupabase } from '@/lib/supabaseClient'
import { getMachineId, openExternalUrl, setLicenseActive } from '@/services/dbService'
import { useLicenseStore } from '@/stores/licenseStore'
import { WindowTitleBar } from '@/components/WindowTitleBar'
import { defaultAppLogoSrc } from '@/lib/appBrand'

const DEVELOPER_PHONE = '00963981061026'
const DEVELOPER_NAME_AR = 'م. محمد شعبان ريمه'
const DEVELOPER_NAME_EN = 'Eng. Muhammad Sha\'ban Rima'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
      title="نسخ"
    >
      {copied
        ? <span className="text-[10px] font-bold text-emerald-600">✓</span>
        : <Copy className="size-3.5" />
      }
    </button>
  )
}

export function ActivationScreen() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const refresh = useLicenseStore((s) => s.refresh)
  const machineId = useLicenseStore((s) => s.machineId)
  const activationHintKey = useLicenseStore((s) => s.activationHintKey)
  const [deviceIdInput, setDeviceIdInput] = useState('')
  const [refId, setRefId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const isUnexpired = (expiresAt: string | null | undefined): boolean => {
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() > Date.now()
  }

  const startPoll = (mid: string, ref: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    stopPoll()
    pollRef.current = setInterval(async () => {
      const { data, error: qErr } = await supabase
        .from('payment_requests')
        .select('status, expires_at')
        .eq('machine_id', mid)
        .eq('ref_id', ref)
        .maybeSingle()
      if (qErr) { setError(qErr.message); stopPoll(); setBusy(false); return }
      if (data?.status === 'active' && isUnexpired(data.expires_at)) {
        stopPoll()
        await setLicenseActive()
        setMessage(t('activation.success'))
        setBusy(false)
        await refresh()
      }
    }, 4000)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setMessage(null)
    const supabase = getSupabase()
    if (!supabase) { setError(t('activation.missingSupabase')); return }
    const trimmed = refId.trim()
    if (!trimmed) { setError(t('activation.refPlaceholder')); return }
    setBusy(true)
    const mid = deviceIdInput.trim() || machineId || (await getMachineId())
    if (!mid.trim()) { setBusy(false); setError(t('activation.deviceRequired')); return }
    const { data: existing, error: existingErr } = await supabase
      .from('payment_requests')
      .select('status, expires_at')
      .eq('machine_id', mid)
      .eq('ref_id', trimmed)
      .maybeSingle()
    if (existingErr) { setBusy(false); setError(existingErr.message); return }

    if (existing?.status === 'active' && isUnexpired(existing.expires_at)) {
      await setLicenseActive()
      setMessage(t('activation.alreadyActive'))
      setBusy(false)
      await refresh()
      return
    }
    if (existing?.status === 'pending') {
      setMessage(t('activation.alreadyPending'))
      startPoll(mid, trimmed)
      return
    }
    if (existing?.status === 'rejected') {
      setBusy(false)
      setError(t('activation.rejected'))
      return
    }

    const { error: insErr } = await supabase.from('payment_requests').insert({
      machine_id: mid,
      ref_id: trimmed,
      status: 'pending',
    })
    if (insErr) { setBusy(false); setError(insErr.message); return }
    setMessage(t('activation.polling'))
    startPoll(mid, trimmed)
  }

  const sendToDeveloper = async () => {
    setError(null)
    const trimmedRef = refId.trim()
    if (!trimmedRef) { setError(t('activation.refRequiredForSend')); return }
    const mid = deviceIdInput.trim() || machineId || (await getMachineId())
    if (!mid.trim()) { setError(t('activation.deviceRequired')); return }
    const waPhone = DEVELOPER_PHONE.replace(/^\+/, '').replace(/^00/, '')
    const body = isAr
      ? `طلب تفعيل جديد\nمعرف الجهاز: ${mid}\nرقم العملية: ${trimmedRef}`
      : `New activation request\nMachine ID: ${mid}\nTransaction Reference: ${trimmedRef}`
    const ok = await openExternalUrl(`https://wa.me/${waPhone}?text=${encodeURIComponent(body)}`)
    if (!ok) setError(t('activation.contactOpenFailed'))
  }

  return (
    <div className="flex min-h-full flex-col" style={{ background: '#f0f4f8' }}>
      <WindowTitleBar />
      <div className="flex flex-1 cursor-default items-center justify-center p-6 md:p-10">
        <div
          className="w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl"
          style={{ background: 'white' }}
        >
          <div className="grid md:grid-cols-2">

            {/* ── Left panel: dark gradient branding ── */}
            <div
              className="flex flex-col gap-6 p-8 md:p-10"
              style={{ background: 'linear-gradient(160deg, #0d1424 0%, #0f2027 50%, #0d9488 150%)' }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={defaultAppLogoSrc()}
                    alt="DentAssist"
                    className="size-11 object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">DentAssist</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#14b8a6' }}>Pro</p>
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">{t('activation.title')}</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{t('activation.subtitle')}</p>
                <div
                  className="mt-4 max-w-full rounded-xl px-4 py-3"
                  style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(45,212,191,0.35)' }}
                >
                  <p className="text-base font-bold leading-snug text-white">{t('activation.annualPrice')}</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {[
                  isAr ? 'اسكن QR أو انسخ رقم شام كاش' : 'Scan QR or copy the Sham Cash number',
                  isAr ? 'أرسل المبلغ مع رقم الجهاز' : 'Send payment with your machine ID',
                  isAr ? 'أدخل رقم الحوالة وانقر تفعيل' : 'Enter the transfer reference & activate',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: 'rgba(20,184,166,0.25)', border: '1px solid rgba(20,184,166,0.4)' }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-xs text-white/70">{step}</p>
                  </div>
                ))}
              </div>

              {/* Machine ID */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-xs font-semibold text-white/50">{t('activation.machine')}</p>
                <div className="mt-2 flex items-start gap-2">
                  <p className="flex-1 break-all font-mono text-[11px] text-white/80">{machineId}</p>
                  <CopyButton text={machineId ?? ''} />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">{t('activation.hint')}</p>
              </div>

              {/* Developer info */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#14b8a6' }}>
                  {isAr ? 'تواصل مع المطور' : 'Contact Developer'}
                </p>
                <p className="text-sm font-bold text-white">
                  {isAr ? DEVELOPER_NAME_AR : DEVELOPER_NAME_EN}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" style={{ color: '#14b8a6' }} />
                  <span className="font-mono text-xs text-white/80 tabular-nums">{DEVELOPER_PHONE}</span>
                  <CopyButton text={DEVELOPER_PHONE} />
                </div>
              </div>
            </div>

            {/* ── Right panel: QR + form ── */}
            <div className="flex flex-col gap-6 p-8 md:p-10">
              {activationHintKey ? (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
                  role="status"
                >
                  {t(activationHintKey)}
                </div>
              ) : (
                <div
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800"
                  role="status"
                >
                  {t('trial.expired')}
                </div>
              )}

              {/* QR Code */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isAr ? 'ادفع عبر شام كاش' : 'Pay via Sham Cash'}
                </p>
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}shamcash-qr.png`}
                    alt="Sham Cash QR"
                    className="mx-auto block max-h-56 w-auto object-contain p-4"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div
                    className="border-t px-4 py-3 text-center"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {isAr ? 'عنوان الحساب' : 'Account Address'}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 tabular-nums break-all">
                        fcf8cfe6f4d23d39cd1b452f8b83776a
                      </span>
                      <CopyButton text="fcf8cfe6f4d23d39cd1b452f8b83776a" />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-700 tabular-nums">{DEVELOPER_PHONE}</span>
                      <CopyButton text={DEVELOPER_PHONE} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isAr ? DEVELOPER_NAME_AR : DEVELOPER_NAME_EN}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isAr ? 'بعد الدفع' : 'After Payment'}
                  </p>
                  <label className="mb-3 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    {t('activation.deviceFieldLabel')}
                    <input
                      value={deviceIdInput || machineId || ''}
                      onChange={(ev) => setDeviceIdInput(ev.target.value)}
                      className="da-input cursor-text font-mono text-xs"
                      autoComplete="off"
                      placeholder={t('activation.deviceFieldPlaceholder')}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    {t('activation.refLabel')}
                    <input
                      value={refId}
                      onChange={(ev) => setRefId(ev.target.value)}
                      className="da-input cursor-text"
                      autoComplete="off"
                      placeholder={t('activation.refPlaceholder')}
                    />
                  </label>
                </div>

                {error ? (
                  <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
                ) : null}
                {message ? (
                  <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" />}
                  {t('activation.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => void sendToDeveloper()}
                  disabled={busy}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-300 bg-white py-3 text-sm font-bold text-teal-700 shadow-sm transition-all hover:bg-teal-50 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                >
                  <Phone className="size-4" />
                  {t('activation.sendToDeveloper')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
