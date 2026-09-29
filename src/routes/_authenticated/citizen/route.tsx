import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/citizen")({
  beforeLoad: () => requireRole("citizen"),
  component: () => <Outlet />,
});
