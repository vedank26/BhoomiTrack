-- Establish one controlled Citizen visibility relationship for the existing
-- DEMO-PARTY-001 account and the existing P-001 parcel.
--
-- The party is not asserted to be a verified legal owner of this parcel, so
-- this relationship uses the existing `other` / `unverified` enum values.
-- The existing OWNER-2030-* relationship is left untouched.

BEGIN;

DO $$
DECLARE
  v_party_id uuid;
  v_parcel_id uuid;
  v_case_parcel_id uuid;
  v_interest_count bigint;
BEGIN
  SELECT id
    INTO v_party_id
    FROM public.parties
   WHERE party_ref = 'DEMO-PARTY-001';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Cannot establish Citizen relationship: DEMO-PARTY-001 was not found';
  END IF;

  SELECT id
    INTO v_parcel_id
    FROM public.parcels
   WHERE parcel_ref = 'MH-AWARD-2030';

  IF v_parcel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot establish Citizen relationship: parcel MH-AWARD-2030 was not found';
  END IF;

  SELECT parcel_id
    INTO v_case_parcel_id
    FROM public.acquisition_cases
   WHERE case_no = 'P-001';

  IF v_case_parcel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot establish Citizen relationship: acquisition case P-001 was not found';
  END IF;

  IF v_case_parcel_id <> v_parcel_id THEN
    RAISE EXCEPTION
      'Cannot establish Citizen relationship: P-001 does not reference parcel MH-AWARD-2030';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.acquisition_cases
     WHERE case_no IN ('P-018', 'P-024', 'P-030')
       AND parcel_id = v_parcel_id
  ) THEN
    RAISE EXCEPTION
      'Cannot establish one-case Citizen relationship: another canonical case references MH-AWARD-2030';
  END IF;

  -- Remove only the old demo-parcel interests for this party. If any
  -- unexpected non-target relationship remains, the assertion below aborts
  -- the migration rather than silently deleting it.
  DELETE FROM public.land_interests AS li
   USING public.parcels AS p
   WHERE li.parcel_id = p.id
     AND li.party_id = v_party_id
     AND p.parcel_ref LIKE 'DEMO-PCL-%';

  -- `other` + `unverified` establishes the RLS relationship without asserting
  -- that DEMO-PARTY-001 is an owner or that this interest has been verified.
  INSERT INTO public.land_interests (
    parcel_id,
    party_id,
    interest_type,
    verification
  ) VALUES (
    v_parcel_id,
    v_party_id,
    'other'::public.interest_type,
    'unverified'::public.verification_status
  )
  ON CONFLICT (parcel_id, party_id, interest_type) DO NOTHING;

  SELECT count(*)
    INTO v_interest_count
    FROM public.land_interests
   WHERE party_id = v_party_id;

  IF v_interest_count <> 1 OR NOT EXISTS (
    SELECT 1
      FROM public.land_interests
     WHERE party_id = v_party_id
       AND parcel_id = v_parcel_id
       AND interest_type = 'other'::public.interest_type
       AND verification = 'unverified'::public.verification_status
  ) THEN
    RAISE EXCEPTION
      'Cannot establish controlled Citizen relationship: DEMO-PARTY-001 must have exactly one interest on MH-AWARD-2030';
  END IF;
END
$$;

COMMIT;

-- Read-only validation queries are provided in the implementation report.
