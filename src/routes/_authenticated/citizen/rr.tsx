import { createFileRoute } from "@tanstack/react-router";
import { Home, Info, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard, PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

export const Route = createFileRoute("/_authenticated/citizen/rr")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

function statusLabel(status: string) {
  switch (status) {
    case "eligibility_review":
      return "Under review";
    case "partial_settlement":
      return "Partial settlement";
    case "pending_survey":
      return "Pending survey";
    case "not_applicable":
      return "Not applicable";
    default:
      return status.replace(/_/g, " ");
  }
}

function stageLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string): "progress" | "complete" | "issue" | "neutral" {
  switch (status) {
    case "eligibility_review":
    case "partial_settlement":
    case "pending_survey":
      return "progress";
    default:
      return "neutral";
  }
}

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const rr = caseData?.rr ?? null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Rehabilitation & Resettlement"
        description="Review rehabilitation and resettlement information associated with your selected case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          {rr ? (
            <>
              <Section title="R&R status">
                <div className="surface-panel flex flex-wrap items-center justify-between gap-5 border-primary/20 p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Current status
                    </p>
                    <h2 className="mt-2 font-serif text-2xl font-bold">{statusLabel(rr.status)}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Current stage: {stageLabel(rr.status)}
                    </p>
                  </div>
                  <StatusPill tone={statusTone(rr.status)}>{statusLabel(rr.status)}</StatusPill>
                </div>
              </Section>

              <Section title="Case summary">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    label={
                      rr.status === "eligibility_review"
                        ? "Families under eligibility review"
                        : "Families recorded"
                    }
                    value={String(rr.eligibleFamilies)}
                    note="As recorded in this case"
                  />
                  <MetricCard
                    label="Housing allotted"
                    value={String(rr.housingAllotted)}
                    note="As recorded in this case"
                  />
                  <article className="surface-panel p-4">
                    <p className="font-serif text-xl font-bold">{stageLabel(rr.status)}</p>
                    <p className="mt-1 text-sm font-medium">Current stage</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status from the existing R&R case data
                    </p>
                  </article>
                </div>
              </Section>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Section title="Current R&R review">
                  <div className="surface-panel space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <UsersRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Status
                        </p>
                        <p className="mt-1 font-semibold">{statusLabel(rr.status)}</p>
                      </div>
                    </div>
                    <p className="border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                      Your rehabilitation and resettlement information is currently recorded at the{" "}
                      {stageLabel(rr.status)} stage.
                    </p>
                  </div>
                </Section>
                <Section title="What this means">
                  <div className="surface-panel flex gap-3 p-5">
                    <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Eligibility and allotment information may change as the responsible department
                      updates the case.
                    </p>
                  </div>
                </Section>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-border p-6">
              <h2 className="font-serif text-lg font-semibold">
                R&R information is unavailable for this case.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Rehabilitation and resettlement details will appear here when supported information
                is available in the selected case data.
              </p>
            </div>
          )}

          <Section title="Case reference">
            <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
              <Reference label="Case" value={caseData.id} />
              <Reference label="Parcel" value={caseData.parcel.parcelRef || "Unavailable"} />
            </dl>
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}

function Reference({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2 break-words text-sm font-semibold">
        <Home className="size-4 shrink-0 text-primary" aria-hidden="true" /> {value}
      </dd>
    </div>
  );
}
