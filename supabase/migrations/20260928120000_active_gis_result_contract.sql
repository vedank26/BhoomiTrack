CREATE TABLE IF NOT EXISTS public.project_gis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_ref text NOT NULL,
  source_ref text NOT NULL,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  parcels jsonb NOT NULL,
  affected_parcels jsonb NOT NULL,
  alignment jsonb NOT NULL,
  engineer_points jsonb NOT NULL,
  corridor jsonb NOT NULL,
  summary jsonb NOT NULL,
  corridor_m numeric NOT NULL CHECK (corridor_m = 30),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (project_id, version_ref)
);

CREATE UNIQUE INDEX IF NOT EXISTS project_gis_results_one_active
  ON public.project_gis_results(project_id) WHERE is_active;

ALTER TABLE public.project_gis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_gis_results_read ON public.project_gis_results
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'officer'::app_role) OR has_role(auth.uid(), 'ministry'::app_role));

CREATE POLICY project_gis_results_publish ON public.project_gis_results
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'officer'::app_role));

CREATE OR REPLACE FUNCTION public.publish_project_gis_result(
  p_project_id uuid,
  p_version_ref text,
  p_source_ref text,
  p_source_metadata jsonb,
  p_parcels jsonb,
  p_affected_parcels jsonb,
  p_alignment jsonb,
  p_engineer_points jsonb,
  p_corridor jsonb,
  p_summary jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE result_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'officer'::app_role) THEN
    RAISE EXCEPTION 'Officer role required';
  END IF;

  UPDATE public.project_gis_results
  SET is_active = false
  WHERE project_id = p_project_id AND is_active;

  INSERT INTO public.project_gis_results (
    project_id, version_ref, source_ref, source_metadata, parcels,
    affected_parcels, alignment, engineer_points, corridor, summary,
    corridor_m, is_active, created_by
  ) VALUES (
    p_project_id, p_version_ref, p_source_ref, p_source_metadata, p_parcels,
    p_affected_parcels, p_alignment, p_engineer_points, p_corridor, p_summary,
    30, true, auth.uid()
  )
  ON CONFLICT (project_id, version_ref) DO UPDATE SET
    source_ref = EXCLUDED.source_ref,
    source_metadata = EXCLUDED.source_metadata,
    parcels = EXCLUDED.parcels,
    affected_parcels = EXCLUDED.affected_parcels,
    alignment = EXCLUDED.alignment,
    engineer_points = EXCLUDED.engineer_points,
    corridor = EXCLUDED.corridor,
    summary = EXCLUDED.summary,
    corridor_m = EXCLUDED.corridor_m,
    is_active = true,
    created_at = now(),
    created_by = auth.uid()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_project_gis_result(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_project_gis_result(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_gis_data(p_project_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT json_build_object(
      'project', (
        SELECT json_build_object(
          'id', pr.id, 'project_code', pr.project_code, 'project_name', pr.project_name,
          'state', pr.state, 'districts', pr.districts, 'status', pr.status,
          'is_synthetic', pr.is_synthetic
        ) FROM public.projects pr WHERE pr.id = p_project_id
      ),
      'alignment', r.alignment,
      'engineerPoints', r.engineer_points,
      'parcels', r.parcels,
      'affectedParcels', r.affected_parcels,
      'corridor', r.corridor,
      'summary', r.summary,
      'source', json_build_object(
        'result_id', r.id, 'version_ref', r.version_ref, 'source_ref', r.source_ref,
        'source_metadata', r.source_metadata, 'corridor_m', r.corridor_m
      )
    )
    FROM public.project_gis_results r
    WHERE r.project_id = p_project_id AND r.is_active
  ), json_build_object(
    'project', NULL,
    'alignment', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'engineerPoints', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'parcels', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'affectedParcels', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'corridor', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'summary', json_build_object('alignment_length_km', 0, 'parcels_displayed', 0, 'candidate_affected', 0, 'total_affected_area_sqm', 0)
  ));
$$;

REVOKE ALL ON FUNCTION public.get_project_gis_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_gis_data(uuid) TO authenticated;
