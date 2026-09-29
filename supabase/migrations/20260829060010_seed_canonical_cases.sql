-- ============================================================================
-- 20260829060010_seed_canonical_cases.sql
-- ============================================================================
-- Inserts four canonical acquisition_cases (P-001, P-018, P-024, P-030).
-- Must run AFTER 20260829060000_seed_demo_party.sql (timestamp guarantees order).
-- Must run AFTER 20260829050000_phase3_gis_seed_demo_geometry.sql, which
-- already created the DEMO-MH-001 project and DEMO-PCL-001 … DEMO-PCL-004.
--
-- Conflict handling (per canonical case):
--   - Row does not exist        -> INSERT
--   - Row exists, data matches  -> leave unchanged (no-op)
--   - Row exists, data differs  -> RAISE EXCEPTION (fail loudly, fix manually)
--
-- Enum values used (verified against types.ts / 0001_phase2_core_domain.sql):
--   acquisition_method : lara_2013
--   workflow_stage     : identification, preliminary_notification, survey, objection
--   case_status        : open
--   case_priority      : normal
-- ============================================================================

DO $$
DECLARE
    v_project_id UUID;

    -- Per-iteration variables
    v_parcel_ref  TEXT;
    v_case_no     TEXT;
    v_stage       TEXT;
    v_parcel_id   UUID;
    v_count       INT;
BEGIN
    -- ------------------------------------------------------------------
    -- 0. Resolve demo project (must already exist from GIS seed migration)
    -- ------------------------------------------------------------------
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE project_code = 'DEMO-MH-001';

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION
            'Prerequisite not met: project with project_code=''DEMO-MH-001'' not found. '
            'Ensure 20260829050000_phase3_gis_seed_demo_geometry.sql ran first.';
    END IF;

    -- ------------------------------------------------------------------
    -- 1. Process each canonical case in order
    -- ------------------------------------------------------------------
    FOR v_case_no, v_stage, v_parcel_ref IN
        VALUES
            ('P-001', 'identification',           'DEMO-PCL-001'),
            ('P-018', 'preliminary_notification', 'DEMO-PCL-002'),
            ('P-024', 'survey',                   'DEMO-PCL-003'),
            ('P-030', 'objection',                'DEMO-PCL-004')
    LOOP
        -- Resolve parcel
        SELECT id INTO v_parcel_id
        FROM public.parcels
        WHERE parcel_ref = v_parcel_ref;

        IF v_parcel_id IS NULL THEN
            RAISE EXCEPTION
                'Prerequisite not met: parcel with parcel_ref=''%'' not found.',
                v_parcel_ref;
        END IF;

        -- Check existing
        SELECT COUNT(*) INTO v_count
        FROM public.acquisition_cases
        WHERE case_no = v_case_no;

        IF v_count = 0 THEN
            -- Case does not exist – safe to insert
            INSERT INTO public.acquisition_cases (
                case_no,
                project_id,
                parcel_id,
                method,
                current_stage,
                status,
                priority
            ) VALUES (
                v_case_no,
                v_project_id,
                v_parcel_id,
                'lara_2013'::public.acquisition_method,
                v_stage::public.workflow_stage,
                'open'::public.case_status,
                'normal'::public.case_priority
            );
        ELSE
            -- Case exists – verify it matches our expected values exactly
            IF EXISTS (
                SELECT 1
                FROM public.acquisition_cases ac
                WHERE ac.case_no = v_case_no
                  AND (
                      ac.project_id    <> v_project_id
                   OR ac.parcel_id     <> v_parcel_id
                   OR ac.current_stage <> v_stage::public.workflow_stage
                  )
            ) THEN
                RAISE EXCEPTION
                    'Canonical case ''%'' already exists but has conflicting '
                    'project_id, parcel_id, or current_stage. '
                    'Resolve the conflict manually before re-running this migration.',
                    v_case_no;
            END IF;
            -- If the existing row matches exactly, do nothing (idempotent).
        END IF;
    END LOOP;
END $$;
