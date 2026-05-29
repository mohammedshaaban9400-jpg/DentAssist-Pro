-- DentAssist Pro - Admin helper functions for license operations
-- Run after:
--   1) PAYMENT_REQUESTS_HARDENING.sql
--   2) PAYMENT_REQUESTS_ADMIN_VIEWS.sql (optional but recommended)

BEGIN;

-- Activate a pending/rejected request for one year.
CREATE OR REPLACE FUNCTION public.activate_for_one_year(
  p_machine_id TEXT,
  p_ref_id TEXT,
  p_activated_by TEXT DEFAULT 'owner',
  p_note TEXT DEFAULT 'Verified and activated (1 year)'
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.payment_requests;
BEGIN
  UPDATE public.payment_requests
  SET
    status = 'active',
    expires_at = now() + interval '1 year',
    activated_at = now(),
    activated_by = COALESCE(NULLIF(trim(p_activated_by), ''), 'owner'),
    notes = COALESCE(NULLIF(trim(p_note), ''), notes)
  WHERE machine_id = trim(p_machine_id)
    AND ref_id = trim(p_ref_id)
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No request found for machine_id=% and ref_id=%', p_machine_id, p_ref_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Renew an existing request for one more year.
-- If still valid, extends from current expiry.
-- If expired or missing expiry, extends from now.
CREATE OR REPLACE FUNCTION public.renew_for_one_year(
  p_machine_id TEXT,
  p_ref_id TEXT,
  p_activated_by TEXT DEFAULT 'owner',
  p_note TEXT DEFAULT 'Annual renewal (+1 year)'
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.payment_requests;
BEGIN
  UPDATE public.payment_requests
  SET
    status = 'active',
    expires_at = GREATEST(COALESCE(expires_at, now()), now()) + interval '1 year',
    activated_at = now(),
    activated_by = COALESCE(NULLIF(trim(p_activated_by), ''), 'owner'),
    notes = COALESCE(NULLIF(trim(p_note), ''), notes)
  WHERE machine_id = trim(p_machine_id)
    AND ref_id = trim(p_ref_id)
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No request found for machine_id=% and ref_id=%', p_machine_id, p_ref_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Reject a request (keeps audit data).
CREATE OR REPLACE FUNCTION public.reject_request(
  p_machine_id TEXT,
  p_ref_id TEXT,
  p_rejected_by TEXT DEFAULT 'owner',
  p_note TEXT DEFAULT 'Rejected after review'
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.payment_requests;
BEGIN
  UPDATE public.payment_requests
  SET
    status = 'rejected',
    notes = COALESCE(NULLIF(trim(p_note), ''), notes),
    activated_by = COALESCE(NULLIF(trim(p_rejected_by), ''), activated_by)
  WHERE machine_id = trim(p_machine_id)
    AND ref_id = trim(p_ref_id)
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No request found for machine_id=% and ref_id=%', p_machine_id, p_ref_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Optional: lock down public execute and grant only to service roles/admin roles you use.
-- REVOKE ALL ON FUNCTION public.activate_for_one_year(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
-- REVOKE ALL ON FUNCTION public.renew_for_one_year(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
-- REVOKE ALL ON FUNCTION public.reject_request(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

COMMIT;

-- Usage examples:
-- SELECT * FROM public.activate_for_one_year('DEVICE_MACHINE_ID', 'TRANSFER_REFERENCE_ID', 'owner', 'Paid via Sham Cash');
-- SELECT * FROM public.renew_for_one_year('DEVICE_MACHINE_ID', 'TRANSFER_REFERENCE_ID', 'owner', 'Renewal paid');
-- SELECT * FROM public.reject_request('DEVICE_MACHINE_ID', 'TRANSFER_REFERENCE_ID', 'owner', 'Reference mismatch');
