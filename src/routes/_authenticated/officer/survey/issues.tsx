import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { fetchMeasurementVerification } from "@/lib/survey/measurement-verification";
import { useSurveyActorName } from "@/lib/survey/useSurveyActorName";
import {
  createSurveyIssue,
  fetchSurveyIssues,
  markSurveyIssueUnderReview,
  resolveSurveyIssue,
  SURVEY_ISSUE_SEVERITIES,
  SURVEY_ISSUE_TYPES,
  surveyIssuesQueryKey,
  type CreateSurveyIssueInput,
  type SurveyIssue,
  type SurveyIssueSeverity,
  type SurveyIssueType,
} from "@/lib/survey/issues";

export const Route = createFileRoute("/_authenticated/officer/survey/issues")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Survey Issues — Survey & Land Records" },
      {
        name: "description",
        content: "Record and track Survey verification issues for existing acquisition cases.",
      },
    ],
  }),
  component: SurveyIssuesPage,
});

const EMPTY_ISSUE: CreateSurveyIssueInput = {
  issue_type: "FIELD_VERIFICATION_REQUIRED",
  severity: "MEDIUM",
  description: "",
  evidence_reference: null,
  remarks: null,
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function issueTone(status: string) {
  if (status === "RESOLVED") return "complete";
  if (status === "UNDER_REVIEW") return "progress";
  return "issue";
}

function SurveyIssuesPage() {
  const { caseId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const {
    data: cases = [],
    isLoading: casesLoading,
    isError: casesError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });
  const selectedCase = useMemo(
    () => (caseId ? (cases.find((item) => item.id === caseId) ?? cases[0]) : cases[0]),
    [caseId, cases],
  );
  const queryKey = selectedCase
    ? surveyIssuesQueryKey(selectedCase.id, selectedCase.parcel.id)
    : ["survey", "issues", "none"];
  const issuesQuery = useQuery({
    queryKey,
    queryFn: () => fetchSurveyIssues(selectedCase!.id, selectedCase!.parcel.id),
    enabled: Boolean(selectedCase),
    retry: false,
  });
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedIssue = useMemo(
    () => (issuesQuery.data ?? []).find((issue) => issue.id === selectedIssueId) ?? null,
    [issuesQuery.data, selectedIssueId],
  );

  useEffect(() => {
    setSelectedIssueId(null);
    setResolution("");
    setStatusMessage(null);
    setShowCreateForm(false);
  }, [selectedCase?.id, selectedCase?.parcel.id]);

  const invalidateIssues = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateSurveyIssueInput) => {
      if (!selectedCase) throw new Error("Select an available case first.");
      return createSurveyIssue(selectedCase.id, selectedCase.parcel.id, input);
    },
    onSuccess: invalidateIssues,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      issueId,
      nextStatus,
    }: {
      issueId: string;
      nextStatus: "UNDER_REVIEW" | "RESOLVED";
    }) =>
      nextStatus === "UNDER_REVIEW"
        ? markSurveyIssueUnderReview(issueId)
        : resolveSurveyIssue(issueId, resolution),
    onSuccess: invalidateIssues,
  });

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;
    setStatusMessage(null);
    try {
      const saved = await createMutation.mutateAsync({
        ...issueForm,
        description: issueForm.description.trim(),
        evidence_reference: issueForm.evidence_reference?.trim() || null,
        remarks: issueForm.remarks?.trim() || null,
      });
      setShowCreateForm(false);
      setIssueForm(EMPTY_ISSUE);
      setSelectedIssueId(saved.id);
      setStatusMessage("Survey issue created.");
    } catch {
      setStatusMessage("Unable to create the survey issue. Check Survey Officer authorization.");
    }
  }

  async function handleStatusUpdate(issue: SurveyIssue, nextStatus: "UNDER_REVIEW" | "RESOLVED") {
    setStatusMessage(null);
    try {
      await statusMutation.mutateAsync({ issueId: issue.id, nextStatus });
      setResolution("");
      setStatusMessage("Survey issue status updated.");
    } catch {
      setStatusMessage("Unable to update the survey issue. Check Survey Officer authorization.");
    }
  }

  function updateIssueForm<K extends keyof CreateSurveyIssueInput>(
    key: K,
    value: CreateSurveyIssueInput[K],
  ) {
    setIssueForm((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
  }

  return (
    <AppShell portal="officer" department="survey_land_records">
      <PageHeader
        eyebrow="Survey & Land Records"
        title="Survey Issues"
        description="Record and coordinate verification issues on existing case parcels."
        actions={
          <button
            type="button"
            onClick={() => {
              createMutation.reset();
              setStatusMessage(null);
              setShowCreateForm(true);
            }}
            disabled={!selectedCase || casesLoading || casesError}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="size-4" />
            Raise Issue
          </button>
        }
      />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <label className="block min-w-64 text-xs font-semibold text-foreground">
          Acquisition case / parcel
          <select
            value={selectedCase?.id ?? ""}
            onChange={(event) =>
              void navigate({ search: (previous) => ({ ...previous, caseId: event.target.value }) })
            }
            disabled={casesLoading || casesError || cases.length === 0}
            className="mt-1 block w-full rounded border border-input bg-background px-3 py-2 text-sm"
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} — {item.parcel.parcelRef}
              </option>
            ))}
          </select>
        </label>
        {selectedCase ? (
          <p className="text-sm text-muted-foreground">
            {selectedCase.project.projectCode || "Project unavailable"} ·{" "}
            {selectedCase.parcel.village}
          </p>
        ) : null}
      </div>

      {statusMessage ? (
        <p
          role="status"
          className={`mt-4 text-sm ${statusMessage.startsWith("Unable") ? "text-destructive" : "text-emerald-700"}`}
        >
          {statusMessage}
        </p>
      ) : null}

      {casesLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading shared cases...</p>
      ) : casesError ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          Unable to load the available shared cases.
        </p>
      ) : !selectedCase ? (
        <p className="mt-6 text-sm text-muted-foreground">No shared cases are available.</p>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <section className="min-w-0 overflow-x-auto border-b border-border pb-5 xl:border-b-0 xl:border-r xl:pr-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {selectedCase.id} · {selectedCase.parcel.parcelRef}
              </h2>
              <button
                type="button"
                onClick={() => void issuesQuery.refetch()}
                disabled={issuesQuery.isFetching}
                title="Refresh issues"
                aria-label="Refresh issues"
                className="rounded border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-50"
              >
                {issuesQuery.isFetching ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {issuesQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading persisted survey issues...
              </p>
            ) : issuesQuery.isError ? (
              <p role="alert" className="py-8 text-center text-sm text-destructive">
                Unable to load persisted survey issues.
              </p>
            ) : issuesQuery.data?.length ? (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[0.65rem] font-semibold uppercase text-muted-foreground">
                    <th className="px-2 py-3">Issue</th>
                    <th className="px-2 py-3">Type</th>
                    <th className="px-2 py-3">Severity</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {issuesQuery.data.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={`cursor-pointer ${issue.id === selectedIssue?.id ? "bg-primary/5" : "hover:bg-secondary/30"}`}
                    >
                      <td className="px-2 py-3">
                        <span className="font-medium text-foreground">{selectedCase.id}</span>
                        <span className="block text-xs text-muted-foreground">
                          {selectedCase.parcel.parcelRef}
                        </span>
                        <span className="block break-all font-mono text-[0.65rem] text-muted-foreground">
                          {issue.id}
                        </span>
                      </td>
                      <td className="px-2 py-3">{titleCase(issue.issue_type)}</td>
                      <td className="px-2 py-3">{issue.severity}</td>
                      <td className="px-2 py-3">
                        <StatusPill tone={issueTone(issue.status)}>
                          {titleCase(issue.status)}
                        </StatusPill>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {formatTimestamp(issue.raised_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No survey issues recorded.
              </p>
            )}
          </section>

          <section aria-live="polite" className="min-w-0">
            {selectedIssue ? (
              <IssueDetails
                issue={selectedIssue}
                caseId={selectedCase.id}
                parcelId={selectedCase.parcel.id}
                parcelRef={selectedCase.parcel.parcelRef}
                resolution={resolution}
                onResolutionChange={setResolution}
                onUnderReview={() => void handleStatusUpdate(selectedIssue, "UNDER_REVIEW")}
                onResolve={() => void handleStatusUpdate(selectedIssue, "RESOLVED")}
                busy={statusMutation.isPending}
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center border border-dashed border-border px-5 text-center text-sm text-muted-foreground">
                Select an issue to review its persisted details.
              </div>
            )}
          </section>
        </div>
      )}

      {showCreateForm && selectedCase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-survey-issue-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded border border-border bg-background p-5 shadow-xl"
          >
            <div className="border-b border-border pb-3">
              <h2 id="new-survey-issue-title" className="text-base font-semibold text-foreground">
                Raise Survey Issue
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedCase.id} · {selectedCase.parcel.parcelRef}
              </p>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-foreground">
                  Issue Type
                  <select
                    value={issueForm.issue_type}
                    onChange={(event) =>
                      updateIssueForm("issue_type", event.target.value as SurveyIssueType)
                    }
                    className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                  >
                    {SURVEY_ISSUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-foreground">
                  Severity
                  <select
                    value={issueForm.severity}
                    onChange={(event) =>
                      updateIssueForm("severity", event.target.value as SurveyIssueSeverity)
                    }
                    className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                  >
                    {SURVEY_ISSUE_SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-foreground">
                Description
                <textarea
                  required
                  minLength={1}
                  maxLength={4000}
                  rows={4}
                  value={issueForm.description}
                  onChange={(event) => updateIssueForm("description", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Evidence Reference
                <input
                  maxLength={500}
                  value={issueForm.evidence_reference ?? ""}
                  onChange={(event) =>
                    updateIssueForm("evidence_reference", event.target.value || null)
                  }
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
                <span className="mt-1 block font-normal text-muted-foreground">
                  Reference only; no document upload is connected.
                </span>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Remarks
                <textarea
                  maxLength={2000}
                  rows={2}
                  value={issueForm.remarks ?? ""}
                  onChange={(event) => updateIssueForm("remarks", event.target.value || null)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              {createMutation.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  Unable to create the survey issue. Check Survey Officer authorization.
                </p>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    createMutation.reset();
                    setShowCreateForm(false);
                  }}
                  className="rounded border border-border px-3 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !issueForm.description.trim()}
                  className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Issue
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function IssueDetails({
  issue,
  caseId,
  parcelId,
  parcelRef,
  resolution,
  onResolutionChange,
  onUnderReview,
  onResolve,
  busy,
}: {
  issue: SurveyIssue;
  caseId: string;
  parcelId: string;
  parcelRef: string;
  resolution: string;
  onResolutionChange: (value: string) => void;
  onUnderReview: () => void;
  onResolve: () => void;
  busy: boolean;
}) {
  const [resolving, setResolving] = useState(false);
  const actorName = useSurveyActorName();
  const measurementQuery = useQuery({
    queryKey: ["survey", "measurement-issue-context", caseId, parcelId],
    queryFn: () => fetchMeasurementVerification(caseId, parcelId),
    enabled: issue.issue_type === "MEASUREMENT_DISCREPANCY",
    retry: false,
  });

  useEffect(() => {
    setResolving(false);
  }, [issue.id]);

  return (
    <div className="border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Survey issue</p>
          <h2 className="mt-1 break-all font-mono text-xs text-foreground">{issue.id}</h2>
          <p className="mt-1 text-sm font-medium text-foreground">
            {caseId} · {parcelRef}
          </p>
        </div>
        <StatusPill tone={issueTone(issue.status)}>{titleCase(issue.status)}</StatusPill>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="Issue Type" value={titleCase(issue.issue_type)} />
        <InfoItem label="Severity" value={issue.severity} />
        <InfoItem label="Raised Date" value={formatTimestamp(issue.raised_at)} />
        <InfoItem label="Raised By" value={actorName(issue.raised_by)} />
        <InfoItem label="Assigned To" value="Unavailable" />
        <InfoItem label="Evidence Reference" value={issue.evidence_reference || "Unavailable"} />
      </dl>
      <div className="mt-4 space-y-3 border-t border-border pt-3">
        <InfoBlock label="Description" value={issue.description} />
        {issue.remarks ? <InfoBlock label="Remarks" value={issue.remarks} /> : null}
        {issue.issue_type === "MEASUREMENT_DISCREPANCY" ? (
          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <InfoItem
              label="Persisted Measured Area"
              value={
                measurementQuery.isLoading
                  ? "Loading..."
                  : measurementQuery.isError
                    ? "Unavailable"
                    : measurementQuery.data?.measured_area_sqm == null
                      ? "Not recorded"
                      : `${measurementQuery.data.measured_area_sqm.toLocaleString()} m²`
              }
            />
            <InfoItem
              label="Measurement Status"
              value={
                measurementQuery.isLoading
                  ? "Loading..."
                  : measurementQuery.isError
                    ? "Unavailable"
                    : measurementQuery.data?.measurement_status
                      ? titleCase(measurementQuery.data.measurement_status)
                      : "Not recorded"
              }
            />
          </div>
        ) : null}
        {issue.status === "RESOLVED" ? (
          <>
            <InfoBlock label="Resolution" value={issue.resolution || "Unavailable"} />
            <InfoItem label="Resolved By" value={actorName(issue.resolved_by)} />
            <InfoItem
              label="Resolved At"
              value={issue.resolved_at ? formatTimestamp(issue.resolved_at) : "Unavailable"}
            />
          </>
        ) : null}
      </div>

      {issue.status !== "RESOLVED" ? (
        <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-border pt-3">
          {issue.status === "OPEN" ? (
            <button
              type="button"
              onClick={onUnderReview}
              disabled={busy}
              className="rounded border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Mark Under Review
            </button>
          ) : null}
          {resolving ? (
            <form
              className="min-w-full space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                onResolve();
              }}
            >
              <label className="block text-xs font-semibold text-foreground">
                Resolution
                <textarea
                  required
                  minLength={1}
                  maxLength={4000}
                  rows={3}
                  value={resolution}
                  onChange={(event) => onResolutionChange(event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !resolution.trim()}
                className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save Resolution
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setResolving(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="size-4" />
              Resolve
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{value}</p>
    </div>
  );
}
