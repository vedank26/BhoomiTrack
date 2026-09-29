# SIH26016 — Phase 2 Database Documentation

Backend: single Lovable Cloud PostgreSQL instance with PostGIS 3.3.7 (installed in the
`extensions` schema). No second backend or database was introduced.

## Migration strategy

| Migration | Purpose |
| --- | --- |
| `0000_phase1_identity_roles` | Re-applied Phase 1 SQL byte-for-byte (`profiles`, `user_roles`, `app_role` enum, `has_role`, `current_app_role`, `handle_new_user` trigger) on the newly provisioned Cloud backend. Unchanged from the imported project. |
| `0001_phase2_core_domain` | New Phase 2 core domain: PostGIS, enums, 8 business tables, constraints, indexes, `updated_at` triggers, citizen-visibility helpers, grants and RLS policies. |

Phase 1 SQL was not modified. Synthetic demo rows are inserted as data (not migrations).

## Tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| `projects` | Project identity/metadata | `project_code` (unique), `project_name`, `project_type`, `authority`, `state`, `districts[]`, `status` |
| `alignments` | Versioned route geometry per project | `project_id`, `version_ref` (unique per project), `geom`, `start/end_chainage_m`, `source_crs` |
| `parcels` | Project-independent land unit | `parcel_ref` (unique), `survey_no`/`gat_no`/`khasra_no`, village/tehsil/district/state, `total_area_sqm`, `land_use`, `geom` |
| `project_parcels` | Many-to-many project ↔ parcel link | unique `(project_id, parcel_id)`, `affected_area_sqm` |
| `parties` | Persons/entities holding interests; optional `user_id` link to an authenticated citizen | `party_ref` (unique), `party_type` |
| `land_interests` | Ownership / tenancy / other interests | `parcel_id`, `party_id`, `interest_type`, fractional share, `verification`, effective dates |
| `acquisition_cases` | Project + parcel + workflow | `case_no` (unique), unique `(project_id, parcel_id)`, `method`, `current_stage`, `status`, `priority`, `responsible_office`, `assigned_to` |
| `case_workflow_events` | Append-only stage/event history | `case_id`, `stage`, `event_type`, `from_stage`/`to_stage`, `actor_user_id`, `occurred_at`, `remarks` |

Relationships: `projects 1—N alignments`; `projects N—N parcels` (via `project_parcels`);
`parcels 1—N land_interests N—1 parties`; `acquisition_cases N—1 projects`, `N—1 parcels`;
`case_workflow_events N—1 acquisition_cases`.

Auditability: every core table has `created_at` / `updated_at` (trigger-maintained);
`projects`, `alignments`, `parcels`, `acquisition_cases` also carry `created_by` / `updated_by`.
Workflow events retain actor and timestamp and have no UPDATE/DELETE grant.

## Geometry design

- Storage CRS convention: **EPSG:4326 (WGS84 lon/lat)** for every geometry column.
- `alignments.geom` — `MultiLineString(4326)`; `parcels.geom` — `MultiPolygon(4326)` (arbitrary polygons, not rectangles).
- `source_crs` records the CRS of the incoming government dataset; importers must call
  `ST_Transform(geom, 4326)` before insert so mixed-CRS sources normalise on the way in.
- GiST spatial indexes exist on both geometry columns, enabling later intersection,
  affected-area, distance and bbox filtering. Metric maths must project to a metric CRS
  (e.g. `ST_Transform(geom, 32643)` for UTM 43N) or cast to `geography`.
- No spatial computation is implemented in this phase.

## Role / RLS model

Roles come from the existing Phase 1 `user_roles` + `has_role()` security-definer function.
RLS is enabled on all eight new tables; there is no "authenticated can read everything" policy.

- **OFFICER** — SELECT on all core tables; INSERT/UPDATE on projects, alignments, parcels,
  project links, parties, interests and cases; INSERT-only on workflow events (`actor_user_id`
  must equal `auth.uid()`).
- **MINISTRY** — read-only oversight across all core tables; no write policies.
- **CITIZEN** — no blanket access. Visibility is derived from `parties.user_id = auth.uid()`
  via security-definer helpers `citizen_can_see_parcel/case/project`: a citizen sees only
  their own party record, their own land interests, the parcels they hold an interest in,
  the cases on those parcels, those cases' workflow events, and the projects those cases
  belong to. Another citizen's records are invisible.
- DELETE is granted to no application role (service role only).

## Synthetic data strategy

All demo rows are flagged `is_synthetic = true` and named with a `DEMO` prefix:
1 project (`Mumbai–Pune Infrastructure Corridor — DEMO`), 2 alignment versions, 8 parcels,
5 synthetic parties, 11 land interests, 5 acquisition cases, 7 workflow events.
No real personal, bank or government case data is present.
