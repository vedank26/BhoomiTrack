import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard, PageHeader, Section } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/treasury/")({
  head: () => ({
    meta: [
      { title: "Treasury / Finance Dashboard — BhoomiTrack" },
      {
        name: "description",
        content:
          "Treasury and Finance Department console for compensation award context and payment workflow tracking.",
      },
    ],
  }),
  component: TreasuryDashboard,
});

function TreasuryDashboard() {
  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });
  const awardCases = cases.filter((item) => item.award !== null);
  const paymentCases = cases.filter((item) => item.payment.length > 0);

  return (
    <AppShell portal="officer" department="treasury_finance">
      <PageHeader
        eyebrow="Treasury / Finance · Officer Portal"
        title="Treasury / Finance"
        description="Award context and payment workflow for acquisition cases. Award determination remains with the Revenue Department / LAO."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <Section
        title="Case register"
        description="Identity from the shared acquisition case store; financial context is adapter-backed demo data where present."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Cases available"
            value={isLoading ? "…" : isError ? "Unavailable" : String(cases.length)}
          />
          <MetricCard
            label="Cases with award context"
            value={isLoading ? "…" : isError ? "Unavailable" : String(awardCases.length)}
            note="Synthetic adapter data"
          />
          <MetricCard
            label="Cases with payment context"
            value={isLoading ? "…" : isError ? "Unavailable" : String(paymentCases.length)}
            note="Synthetic adapter data"
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
          {cases.map((item) => (
            <article
              key={item.id}
              className="surface-panel flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{item.id}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {item.parcel.parcelRef || "Parcel reference unavailable"} ·{" "}
                  {item.project.projectCode || "Project unavailable"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.parcel.village || "Village unavailable"}
                  {item.parcel.district ? `, ${item.parcel.district}` : ""}
                  {item.award
                    ? ` · Synthetic award context: ${item.award.status}`
                    : " · Award context unavailable"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={item.award ? "progress" : "neutral"}>
                  {item.award ? "Demo context" : "Unavailable"}
                </StatusPill>
                <Link
                  to="/officer/treasury/payments"
                  className="inline-flex rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                >
                  Payments
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
