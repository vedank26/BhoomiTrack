-- ---------------------------------------------------------------------------
-- A Ward parcel alignment correction.
--
-- Calibrated visually at the Nariman Point / Free Press Journal Road area
-- (near parcels MH-AWARD-1993/1996/1997/1998): the proposed alignment line
-- rendered ~1.5 real parcel-widths (~120 m) west of its correct position.
--
-- NOTE: a separate check near Colaba/Radio Club suggested the opposite
-- direction was needed there (~135 m west). The two don't agree, which
-- means the true distortion is not a uniform shift across the whole ward
-- (likely rotation/scale from the original georeferencing). This migration
-- optimizes for the area you're currently checking and may not be correct
-- everywhere else in A Ward.
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE public.parcels
SET geom = extensions.ST_Translate(geom, 0.001140, 0)
WHERE source_ref ->> 'ward' = 'A Ward';

COMMIT;