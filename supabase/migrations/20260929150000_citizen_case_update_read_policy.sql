-- Limit Citizen workflow-event reads to explicitly visible Citizen case updates.
-- The existing case helper preserves the current parcel/party authorization path.
DROP POLICY IF EXISTS "citizen_read_own_events"
  ON public.case_workflow_events;

CREATE POLICY "citizen_read_own_events"
  ON public.case_workflow_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'citizen'::public.app_role
    )
    AND public.citizen_can_see_case(case_id)
    AND event_type = 'CITIZEN_CASE_UPDATE'
    AND metadata @> '{"visible_to_citizen": true}'::jsonb
  );
