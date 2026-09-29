import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { TopBar } from "./TopBar";
import { PortalSidebar } from "./PortalSidebar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  AGENCY_META,
  OFFICER_DEPARTMENT_META,
  ROLE_META,
  type OfficerDepartment,
  type Role,
} from "@/lib/domain";

/**
 * Global application shell: gov top bar, prototype disclosure banner,
 * portal sidebar (rail on desktop, disclosure panel on small screens),
 * main content column and footer.
 */
export function AppShell({
  portal,
  department,
  children,
}: {
  portal?: Role;
  department?: OfficerDepartment | null;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const { role, department: contextDepartment, agency } = useAuth();

  const currentRole = portal || role;
  const currentDept = department || contextDepartment;
  const isCitizenPortal = currentRole === "citizen";

  let contextLabel = "";
  if (currentRole === "officer" && currentDept) {
    contextLabel = `Officer · ${OFFICER_DEPARTMENT_META[currentDept].label}`;
    if (agency) {
      contextLabel += ` · ${AGENCY_META[agency].label}`;
    }
  } else if (isCitizenPortal) {
    contextLabel = "Citizen";
  } else if (currentRole === "ministry") {
    contextLabel = "Ministry / Program Oversight";
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {portal ? (
        <TopBar portal={portal} department={currentDept ?? null} />
      ) : (
        <TopBar department={currentDept ?? null} />
      )}

      <div
        role="note"
        className="border-b border-border bg-secondary/70 px-4 py-2 text-center text-xs text-secondary-foreground"
      >
        <span className="mr-2 rounded border border-saffron/60 px-1.5 py-px font-bold uppercase tracking-wider text-saffron">
          Demo mode
        </span>
        <span className="font-semibold uppercase tracking-wide">
          {contextLabel ? contextLabel : "Prototype / representative data"}
        </span>
        <span className="mx-2 opacity-40">|</span>
        {t(isCitizenPortal ? "banner.citizenPrototype" : "banner.prototype")}
      </div>

      <div className="flex w-full flex-1 items-start">
        {portal ? (
          <>
            <aside className="sticky top-[7rem] hidden w-[18rem] shrink-0 self-start border-r border-border bg-card/70 backdrop-blur-sm lg:block">
              <PortalSidebar portal={portal} department={currentDept ?? null} />
            </aside>

            <div className="w-full min-w-0 lg:hidden">
              <div className="border-b border-border bg-card/80 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setNavOpen((v) => !v)}
                  aria-expanded={navOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-sm font-semibold text-foreground shadow-sm"
                >
                  {navOpen ? (
                    <X className="size-4" aria-hidden="true" />
                  ) : (
                    <Menu className="size-4" aria-hidden="true" />
                  )}
                  Portal menu
                </button>
              </div>
              {navOpen ? (
                <div className="border-b border-border bg-card">
                  <PortalSidebar
                    portal={portal}
                    department={currentDept ?? null}
                    onNavigate={() => setNavOpen(false)}
                  />
                </div>
              ) : null}
              <main id="main" className="min-w-0 px-4 py-6 md:px-6">
                {children}
              </main>
            </div>

            <main id="main" className="hidden min-w-0 flex-1 px-6 py-8 lg:block xl:px-8">
              {children}
            </main>
          </>
        ) : (
          <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-8">
            {children}
          </main>
        )}
      </div>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[100rem] px-4 py-6 text-xs leading-relaxed text-muted-foreground md:px-8">
          <p className="font-semibold text-foreground">
            BhoomiTrack — Integrated Land Acquisition &amp; Management Platform
          </p>
          <p className="mt-1">
            SIH26016 — Prototype build for demonstration. GIS outputs and AI insights are decision
            support only; they never replace an authoritative land record or a human decision.
          </p>
          <p className="mt-1">The role selector is a demonstration control, not authentication.</p>
        </div>
      </footer>
    </div>
  );
}

/** Placeholder tile for a capability delivered in a later phase. */
export function PhasePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <article className="surface-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-semibold">{title}</h3>
        <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {phase}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}
