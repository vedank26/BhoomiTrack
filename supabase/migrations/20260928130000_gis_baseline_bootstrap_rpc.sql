CREATE OR REPLACE FUNCTION public.get_project_gis_baseline(p_project_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'project', (
      SELECT json_build_object(
        'id', pr.id, 'project_code', pr.project_code, 'project_name', pr.project_name,
        'state', pr.state, 'districts', pr.districts, 'status', pr.status,
        'is_synthetic', pr.is_synthetic
      ) FROM public.projects pr WHERE pr.id = p_project_id
    ),
    'alignment', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'engineerPoints', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'parcels', COALESCE((
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(json_build_object(
          'type', 'Feature',
          'geometry', extensions.ST_AsGeoJSON(pa.geom)::json,
          'properties', json_build_object(
            'id', pa.id, 'parcel_ref', pa.parcel_ref, 'survey_no', pa.survey_no,
            'gat_no', pa.gat_no, 'khasra_no', pa.khasra_no, 'village', pa.village,
            'district', pa.district, 'state', pa.state, 'total_area_sqm', pa.total_area_sqm,
            'is_synthetic', pa.is_synthetic, 'affected_area_sqm', pp.affected_area_sqm,
            'affected_percentage', NULL, 'spatial_status',
              CASE WHEN pp.affected_area_sqm IS NULL THEN 'pending_analysis' ELSE 'analyzed_unaffected' END
          )
        )), '[]'::json)
      )
      FROM public.project_parcels pp
      JOIN public.parcels pa ON pa.id = pp.parcel_id
      WHERE pp.project_id = p_project_id
    ), json_build_object('type', 'FeatureCollection', 'features', '[]'::json)),
    'affectedParcels', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'corridor', json_build_object('type', 'FeatureCollection', 'features', '[]'::json),
    'summary', json_build_object(
      'alignment_length_km', 0, 'parcels_displayed',
      (SELECT count(*) FROM public.project_parcels WHERE project_id = p_project_id),
      'candidate_affected', 0, 'total_affected_area_sqm', 0
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_project_gis_baseline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_gis_baseline(uuid) TO authenticated;
