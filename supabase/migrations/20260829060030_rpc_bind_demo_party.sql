-- ============================================================================
-- 20260829060030_rpc_bind_demo_party.sql
-- ============================================================================
-- Defines public.bind_demo_party() — a SECURITY DEFINER RPC that allows the
-- first eligible authenticated citizen to bind the synthetic DEMO-PARTY-001
-- to their own auth.uid().
--
-- SECURITY DEFINER is required because:
--   - The citizen role has no UPDATE right on public.parties (only officers do,
--     per the officer_write_parties RLS policy in 0001_phase2_core_domain.sql).
--   - The function must bypass that RLS restriction for the single, hard-coded
--     DEMO-PARTY-001 row only.
--
-- Security properties:
--   - Accepts NO parameters; callers cannot supply arbitrary party_id/user_id.
--   - Hard-codes party_ref = 'DEMO-PARTY-001' as the only valid target.
--   - Validates the caller is a citizen via public.has_role() before acting.
--   - Uses FOR UPDATE to serialise concurrent requests (first-caller-wins).
--   - Rejects any second citizen who tries to claim the already-bound party.
--   - If the same citizen calls again, the function is a harmless no-op.
--   - SET search_path = public prevents accidental resolution to other schemas.
--
-- has_role() signature (verified from 20260829041812_...sql):
--   public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN
--
-- No new tables, columns, enums, or RLS policies are created.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bind_demo_party()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_party_id    uuid;
    v_current_uid uuid;
BEGIN
    -- ----------------------------------------------------------------
    -- 1. Verify the calling user is authenticated and has citizen role.
    --    has_role signature: has_role(_user_id UUID, _role app_role)
    -- ----------------------------------------------------------------
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.has_role(auth.uid(), 'citizen'::public.app_role) THEN
        RAISE EXCEPTION 'Only users with the citizen role may bind the demo party';
    END IF;

    -- ----------------------------------------------------------------
    -- 2. Lock the demo party row exclusively to prevent races.
    --    FOR UPDATE serialises concurrent callers at the DB level.
    -- ----------------------------------------------------------------
    SELECT id, user_id
      INTO v_party_id, v_current_uid
      FROM public.parties
     WHERE party_ref = 'DEMO-PARTY-001'
       FOR UPDATE;

    IF v_party_id IS NULL THEN
        RAISE EXCEPTION
            'Demo party DEMO-PARTY-001 does not exist. '
            'Ensure 20260829060000_seed_demo_party.sql ran first.';
    END IF;

    -- ----------------------------------------------------------------
    -- 3. Apply first-caller-wins binding logic.
    -- ----------------------------------------------------------------
    IF v_current_uid IS NULL THEN
        -- Party is unclaimed — bind it to the current citizen.
        UPDATE public.parties
           SET user_id = auth.uid()
         WHERE id = v_party_id;

    ELSIF v_current_uid = auth.uid() THEN
        -- Same citizen calling again — idempotent no-op.
        NULL;

    ELSE
        -- A different citizen already owns the party — reject.
        RAISE EXCEPTION
            'Demo party DEMO-PARTY-001 is already bound to another user. '
            'Only the first citizen to call this function may claim it.';
    END IF;
END;
$$;

-- Grant EXECUTE to authenticated users only (not anon, not public).
REVOKE ALL ON FUNCTION public.bind_demo_party() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bind_demo_party() TO authenticated;
