import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import {
  APP,
  OFFICER_DEPARTMENT_META,
  ROLE_META,
  ROLES,
  type OfficerDepartment,
  type Role,
} from "@/lib/domain";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";
import { useDemoRole } from "@/lib/demo-role";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

/**
 * Application top bar: identity, portal switcher, search, notifications,
 * language, accessibility control and the prototype demo-role indicator.
 * Branding is driven by APP so the temporary name is easy to replace.
 */
export function TopBar({
  portal,
  department,
}: {
  portal?: Role;
  department?: OfficerDepartment | null;
}) {
  const location = useLocation();
  const citizenCaseId = String((location.search as { caseId?: string }).caseId ?? "");
  const { t, lang, setLang } = useI18n();
  const { role, setRole, largeText, toggleLargeText } = useDemoRole();
  const { status, user, role: authRole, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40">
      <div className="gov-stripe h-1 w-full" aria-hidden="true" />
      <div className="border-b border-border bg-gov-navy text-gov-navy-foreground">
        <div className="mx-auto grid max-w-[100rem] grid-cols-1 items-center gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-saffron font-serif text-sm font-bold text-saffron-foreground">
                SIH
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-serif text-sm font-semibold">{APP.code}</span>
                <span className="block truncate text-[0.7rem] opacity-75">{t("app.name")}</span>
              </span>
            </Link>

            {portal ? (
              <span className="hidden shrink-0 rounded-md border border-sidebar-border px-2 py-1 text-xs font-semibold lg:inline">
                {portal === "officer" && department
                  ? OFFICER_DEPARTMENT_META[department].label
                  : ROLE_META[portal].label}
              </span>
            ) : null}

            <label className="sr-only" htmlFor="global-search">
              Search
            </label>
            <div className="relative ml-2 hidden min-w-0 max-w-xs flex-1 items-center xl:flex">
              <Search
                className="pointer-events-none absolute left-2.5 size-4 opacity-70"
                aria-hidden="true"
              />
              <input
                id="global-search"
                type="search"
                disabled
                placeholder="Search (Phase 2)"
                className="w-full rounded-md border border-sidebar-border bg-sidebar-accent py-1.5 pl-8 pr-2 text-sm placeholder:opacity-70 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/citizen/notifications"
              search={{ caseId: citizenCaseId || undefined }}
              aria-label="Notifications"
              className="relative inline-flex rounded-md border border-sidebar-border bg-sidebar-accent p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar"
            >
              <Bell className="size-4" aria-hidden="true" />
            </Link>

            <label className="sr-only" htmlFor="lang-select">
              {t("common.language")}
            </label>
            <select
              id="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1.5 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleLargeText}
              aria-pressed={largeText}
              className="rounded-md border border-sidebar-border px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-sidebar-accent"
            >
              A+ <span className="sr-only">{t("common.largeText")}</span>
            </button>

            {status === "signedIn" && user ? (
              <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1">
                <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                  <span className="max-w-[11rem] truncate text-xs font-semibold">{user.email}</span>
                  <span className="text-[0.62rem] uppercase tracking-wide opacity-80">
                    {authRole ? ROLE_META[authRole].label : t("auth.role")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="rounded-md border border-sidebar-border px-2 py-1 text-xs font-semibold transition-colors hover:bg-sidebar"
                >
                  {t("auth.signOut")}
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded-md border border-sidebar-border px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-sidebar-accent"
              >
                {t("auth.signIn")}
              </Link>
            )}

            <div className="flex items-center gap-1.5 rounded-md border border-saffron/60 bg-sidebar-accent px-2 py-1">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-saffron">
                Demo mode
              </span>
              <label className="sr-only" htmlFor="role-select">
                {t("common.demoRole")}
              </label>
              <select
                id="role-select"
                value={role ?? ""}
                onChange={(e) => setRole(e.target.value === "" ? null : (e.target.value as Role))}
                className="max-w-[8.5rem] bg-transparent text-sm"
              >
                <option value="">No role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Portals" className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[100rem] items-center gap-1 overflow-x-auto px-4 py-1.5">
          <Link
            to="/"
            className="shrink-0 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground font-semibold" }}
          >
            {t("nav.home")}
          </Link>
          {ROLES.map((r) => (
            <Link
              key={r}
              to={ROLE_META[r].home}
              className="shrink-0 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-semibold" }}
            >
              {t(`nav.${r}`)}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
