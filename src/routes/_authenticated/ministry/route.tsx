import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/ministry")({
  beforeLoad: () => requireRole("ministry"),
  component: () => <Outlet />,
});
