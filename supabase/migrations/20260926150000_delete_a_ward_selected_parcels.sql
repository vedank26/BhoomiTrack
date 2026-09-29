BEGIN;

-- 1. Remove project-parcel links first
DELETE FROM public.project_parcels pp
USING public.parcels p
WHERE pp.parcel_id = p.id
  AND p.parcel_ref IN (
    'MH-AWARD-2159',
    'MH-AWARD-0037',
    'MH-AWARD-0048',
    'MH-AWARD-0049',
    'MH-AWARD-0024',
    'MH-AWARD-0420'
  );

-- 2. Remove land-interest records associated with these parcels
DELETE FROM public.land_interests li
USING public.parcels p
WHERE li.parcel_id = p.id
  AND p.parcel_ref IN (
    'MH-AWARD-2159',
    'MH-AWARD-0037',
    'MH-AWARD-0048',
    'MH-AWARD-0049',
    'MH-AWARD-0024',
    'MH-AWARD-0420'
  );

-- 3. Remove the parcels themselves
DELETE FROM public.parcels
WHERE parcel_ref IN (
  'MH-AWARD-2159',
  'MH-AWARD-0037',
  'MH-AWARD-0048',
  'MH-AWARD-0049',
  'MH-AWARD-0024',
  'MH-AWARD-0420'
);

COMMIT;