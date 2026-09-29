CREATE TABLE public.survey_measurement_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  parcel_id uuid NOT NULL,
  measurement_status text NOT NULL DEFAULT 'NOT_STARTED'
    CHECK (measurement_status IN (
      'NOT_STARTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVIEW_REQUIRED'
    )),
  measurement_reference text CHECK (
    measurement_reference IS NULL OR char_length(measurement_reference) <= 200
  ),
  measurement_purpose text CHECK (
    measurement_purpose IS NULL OR measurement_purpose IN (
      'BOUNDARY_VERIFICATION', 'PARCEL_MEASUREMENT',
      'ACQUISITION_FIELD_VERIFICATION', 'OTHER'
    )
  ),
  scheduled_date date,
  measurement_date date,
  measured_area_sqm numeric CHECK (measured_area_sqm IS NULL OR measured_area_sqm > 0),
  boundary_verification_status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (boundary_verification_status IN (
      'NOT_VERIFIED', 'VERIFIED', 'REVIEW_REQUIRED'
    )),
  field_visit_date date,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_notes text CHECK (field_notes IS NULL OR char_length(field_notes) <= 4000),
  evidence_reference text CHECK (
    evidence_reference IS NULL OR char_length(evidence_reference) <= 500
  ),
  remarks text CHECK (remarks IS NULL OR char_length(remarks) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_measurement_verifications_case_parcel_fkey
    FOREIGN KEY (case_id, parcel_id)
    REFERENCES public.acquisition_cases(id, parcel_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT survey_measurement_verifications_case_parcel_key
    UNIQUE (case_id, parcel_id)
);

ALTER TABLE public.survey_measurement_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.survey_measurement_verifications
  FROM authenticated, anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.survey_measurement_verifications TO authenticated;

CREATE POLICY survey_measurement_verifications_select
  ON public.survey_measurement_verifications
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_measurement_verifications.case_id
        AND ac.parcel_id = survey_measurement_verifications.parcel_id
    )
  );

CREATE POLICY survey_measurement_verifications_insert
  ON public.survey_measurement_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_measurement_verifications.case_id
        AND ac.parcel_id = survey_measurement_verifications.parcel_id
    )
  );

CREATE POLICY survey_measurement_verifications_update
  ON public.survey_measurement_verifications
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_measurement_verifications.case_id
        AND ac.parcel_id = survey_measurement_verifications.parcel_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_measurement_verifications.case_id
        AND ac.parcel_id = survey_measurement_verifications.parcel_id
    )
  );

CREATE FUNCTION public.enforce_survey_measurement_verification_integrity()
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
      RAISE EXCEPTION 'Measurement case and parcel identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.recorded_by := OLD.recorded_by;
  ELSE
    NEW.created_at := now();
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'A measurement record requires an authenticated recorder'
        USING ERRCODE = '42501';
    END IF;
    NEW.recorded_by := auth.uid();
  END IF;

  SELECT ac.parcel_id INTO linked_parcel_id
  FROM public.acquisition_cases ac
  WHERE ac.id = NEW.case_id;

  IF linked_parcel_id IS NULL OR linked_parcel_id <> NEW.parcel_id THEN
    RAISE EXCEPTION 'Measurement case and parcel do not match'
      USING ERRCODE = '23503';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_survey_measurement_verification_integrity()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER survey_measurement_verifications_integrity
  BEFORE INSERT OR UPDATE ON public.survey_measurement_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_survey_measurement_verification_integrity();
