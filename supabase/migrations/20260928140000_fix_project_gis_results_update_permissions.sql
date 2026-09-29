GRANT UPDATE ON public.project_gis_results TO authenticated;

DROP POLICY IF EXISTS project_gis_results_update ON public.project_gis_results;
CREATE POLICY project_gis_results_update ON public.project_gis_results
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'officer'::public.app_role))
  WITH CHECK (has_role(auth.uid(), 'officer'::public.app_role));
