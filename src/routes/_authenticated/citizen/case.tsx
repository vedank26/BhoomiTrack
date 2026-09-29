import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ClipboardList, FileText, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import { resolveCitizenCasePresentation } from "@/lib/shared-case/citizen-demo-data";

export const Route = createFileRoute("/_authenticated/citizen/case")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Case — Citizen Portal" },
      { name: "description", content: "Citizen acquisition case overview." },
    ],
  }),
  component: CitizenCasePage,
});

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date,
      );
}

function CitizenCasePage() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const presentation = caseData ? resolveCitizenCasePresentation(caseData) : null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="My Case"
        description="Review your acquisition case, current status and recorded next steps."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section
            title="Case overview"
            description="Identity and status from your selected shared case record."
          >
            <dl className="surface-panel grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
              <Detail
                label="Case ID"
                value={caseData.id}
                icon={<FileText className="size-4" aria-hidden="true" />}
              />
              <Detail
                label="Parcel"
                value={presentation?.parcelRef || "Unavailable"}
                icon={<ClipboardList className="size-4" aria-hidden="true" />}
              />
              <Detail label="Project" value={caseData.project.projectName || "Unavailable"} />
              <Detail label="Current stage" value={getStageDisplayLabel(caseData.currentStage)} />
              <Detail
                label="Readiness"
                value={caseData.readiness}
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
              />
              <Detail
                label="Recorded landholder"
                value={presentation?.recordedLandholder || "Unavailable"}
              />
              <Detail
                label="Owner reference"
                value={presentation?.ownerReference || "Unavailable"}
              />
              <Detail
                label="Recorded interest"
                value={presentation?.recordedInterestType || "Unavailable"}
              />
              <Detail
                label="Owner verification"
                value={presentation?.ownerVerification || "Unavailable"}
              />
              <Detail
                label="Citizen / Party"
                value={presentation?.citizenPartyName ? "Citizen" : "Unavailable"}
              />
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <span className="font-semibold">Portal relationship</span>
              <span>{presentation?.portalRelationshipLabel || "Unavailable"}</span>
              <span className="basis-full text-muted-foreground">
                This Citizen access relationship does not by itself establish legal ownership.
              </span>
            </div>
          </Section>

          <Section
            title="Case progress"
            description="Current workflow stage recorded for the selected case."
          >
            <div className="surface-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Current stage
                  </p>
                  <h2 className="mt-2 font-serif text-xl font-bold">
                    {getStageDisplayLabel(caseData.currentStage)}
                  </h2>
                </div>
                <StatusPill tone="progress">Current</StatusPill>
              </div>
              <div
                className="mt-5 flex items-center gap-3 border-t border-border pt-4"
                aria-hidden="true"
              >
                <span className="size-3 rounded-full bg-primary ring-4 ring-primary/15" />
                <span className="h-px flex-1 bg-border" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The selected case is currently recorded at the{" "}
                {getStageDisplayLabel(caseData.currentStage)} stage.
              </p>
            </div>
          </Section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Latest case information">
              <div className="surface-panel space-y-4 p-5">
                <p className="text-sm">
                  Readiness: <span className="font-semibold">{caseData.readiness}</span>
                </p>
                {caseData.hearing ? (
                  <div className="flex items-start gap-3 border-t border-border pt-4">
                    <CalendarDays className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                    <p className="text-sm leading-relaxed">
                      Hearing {caseData.hearing.status.replace(/_/g, " ")}
                      {caseData.hearing.scheduledDate
                        ? ` for ${formatDate(caseData.hearing.scheduledDate)}`
                        : "; date not recorded"}
                      .
                    </p>
                  </div>
                ) : (
                  <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                    No hearing is currently recorded for this case.
                  </p>
                )}
                {caseData.objections.length > 0 ? (
                  <p className="border-t border-border pt-4 text-sm">
                    {caseData.objections.length === 1 ? "Objection" : "Objections"}:{" "}
                    {caseData.objections
                      .map((item) => `${item.objectionId} · ${item.status.replace(/_/g, " ")}`)
                      .join("; ")}
                    .
                  </p>
                ) : null}
              </div>
            </Section>
            <Section
              title="Case identity / reference"
              description="Use these references when enquiring about this case."
            >
              <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
                <Detail label="Case reference" value={caseData.id} />
                <Detail label="Parcel reference" value={presentation?.parcelRef || "Unavailable"} />
              </dl>
            </Section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/citizen/timeline"
              search={{ caseId: caseData.id }}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Open case timeline <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/citizen/hearing"
              search={{ caseId: caseData.id }}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              View hearing <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}
