CREATE TABLE public.survey_ownership_interest_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  parcel_id uuid NOT NULL,
  interest_id uuid NOT NULL REFERENCES public.land_interests(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  verification_status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (verification_status IN ('NOT_VERIFIED', 'VERIFIED', 'REVIEW_REQUIRED')),
  verification_date date,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_source text CHECK (verification_source IS NULL OR verification_source IN (
    '7/12', '8A', 'PROPERTY_CARD', 'FERFAR_MUTATION', 'E_RECORD', 'OTHER'
  )),
  record_reference text CHECK (record_reference IS NULL OR char_length(record_reference) <= 200),
  remarks text CHECK (remarks IS NULL OR char_length(remarks) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_ownership_interest_verifications_case_parcel_fkey
    FOREIGN KEY (case_id, parcel_id)
    REFERENCES public.acquisition_cases(id, parcel_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT survey_ownership_interest_verifications_case_interest_key
    UNIQUE (case_id, interest_id)
);

CREATE INDEX survey_ownership_interest_verifications_interest_id_idx
  ON public.survey_ownership_interest_verifications(interest_id);

ALTER TABLE public.survey_ownership_interest_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.survey_ownership_interest_verifications TO authenticated;
REVOKE ALL ON public.survey_ownership_interest_verifications FROM anon, PUBLIC;

CREATE POLICY survey_ownership_interest_verifications_select
  ON public.survey_ownership_interest_verifications
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_ownership_interest_verifications.case_id
        AND ac.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
    AND EXISTS (
      SELECT 1 FROM public.land_interests li
      WHERE li.id = survey_ownership_interest_verifications.interest_id
        AND li.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
  );

CREATE POLICY survey_ownership_interest_verifications_insert
  ON public.survey_ownership_interest_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_ownership_interest_verifications.case_id
        AND ac.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
    AND EXISTS (
      SELECT 1 FROM public.land_interests li
      WHERE li.id = survey_ownership_interest_verifications.interest_id
        AND li.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
  );

CREATE POLICY survey_ownership_interest_verifications_update
  ON public.survey_ownership_interest_verifications
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_ownership_interest_verifications.case_id
        AND ac.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
    AND EXISTS (
      SELECT 1 FROM public.land_interests li
      WHERE li.id = survey_ownership_interest_verifications.interest_id
        AND li.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_ownership_interest_verifications.case_id
        AND ac.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
    AND EXISTS (
      SELECT 1 FROM public.land_interests li
      WHERE li.id = survey_ownership_interest_verifications.interest_id
        AND li.parcel_id = survey_ownership_interest_verifications.parcel_id
    )
  );

CREATE FUNCTION public.enforce_survey_ownership_interest_verification_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  linked_parcel_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.case_id IS DISTINCT FROM OLD.case_id
       OR NEW.parcel_id IS DISTINCT FROM OLD.parcel_id
       OR NEW.interest_id IS DISTINCT FROM OLD.interest_id THEN
      RAISE EXCEPTION 'Verification case, parcel, and interest identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := now();
  END IF;

  SELECT ac.parcel_id INTO linked_parcel_id
  FROM public.acquisition_cases ac
  WHERE ac.id = NEW.case_id;

  IF linked_parcel_id IS NULL OR linked_parcel_id <> NEW.parcel_id THEN
    RAISE EXCEPTION 'Verification case and parcel do not match'
      USING ERRCODE = '23503';
  END IF;

  SELECT li.parcel_id INTO linked_parcel_id
  FROM public.land_interests li
  WHERE li.id = NEW.interest_id;

  IF linked_parcel_id IS NULL OR linked_parcel_id <> NEW.parcel_id THEN
    RAISE EXCEPTION 'Verification interest does not belong to the selected parcel'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.verification_status = 'VERIFIED' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'A verified ownership interest requires an authenticated verifier'
        USING ERRCODE = '42501';
    END IF;
    NEW.verified_by := auth.uid();
  ELSE
    NEW.verified_by := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_survey_ownership_interest_verification_integrity()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER survey_ownership_interest_verifications_integrity
  BEFORE INSERT OR UPDATE ON public.survey_ownership_interest_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_survey_ownership_interest_verification_integrity();
