-- DentAssist Pro - Supabase payment activation hardening (annual subscription)
-- Run this script in Supabase SQL Editor.
-- It upgrades `payment_requests` to support stronger auditability and duplicate protection.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id            BIGSERIAL PRIMARY KEY,
  machine_id    TEXT        NOT NULL,
  ref_id        TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  activated_at  TIMESTAMPTZ,
  activated_by  TEXT,
  notes         TEXT
);

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Annual-license integrity:
-- Any active row must have a future/past expiry timestamp recorded.
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_active_requires_expiry;
ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_active_requires_expiry
  CHECK (status <> 'active' OR expires_at IS NOT NULL);

-- Prevent duplicate requests for the same machine + transfer reference.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_machine_ref
  ON public.payment_requests (machine_id, ref_id);

-- Fast checks for active, unexpired licenses by machine id.
CREATE INDEX IF NOT EXISTS idx_payment_requests_machine_status_expires
  ON public.payment_requests (machine_id, status, expires_at DESC);

-- Keep updated_at fresh on each row update.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER trg_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Remove previous broad policies if they exist.
DROP POLICY IF EXISTS "allow_insert" ON public.payment_requests;
DROP POLICY IF EXISTS "allow_select_own" ON public.payment_requests;
DROP POLICY IF EXISTS "anon_insert_only" ON public.payment_requests;
DROP POLICY IF EXISTS "anon_select_for_polling" ON public.payment_requests;

-- App side: allow creating pending requests only.
CREATE POLICY "anon_insert_only"
ON public.payment_requests
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- App side: allow select for polling.
-- NOTE: without authenticated users, this is limited but not identity-strong.
-- It is still safe as long as anon has NO UPDATE/DELETE policies.
CREATE POLICY "anon_select_for_polling"
ON public.payment_requests
FOR SELECT
TO anon
USING (true);

-- No anon UPDATE/DELETE policy on purpose.
-- Activation must be done by owner/admin only (Dashboard SQL or service_role).

COMMIT;

-- Example owner-only annual activation statement (1 year):
-- UPDATE public.payment_requests
-- SET status = 'active',
--     expires_at = now() + interval '1 year',
--     notes = 'Verified and activated',
--     activated_at = now(),
--     activated_by = 'owner'
-- WHERE machine_id = 'DEVICE_MACHINE_ID'
--   AND ref_id = 'TRANSFER_REFERENCE_ID';

-- Example owner-only annual renewal statement (extends from current expiry if still active):
-- UPDATE public.payment_requests
-- SET status = 'active',
--     expires_at = GREATEST(COALESCE(expires_at, now()), now()) + interval '1 year',
--     notes = 'Annual renewal',
--     activated_at = now(),
--     activated_by = 'owner'
-- WHERE machine_id = 'DEVICE_MACHINE_ID'
--   AND ref_id = 'TRANSFER_REFERENCE_ID';
