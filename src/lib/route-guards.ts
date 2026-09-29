import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchDepartment, fetchRole } from "./auth";
import {
  OFFICER_DEPARTMENT_META,
  type OfficerDepartment,
  type Role,
} from "./domain";

/**
 * Route-level role check for the protected portals.
 *
 * The role is read from the database, not from client state, so switching the
 * prototype demo role cannot grant access. Frontend guards are a usability
 * layer only — Phase 2 adds Row Level Security for the real data boundary.
 */
export async function requireRole(required: Role) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth" });

  const role = await fetchRole(data.user.id);
  if (role !== required) {
    throw redirect({ to: "/unauthorized" });
  }
  return { role };
}

export async function requireDepartment(required: OfficerDepartment) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth" });

  const role = await fetchRole(data.user.id);
  if (role !== "officer") {
    throw redirect({ to: "/unauthorized" });
  }

  const department = await fetchDepartment(data.user.id);
  if (department !== required) {
    throw redirect({
      to: department ? (OFFICER_DEPARTMENT_META[department].home as any) : "/unauthorized",
    });
  }

  return { role, department };
}
