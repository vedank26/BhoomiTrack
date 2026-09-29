import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

export const Route = createFileRoute("/_authenticated/citizen/hearing")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(
        date,
      );
}

function hearingTone(status: string): "progress" | "complete" | "issue" | "neutral" {
  switch (status.toLowerCase()) {
    case "scheduled":
    case "awaiting_schedule":
      return "progress";
    case "completed":
      return "complete";
    case "cancelled":
    case "canceled":
      return "issue";
    default:
      return "neutral";
  }
}

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const hearing = caseData?.hearing ?? null;
  const hearingDate = hearing ? formatDate(hearing.scheduledDate) : null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Hearing Info"
        description="Review hearing information recorded against your selected case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          {hearing ? (
            <>
              <section
                className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04]"
                aria-labelledby="upcoming-hearing-title"
              >
                <div className="grid gap-5 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CalendarDays className="size-7" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p
                      id="upcoming-hearing-title"
                      className="text-xs font-bold uppercase tracking-[0.18em] text-primary"
                    >
                      {hearing.status === "scheduled" ? "Upcoming hearing" : "Hearing information"}
                    </p>
                    <p className="mt-2 break-words font-serif text-3xl font-bold tabular-nums sm:text-4xl">
                      {hearingDate ?? "Date not recorded"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <StatusPill tone={hearingTone(hearing.status)}>
                        {hearing.status.replace(/_/g, " ")}
                      </StatusPill>
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="size-4" aria-hidden="true" /> Reference{" "}
                        {hearing.hearingId}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <Section title="Hearing details">
                <dl className="surface-panel grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <Detail label="Case" value={caseData.id} />
                  <Detail label="Parcel" value={caseData.parcel.parcelRef || "Unavailable"} />
                  <Detail label="Reference" value={hearing.hearingId} />
                  <Detail label="Status" value={hearing.status.replace(/_/g, " ")} />
                  <Detail label="Scheduled date" value={hearingDate ?? "Not recorded"} />
                  <Detail label="Outcome" value={hearing.outcome || "Not recorded"} />
                </dl>
              </Section>

              <Section title="What to expect">
                <div className="surface-panel p-5 text-sm leading-relaxed text-muted-foreground">
                  This hearing is recorded against your selected acquisition case. The outcome will
                  appear here when recorded.
                </div>
              </Section>
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No hearing is currently recorded for this case.
            </div>
          )}
          <Section title="Case identity">
            <CitizenCaseContext caseData={caseData} compact />
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}
