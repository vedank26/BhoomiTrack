import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { AGENCIES, AGENCY_META } from "@/lib/domain";
import { requireRole } from "@/lib/route-guards";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";

export const Route = createFileRoute("/_authenticated/ministry/")({
  beforeLoad: () => requireRole("ministry"),
  head: () => ({
    meta: [
      { title: "Ministry Oversight — BhoomiTrack" },
      {
        name: "description",
        content: "Programme oversight using supported project and acquisition case context.",
      },
      { property: "og:title", content: "Ministry Oversight — BhoomiTrack" },
      {
        property: "og:description",
        content: "Supported project and acquisition case context.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MinistryPortal,
});

function MinistryPortal() {
  const casesQuery = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  return (
    <AppShell portal="ministry">
      <PageHeader
        eyebrow="Ministry / Oversight"
        title="Programme overview"
        description="Project and case context comes from the shared case source. Portfolio analytics and GIS impact are unavailable here unless supplied by a verified source."
      />

      <Section
        title="Agency availability"
        description="National Highways is the active prototype. Other agencies remain preview experiences."
      >
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AGENCIES.map((agency) => {
            const metadata = AGENCY_META[agency];
            const active = metadata.status === "Active Prototype";

            return (
              <li
                key={agency}
                className="surface-panel flex items-center justify-between gap-3 p-4"
              >
                <span className="text-sm font-medium">{metadata.label}</span>
                <StatusPill tone={active ? "progress" : "neutral"}>
                  {active ? "Active prototype" : "Preview / Coming Soon"}
                </StatusPill>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        title="Supported acquisition cases"
        description="Case, project, parcel, and current stage are read from the shared case store under the signed-in session’s RLS."
      >
        {casesQuery.isPending ? (
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            Loading cases visible to this account…
          </p>
        ) : casesQuery.isError ? (
          <p role="alert" className="surface-panel p-4 text-sm text-destructive">
            Case context could not be loaded.
          </p>
        ) : casesQuery.data.length === 0 ? (
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            No acquisition cases are visible to this account.
          </p>
        ) : (
          <ul className="space-y-3">
            {casesQuery.data.map((sharedCase) => (
              <li key={sharedCase.id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{sharedCase.id}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sharedCase.project.projectName || "Project name unavailable"}
                      {sharedCase.project.projectCode ? ` · ${sharedCase.project.projectCode}` : ""}
                    </p>
                  </div>
                  <StatusPill tone="neutral">
                    {getStageDisplayLabel(sharedCase.currentStage)}
                  </StatusPill>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Parcel</dt>
                    <dd className="font-medium">
                      {sharedCase.parcel.parcelRef || "Parcel reference unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">District</dt>
                    <dd className="font-medium">
                      {sharedCase.parcel.district || "District unavailable"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Readiness, blockers, and GIS impact are unavailable from this Ministry view’s
                  verified data source.
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AppShell>
  );
}
