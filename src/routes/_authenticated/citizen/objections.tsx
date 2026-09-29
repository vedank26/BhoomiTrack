import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FileText, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import type { ObjectionRecord } from "@/lib/shared-case/case-contract";
import { resolveCitizenCasePresentation } from "@/lib/shared-case/citizen-demo-data";

export const Route = createFileRoute("/_authenticated/citizen/objections")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date,
      );
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(
        date,
      );
}

function statusTone(status: string): "progress" | "complete" | "issue" | "neutral" {
  switch (status.toLowerCase()) {
    case "pending_hearing":
    case "under_review":
      return "progress";
    case "resolved":
      return "complete";
    case "rejected":
      return "issue";
    default:
      return "neutral";
  }
}

function statusExplanation(status: string) {
  switch (status.toLowerCase()) {
    case "pending_hearing":
      return "This objection is recorded as pending hearing.";
    case "under_review":
      return "This objection is recorded as under review.";
    case "resolved":
      return "This objection is recorded as resolved.";
    case "rejected":
      return "This objection is recorded as rejected.";
    default:
      return "The status is shown as recorded in the case data.";
  }
}

function splitSummary(summary: string) {
  const separator = " — ";
  const splitIndex = summary.indexOf(separator);
  if (splitIndex < 0) return { issue: null, statement: null, summary };
  return {
    issue: summary.slice(0, splitIndex).trim(),
    statement: summary.slice(splitIndex + separator.length).trim(),
    summary: null,
  };
}

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const presentation = caseData ? resolveCitizenCasePresentation(caseData) : null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Objections"
        description="Review objections recorded against your selected acquisition case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          {caseData.objections.length > 0 ? (
            <>
              {caseData.objections.map((objection) => (
                <ObjectionCard key={objection.objectionId} objection={objection} />
              ))}
              {caseData.objections.some((objection) => objection.status === "pending_hearing") &&
              caseData.hearing ? (
                <Section title="Case hearing information">
                  <div className="surface-panel flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">Hearing information recorded for this case</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Reference {caseData.hearing.hearingId}
                          {caseData.hearing.scheduledDate
                            ? ` · ${formatLongDate(caseData.hearing.scheduledDate)}`
                            : " · Date not recorded"}
                        </p>
                      </div>
                    </div>
                    <StatusPill
                      tone={caseData.hearing.status === "scheduled" ? "progress" : "neutral"}
                    >
                      {caseData.hearing.status.replace(/_/g, " ")}
                    </StatusPill>
                  </div>
                </Section>
              ) : null}
            </>
          ) : (
            <EmptyObjections caseId={caseData.id} />
          )}
          <Section title="Case references">
            <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-3">
              <Reference label="Case" value={caseData.id} />
              <Reference label="Parcel" value={presentation?.parcelRef || "Unavailable"} />
              <Reference
                label="Objection"
                value={
                  caseData.objections.map((item) => item.objectionId).join(", ") || "Unavailable"
                }
              />
            </dl>
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}

function ObjectionCard({ objection }: { objection: ObjectionRecord }) {
  const summary = splitSummary(objection.summary);
  const statusLabel = objection.status.replace(/_/g, " ");

  return (
    <article className="surface-panel mt-8 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/30 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Recorded objection
          </p>
          <h2 className="mt-2 break-all font-mono text-lg font-bold">{objection.objectionId}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" /> Filed{" "}
            {formatDate(objection.dateFiled)}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill tone={statusTone(objection.status)}>{statusLabel}</StatusPill>
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-4 text-primary" aria-hidden="true" /> Issue
          </p>
          {summary.issue ? (
            <p className="mt-3 text-sm font-semibold leading-relaxed">{summary.issue}</p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed">{summary.summary}</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <MessageSquareText className="size-4 text-primary" aria-hidden="true" /> Recorded
            summary
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            {summary.statement ?? "Not separately provided in the case record."}
          </p>
        </div>
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Current status
        </p>
        <p className="mt-2 text-sm font-semibold capitalize">{statusLabel}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {statusExplanation(objection.status)}
        </p>
      </div>
    </article>
  );
}

function EmptyObjections({ caseId }: { caseId: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border bg-background p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Objection records
      </p>
      <h2 className="mt-2 font-serif text-lg font-semibold">
        No objection record is currently available for case {caseId}.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Objections recorded against this selected case will appear here with their reference, filed
        date and current status.
      </p>
    </div>
  );
}

function Reference({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}
