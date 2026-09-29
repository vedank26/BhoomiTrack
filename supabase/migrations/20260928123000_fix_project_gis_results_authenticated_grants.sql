-- RLS policies decide which rows are visible; table privileges decide whether
-- the authenticated role may reach the table at all.
GRANT SELECT ON public.project_gis_results TO authenticated;
GRANT INSERT ON public.project_gis_results TO authenticated;

-- The publish function is SECURITY INVOKER, so its caller still needs the
-- table privileges above and remains subject to the officer RLS policy.
GRANT EXECUTE ON FUNCTION public.get_project_gis_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_project_gis_result(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) TO authenticated;
