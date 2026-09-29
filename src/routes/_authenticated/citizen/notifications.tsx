import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Home,
  Info,
  MessageSquareText,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { useAuth } from "@/lib/auth";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import { getCitizenCaseUpdates, type CitizenCaseUpdate } from "@/lib/shared-case/citizen-updates";

export const Route = createFileRoute("/_authenticated/citizen/notifications")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

const TYPE_LABELS: Record<CitizenCaseUpdate["type"], string> = {
  case_update: "Case update",
  hearing: "Hearing",
  objection: "Objection",
  compensation: "Compensation",
  r_and_r: "R&R",
};

function updateIcon(type: CitizenCaseUpdate["type"]) {
  switch (type) {
    case "hearing":
      return CalendarDays;
    case "objection":
      return FileText;
    case "compensation":
      return CircleDollarSign;
    case "r_and_r":
      return Home;
    default:
      return MessageSquareText;
  }
}

function formatDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
  }).format(date);
}

function channelLabel(channels: CitizenCaseUpdate["channels"]) {
  if (channels.includes("portal") && channels.includes("sms")) return "Portal + SMS";
  return channels.includes("sms") ? "SMS" : "Portal";
}

function Page() {
  const caseQuery = useCitizenCase();
  const caseData = caseQuery.data?.selected ?? null;
  const { user } = useAuth();
  const updatesQuery = useQuery({
    queryKey: ["citizen-case-updates", user?.id ?? null, caseData?.id ?? null, "portal"],
    enabled: Boolean(caseData),
    queryFn: () => getCitizenCaseUpdates(caseData!, "portal"),
  });
  const updates = updatesQuery.data ?? [];

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Notifications"
        description="Case-specific updates for your selected acquisition case."
      />
      <CitizenCaseState loading={caseQuery.isLoading} error={caseQuery.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section
            title="Latest case updates"
            description="Case-record information and updates shared for your selected case appear here."
          >
            {updatesQuery.isLoading ? (
              <div className="space-y-3" aria-label="Loading case updates">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="surface-panel h-28 animate-pulse bg-muted" />
                ))}
              </div>
            ) : updatesQuery.error ? (
              <div className="surface-panel p-5 text-sm text-destructive" role="alert">
                {updatesQuery.error instanceof Error
                  ? updatesQuery.error.message
                  : "Case updates are unavailable."}
              </div>
            ) : updates.length > 0 ? (
              <ol className="space-y-3">
                {updates.map((update) => (
                  <UpdateCard key={update.id} update={update} />
                ))}
              </ol>
            ) : (
              <div className="surface-panel p-6 sm:p-8">
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">
                  <Bell className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-serif text-lg font-semibold">
                  Your selected case does not have any new case-specific updates.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  When the responsible department publishes an update for this case, it will appear
                  here.
                </p>
              </div>
            )}
          </Section>
          <div className="mt-6 flex gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This feed does not track read/unread status. No badge count or delivery state is
              inferred.
            </p>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function UpdateCard({ update }: { update: CitizenCaseUpdate }) {
  const Icon = updateIcon(update.type);
  return (
    <li className="surface-panel flex gap-4 p-4 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <article className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {TYPE_LABELS[update.type]}
            </p>
            <h2 className="mt-1 break-words font-semibold">{update.title}</h2>
          </div>
          <StatusPill tone="neutral">
            {update.sourceKind === "officer_update" ? "Officer update" : "Case record"}
          </StatusPill>
        </div>
        <p className="mt-3 break-words text-sm leading-relaxed text-foreground/85">
          {update.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
          {update.createdAt ? <span>{formatDate(update.createdAt)}</span> : null}
          {update.source ? <span>Source: {update.source}</span> : null}
          <span>Channel: {channelLabel(update.channels)}</span>
        </div>
      </article>
    </li>
  );
}
