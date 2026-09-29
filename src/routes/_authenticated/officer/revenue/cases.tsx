import { useMemo, useState, useEffect, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, MetricCard } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import {
  AlertTriangle,
  CalendarClock,
  FileCheck2,
  Landmark,
  Plus,
  Loader2,
  Send,
} from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CITIZEN_CASE_UPDATE_EVENT } from "@/lib/shared-case/citizen-updates";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";
import type { CitizenUpdateChannel } from "@/lib/shared-case/citizen-updates";

export const Route = createFileRoute("/_authenticated/officer/revenue/cases")({
  head: () => ({
    meta: [
      { title: "Acquisition Cases — Land Acquisition" },
      {
        name: "description",
        content:
          "Manage acquisition case intake, scrutiny, notifications, and award declaration under Land Acquisition jurisdiction.",
      },
    ],
  }),
  component: RevenueCasesPage,
});

function getToneForReadiness(readiness: string): "complete" | "progress" | "issue" {
  switch (readiness) {
    case "READY":
      return "complete";
    case "REVIEW_REQUIRED":
      return "progress";
    case "BLOCKED":
      return "issue";
    default:
      return "progress";
  }
}

function getStatusForReadiness(readiness: string) {
  switch (readiness) {
    case "READY":
      return "Ready for next stage";
    case "REVIEW_REQUIRED":
      return "Pending scrutiny";
    case "BLOCKED":
      return "Blocked / High attention";
    default:
      return "Unknown";
  }
}

function RevenueCasesPage() {
  const { role, department } = useAuth();
  const { data: cases = [], isLoading } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Automatically select the first case when cases load
  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) {
      setSelectedCaseId(cases[0]?.id ?? null);
    }
  }, [cases, selectedCaseId]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) ?? cases[0],
    [cases, selectedCaseId],
  );

  const pendingScrutiny = cases.filter((c) => c.readiness === "REVIEW_REQUIRED").length;
  const openObjections = cases.reduce((acc, c) => acc + (c.objections?.length ?? 0), 0);
  const awardsDeclared = cases.filter(
    (c) => c.currentStage === "award" || c.currentStage === "compensation",
  ).length;

  return (
    <AppShell portal="officer" department="land_acquisition">
      <PageHeader
        eyebrow="Land Acquisition · Officer Portal"
        title="Acquisition Cases & Scrutiny"
        description="Case intake, statutory notification readiness, hearing preparation, and award computation for land acquisition jurisdiction cases."
        actions={
          <div className="flex items-center gap-2">
            <DataClassBadge dataClass="synthetic" />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="size-3.5" />
              New acquisition case
            </button>
          </div>
        }
      />

      <Section
        title="Department metrics"
        description="Operational status of active acquisition matters."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active cases"
            value={cases.length.toString()}
            note="Under revenue jurisdiction"
          />
          <MetricCard
            label="Pending scrutiny"
            value={pendingScrutiny.toString()}
            note="Awaiting review"
          />
          <MetricCard
            label="Open objections"
            value={openObjections.toString()}
            note="Scheduled for hearing"
          />
          <MetricCard
            label="Awards declared"
            value={awardsDeclared.toString()}
            note="Ready for treasury payment"
          />
        </div>
      </Section>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Cases under jurisdiction ({cases.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            cases.map((caseItem) => {
              const isSelected = caseItem.id === selectedCase?.id;
              const stageLabel = getStageDisplayLabel(caseItem.currentStage);
              const statusLabel = getStatusForReadiness(caseItem.readiness);
              const tone = getToneForReadiness(caseItem.readiness);

              return (
                <button
                  key={caseItem.id}
                  type="button"
                  onClick={() => setSelectedCaseId(caseItem.id)}
                  className={`surface-panel block w-full p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary">{caseItem.id}</span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {caseItem.project.projectName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {caseItem.parcel.village} — {caseItem.parcel.parcelRef}
                      </p>
                    </div>
                    <StatusPill tone={tone}>{statusLabel}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] font-medium text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      Land Type: {caseItem.landType}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5">{stageLabel}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="surface-panel p-6">
              <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {selectedCase.id}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-foreground">
                    {selectedCase.project.projectName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedCase.parcel.village} — {selectedCase.parcel.parcelRef}
                  </p>
                </div>
                <StatusPill tone={getToneForReadiness(selectedCase.readiness)}>
                  {getStatusForReadiness(selectedCase.readiness)}
                </StatusPill>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Landmark className="size-3.5 text-primary" />
                    Land Type
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedCase.landType}
                  </p>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarClock className="size-3.5 text-primary" />
                    Readiness
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedCase.readiness}
                  </p>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileCheck2 className="size-3.5 text-primary" />
                    Stage
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {getStageDisplayLabel(selectedCase.currentStage)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Scrutiny note
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedCase.readiness === "BLOCKED"
                    ? "Case is blocked and requires immediate attention to resolve missing dependencies or disputes before proceeding."
                    : selectedCase.readiness === "REVIEW_REQUIRED"
                      ? "Case is pending scrutiny. Verify parcel identity, landowner interest, and statutory readiness before stage advancement."
                      : "Case is ready for the next statutory workflow stage. No blocking issues found."}
                </p>
              </div>

              {role === "officer" && department === "land_acquisition" ? (
                <CitizenCaseUpdateComposer caseData={selectedCase} />
              ) : null}
            </div>
          ) : (
            !isLoading && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No case selected.
              </div>
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CitizenCaseUpdateComposer({ caseData }: { caseData: SharedCaseContract }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"portal" | "sms" | "both">("portal");
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!user || !trimmedTitle || !trimmedMessage) {
      setFeedback({ tone: "error", text: "Enter an update title and message." });
      return;
    }

    setIsPublishing(true);
    setFeedback(null);
    try {
      const { data: linkedCase, error: caseError } = await supabase
        .from("acquisition_cases")
        .select("id")
        .eq("case_no", caseData.id)
        .maybeSingle();
      if (caseError) throw new Error(`Unable to resolve the selected case: ${caseError.message}`);
      if (!linkedCase)
        throw new Error("The selected acquisition case is not available to this Officer session.");

      const channels: CitizenUpdateChannel[] = channel === "both" ? ["portal", "sms"] : [channel];
      const { error } = await supabase.from("case_workflow_events").insert({
        case_id: linkedCase.id,
        stage: caseData.currentStage,
        event_type: CITIZEN_CASE_UPDATE_EVENT,
        action: "PUBLISH_TO_CITIZEN",
        actor_user_id: user.id,
        actor_label: null,
        remarks: trimmedMessage,
        metadata: {
          title: trimmedTitle,
          update_type: "case_update",
          channels,
          visible_to_citizen: true,
          source_label: "Officer portal",
        },
      });
      if (error) throw new Error(`Unable to publish this case update: ${error.message}`);

      setTitle("");
      setMessage("");
      setFeedback({
        tone: "success",
        text:
          channel === "sms" || channel === "both"
            ? "Case update published. SMS is marked as a selected channel; no SMS delivery is performed by this prototype."
            : "Case update published to the Citizen portal.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to publish this case update.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-serif text-lg font-semibold">Publish Citizen case update</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This update is attached to {caseData.id} and will be visible to Citizens whose case
          relationship passes RLS.
        </p>
      </div>
      <form className="space-y-4" onSubmit={publish}>
        <div>
          <label
            htmlFor="citizen-update-title"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Update title
          </label>
          <input
            id="citizen-update-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="Case update"
          />
        </div>
        <div>
          <label
            htmlFor="citizen-update-message"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Message
          </label>
          <textarea
            id="citizen-update-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1200}
            required
            rows={4}
            className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="Enter a case-specific update for the Citizen."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label
              htmlFor="citizen-update-channel"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Channel
            </label>
            <select
              id="citizen-update-channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value as "portal" | "sms" | "both")}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="portal">Portal</option>
              <option value="sms">SMS channel record</option>
              <option value="both">Portal + SMS channel record</option>
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              SMS selection records a channel only; no provider sends a message.
            </p>
          </div>
          <button
            type="submit"
            disabled={isPublishing || !user}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden="true" />
            {isPublishing ? "Publishing…" : "Publish update"}
          </button>
        </div>
        {feedback ? (
          <p
            className={`rounded-lg border p-3 text-sm ${feedback.tone === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-status-success/35 bg-status-success/10 text-foreground"}`}
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}
      </form>
    </section>
  );
}
