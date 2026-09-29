import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { PhaseWorkspacePage } from "@/components/phase/PhaseWorkspacePage";

export const Route = createFileRoute("/_authenticated/citizen/$workspace")({
  beforeLoad: () => requireRole("citizen"),
  component: CitizenWorkspaceRoute,
});

function CitizenWorkspaceRoute() {
  const { workspace } = Route.useParams();

  return <PhaseWorkspacePage portal="citizen" workspace={workspace} />;
}
