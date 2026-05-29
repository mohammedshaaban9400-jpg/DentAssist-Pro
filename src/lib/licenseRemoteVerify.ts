import { getSupabase } from '@/lib/supabaseClient'

/** Confirmed paid/active row exists for this device and is not expired. */
export type RemoteLicenseResult = 'active' | 'inactive' | 'unavailable'

/**
 * Checks Supabase for an approved payment tied to this machine.
 * `unavailable`: missing env, network/RLS errors — caller should keep last known local state.
 */
export async function checkRemoteLicenseActive(
  machineId: string,
  serverNowIso?: string,
): Promise<RemoteLicenseResult> {
  const supabase = getSupabase()
  if (!supabase || !machineId.trim()) return 'unavailable'
  const nowIso =
    serverNowIso && Number.isFinite(Date.parse(serverNowIso))
      ? new Date(serverNowIso).toISOString()
      : new Date().toISOString()

  const { data, error } = await supabase
    .from('payment_requests')
    .select('id')
    .eq('machine_id', machineId.trim())
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .limit(1)

  if (error) return 'unavailable'
  if (data && data.length > 0) return 'active'
  return 'inactive'
}
