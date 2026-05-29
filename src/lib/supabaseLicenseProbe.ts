import { getSupabase } from '@/lib/supabaseClient'

export type LicenseProbeResult =
  | {
      ok: true
      serverNowMs: number
      trialEndsAtMs: number
      trialValid: boolean
    }
  | { ok: false; error: 'no_client' | 'rpc_failed'; message?: string }

/** Max allowed difference between device clock and Postgres `now()` (ms). */
export const LICENSE_CLOCK_SKEW_MS = 5 * 60 * 1000

export async function fetchLicenseProbe(
  machineId: string,
  firstLaunchIso: string | null,
): Promise<LicenseProbeResult> {
  const supabase = getSupabase()
  if (!supabase || !machineId.trim()) return { ok: false, error: 'no_client' }

  const { data, error } = await supabase.rpc('app_license_probe', {
    p_machine_id: machineId.trim(),
    p_first_launch_iso: firstLaunchIso ?? null,
  })

  if (error) return { ok: false, error: 'rpc_failed', message: error.message }

  const row = data as Record<string, unknown> | null
  if (!row || row.ok === false) {
    const err = typeof row?.error === 'string' ? row.error : 'rpc_failed'
    return { ok: false, error: 'rpc_failed', message: err }
  }

  const serverNow = new Date(String(row.server_now)).getTime()
  const trialEnds = new Date(String(row.trial_ends_at)).getTime()
  if (!Number.isFinite(serverNow) || !Number.isFinite(trialEnds)) {
    return { ok: false, error: 'rpc_failed', message: 'invalid_payload' }
  }

  return {
    ok: true,
    serverNowMs: serverNow,
    trialEndsAtMs: trialEnds,
    trialValid: Boolean(row.trial_valid),
  }
}

export function isClockSkewed(serverNowMs: number, localNowMs: number, maxSkewMs: number): boolean {
  return Math.abs(serverNowMs - localNowMs) > maxSkewMs
}
