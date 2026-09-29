-- ============================================================================
-- Phase 3 GIS Core — seed synthetic demo geometry
-- ============================================================================
-- Uses ONLY the authoritative Phase 2 tables (projects, alignments, parcels,
-- project_parcels). No schema changes, no new tables, no duplicate database.
--
-- All rows are SYNTHETIC demo data for the Mumbai–Pune Infrastructure
-- Corridor — DEMO project. Idempotent: ON CONFLICT DO NOTHING.
--
-- Geometry convention (Phase 2): EPSG:4326 (WGS84 lon/lat).
--   alignments -> geometry(MultiLineString, 4326)
--   parcels    -> geometry(MultiPolygon, 4326)
--
-- The 120 m analysis corridor used for affected-area calculation is a
-- REPRESENTATIVE DEMO buffer of the stored alignment. It is NOT an official
-- government right-of-way standard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Demo project (Phase 2 schema)
-- ---------------------------------------------------------------------------
INSERT INTO public.projects (
  project_code,
  project_name,
  project_type,
  authority,
  state,
  districts,
  description,
  status,
  is_synthetic,
  metadata
)
VALUES (
  'DEMO-MH-001',
  'Mumbai–Pune Infrastructure Corridor',
  'highway',
  'Demonstration Project Authority',
  'Maharashtra',
  ARRAY['Pune', 'Raigad'],
  'SYNTHETIC demo project for the Phase 3 GIS prototype. Not an official government project.',
  'active',
  true,
  jsonb_build_object('data_class', 'SYNTHETIC', 'demo', true)
)
ON CONFLICT (project_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Demo alignment (Phase 2 schema: geometry(MultiLineString, 4326))
--    A gentle ~12 km curve from (73.76, 18.52) to (73.85, 18.585).
-- ---------------------------------------------------------------------------
WITH demo_project AS (
  SELECT id FROM public.projects WHERE project_code = 'DEMO-MH-001'
),
demo_alignment AS (
  SELECT ST_GeomFromText(
    'MULTILINESTRING((
      73.7600 18.5200,
      73.7650 18.5210,
      73.7710 18.5215,
      73.7770 18.5210,
      73.7820 18.5220,
      73.7860 18.5250,
      73.7880 18.5290,
      73.7870 18.5330,
      73.7840 18.5370,
      73.7800 18.5410,
      73.7780 18.5460,
      73.7790 18.5510,
      73.7820 18.5550,
      73.7880 18.5570,
      73.7940 18.5570,
      73.8000 18.5550,
      73.8060 18.5520,
      73.8120 18.5510,
      73.8180 18.5520,
      73.8230 18.5550,
      73.8270 18.5590,
      73.8290 18.5640,
      73.8300 18.5690,
      73.8320 18.5730,
      73.8360 18.5760
    ))',
    4326
  ) AS geom
)
INSERT INTO public.alignments (
  project_id,
  version_ref,
  name,
  geom,
  start_chainage_m,
  end_chainage_m,
  source_crs,
  metadata
)
SELECT
  dp.id,
  'v1',
  'DEMO Alignment — Mumbai–Pune Corridor',
  da.geom,
  0,
  ROUND(ST_Length(da.geom::geography)::numeric, 2),
  'EPSG:4326',
  jsonb_build_object('data_class', 'SYNTHETIC', 'demo', true)
FROM demo_project dp
CROSS JOIN demo_alignment da
ON CONFLICT (project_id, version_ref) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Demo parcels (Phase 2 schema: geometry(MultiPolygon, 4326))
--    Irregular, varied-size cadastral-style polygons. Some cross the
--    alignment (candidate affected), some are offset (unaffected).
--    recorded total area is derived from the geometry via ST_Area(geography).
-- ---------------------------------------------------------------------------
INSERT INTO public.parcels (
  parcel_ref,
  survey_no,
  gat_no,
  khasra_no,
  village,
  tehsil,
  district,
  state,
  total_area_sqm,
  land_use,
  geom,
  source_crs,
  source_ref,
  status,
  is_synthetic
)
SELECT
  p.ref,
  p.survey,
  p.gat,
  p.khasra,
  p.village,
  'Haveli',
  'Pune',
  'Maharashtra',
  ROUND(ST_Area(p.geom::geography)::numeric, 2),
  'agricultural',
  p.geom,
  'EPSG:4326',
  jsonb_build_object('data_class', 'SYNTHETIC', 'demo', true),
  'active',
  true
FROM (VALUES
  -- P1: large rectangle ~280,000 m² positioned on alignment
  ('DEMO-PCL-001', 'Survey 18/2', '18', '2', 'Kasarwadi',
   ST_GeomFromText('MULTIPOLYGON(((73.7650 18.5180,73.7750 18.5180,73.7750 18.5250,73.7650 18.5250,73.7650 18.5180)))', 4326)),
  -- P2: large rectangle ~450,000 m² positioned on alignment
  ('DEMO-PCL-002', 'Survey 22/1', '22', '1', 'Kasarwadi',
   ST_GeomFromText('MULTIPOLYGON(((73.7800 18.5320,73.7900 18.5320,73.7900 18.5400,73.7800 18.5400,73.7800 18.5320)))', 4326)),
  -- P3: large rectangle ~800,000 m² positioned on alignment
  ('DEMO-PCL-003', 'Survey 31/4', '31', '4', 'Wakad',
   ST_GeomFromText('MULTIPOLYGON(((73.7950 18.5400,73.8050 18.5400,73.8050 18.5500,73.7950 18.5500,73.7950 18.5400)))', 4326)),
  -- P4: large rectangle ~350,000 m² positioned on alignment
  ('DEMO-PCL-004', 'Survey 44/3', '44', '3', 'Wakad',
   ST_GeomFromText('MULTIPOLYGON(((73.8150 18.5550,73.8250 18.5550,73.8250 18.5650,73.8150 18.5650,73.8150 18.5550)))', 4326)),
  -- P5: irregular triangle ~2,200 m², far from alignment — unaffected
  ('DEMO-PCL-005', 'Survey 51/1', '51', '1', 'Tathawade',
   ST_GeomFromText('MULTIPOLYGON(((73.8380 18.5825,73.8410 18.5835,73.8390 18.5855,73.8380 18.5825)))', 4326)),
  -- P6: irregular hexagon ~6,000 m², offset from alignment — unaffected
  ('DEMO-PCL-006', 'Survey 55/2', '55', '2', 'Tathawade',
   ST_GeomFromText('MULTIPOLYGON(((73.7900 18.5500,73.7925 18.5505,73.7930 18.5525,73.7915 18.5540,73.7895 18.5535,73.7890 18.5515,73.7900 18.5500)))', 4326)),
  -- P7: irregular pentagon ~12,000 m², offset from alignment — unaffected
  ('DEMO-PCL-007', 'Survey 60/5', '60', '5', 'Wakad',
   ST_GeomFromText('MULTIPOLYGON(((73.8250 18.5700,73.8290 18.5705,73.8300 18.5730,73.8275 18.5750,73.8240 18.5735,73.8250 18.5700)))', 4326))
) AS p(ref, survey, gat, khasra, village, geom)
ON CONFLICT (parcel_ref) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Demo project <-> parcel links with GIS-calculated affected area.
--    affected_area_sqm = ST_Area(ST_Intersection(parcel, 120 m DEMO buffer)).
--    recorded_area_sqm (authoritative) is never overwritten.
-- ---------------------------------------------------------------------------
INSERT INTO public.project_parcels (
  project_id,
  parcel_id,
  affected_area_sqm,
  inclusion_reason
)
SELECT
  dp.id,
  pa.id,
  COALESCE(
    ROUND(ST_Area(ST_Intersection(pa.geom::geography, ST_Buffer(al.geom::geography, 120)))::numeric, 2),
    0
  ),
  'SYNTHETIC demo: parcel intersects the 120 m DEMO analysis corridor (not an official right-of-way).'
FROM public.projects dp
JOIN public.parcels pa ON pa.parcel_ref IN (
  'DEMO-PCL-001', 'DEMO-PCL-002', 'DEMO-PCL-003', 'DEMO-PCL-004',
  'DEMO-PCL-005', 'DEMO-PCL-006', 'DEMO-PCL-007'
)
CROSS JOIN LATERAL (
  SELECT geom
  FROM public.alignments
  WHERE project_id = dp.id
  ORDER BY created_at DESC
  LIMIT 1
) al
WHERE dp.project_code = 'DEMO-MH-001'
ON CONFLICT (project_id, parcel_id) DO NOTHING;