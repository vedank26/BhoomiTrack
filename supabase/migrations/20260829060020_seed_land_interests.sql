-- ============================================================================
-- 20260829060020_seed_land_interests.sql
-- ============================================================================
-- Creates four owner land_interest rows linking DEMO-PARTY-001 to each of the
-- four canonical demo parcels (DEMO-PCL-001 … DEMO-PCL-004).
--
-- Must run AFTER:
--   20260829060000_seed_demo_party.sql   (DEMO-PARTY-001 must exist)
--
-- Idempotent: uses IF NOT EXISTS check before each INSERT because
-- land_interests has no UNIQUE(parcel_id, party_id) constraint in the schema.
--
-- Enum values used (verified against types.ts / 0001_phase2_core_domain.sql):
--   interest_type       : owner
--   verification_status : verified
-- ============================================================================

DO $$
DECLARE
    v_party_id   UUID;
    v_parcel_id  UUID;
    v_parcel_ref TEXT;
BEGIN
    -- ------------------------------------------------------------------
    -- 0. Resolve the demo party (must exist from the prior migration)
    -- ------------------------------------------------------------------
    SELECT id INTO v_party_id
    FROM public.parties
    WHERE party_ref = 'DEMO-PARTY-001';

    IF v_party_id IS NULL THEN
        RAISE EXCEPTION
            'Prerequisite not met: party with party_ref=''DEMO-PARTY-001'' not found. '
            'Ensure 20260829060000_seed_demo_party.sql ran first.';
    END IF;

    -- ------------------------------------------------------------------
    -- 1. Insert one owner interest row per canonical parcel (idempotent)
    --    land_interests has no UNIQUE(parcel_id, party_id) constraint,
    --    so we guard with an EXISTS check to avoid duplicates on re-run.
    -- ------------------------------------------------------------------
    FOREACH v_parcel_ref IN ARRAY ARRAY[
        'DEMO-PCL-001',
        'DEMO-PCL-002',
        'DEMO-PCL-003',
        'DEMO-PCL-004'
    ]
    LOOP
        SELECT id INTO v_parcel_id
        FROM public.parcels
        WHERE parcel_ref = v_parcel_ref;

        IF v_parcel_id IS NULL THEN
            RAISE EXCEPTION
                'Prerequisite not met: parcel with parcel_ref=''%'' not found.',
                v_parcel_ref;
        END IF;

        -- Only insert if this exact (parcel, party) pair does not already exist
        IF NOT EXISTS (
            SELECT 1 FROM public.land_interests
            WHERE parcel_id = v_parcel_id AND party_id = v_party_id
        ) THEN
            INSERT INTO public.land_interests (
                parcel_id,
                party_id,
                interest_type,
                verification
            ) VALUES (
                v_parcel_id,
                v_party_id,
                'owner'::public.interest_type,
                'verified'::public.verification_status
            );
        END IF;
    END LOOP;
END $$;
