-- Remove duplicate A-Ward owner relationships and protect the logical key.
-- This migration intentionally does not re-import owner data.
BEGIN;

WITH ranked AS (
  SELECT li.id,
         row_number() OVER (
           PARTITION BY li.parcel_id, li.party_id, li.interest_type
           ORDER BY li.created_at ASC NULLS LAST, li.id ASC
         ) AS rn
  FROM public.land_interests AS li
  JOIN public.parcels AS p ON p.id = li.parcel_id
  WHERE p.source_ref ->> 'ward' = 'A Ward'
), deleted AS (
  DELETE FROM public.land_interests AS li
  USING ranked
  WHERE li.id = ranked.id AND ranked.rn > 1
  RETURNING li.id
)
SELECT count(*) AS deleted_duplicate_rows FROM deleted;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.land_interests
    GROUP BY parcel_id, party_id, interest_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create logical land_interests uniqueness rule: duplicate groups remain';
  END IF;
END
$$;

CREATE UNIQUE INDEX uq_land_interests_parcel_party_interest
  ON public.land_interests (parcel_id, party_id, interest_type);

COMMIT;

-- Post-apply read-only validation queries:
-- SELECT count(*) AS a_ward_rows
-- FROM public.land_interests li JOIN public.parcels p ON p.id = li.parcel_id
-- WHERE p.source_ref ->> 'ward' = 'A Ward';
-- SELECT count(*) AS a_ward_unique_relationships FROM (
--   SELECT li.parcel_id, li.party_id, li.interest_type
--   FROM public.land_interests li JOIN public.parcels p ON p.id = li.parcel_id
--   WHERE p.source_ref ->> 'ward' = 'A Ward'
--   GROUP BY li.parcel_id, li.party_id, li.interest_type
-- ) AS relationships;
-- SELECT count(*) AS a_ward_duplicate_groups FROM (
--   SELECT li.parcel_id, li.party_id, li.interest_type
--   FROM public.land_interests li JOIN public.parcels p ON p.id = li.parcel_id
--   WHERE p.source_ref ->> 'ward' = 'A Ward'
--   GROUP BY li.parcel_id, li.party_id, li.interest_type HAVING count(*) > 1
-- ) AS duplicates;
-- SELECT count(*) AS global_duplicate_groups FROM (
--   SELECT parcel_id, party_id, interest_type FROM public.land_interests
--   GROUP BY parcel_id, party_id, interest_type HAVING count(*) > 1
-- ) AS duplicates;
-- SELECT p.parcel_ref, pt.display_name, count(*) AS row_count
-- FROM public.land_interests li
-- JOIN public.parcels p ON p.id = li.parcel_id
-- JOIN public.parties pt ON pt.id = li.party_id
-- WHERE p.parcel_ref = 'MH-AWARD-1996'
-- GROUP BY p.parcel_ref, pt.display_name ORDER BY pt.display_name;
-- SELECT p.parcel_ref, count(li.id) AS land_interest_rows
-- FROM public.parcels p LEFT JOIN public.land_interests li ON li.parcel_id = p.id
-- WHERE p.parcel_ref IN ('MH-AWARD-0024','MH-AWARD-0037','MH-AWARD-0048',
--   'MH-AWARD-0049','MH-AWARD-0420','MH-AWARD-2159')
-- GROUP BY p.parcel_ref ORDER BY p.parcel_ref;
-- SELECT count(*) AS a_ward_project_parcels
-- FROM public.project_parcels pp JOIN public.projects pr ON pr.id = pp.project_id
-- WHERE pr.project_code = 'A-WARD-MH-001';
