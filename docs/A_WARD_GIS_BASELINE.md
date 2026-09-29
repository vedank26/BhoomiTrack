# A-Ward GIS Baseline

## Scope

This baseline imports the parcel, party, and land-interest sections from Person 1 migration `20260925110000_seed_a_ward_parcels_realistic_owners.sql`. It creates project `A-WARD-MH-001` as a planned highway baseline and links the imported A-Ward parcels with `affected_area_sqm = NULL`.

NULL affected area means final alignment and impact analysis are pending. It does not mean unaffected. No alignment, corridor, acquisition case, or citizen case is created by this baseline.

## Provenance

- Declared source: `A_WARD_QGIS_BASE.gpkg`
- Original CRS: EPSG:32643
- Stored geometry CRS: EPSG:4326
- Parcel rows: 2,404 actual source INSERT rows
- Party rows: 3,288
- Land-interest rows: 3,288
- Source geometry is derived from the supplied GIS baseline; ownership and other non-geometry attributes are synthetic prototype values.

The source migration records `source_ref`, `source_crs`, and `is_synthetic`, including the synthetic-data notice. The GPKG itself was not included in the supplied ZIP; only the generated SQL migration was available for integration.

## GIS status

The status-aware RPC reports `pending_analysis` when `project_parcels.affected_area_sqm` is NULL, `analyzed_unaffected` for zero, and `candidate_affected` for positive values. The existing representative 120 m buffer semantics remain unchanged. Since this baseline creates no alignment, its alignment and corridor collections are empty.

Final coordinated highway alignment and impact analysis remain pending.
