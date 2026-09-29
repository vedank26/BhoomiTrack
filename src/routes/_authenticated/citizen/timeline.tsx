import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CircleDot, Clock3, Flag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

export const Route = createFileRoute("/_authenticated/citizen/timeline")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

type CaseActivity = {
  key: string;
  date: string | null;
  title: string;
  description: string;
  source: string;
  status: string;
  kind: "recorded" | "upcoming";
};

/** Composes only activity records already present on the selected shared case. */
function getCitizenCaseTimeline(caseData: SharedCaseContract): CaseActivity[] {
  const activities: CaseActivity[] = caseData.objections.map((objection) => ({
    key: `objection-${objection.objectionId}`,
    date: objection.dateFiled || null,
    title: "Objection filed",
    description: `Objection ${objection.objectionId} was recorded for the selected case.`,
    source: "Objection record",
    status: sentenceCase(objection.status),
    kind: "recorded",
  }));

  if (caseData.hearing) {
    activities.push({
      key: `hearing-${caseData.hearing.hearingId}`,
      date: caseData.hearing.scheduledDate,
      title: caseData.hearing.status === "scheduled" ? "Hearing scheduled" : "Hearing status",
      description: `Reference: ${caseData.hearing.hearingId}`,
      source: "Hearing record",
      status: sentenceCase(caseData.hearing.status),
      kind:
        caseData.hearing.status === "scheduled" && caseData.hearing.scheduledDate
          ? "upcoming"
          : "recorded",
    });
  }

  return activities.sort((left, right) => {
    return (left.date ?? "").localeCompare(right.date ?? "");
  });
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function sentenceCase(value: string) {
  const normalized = value.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date,
      );
}

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const activities = caseData ? getCitizenCaseTimeline(caseData) : [];
  const recordedActivities = activities.filter((activity) => activity.kind === "recorded");
  const upcomingActivities = activities.filter((activity) => activity.kind === "upcoming");
  const citizenRelationship = caseData?.ownership.find(
    (interest) => interest.interestType === "other" && interest.verification === "unverified",
  );
  const portalRelationshipLabel = citizenRelationship
    ? `${titleCase(citizenRelationship.interestType)} · ${titleCase(citizenRelationship.verification)}`
    : "Unavailable";

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Timeline"
        description="Recorded milestones and the current workflow stage for your selected case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          {recordedActivities.length > 0 ? (
            <Section title="Recorded activity">
              <ActivityList activities={recordedActivities} />
            </Section>
          ) : null}
          {upcomingActivities.length > 0 ? (
            <Section title="Upcoming activity">
              <ActivityList activities={upcomingActivities} />
            </Section>
          ) : null}
          <Section title="Current case status">
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="surface-panel flex items-start gap-3 border-primary/30 bg-primary/[0.03] p-5">
                <Flag className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current workflow stage
                  </p>
                  <h2 className="mt-1 font-serif text-lg font-semibold">
                    {getStageDisplayLabel(caseData.currentStage)}
                  </h2>
                  <StatusPill tone="progress">Current</StatusPill>
                </div>
              </article>
              <article className="surface-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Portal relationship
                </p>
                <h2 className="mt-1 font-serif text-lg font-semibold">{portalRelationshipLabel}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This Citizen access relationship does not by itself establish legal ownership.
                </p>
              </article>
            </div>
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}

function ActivityList({ activities }: { activities: CaseActivity[] }) {
  return (
    <ol className="relative space-y-0 border-l border-border pl-5 sm:pl-7">
      {activities.map((activity) => {
        const upcoming = activity.kind === "upcoming";
        const Icon = upcoming ? CalendarDays : Clock3;
        return (
          <li key={activity.key} className="relative pb-6 last:pb-0">
            <span className="absolute -left-[1.9rem] top-0.5 flex size-8 items-center justify-center rounded-full border border-border bg-background text-primary sm:-left-[2.4rem]">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <article className="surface-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {activity.date ? formatDate(activity.date) : "Date unavailable"}
                  </p>
                  <h2 className="mt-1 font-serif text-lg font-semibold">{activity.title}</h2>
                </div>
                <StatusPill tone={upcoming ? "progress" : "neutral"}>{activity.status}</StatusPill>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {activity.description}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CircleDot className="size-3.5" aria-hidden="true" /> {activity.source}
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
