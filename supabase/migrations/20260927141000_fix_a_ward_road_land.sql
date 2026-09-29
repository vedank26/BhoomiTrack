BEGIN;

-- 1. Remove project-parcel links first
DELETE FROM public.project_parcels pp
USING public.parcels p
WHERE pp.parcel_id = p.id
  AND p.parcel_ref IN (
    'MH-AWARD-0045'
  );

-- 2. Remove land-interest records associated with these parcels
DELETE FROM public.land_interests li
USING public.parcels p
WHERE li.parcel_id = p.id
  AND p.parcel_ref IN (
    'MH-AWARD-0045'
  );

-- 3. Remove the parcels themselves
DELETE FROM public.parcels
WHERE parcel_ref IN (
  'MH-AWARD-0045'
);

COMMIT;