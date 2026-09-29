import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

/**
 * Officer portal layout. Every officer route (dashboard, GIS, and future
 * pages) lives under this layout so the officer role check applies once.
 */
export const Route = createFileRoute("/_authenticated/officer")({
  beforeLoad: () => requireRole("officer"),
  component: () => <Outlet />,
});