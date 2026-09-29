import { createFileRoute } from "@tanstack/react-router";
import { PhaseWorkspacePage } from "@/components/phase/PhaseWorkspacePage";

export const Route = createFileRoute("/_authenticated/officer/$workspace")({
  component: OfficerWorkspaceRoute,
});

function OfficerWorkspaceRoute() {
  const { workspace } = Route.useParams();

  return <PhaseWorkspacePage portal="officer" workspace={workspace} />;
}
