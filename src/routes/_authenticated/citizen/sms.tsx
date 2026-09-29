import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Info, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { useAuth } from "@/lib/auth";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import { getCitizenCaseUpdates } from "@/lib/shared-case/citizen-updates";

export const Route = createFileRoute("/_authenticated/citizen/sms")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

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

function Page() {
  const caseQuery = useCitizenCase();
  const caseData = caseQuery.data?.selected ?? null;
  const { user } = useAuth();
  const updatesQuery = useQuery({
    queryKey: ["citizen-case-updates", user?.id ?? null, caseData?.id ?? null, "sms"],
    enabled: Boolean(caseData),
    queryFn: () => getCitizenCaseUpdates(caseData!, "sms"),
  });
  const smsUpdates = updatesQuery.data ?? [];

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="SMS Alerts"
        description="Review case-related communication records designated for the SMS channel."
      />
      <CitizenCaseState loading={caseQuery.isLoading} error={caseQuery.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section title="Communication status">
            <div className="surface-panel flex gap-3 p-5">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">SMS communication history</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  SMS-channel records appear here when an update is associated with the selected
                  case and SMS is selected as a channel.
                </p>
              </div>
            </div>
          </Section>

          <Section
            title="SMS communication records"
            description="Channel selection is shown here; it does not confirm that an SMS was sent or delivered."
          >
            {updatesQuery.isLoading ? (
              <div className="space-y-3" aria-label="Loading SMS communication records">
                {[0, 1].map((item) => (
                  <div key={item} className="surface-panel h-28 animate-pulse bg-muted" />
                ))}
              </div>
            ) : updatesQuery.error ? (
              <div className="surface-panel p-5 text-sm text-destructive" role="alert">
                {updatesQuery.error instanceof Error
                  ? updatesQuery.error.message
                  : "SMS communication records are unavailable."}
              </div>
            ) : smsUpdates.length > 0 ? (
              <ol className="space-y-3">
                {smsUpdates.map((update) => (
                  <li key={update.id} className="surface-panel flex gap-4 p-4 sm:p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquareText className="size-5" aria-hidden="true" />
                    </span>
                    <article className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="break-words font-semibold">{update.title}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {update.type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <StatusPill tone="neutral">SMS channel selected</StatusPill>
                      </div>
                      <p className="mt-3 break-words text-sm leading-relaxed text-foreground/85">
                        {update.message}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                        {update.createdAt ? <span>{formatDate(update.createdAt)}</span> : null}
                        {update.source ? <span>Source: {update.source}</span> : null}
                        <span>Channel: SMS</span>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="surface-panel p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  No SMS-channel records
                </p>
                <h2 className="mt-2 font-serif text-lg font-semibold">
                  No SMS communication record is currently associated with this case.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Case updates designated for SMS will appear here when recorded. No SMS is sent by
                  this page, and delivery status is unavailable.
                </p>
              </div>
            )}
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}
