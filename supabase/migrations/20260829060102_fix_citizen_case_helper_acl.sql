-- ======================================================================
-- 20260829060102_fix_citizen_case_helper_acl.sql
-- ======================================================================
-- This migration corrects the missing EXECUTE privilege on the helper
-- public.citizen_can_see_case(uuid) for the authenticated role.
-- No other objects are altered.
-- ======================================================================

-- Ensure no PUBLIC or anon privileges exist (harmless if already absent)
REVOKE ALL ON FUNCTION public.citizen_can_see_case(uuid) FROM PUBLIC, anon;

-- Grant EXECUTE to the authenticated role (used by logged‑in users)
GRANT EXECUTE ON FUNCTION public.citizen_can_see_case(uuid) TO authenticated;
