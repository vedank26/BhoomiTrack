import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  APP,
  OFFICER_DEPARTMENTS,
  OFFICER_DEPARTMENT_META,
  AGENCIES,
  AGENCY_META,
  ROLES,
  ROLE_META,
  type OfficerDepartment,
  type Agency,
  type Role,
} from "@/lib/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BhoomiTrack" },
      {
        name: "description",
        content: "Sign in to BhoomiTrack to reach your officer, ministry or landowner portal.",
      },
      { property: "og:title", content: "Sign in — BhoomiTrack" },
      {
        property: "og:description",
        content:
          "Role-based sign in for officer, ministry oversight and citizen/landowner portals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { status, role, roleLoading, department, departmentLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<Role>("citizen");
  const [signupDepartment, setSignupDepartment] =
    useState<OfficerDepartment>("project_authority_gis");
  const [signupAgency, setSignupAgency] = useState<Agency>("national_highways");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in → go to the portal the account's role allows.
  useEffect(() => {
    if (status === "signedIn" && role && !roleLoading) {
      if (role === "officer") {
        if (departmentLoading) return;
        const dest = department ? OFFICER_DEPARTMENT_META[department].home : "/officer";
        navigate({
          to: dest as
            | "/officer"
            | "/officer/revenue"
            | "/officer/survey"
            | "/officer/treasury"
            | "/officer/rr",
          replace: true,
        });
      } else {
        navigate({ to: ROLE_META[role].home, replace: true });
      }
    }
  }, [status, role, roleLoading, department, departmentLoading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) setError(err.message);
    } else {
      if (signupRole === "officer" && !signupDepartment) {
        setError("Please select a department for the officer account.");
        setBusy(false);
        return;
      }

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            role: signupRole,
            department: signupRole === "officer" ? signupDepartment : null,
            agency: signupRole === "officer" ? signupAgency : null,
          },
        },
      });
      if (err) setError(err.message);
      else if (!data.session) setNotice(t("auth.checkEmail"));
    }
    setBusy(false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <div className="surface-panel p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {APP.code}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold">
            {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.syntheticIdentities")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold">
                {t("auth.email")}
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold">
                {t("auth.password")}
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {mode === "signup" ? (
              <>
                <div>
                  <label htmlFor="auth-role" className="block text-sm font-semibold">
                    {t("auth.role")}
                  </label>
                  <select
                    id="auth-role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as Role)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">{t("auth.roleHint")}</p>
                </div>

                {signupRole === "officer" ? (
                  <>
                    <div>
                      <label htmlFor="auth-department" className="block text-sm font-semibold">
                        Department
                      </label>
                      <select
                        id="auth-department"
                        value={signupDepartment}
                        onChange={(e) => setSignupDepartment(e.target.value as OfficerDepartment)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {OFFICER_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {OFFICER_DEPARTMENT_META[d].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="auth-agency" className="block text-sm font-semibold">
                        Agency
                      </label>
                      <select
                        id="auth-agency"
                        value={signupAgency}
                        onChange={(e) => setSignupAgency(e.target.value as Agency)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {AGENCIES.map((a) => {
                          const meta = AGENCY_META[a];
                          const label =
                            meta.status === "Preview" ? `${meta.label} (Preview)` : meta.label;
                          return (
                            <option key={a} value={a}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {t("auth.error")}: {error}
              </p>
            ) : null}
            {notice ? (
              <p
                role="status"
                className="rounded-md border border-border bg-secondary px-3 py-2 text-sm"
              >
                {notice}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {busy ? t("auth.working") : mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 text-sm font-semibold text-primary underline"
          >
            {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
          </button>

          {status === "loading" ? (
            <p className="mt-4 text-xs text-muted-foreground" role="status">
              {t("auth.checkingSession")}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
