import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { PhaseWorkspacePage } from "@/components/phase/PhaseWorkspacePage";

export const Route = createFileRoute("/_authenticated/ministry/$workspace")({
  beforeLoad: () => requireRole("ministry"),
  component: MinistryWorkspaceRoute,
});

function MinistryWorkspaceRoute() {
  const { workspace } = Route.useParams();

  return <PhaseWorkspacePage portal="ministry" workspace={workspace} />;
}
