-- DentAssist Pro - Daily operations helper queries
-- Run after:
--   1) PAYMENT_REQUESTS_HARDENING.sql
--   2) PAYMENT_REQUESTS_ADMIN_VIEWS.sql
--   3) PAYMENT_REQUESTS_ADMIN_FUNCTIONS.sql
--
-- This file is designed for quick copy/paste daily work.

-- =========================================================
-- 1) DAILY DASHBOARD QUERIES
-- =========================================================

-- Pending requests (newest first)
SELECT * FROM public.v_pending_activation_requests;

-- Active devices (soonest expiry first)
SELECT * FROM public.v_active_devices;

-- Expiring within 14 days
SELECT * FROM public.v_expiring_soon;

-- Expired devices
SELECT * FROM public.v_expired_devices;


-- =========================================================
-- 2) SEARCH HELPERS
-- =========================================================

-- Search by machine id (partial match)
-- Replace: MACHINE_PART
SELECT
  id, machine_id, ref_id, status, expires_at, activated_at, activated_by, notes, created_at, updated_at
FROM public.payment_requests
WHERE machine_id ILIKE '%' || 'MACHINE_PART' || '%'
ORDER BY created_at DESC;

-- Search by transfer reference id (partial match)
-- Replace: REF_PART
SELECT
  id, machine_id, ref_id, status, expires_at, activated_at, activated_by, notes, created_at, updated_at
FROM public.payment_requests
WHERE ref_id ILIKE '%' || 'REF_PART' || '%'
ORDER BY created_at DESC;


-- =========================================================
-- 3) ADMIN ACTIONS (SAFE WRAPPERS)
-- =========================================================

-- Activate one year
-- Replace values:
--   DEVICE_MACHINE_ID
--   TRANSFER_REFERENCE_ID
SELECT * FROM public.activate_for_one_year(
  'DEVICE_MACHINE_ID',
  'TRANSFER_REFERENCE_ID',
  'owner',
  'Paid and verified (annual activation)'
);

-- Renew one year
-- Replace values:
--   DEVICE_MACHINE_ID
--   TRANSFER_REFERENCE_ID
SELECT * FROM public.renew_for_one_year(
  'DEVICE_MACHINE_ID',
  'TRANSFER_REFERENCE_ID',
  'owner',
  'Paid and verified (annual renewal)'
);

-- Reject request
-- Replace values:
--   DEVICE_MACHINE_ID
--   TRANSFER_REFERENCE_ID
SELECT * FROM public.reject_request(
  'DEVICE_MACHINE_ID',
  'TRANSFER_REFERENCE_ID',
  'owner',
  'Rejected after payment review'
);


-- =========================================================
-- 4) OPTIONAL DIRECT ACTIONS (WITHOUT FUNCTIONS)
-- =========================================================

-- Direct activate (1 year)
-- UPDATE public.payment_requests
-- SET status = 'active',
--     expires_at = now() + interval '1 year',
--     activated_at = now(),
--     activated_by = 'owner',
--     notes = 'Paid and verified (direct update)'
-- WHERE machine_id = 'DEVICE_MACHINE_ID'
--   AND ref_id = 'TRANSFER_REFERENCE_ID';

-- Direct renewal (+1 year)
-- UPDATE public.payment_requests
-- SET status = 'active',
--     expires_at = GREATEST(COALESCE(expires_at, now()), now()) + interval '1 year',
--     activated_at = now(),
--     activated_by = 'owner',
--     notes = 'Annual renewal (direct update)'
-- WHERE machine_id = 'DEVICE_MACHINE_ID'
--   AND ref_id = 'TRANSFER_REFERENCE_ID';

-- Direct reject
-- UPDATE public.payment_requests
-- SET status = 'rejected',
--     activated_by = 'owner',
--     notes = 'Rejected after review'
-- WHERE machine_id = 'DEVICE_MACHINE_ID'
--   AND ref_id = 'TRANSFER_REFERENCE_ID';


-- =========================================================
-- 5) WEEKLY HEALTH CHECKS
-- =========================================================

-- Duplicate protection verification (should return zero rows)
SELECT machine_id, ref_id, COUNT(*) AS cnt
FROM public.payment_requests
GROUP BY machine_id, ref_id
HAVING COUNT(*) > 1;

-- Active records missing expiry (should return zero rows)
SELECT id, machine_id, ref_id, status, expires_at
FROM public.payment_requests
WHERE status = 'active'
  AND expires_at IS NULL;

-- Quick count by status
SELECT status, COUNT(*) AS total
FROM public.payment_requests
GROUP BY status
ORDER BY status;
