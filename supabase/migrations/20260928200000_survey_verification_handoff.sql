REVOKE ALL PRIVILEGES ON TABLE public.case_workflow_events
  FROM authenticated, anon, PUBLIC;
GRANT SELECT, INSERT ON TABLE public.case_workflow_events
  TO authenticated;

CREATE UNIQUE INDEX case_workflow_events_survey_handoff_case_uidx
  ON public.case_workflow_events (case_id)
  WHERE event_type = 'SURVEY_VERIFICATION_SUBMITTED';

CREATE FUNCTION public.survey_verification_handoff_enabled()
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT true
$$;

REVOKE ALL ON FUNCTION public.survey_verification_handoff_enabled()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.survey_verification_handoff_enabled()
  TO authenticated;

CREATE POLICY case_workflow_events_survey_handoff_claims
  ON public.case_workflow_events
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    event_type <> 'SURVEY_VERIFICATION_SUBMITTED'
    OR (
      auth.uid() IS NOT NULL
      AND auth.jwt() -> 'app_metadata' ->> 'role' = 'officer'
      AND auth.jwt() -> 'app_metadata' ->> 'department' = 'survey_land_records'
      AND actor_user_id = auth.uid()
      AND stage = 'survey'::public.workflow_stage
      AND action = 'SUBMIT_TO_LAND_ACQUISITION'
    )
  );

CREATE FUNCTION public.guard_survey_verification_handoff()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parcel_id uuid;
  v_parcel_ref text;
  v_land_status text;
  v_measurement_status text;
  v_boundary_status text;
BEGIN
  IF NEW.event_type <> 'SURVEY_VERIFICATION_SUBMITTED' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'officer'
     OR (auth.jwt() -> 'app_metadata' ->> 'department') IS DISTINCT FROM 'survey_land_records' THEN
    RAISE EXCEPTION 'Only an authorized Survey Officer can submit this handoff'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.stage IS DISTINCT FROM 'survey'::public.workflow_stage
     OR NEW.action IS DISTINCT FROM 'SUBMIT_TO_LAND_ACQUISITION'
     OR NEW.metadata ->> 'destination_department' IS DISTINCT FROM 'land_acquisition' THEN
    RAISE EXCEPTION 'Survey handoff destination or event identity is invalid'
      USING ERRCODE = '23514';
  END IF;

  SELECT ac.parcel_id, p.parcel_ref
    INTO v_parcel_id, v_parcel_ref
    FROM public.acquisition_cases AS ac
    JOIN public.parcels AS p ON p.id = ac.parcel_id
    WHERE ac.id = NEW.case_id
    FOR UPDATE OF ac;

  IF v_parcel_id IS NULL THEN
    RAISE EXCEPTION 'Survey handoff case or linked parcel was not found'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.metadata ->> 'parcel_id' IS DISTINCT FROM v_parcel_id::text
     OR NEW.metadata ->> 'parcel_ref' IS DISTINCT FROM v_parcel_ref THEN
    RAISE EXCEPTION 'Survey handoff parcel does not match the case parcel'
      USING ERRCODE = '23514';
  END IF;

  SELECT verification_status INTO v_land_status
    FROM public.survey_land_record_verifications
    WHERE case_id = NEW.case_id AND parcel_id = v_parcel_id;
  IF v_land_status IS DISTINCT FROM 'VERIFIED' THEN
    RAISE EXCEPTION 'Handoff blocked: land record verification is missing or not VERIFIED'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.land_interests AS li
      LEFT JOIN public.survey_ownership_interest_verifications AS siv
        ON siv.case_id = NEW.case_id
       AND siv.parcel_id = v_parcel_id
       AND siv.interest_id = li.id
      WHERE li.parcel_id = v_parcel_id
        AND siv.verification_status IS DISTINCT FROM 'VERIFIED'
  ) THEN
    RAISE EXCEPTION 'Handoff blocked: every linked ownership interest must be VERIFIED'
      USING ERRCODE = '23514';
  END IF;

  SELECT measurement_status, boundary_verification_status
    INTO v_measurement_status, v_boundary_status
    FROM public.survey_measurement_verifications
    WHERE case_id = NEW.case_id AND parcel_id = v_parcel_id;
  IF v_measurement_status IS DISTINCT FROM 'COMPLETED'
     OR v_boundary_status IS DISTINCT FROM 'VERIFIED' THEN
    RAISE EXCEPTION 'Handoff blocked: measurement must be COMPLETED and boundary VERIFIED'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.survey_issues
    WHERE case_id = NEW.case_id
      AND parcel_id = v_parcel_id
      AND status IN ('OPEN', 'UNDER_REVIEW')
  ) THEN
    RAISE EXCEPTION 'Handoff blocked: resolve all OPEN or UNDER_REVIEW Survey issues'
      USING ERRCODE = '23514';
  END IF;

  NEW.actor_user_id := auth.uid();
  NEW.actor_label := NULL;
  NEW.from_stage := NULL;
  NEW.to_stage := NULL;
  NEW.occurred_at := now();
  NEW.created_at := now();
  NEW.metadata := jsonb_build_object(
    'parcel_id', v_parcel_id,
    'parcel_ref', v_parcel_ref,
    'destination_department', 'land_acquisition'
  );
  IF nullif(btrim(NEW.remarks), '') IS NULL THEN
    NEW.remarks := 'Survey verification submitted to Land Acquisition.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_survey_verification_handoff()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER case_workflow_events_survey_handoff_guard
  BEFORE INSERT ON public.case_workflow_events
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_survey_verification_handoff();

CREATE FUNCTION public.prevent_survey_handoff_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.event_type = 'SURVEY_VERIFICATION_SUBMITTED'
     OR (TG_OP = 'UPDATE' AND NEW.event_type = 'SURVEY_VERIFICATION_SUBMITTED') THEN
    RAISE EXCEPTION 'A Survey verification handoff event is immutable'
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_survey_handoff_event_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER case_workflow_events_survey_handoff_immutable
  BEFORE UPDATE OR DELETE ON public.case_workflow_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_survey_handoff_event_mutation();
