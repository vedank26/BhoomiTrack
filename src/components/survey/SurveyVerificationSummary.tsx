import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, Send } from "lucide-react";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";
import {
  fetchSurveyVerificationSummary,
  submitSurveyVerification,
  surveyHandoffQueryKey,
} from "@/lib/survey/verification-handoff";
import { StatusPill } from "@/components/ui/status-pill";
import { useSurveyActorName } from "@/lib/survey/useSurveyActorName";

function dateLabel(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function verificationAttribution(
  status: string,
  date: string | null,
  actorId: string | null,
  actorName: (id: string | null | undefined) => string,
): string {
  if (!date) return `${status} · ${actorName(actorId)}`;
  const action = status === "VERIFIED" ? "Verified" : "Updated";
  return `${status} · ${action} on ${dateLabel(date)} by ${actorName(actorId)}`;
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function SurveyVerificationSummary({ selectedCase }: { selectedCase: SharedCaseContract }) {
  const actorName = useSurveyActorName();
  const queryClient = useQueryClient();
  const queryKey = surveyHandoffQueryKey(selectedCase.id, selectedCase.parcel.id);
  const [message, setMessage] = useState<string | null>(null);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchSurveyVerificationSummary(selectedCase.id, selectedCase.parcel.id),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!query.data) throw new Error("Persisted Survey records are not loaded.");
      await submitSurveyVerification(query.data, selectedCase.parcel.parcelRef);
    },
    onSuccess: async () => {
      setMessage("Survey verification submitted to Land Acquisition.");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: async (error) => {
      setMessage(`Submission blocked: ${error.message}`);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const summary = query.data;
  const blockers: string[] = [];
  if (summary && summary.landRecord?.verification_status !== "VERIFIED") {
    blockers.push(
      `Land record: ${summary.landRecord?.verification_status ?? "NO RECORD"} (requires VERIFIED).`,
    );
  }
  summary?.interests.forEach((interest) => {
    if (interest.verification?.verification_status !== "VERIFIED") {
      blockers.push(
        `${interest.partyName}: ${interest.verification?.verification_status ?? "NO VERIFICATION"} (requires VERIFIED).`,
      );
    }
  });
  if (
    summary &&
    (summary.measurement?.measurement_status !== "COMPLETED" ||
      summary.measurement?.boundary_verification_status !== "VERIFIED")
  ) {
    blockers.push(
      `Measurement: ${summary.measurement?.measurement_status ?? "NO RECORD"}; boundary ${summary.measurement?.boundary_verification_status ?? "NOT RECORDED"} (requires COMPLETED / VERIFIED).`,
    );
  }
  summary?.issues
    .filter((issue) => issue.status === "OPEN" || issue.status === "UNDER_REVIEW")
    .forEach((issue) => blockers.push(`Issue ${issue.id}: ${issue.status} - ${issue.description}`));

  return (
    <section className="mt-6 border-t border-border pt-5" aria-labelledby="survey-summary-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="survey-summary-title" className="text-sm font-bold text-foreground">
            Survey Verification Summary & Handoff
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only summary of persisted Survey records. Submission records a handoff event and
            does not advance the case stage.
          </p>
        </div>
        <StatusPill tone={summary?.handoff ? "complete" : "neutral"}>
          {summary?.handoff ? "SUBMITTED" : "NOT SUBMITTED"}
        </StatusPill>
      </div>

      {query.isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading persisted verification summary...
        </p>
      ) : query.isError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {query.error.message}
        </p>
      ) : summary ? (
        <>
          <div className="mt-4 grid gap-x-6 gap-y-4 border-y border-border py-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField label="Case ID" value={selectedCase.id} />
            <SummaryField
              label="Project"
              value={`${selectedCase.project.projectCode} · ${selectedCase.project.projectName}`}
            />
            <SummaryField
              label="Parcel Ref"
              value={selectedCase.parcel.parcelRef || "Unavailable"}
            />
            <SummaryField
              label="Survey / Gat / Khasra"
              value={
                [
                  selectedCase.parcel.surveyNo,
                  selectedCase.parcel.gatNo,
                  selectedCase.parcel.khasraNo,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Unavailable"
              }
            />
            <SummaryField
              label="Village / Tehsil / District"
              value={
                [
                  selectedCase.parcel.village,
                  selectedCase.parcel.tehsil,
                  selectedCase.parcel.district,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Unavailable"
              }
            />
            <SummaryField
              label="Recorded Parcel Area"
              value={
                selectedCase.parcel.totalAreaSqm == null
                  ? "Unavailable"
                  : `${selectedCase.parcel.totalAreaSqm.toLocaleString()} m²`
              }
            />
            <SummaryField
              label="Land Record Status"
              value={summary.landRecord?.verification_status ?? "NO RECORD"}
            />
            <SummaryField
              label="Land Record Type / Reference"
              value={
                summary.landRecord
                  ? `${summary.landRecord.record_type} / ${summary.landRecord.record_reference || "No reference"}`
                  : "Not recorded"
              }
            />
            <SummaryField
              label="Land Record Date / Source"
              value={
                summary.landRecord
                  ? `${dateLabel(summary.landRecord.record_date)} / ${summary.landRecord.record_source || "Unavailable"}`
                  : "Not recorded"
              }
            />
            <SummaryField
              label="Land Record Verification"
              value={
                summary.landRecord
                  ? verificationAttribution(
                      summary.landRecord.verification_status,
                      summary.landRecord.verification_date,
                      summary.landRecord.verified_by,
                      actorName,
                    )
                  : "Not recorded"
              }
            />
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ownership Interests
            </h4>
            {summary.interests.length ? (
              <div className="mt-2 divide-y divide-border">
                {summary.interests.map((interest) => (
                  <div key={interest.id} className="grid gap-2 py-3 sm:grid-cols-3">
                    <SummaryField label="Interest Holder" value={interest.partyName} />
                    <SummaryField label="Interest Type" value={interest.interestType} />
                    <SummaryField
                      label="Persisted Verification"
                      value={
                        interest.verification
                          ? verificationAttribution(
                              interest.verification.verification_status,
                              interest.verification.verification_date,
                              interest.verification.verified_by,
                              actorName,
                            )
                          : "NO VERIFICATION"
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No land interests are linked to this parcel.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField
              label="Measurement Status"
              value={summary.measurement?.measurement_status ?? "NO RECORD"}
            />
            <SummaryField
              label="Boundary Verification"
              value={summary.measurement?.boundary_verification_status ?? "NOT RECORDED"}
            />
            <SummaryField
              label="Measured Area"
              value={
                summary.measurement?.measured_area_sqm == null
                  ? "Not recorded"
                  : `${summary.measurement.measured_area_sqm.toLocaleString()} m²`
              }
            />
            <SummaryField
              label="Measurement Date"
              value={dateLabel(summary.measurement?.measurement_date)}
            />
            <SummaryField
              label="Field Visit Date"
              value={dateLabel(summary.measurement?.field_visit_date)}
            />
            <SummaryField label="Recorded By" value={actorName(summary.measurement?.recorded_by)} />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Persisted Survey Issues
            </h4>
            {summary.issues.length ? (
              <ul className="mt-2 divide-y divide-border">
                {summary.issues.map((issue) => (
                  <li key={issue.id} className="py-2 text-sm">
                    <span className="font-semibold">
                      {issue.status} · {issue.issue_type} · {issue.severity}
                    </span>
                    <p className="mt-1 text-muted-foreground">{issue.description}</p>
                    {issue.resolution ? (
                      <p className="mt-1 text-xs">Resolution: {issue.resolution}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No persisted Survey issues recorded.
              </p>
            )}
          </div>

          {summary.handoff ? (
            <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm text-emerald-800">
              <Check className="mt-0.5 size-4 shrink-0" />
              <p>
                Survey verification submitted to Land Acquisition. Destination: Land Acquisition.
                Status: SUBMITTED. Submitted on {dateLabel(summary.handoff.occurred_at)} by{" "}
                {actorName(summary.handoff.actor_user_id)}.
              </p>
            </div>
          ) : (
            <div className="mt-4 border-t border-border pt-4">
              {blockers.length ? (
                <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4" />
                    Handoff is blocked by persisted records:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!summary.handoffEnabled ? (
                <p
                  role="status"
                  className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  Handoff is unavailable because the reviewed Survey handoff migration is not
                  enabled in this database.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  aria-live="polite"
                  className={`text-sm ${message?.startsWith("Submission blocked") ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {message ||
                    "Submission creates a single persisted Survey event for the linked case and parcel."}
                </p>
                <button
                  type="button"
                  disabled={mutation.isPending || blockers.length > 0 || !summary.handoffEnabled}
                  onClick={() => {
                    setMessage(null);
                    mutation.mutate();
                  }}
                  className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit to Land Acquisition
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
