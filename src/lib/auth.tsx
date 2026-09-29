/**
 * Phase 1 — single authentication abstraction.
 *
 * Real Cloud (Supabase) auth: session, user, role, department, loading/error
 * state and sign-out. Pages MUST NOT re-implement auth logic; use `useAuth()`.
 *
 * The role comes from the database (`public.user_roles`), while officer
 * department is resolved from existing auth metadata / profile data without
 * introducing a new schema or migration.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  OFFICER_DEPARTMENTS,
  ROLES,
  AGENCIES,
  type OfficerDepartment,
  type Role,
  type Agency,
} from "./domain";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  role: Role | null;
  roleLoading: boolean;
  department: OfficerDepartment | null;
  departmentLoading: boolean;
  agency: Agency | null;
  agencyLoading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Reads the signed-in user's role. Returns null when no role is assigned. */
export async function fetchRole(userId: string): Promise<Role | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const role = data.role as string;
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : null;
}

/** Reads the signed-in officer's agency. */
export async function fetchAgency(): Promise<Agency | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const metaAgency = userData.user?.user_metadata?.["agency"];
    if (
      typeof metaAgency === "string" &&
      (AGENCIES as readonly string[]).includes(metaAgency)
    ) {
      return metaAgency as Agency;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Legacy department identifier aliases.
 *
 * Prototype accounts created before the Phase 1 rename may still carry the
 * old department strings in their profile or user_metadata.  We translate
 * them at read-time so existing accounts are not locked out.  Nothing is
 * written back to the database.
 */
const LEGACY_DEPARTMENT_ALIAS: Record<string, OfficerDepartment> = {
  revenue_lao: "land_acquisition",
  survey_settlement: "survey_land_records",
};

function resolveDepartment(raw: string): OfficerDepartment | null {
  if ((OFFICER_DEPARTMENTS as readonly string[]).includes(raw)) {
    return raw as OfficerDepartment;
  }
  return LEGACY_DEPARTMENT_ALIAS[raw] ?? null;
}

/** Reads the signed-in officer's department without changing the schema. */
export async function fetchDepartment(
  userId: string,
): Promise<OfficerDepartment | null> {
  try {
    const { data, error } = await (supabase
      .from("profiles")
      .select("department")
      .eq("id", userId)
      .limit(1)
      .maybeSingle() as any);

    if (!error && data && typeof data.department === "string") {
      return resolveDepartment(data.department);
    }

    const { data: userData } = await supabase.auth.getUser();
    const metaDept = userData.user?.user_metadata?.["department"];
    if (typeof metaDept === "string") {
      return resolveDepartment(metaDept);
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [department, setDepartment] = useState<OfficerDepartment | null>(null);
  const [departmentLoading, setDepartmentLoading] = useState(false);

  const [agency, setAgency] = useState<Agency | null>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);

  const loadUserData = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      setDepartment(null);
      setAgency(null);
      return;
    }

    setRoleLoading(true);
    setDepartmentLoading(true);
    setAgencyLoading(true);

    const [nextRole, nextDepartment, nextAgency] = await Promise.all([
      fetchRole(userId),
      fetchDepartment(userId),
      fetchAgency(),
    ]);

    setRole(nextRole);
    setDepartment(nextDepartment);
    setAgency(nextAgency);
    setRoleLoading(false);
    setDepartmentLoading(false);
    setAgencyLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setStatus(next ? "signedIn" : "signedOut");
      void loadUserData(next?.user?.id);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? "signedIn" : "signedOut");
      void loadUserData(data.session?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setDepartment(null);
    setAgency(null);
    setStatus("signedOut");
  }, []);

  const refreshRole = useCallback(
    () => loadUserData(session?.user?.id),
    [loadUserData, session],
  );

  const value = useMemo(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      role,
      roleLoading,
      department,
      departmentLoading,
      agency,
      agencyLoading,
      signOut,
      refreshRole,
    }),
    [status, session, role, roleLoading, department, departmentLoading, agency, agencyLoading, signOut, refreshRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
