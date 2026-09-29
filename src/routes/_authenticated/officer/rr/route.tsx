import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireDepartment } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/officer/rr")({
  beforeLoad: () => requireDepartment("rr"),
  component: () => <Outlet />,
});
