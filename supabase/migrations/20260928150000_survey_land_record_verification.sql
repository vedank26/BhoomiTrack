-- id is already a primary key, so this redundant pair is unique for every
-- existing row and lets the verification table enforce the exact parcel link.
ALTER TABLE public.acquisition_cases
  ADD CONSTRAINT acquisition_cases_id_parcel_id_key UNIQUE (id, parcel_id);

CREATE TABLE public.survey_land_record_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE,
  parcel_id uuid NOT NULL,
  record_type text NOT NULL CHECK (record_type IN (
    '7/12', '8A', 'PROPERTY_CARD', 'FERFAR_MUTATION', 'E_RECORD', 'OTHER'
  )),
  record_reference text CHECK (record_reference IS NULL OR char_length(record_reference) <= 200),
  record_date date,
  record_source text CHECK (record_source IS NULL OR char_length(record_source) <= 200),
  verification_status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (verification_status IN ('NOT_VERIFIED', 'VERIFIED', 'REVIEW_REQUIRED')),
  verification_date date,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks text CHECK (remarks IS NULL OR char_length(remarks) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_land_record_verifications_case_parcel_fkey
    FOREIGN KEY (case_id, parcel_id)
    REFERENCES public.acquisition_cases(id, parcel_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX survey_land_record_verifications_parcel_id_idx
  ON public.survey_land_record_verifications(parcel_id);

ALTER TABLE public.survey_land_record_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.survey_land_record_verifications TO authenticated;
REVOKE ALL ON public.survey_land_record_verifications FROM anon, PUBLIC;

CREATE POLICY survey_land_record_verifications_select
  ON public.survey_land_record_verifications
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_land_record_verifications.case_id
        AND ac.parcel_id = survey_land_record_verifications.parcel_id
    )
  );

CREATE POLICY survey_land_record_verifications_insert
  ON public.survey_land_record_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_land_record_verifications.case_id
        AND ac.parcel_id = survey_land_record_verifications.parcel_id
    )
  );

CREATE POLICY survey_land_record_verifications_update
  ON public.survey_land_record_verifications
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_land_record_verifications.case_id
        AND ac.parcel_id = survey_land_record_verifications.parcel_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_land_record_verifications.case_id
        AND ac.parcel_id = survey_land_record_verifications.parcel_id
    )
  );

CREATE FUNCTION public.enforce_survey_land_record_verification_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  linked_parcel_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.case_id IS DISTINCT FROM OLD.case_id
       OR NEW.parcel_id IS DISTINCT FROM OLD.parcel_id THEN
      RAISE EXCEPTION 'Verification case and parcel identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
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

  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  NEW.verified_by := CASE
    WHEN NEW.verification_status = 'VERIFIED' THEN auth.uid()
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_survey_land_record_verification_integrity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER survey_land_record_verifications_integrity
  BEFORE INSERT OR UPDATE ON public.survey_land_record_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_survey_land_record_verification_integrity();
