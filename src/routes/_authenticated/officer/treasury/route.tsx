import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireDepartment } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/officer/treasury")({
  beforeLoad: () => requireDepartment("treasury_finance"),
  component: () => <Outlet />,
});
