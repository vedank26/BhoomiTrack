import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard, PageHeader, Section } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/revenue/")({
  head: () => ({
    meta: [
      { title: "Land Acquisition Dashboard — BhoomiTrack" },
      {
        name: "description",
        content:
          "Land Acquisition Officer dashboard for acquisition cases and supported workflow context.",
      },
    ],
  }),
  component: RevenueDashboard,
});

function RevenueDashboard() {
  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });
  const objectionCount = cases.reduce((count, caseItem) => count + caseItem.objections.length, 0);
  const casesWithAwardContext = cases.filter((caseItem) => caseItem.award !== null).length;

  return (
    <AppShell portal="officer" department="land_acquisition">
      <PageHeader
        eyebrow="Land Acquisition · Officer Portal"
        title="Land Acquisition Console"
        description="Acquisition case identity and workflow context from the shared case store."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <Section
        title="Case context"
        description="Counts reflect cases visible to this session and adapter-backed demo context where noted."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Cases available"
            value={isLoading ? "…" : isError ? "Unavailable" : String(cases.length)}
          />
          <MetricCard
            label="Demo objection entries"
            value={isLoading ? "…" : isError ? "Unavailable" : String(objectionCount)}
            note="Synthetic adapter context"
          />
          <MetricCard
            label="Cases with demo award context"
            value={isLoading ? "…" : isError ? "Unavailable" : String(casesWithAwardContext)}
            note="Synthetic adapter context"
          />
        </div>
      </Section>

      <Section
        title="Acquisition cases"
        description="Canonical case, project, and parcel identity."
      >
        {isLoading ? <p className="text-sm text-muted-foreground">Loading shared cases…</p> : null}
        {isError ? (
          <p className="text-sm text-destructive">Shared case data is unavailable.</p>
        ) : null}
        {!isLoading && !isError && cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases are available to this session.</p>
        ) : null}
        <div className="space-y-3">
          {cases.map((caseItem) => (
            <article
              key={caseItem.id}
              className="surface-panel flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {caseItem.id}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {caseItem.project.projectCode || "Project code unavailable"} ·{" "}
                  {caseItem.project.projectName || "Project name unavailable"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {caseItem.parcel.parcelRef || "Parcel reference unavailable"} ·{" "}
                  {caseItem.parcel.village || "Village unavailable"}
                </p>
              </div>
              <Link
                to="/officer/revenue/cases"
                className="inline-flex shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
              >
                Open case register
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
