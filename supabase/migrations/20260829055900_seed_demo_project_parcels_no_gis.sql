-- ============================================================================
-- 20260829055900_seed_demo_project_parcels_no_gis.sql
-- ============================================================================
-- Seeds the DEMO-MH-001 project and four canonical demo parcels WITHOUT
-- geometry, so the downstream acquisition-case and land-interest seeds can
-- run on environments where PostGIS / ST_GeomFromText is not available.
--
-- geom is intentionally left NULL (column is nullable per schema).
-- affected_area_sqm is set to 0 (GIS-derived value not computable without PostGIS).
--
-- Idempotent: ON CONFLICT … DO NOTHING throughout.
-- No new tables, columns, enums, or RLS policies are created.
-- ============================================================================

-- 1. Demo project
INSERT INTO public.projects (
    project_code, project_name, project_type, authority,
    state, districts, description, status, is_synthetic, metadata
) VALUES (
    'DEMO-MH-001',
    'Mumbai–Pune Infrastructure Corridor',
    'highway',
    'Demonstration Project Authority',
    'Maharashtra',
    ARRAY['Pune', 'Raigad'],
    'SYNTHETIC demo project for Phase 3. Not an official government project.',
    'active'::public.project_status,
    TRUE,
    '{"data_class":"SYNTHETIC","demo":true}'::jsonb
)
ON CONFLICT (project_code) DO NOTHING;

-- 2. Demo parcels (no geometry)
INSERT INTO public.parcels (
    parcel_ref, survey_no, gat_no, khasra_no, village,
    tehsil, district, state, total_area_sqm, land_use,
    source_crs, source_ref, status, is_synthetic
) VALUES
    ('DEMO-PCL-001', 'Survey 18/2', '18', '2', 'Kasarwadi',
     'Haveli', 'Pune', 'Maharashtra', 280000.00, 'agricultural',
     'EPSG:4326', '{"data_class":"SYNTHETIC","demo":true}'::jsonb, 'active', TRUE),
    ('DEMO-PCL-002', 'Survey 22/1', '22', '1', 'Kasarwadi',
     'Haveli', 'Pune', 'Maharashtra', 450000.00, 'agricultural',
     'EPSG:4326', '{"data_class":"SYNTHETIC","demo":true}'::jsonb, 'active', TRUE),
    ('DEMO-PCL-003', 'Survey 31/4', '31', '4', 'Wakad',
     'Haveli', 'Pune', 'Maharashtra', 800000.00, 'agricultural',
     'EPSG:4326', '{"data_class":"SYNTHETIC","demo":true}'::jsonb, 'active', TRUE),
    ('DEMO-PCL-004', 'Survey 44/3', '44', '3', 'Wakad',
     'Haveli', 'Pune', 'Maharashtra', 350000.00, 'agricultural',
     'EPSG:4326', '{"data_class":"SYNTHETIC","demo":true}'::jsonb, 'active', TRUE)
ON CONFLICT (parcel_ref) DO NOTHING;

-- 3. Demo project_parcels links (affected_area_sqm = 0 without PostGIS)
INSERT INTO public.project_parcels (project_id, parcel_id, affected_area_sqm, inclusion_reason)
SELECT
    pr.id,
    pa.id,
    0,
    'SYNTHETIC demo: no GIS-derived area available on this environment.'
FROM public.projects pr
CROSS JOIN public.parcels pa
WHERE pr.project_code = 'DEMO-MH-001'
  AND pa.parcel_ref IN ('DEMO-PCL-001', 'DEMO-PCL-002', 'DEMO-PCL-003', 'DEMO-PCL-004')
ON CONFLICT (project_id, parcel_id) DO NOTHING;
