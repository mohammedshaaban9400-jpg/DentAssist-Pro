-- DentAssist Pro - Admin monitoring views for annual subscriptions
-- Run after PAYMENT_REQUESTS_HARDENING.sql

BEGIN;

-- Active devices (currently valid subscriptions)
CREATE OR REPLACE VIEW public.v_active_devices AS
SELECT
  id,
  machine_id,
  ref_id,
  status,
  expires_at,
  activated_at,
  activated_by,
  notes,
  created_at,
  updated_at
FROM public.payment_requests
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at > now()
ORDER BY expires_at ASC;

-- Devices expiring in the next 14 days
CREATE OR REPLACE VIEW public.v_expiring_soon AS
SELECT
  id,
  machine_id,
  ref_id,
  status,
  expires_at,
  activated_at,
  activated_by,
  notes,
  created_at,
  updated_at,
  (expires_at::date - now()::date) AS days_left
FROM public.payment_requests
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at > now()
  AND expires_at <= (now() + interval '14 days')
ORDER BY expires_at ASC;

-- Expired devices (active flag exists, but subscription period ended)
CREATE OR REPLACE VIEW public.v_expired_devices AS
SELECT
  id,
  machine_id,
  ref_id,
  status,
  expires_at,
  activated_at,
  activated_by,
  notes,
  created_at,
  updated_at
FROM public.payment_requests
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at <= now()
ORDER BY expires_at DESC;

-- Pending payment requests waiting for owner review
CREATE OR REPLACE VIEW public.v_pending_activation_requests AS
SELECT
  id,
  machine_id,
  ref_id,
  status,
  notes,
  created_at,
  updated_at
FROM public.payment_requests
WHERE status = 'pending'
ORDER BY created_at DESC;

COMMIT;

-- Quick usage:
-- SELECT * FROM public.v_active_devices;
-- SELECT * FROM public.v_expiring_soon;
-- SELECT * FROM public.v_expired_devices;
-- SELECT * FROM public.v_pending_activation_requests;
