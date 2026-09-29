-- ============================================================================
-- GIS baseline status-aware GeoJSON RPC endpoint.
-- ============================================================================
-- Single RPC that returns the project alignment, parcels, DEMO analysis
-- corridor and summary metrics as frontend-ready GeoJSON, computed from the
-- authoritative Phase 2 tables (projects, alignments, parcels,
-- project_parcels). No new tables, no schema changes.
--
-- Security:
--   - Runs as INVOKER (default), so RLS on projects/alignments/parcels/
--     project_parcels applies. Officer/ministry roles can read; citizens are
--     scoped by their own parcels.
--   - Only non-personal GIS fields are returned. No owner, bank, or
--     citizen-identifying data is exposed.
--   - EXECUTE granted to authenticated only (officer-only page).
--
-- The corridor is a REPRESENTATIVE DEMO 120 m buffer of the stored
-- alignment. It is NOT an official government right-of-way standard.
-- Affected area is GIS-derived and supplementary to recorded area.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_gis_data(p_project_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'project', (
      SELECT json_build_object(
        'id', pr.id,
        'project_code', pr.project_code,
        'project_name', pr.project_name,
        'state', pr.state,
        'districts', pr.districts,
        'status', pr.status,
        'is_synthetic', pr.is_synthetic
      )
      FROM public.projects pr
      WHERE pr.id = p_project_id
    ),
    'alignment', COALESCE((
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', extensions.ST_AsGeoJSON(al.geom)::json,
            'properties', json_build_object(
              'id', al.id,
              'name', al.name,
              'version_ref', al.version_ref,
              'source_crs', al.source_crs,
              'start_chainage_m', al.start_chainage_m,
              'end_chainage_m', al.end_chainage_m
            )
          )
        ), '[]'::json)
      )
      FROM public.alignments al
      WHERE al.project_id = p_project_id
    ), '{"type":"FeatureCollection","features":[]}'::json),
    'parcels', COALESCE((
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', extensions.ST_AsGeoJSON(pa.geom)::json,
            'properties', json_build_object(
              'id', pa.id,
              'parcel_ref', pa.parcel_ref,
              'survey_no', pa.survey_no,
              'gat_no', pa.gat_no,
              'khasra_no', pa.khasra_no,
              'village', pa.village,
              'district', pa.district,
              'state', pa.state,
              'total_area_sqm', pa.total_area_sqm,
              'is_synthetic', pa.is_synthetic,
              'affected_area_sqm', pp.affected_area_sqm,
              'affected_percentage', CASE
                WHEN pa.total_area_sqm IS NOT NULL AND pa.total_area_sqm > 0
                THEN ROUND((COALESCE(pp.affected_area_sqm, 0) / pa.total_area_sqm * 100)::numeric, 2)
                ELSE 0
              END,
              'spatial_status', CASE
                WHEN pp.affected_area_sqm IS NULL THEN 'pending_analysis'
                WHEN pp.affected_area_sqm = 0 THEN 'analyzed_unaffected'
                WHEN pp.affected_area_sqm > 0 THEN 'candidate_affected'
                ELSE 'pending_analysis'
              END
            )
          )
        ), '[]'::json)
      )
      FROM public.parcels pa
      LEFT JOIN public.project_parcels pp
        ON pp.parcel_id = pa.id AND pp.project_id = p_project_id
      WHERE pa.id IN (
        SELECT parcel_id FROM public.project_parcels WHERE project_id = p_project_id
      )
    ), '{"type":"FeatureCollection","features":[]}'::json),
    'corridor', COALESCE((
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', extensions.ST_AsGeoJSON(extensions.ST_Buffer(al.geom::extensions.geography, 120)::extensions.geometry)::json,
            'properties', json_build_object(
              'id', al.id,
              'name', 'DEMO analysis corridor (120 m buffer)',
              'note', 'REPRESENTATIVE DEMO buffer — not an official right-of-way standard.',
              'buffer_m', 120
            )
          )
        ), '[]'::json)
      )
      FROM public.alignments al
      WHERE al.project_id = p_project_id
    ), '{"type":"FeatureCollection","features":[]}'::json),
    'summary', (
      SELECT json_build_object(
        'alignment_length_km', COALESCE((
          SELECT ROUND((extensions.ST_Length(al.geom::extensions.geography) / 1000)::numeric, 3)
          FROM public.alignments al
          WHERE al.project_id = p_project_id
          ORDER BY al.created_at DESC
          LIMIT 1
        ), 0),
        'parcels_displayed', COUNT(pa.id),
        'candidate_affected', COUNT(pa.id) FILTER (WHERE COALESCE(pp.affected_area_sqm, 0) > 0),
        'total_affected_area_sqm', COALESCE(SUM(pp.affected_area_sqm), 0)
      )
      FROM public.parcels pa
      LEFT JOIN public.project_parcels pp
        ON pp.parcel_id = pa.id AND pp.project_id = p_project_id
      WHERE pa.id IN (
        SELECT parcel_id FROM public.project_parcels WHERE project_id = p_project_id
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_project_gis_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_gis_data(uuid) TO authenticated;
