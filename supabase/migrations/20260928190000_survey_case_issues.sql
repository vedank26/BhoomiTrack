CREATE TABLE public.survey_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  parcel_id uuid NOT NULL,
  issue_type text NOT NULL CHECK (issue_type IN (
    'LAND_RECORD_MISMATCH',
    'PARCEL_IDENTITY_MISMATCH',
    'CADASTRAL_MISMATCH',
    'OWNERSHIP_RECORD_MISMATCH',
    'MEASUREMENT_DISCREPANCY',
    'BOUNDARY_DISCREPANCY',
    'FIELD_VERIFICATION_REQUIRED',
    'MISSING_RECORD',
    'OTHER'
  )),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  description text NOT NULL CHECK (
    char_length(btrim(description)) BETWEEN 1 AND 4000
  ),
  evidence_reference text CHECK (
    evidence_reference IS NULL OR char_length(evidence_reference) <= 500
  ),
  remarks text CHECK (remarks IS NULL OR char_length(remarks) <= 2000),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED')),
  resolution text CHECK (
    resolution IS NULL OR char_length(btrim(resolution)) BETWEEN 1 AND 4000
  ),
  raised_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  raised_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_issues_case_parcel_fkey
    FOREIGN KEY (case_id, parcel_id)
    REFERENCES public.acquisition_cases(id, parcel_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT survey_issues_resolution_state_check CHECK (
    (status = 'RESOLVED'
      AND nullif(btrim(resolution), '') IS NOT NULL
      AND resolved_by IS NOT NULL
      AND resolved_at IS NOT NULL)
    OR
    (status <> 'RESOLVED'
      AND resolution IS NULL
      AND resolved_by IS NULL
      AND resolved_at IS NULL)
  )
);

CREATE INDEX survey_issues_case_raised_at_idx
  ON public.survey_issues (case_id, raised_at DESC);

ALTER TABLE public.survey_issues ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.survey_issues
  FROM authenticated, anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.survey_issues TO authenticated;

CREATE POLICY survey_issues_select
  ON public.survey_issues
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_issues.case_id
        AND ac.parcel_id = survey_issues.parcel_id
    )
  );

CREATE POLICY survey_issues_insert
  ON public.survey_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_issues.case_id
        AND ac.parcel_id = survey_issues.parcel_id
    )
  );

CREATE POLICY survey_issues_update
  ON public.survey_issues
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_issues.case_id
        AND ac.parcel_id = survey_issues.parcel_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
    AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
    AND EXISTS (
      SELECT 1 FROM public.acquisition_cases ac
      WHERE ac.id = survey_issues.case_id
        AND ac.parcel_id = survey_issues.parcel_id
    )
  );

CREATE FUNCTION public.enforce_survey_issue_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.status <> 'OPEN' THEN
      RAISE EXCEPTION 'A survey issue must be created by an authenticated Survey Officer in OPEN status'
        USING ERRCODE = '42501';
    END IF;
    NEW.raised_by := auth.uid();
    NEW.raised_at := now();
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
    NEW.resolution := NULL;
    NEW.created_at := now();
  ELSE
    IF NEW.case_id IS DISTINCT FROM OLD.case_id
       OR NEW.parcel_id IS DISTINCT FROM OLD.parcel_id
       OR NEW.raised_by IS DISTINCT FROM OLD.raised_by
       OR NEW.raised_at IS DISTINCT FROM OLD.raised_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Survey issue identity and attribution cannot be changed'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'RESOLVED' THEN
      RAISE EXCEPTION 'A resolved survey issue cannot be changed'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status <> OLD.status
       AND NOT (NEW.status = 'UNDER_REVIEW' AND OLD.status = 'OPEN')
       AND NEW.status <> 'RESOLVED' THEN
      RAISE EXCEPTION 'Invalid survey issue status transition'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'RESOLVED' THEN
      IF auth.uid() IS NULL OR nullif(btrim(NEW.resolution), '') IS NULL THEN
        RAISE EXCEPTION 'A resolution and authenticated resolver are required'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolved_by := auth.uid();
      NEW.resolved_at := now();
    ELSE
      NEW.resolution := NULL;
      NEW.resolved_by := NULL;
      NEW.resolved_at := NULL;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_survey_issue_integrity()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER survey_issues_integrity
  BEFORE INSERT OR UPDATE ON public.survey_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_survey_issue_integrity();
