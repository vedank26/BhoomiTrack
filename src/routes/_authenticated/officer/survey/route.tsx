import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireDepartment } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/officer/survey")({
  beforeLoad: () => requireDepartment("survey_land_records"),
  component: () => <Outlet />,
});
