-- ---------------------------------------------------------------------------
-- Best-effort correction for A Ward parcel geometry offset.
--
-- Estimated from comparing the dataset's own coastline edges against two
-- verified real-world reference points:
--   - Radio Club (harbour/east side, on the water): dataset overshot east
--     by ~136 m at this latitude.
--   - Cuffe Parade Park (Arabian Sea/west side, on the water): dataset
--     overshot west by ~319 m at this latitude.
--
-- These two measurements disagree with a pure translation (the dataset
-- looks slightly too WIDE east-west near Colaba, not just shifted one way),
-- so this is not a fully verified fix -- it is calibrated to the harbour
-- side only, since that is the side visibly spilling into the sea in the
-- screenshots this was diagnosed from. Re-check visually after applying.
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE public.parcels
SET geom = extensions.ST_Translate(geom, -0.00130, 0)
WHERE source_ref ->> 'ward' = 'A Ward';

COMMIT;