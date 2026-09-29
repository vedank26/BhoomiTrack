import { Link, useLocation } from "@tanstack/react-router";
import {
  OFFICER_DEPARTMENT_META,
  ROLE_META,
  type OfficerDepartment,
  type Role,
} from "@/lib/domain";
import { useAuth } from "@/lib/auth";
import { OFFICER_FALLBACK_NAV, OFFICER_NAV, PORTAL_NAV } from "@/lib/navigation";

/**
 * Grouped portal navigation. Rendered as a fixed rail on large screens and
 * inside a disclosure panel on small screens (see AppShell).
 *
 * Officer navigation is department-scoped, but if a signed-in officer has no
 * department yet, the generic officer dashboard remains available instead of
 * forcing a department assignment.
 */
export function PortalSidebar({
  portal,
  department,
  onNavigate,
}: {
  portal: Role;
  department?: OfficerDepartment | null;
  onNavigate?: () => void;
}) {
  const { department: authDepartment } = useAuth();
  const location = useLocation();
  const citizenCaseId = String((location.search as { caseId?: string }).caseId ?? "");

  const activeDepartment = department ?? authDepartment ?? null;

  const groups =
    portal === "officer"
      ? activeDepartment
        ? OFFICER_NAV[activeDepartment]
        : OFFICER_FALLBACK_NAV
      : PORTAL_NAV[portal];

  const sidebarLabel =
    portal === "officer"
      ? activeDepartment
        ? (OFFICER_DEPARTMENT_META[activeDepartment]?.label ?? "Officer Portal")
        : "Officer / Admin"
      : ROLE_META[portal].label;

  return (
    <nav aria-label={`${sidebarLabel} navigation`} className="space-y-5 p-3">
      {portal === "officer" && activeDepartment ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 shadow-sm">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
            Department Scope
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-foreground">
            {OFFICER_DEPARTMENT_META[activeDepartment]?.label}
          </p>
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="px-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) =>
              item.to ? (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    {...(portal === "citizen" && citizenCaseId
                      ? { search: { caseId: citizenCaseId } }
                      : {})}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:text-foreground"
                    activeOptions={{ exact: true }}
                    activeProps={{
                      className:
                        "bg-secondary text-secondary-foreground shadow-sm ring-1 ring-primary/20 border-l-4 border-primary",
                      "aria-current": "page",
                    }}
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-md bg-background/70 text-[0.7rem] text-muted-foreground">
                      {item.label.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ) : (
                <li key={item.key}>
                  <span
                    aria-disabled="true"
                    title={`Delivered in ${item.phase}`}
                    className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground/80 opacity-70"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span className="inline-flex size-5 items-center justify-center rounded-md bg-background/50 text-[0.7rem]">
                        {item.label.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px text-[0.58rem] font-semibold uppercase tracking-wide">
                      {item.phase}
                    </span>
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}
