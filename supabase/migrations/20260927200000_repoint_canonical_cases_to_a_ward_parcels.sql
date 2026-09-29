-- Repoint the existing canonical demo cases to the controlled A-Ward GIS parcels.
-- Case numbers remain stable; parcel and project identity come from the database.

DO $$
DECLARE
  v_project_id uuid;
  v_missing text[];
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'A-WARD-MH-001';

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'A-WARD-MH-001 project is required before repointing canonical cases';
  END IF;

  SELECT array_agg(target.parcel_ref ORDER BY target.parcel_ref)
  INTO v_missing
  FROM (VALUES
    ('MH-AWARD-2030'),
    ('MH-AWARD-2042'),
    ('MH-AWARD-2045'),
    ('MH-AWARD-2046')
  ) AS target(parcel_ref)
  LEFT JOIN public.parcels p ON p.parcel_ref = target.parcel_ref
  WHERE p.id IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Required A-Ward parcels are missing: %', v_missing;
  END IF;

  UPDATE public.acquisition_cases AS c
  SET project_id = v_project_id,
      parcel_id = p.id,
      updated_at = now()
  FROM public.parcels AS p
  WHERE c.case_no = CASE p.parcel_ref
    WHEN 'MH-AWARD-2030' THEN 'P-001'
    WHEN 'MH-AWARD-2042' THEN 'P-018'
    WHEN 'MH-AWARD-2046' THEN 'P-024'
    WHEN 'MH-AWARD-2045' THEN 'P-030'
  END
  AND p.parcel_ref IN (
    'MH-AWARD-2030',
    'MH-AWARD-2042',
    'MH-AWARD-2045',
    'MH-AWARD-2046'
  );

  IF (SELECT count(*) FROM public.acquisition_cases WHERE case_no IN ('P-001', 'P-018', 'P-024', 'P-030')) <> 4 THEN
    RAISE EXCEPTION 'Expected four canonical acquisition cases after repointing';
  END IF;
END $$;
