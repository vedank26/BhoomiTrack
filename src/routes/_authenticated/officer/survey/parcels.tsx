import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { AlertTriangle, Building, Loader2, Save, Trees } from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";
import { SurveyVerificationSummary } from "@/components/survey/SurveyVerificationSummary";
import { useSurveyActorName } from "@/lib/survey/useSurveyActorName";
import { fetchProjectGisData, formatArea, formatPercent } from "@/lib/gis";
import {
  fetchLandRecordVerification,
  LAND_RECORD_TYPES,
  landRecordVerificationQueryKey,
  saveLandRecordVerification,
  type LandRecordType,
  type LandRecordVerification,
  type LandRecordVerificationStatus,
} from "@/lib/survey/land-record-verification";
import {
  fetchOwnershipInterests,
  OWNERSHIP_VERIFICATION_SOURCES,
  ownershipInterestVerificationQueryKey,
  saveOwnershipInterestVerification,
  type OwnershipVerificationInput,
  type OwnershipVerificationSource,
  type OwnershipVerificationStatus,
  type SurveyLandInterest,
} from "@/lib/survey/ownership-interest-verification";
import {
  BOUNDARY_VERIFICATION_STATUSES,
  fetchMeasurementVerification,
  MEASUREMENT_PURPOSES,
  MEASUREMENT_STATUSES,
  measurementVerificationQueryKey,
  saveMeasurementVerification,
  type BoundaryVerificationStatus,
  type MeasurementPurpose,
  type MeasurementStatus,
  type MeasurementVerification,
  type MeasurementVerificationInput,
} from "@/lib/survey/measurement-verification";

type LandRecordForm = {
  record_type: LandRecordType | "";
  record_reference: string;
  record_date: string;
  record_source: string;
  verification_status: LandRecordVerificationStatus;
  verification_date: string;
  remarks: string;
};

const EMPTY_LAND_RECORD_FORM: LandRecordForm = {
  record_type: "",
  record_reference: "",
  record_date: "",
  record_source: "",
  verification_status: "NOT_VERIFIED",
  verification_date: "",
  remarks: "",
};

function formFromVerification(record: LandRecordVerification | null): LandRecordForm {
  if (!record) return EMPTY_LAND_RECORD_FORM;
  return {
    record_type: record.record_type as LandRecordType,
    record_reference: record.record_reference ?? "",
    record_date: record.record_date ?? "",
    record_source: record.record_source ?? "",
    verification_status: record.verification_status as LandRecordVerificationStatus,
    verification_date: record.verification_date ?? "",
    remarks: record.remarks ?? "",
  };
}

function formatVerificationStatus(status: LandRecordVerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "VERIFIED";
    case "REVIEW_REQUIRED":
      return "REVIEW REQUIRED";
    default:
      return "NOT VERIFIED";
  }
}

function verificationTone(status: LandRecordVerificationStatus) {
  if (status === "VERIFIED") return "complete";
  if (status === "REVIEW_REQUIRED") return "progress";
  return "neutral";
}

function propertyText(properties: Record<string, unknown>, key: string): string | null {
  const value = properties[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function propertyNumber(properties: Record<string, unknown>, key: string): number | null {
  const value = properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const Route = createFileRoute("/_authenticated/officer/survey/parcels")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Parcel Surveys — Survey & Settlement" },
      {
        name: "description",
        content:
          "Record physical parcel surveys, boundary verification, land restrictions, and ground findings.",
      },
    ],
  }),
  component: SurveyParcelsPage,
});

function getToneForReadiness(readiness: string) {
  switch (readiness) {
    case "READY":
      return "complete";
    case "REVIEW_REQUIRED":
      return "progress";
    case "BLOCKED":
      return "issue";
    default:
      return "neutral";
  }
}

function SurveyParcelsPage() {
  const { caseId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: cases = [], isLoading } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const selectedCase = useMemo(
    () => (caseId ? cases.find((c) => c.id === caseId) : cases[0]),
    [cases, caseId],
  );
  const queryClient = useQueryClient();
  const verificationKey = selectedCase
    ? landRecordVerificationQueryKey(selectedCase.id, selectedCase.parcel.id)
    : ["survey", "land-record-verification", "none"];
  const verificationQuery = useQuery({
    queryKey: verificationKey,
    queryFn: () => fetchLandRecordVerification(selectedCase!.id, selectedCase!.parcel.id),
    enabled: Boolean(selectedCase),
    refetchOnWindowFocus: false,
    retry: false,
  });
  const ownershipKey = selectedCase
    ? ownershipInterestVerificationQueryKey(selectedCase.id, selectedCase.parcel.id)
    : ["survey", "ownership-interest-verifications", "none"];
  const ownershipQuery = useQuery({
    queryKey: ownershipKey,
    queryFn: () => fetchOwnershipInterests(selectedCase!.id, selectedCase!.parcel.id),
    enabled: Boolean(selectedCase),
    retry: false,
  });
  const [landRecordForm, setLandRecordForm] = useState(EMPTY_LAND_RECORD_FORM);
  const [landRecordMessage, setLandRecordMessage] = useState<string | null>(null);

  useEffect(() => {
    setLandRecordForm(EMPTY_LAND_RECORD_FORM);
    setLandRecordMessage(null);
  }, [selectedCase?.id, selectedCase?.parcel.id]);

  useEffect(() => {
    if (verificationQuery.isLoading || verificationQuery.isError) return;
    setLandRecordForm(formFromVerification(verificationQuery.data ?? null));
  }, [verificationQuery.data, verificationQuery.isError, verificationQuery.isLoading]);

  const saveLandRecordMutation = useMutation({
    mutationFn: (values: LandRecordForm) => {
      if (!selectedCase || !values.record_type) {
        throw new Error("A case and record type are required.");
      }
      return saveLandRecordVerification(selectedCase.id, selectedCase.parcel.id, {
        record_type: values.record_type,
        record_reference: values.record_reference.trim() || null,
        record_date: values.record_date || null,
        record_source: values.record_source.trim() || null,
        verification_status: values.verification_status,
        verification_date: values.verification_date || null,
        remarks: values.remarks.trim() || null,
      });
    },
    onSuccess: (record) => {
      queryClient.setQueryData(verificationKey, record);
      void queryClient.invalidateQueries({ queryKey: verificationKey });
    },
  });

  const { data: gisData, isLoading: gisLoading } = useQuery({
    queryKey: ["gis", "active-result", selectedCase?.project.id],
    queryFn: () => fetchProjectGisData(selectedCase!.project.id),
    enabled: Boolean(selectedCase?.project.id),
    retry: false,
  });

  const activeAffectedFeature = useMemo(() => {
    if (!gisData?.source || !selectedCase) return undefined;
    return gisData.affectedParcels.features.find((feature) => {
      const id = propertyText(feature.properties, "id");
      return id === selectedCase.parcel.id;
    });
  }, [gisData, selectedCase]);

  async function handleSaveLandRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLandRecordMessage(null);
    try {
      await saveLandRecordMutation.mutateAsync(landRecordForm);
      setLandRecordMessage("Land record verification saved.");
    } catch {
      setLandRecordMessage(
        "Unable to save land record verification. Confirm this account has the required Survey Officer authorization.",
      );
    }
  }

  function updateLandRecordForm<K extends keyof LandRecordForm>(key: K, value: LandRecordForm[K]) {
    setLandRecordForm((current) => ({ ...current, [key]: value }));
    setLandRecordMessage(null);
    saveLandRecordMutation.reset();
  }

  function selectCase(c: SharedCaseContract) {
    void navigate({ search: (previous) => ({ ...previous, caseId: c.id }) });
  }

  return (
    <AppShell portal="officer" department="survey_land_records">
      <PageHeader
        eyebrow="Survey & Settlement Department"
        title="Parcel Survey Dossiers"
        description="Review shared-case parcel identity, available records and read-only GIS impact. These are application working records, not an official government land-record source."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Parcels under survey ({cases.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            cases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              const surveyDone = c.fieldEvidence.surveyCompleted;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCase(c)}
                  className={`surface-panel block w-full p-4 text-left transition-all ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/10 ring-1 ring-emerald-600"
                      : "hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-emerald-700">{c.id}</span>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                        {c.parcel.parcelRef || "Unavailable"} — {c.parcel.village || "Unavailable"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.project.projectCode || "Unavailable"} ·{" "}
                        {c.parcel.district || "Unavailable"} ·{" "}
                        {c.parcel.totalAreaSqm != null
                          ? `${c.parcel.totalAreaSqm.toLocaleString()} sqm`
                          : "Area unknown"}
                      </p>
                    </div>
                    <StatusPill tone={surveyDone ? "complete" : "progress"}>
                      {surveyDone ? "Completed" : "Pending"}
                    </StatusPill>
                  </div>

                  {c.fieldEvidence.discrepancyFound ? (
                    <p className="mt-2 flex items-center gap-1 rounded bg-amber-500/10 p-1.5 text-[0.7rem] font-semibold text-amber-700">
                      <AlertTriangle className="size-3" />
                      Field discrepancy flagged
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="surface-panel p-6">
              <div className="border-b border-border pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Field survey dossier
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-foreground">
                      {selectedCase.id} ({selectedCase.parcel.parcelRef || "Unavailable"})
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Project: {selectedCase.project.projectCode || "Unavailable"} ·{" "}
                      {selectedCase.project.projectName || "Unavailable"}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      getToneForReadiness(selectedCase.readiness) as
                        "complete" | "progress" | "issue" | "neutral"
                    }
                  >
                    {selectedCase.readiness.replace("_", " ")}
                  </StatusPill>
                </div>
              </div>

              <SectionBlock title="Parcel identity">
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Info label="Case ID" value={selectedCase.id || "Unavailable"} />
                  <Info
                    label="Project"
                    value={`${selectedCase.project.projectCode || "Unavailable"} · ${selectedCase.project.projectName || "Unavailable"}`}
                  />
                  <Info
                    label="Parcel Reference"
                    value={selectedCase.parcel.parcelRef || "Unavailable"}
                  />
                  <Info label="Village" value={selectedCase.parcel.village || "Unavailable"} />
                  <Info
                    label="Taluka / Tehsil"
                    value={selectedCase.parcel.tehsil || "Unavailable"}
                  />
                  <Info label="District" value={selectedCase.parcel.district || "Unavailable"} />
                  <Info label="Survey No." value={selectedCase.parcel.surveyNo || "Unavailable"} />
                  <Info label="Gat No." value={selectedCase.parcel.gatNo || "Unavailable"} />
                  <Info label="Khasra No." value={selectedCase.parcel.khasraNo || "Unavailable"} />
                  <Info label="CTS No." value="Unavailable" />
                  <Info
                    label="Recorded / Total Area"
                    value={formatArea(selectedCase.parcel.totalAreaSqm)}
                  />
                  <Info label="Land Type" value={selectedCase.landType || "Unavailable"} />
                  <Info
                    label="Current Stage"
                    value={getStageDisplayLabel(selectedCase.currentStage)}
                  />
                </div>
              </SectionBlock>

              <SectionBlock
                title="Land Record Verification"
                description="Record the Survey Officer's verification of a referenced land record."
              >
                {verificationQuery.isLoading ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading land record verification...
                  </p>
                ) : verificationQuery.isError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    Unable to load land record verification.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusPill
                        tone={verificationTone(
                          (verificationQuery.data?.verification_status ??
                            "NOT_VERIFIED") as LandRecordVerificationStatus,
                        )}
                      >
                        {formatVerificationStatus(
                          (verificationQuery.data?.verification_status ??
                            "NOT_VERIFIED") as LandRecordVerificationStatus,
                        )}
                      </StatusPill>
                      {verificationQuery.data ? null : (
                        <p className="text-sm text-muted-foreground">
                          No land record verification recorded.
                        </p>
                      )}
                    </div>

                    <form onSubmit={handleSaveLandRecord} className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="land-record-type"
                            className="block text-xs font-bold text-foreground"
                          >
                            Record Type
                          </label>
                          <select
                            id="land-record-type"
                            required
                            value={landRecordForm.record_type}
                            onChange={(event) =>
                              updateLandRecordForm(
                                "record_type",
                                event.target.value as LandRecordType | "",
                              )
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          >
                            <option value="">Select a record type</option>
                            {LAND_RECORD_TYPES.map((recordType) => (
                              <option key={recordType} value={recordType}>
                                {recordType === "PROPERTY_CARD"
                                  ? "Property Card"
                                  : recordType === "FERFAR_MUTATION"
                                    ? "Ferfar / Mutation"
                                    : recordType === "E_RECORD"
                                      ? "e-Record"
                                      : recordType === "OTHER"
                                        ? "Other / Not recorded"
                                        : recordType}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="land-record-reference"
                            className="block text-xs font-bold text-foreground"
                          >
                            Record Reference
                          </label>
                          <input
                            id="land-record-reference"
                            maxLength={200}
                            value={landRecordForm.record_reference}
                            onChange={(event) =>
                              updateLandRecordForm("record_reference", event.target.value)
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="land-record-date"
                            className="block text-xs font-bold text-foreground"
                          >
                            Record Date
                          </label>
                          <input
                            id="land-record-date"
                            type="date"
                            value={landRecordForm.record_date}
                            onChange={(event) =>
                              updateLandRecordForm("record_date", event.target.value)
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="land-record-source"
                            className="block text-xs font-bold text-foreground"
                          >
                            Record Source
                          </label>
                          <input
                            id="land-record-source"
                            maxLength={200}
                            value={landRecordForm.record_source}
                            onChange={(event) =>
                              updateLandRecordForm("record_source", event.target.value)
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="land-record-status"
                            className="block text-xs font-bold text-foreground"
                          >
                            Verification Status
                          </label>
                          <select
                            id="land-record-status"
                            value={landRecordForm.verification_status}
                            onChange={(event) =>
                              updateLandRecordForm(
                                "verification_status",
                                event.target.value as LandRecordVerificationStatus,
                              )
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          >
                            <option value="NOT_VERIFIED">Not Verified</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="REVIEW_REQUIRED">Review Required</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="land-record-verification-date"
                            className="block text-xs font-bold text-foreground"
                          >
                            Verification Date
                          </label>
                          <input
                            id="land-record-verification-date"
                            type="date"
                            value={landRecordForm.verification_date}
                            onChange={(event) =>
                              updateLandRecordForm("verification_date", event.target.value)
                            }
                            className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="land-record-remarks"
                          className="block text-xs font-bold text-foreground"
                        >
                          Remarks
                        </label>
                        <textarea
                          id="land-record-remarks"
                          rows={3}
                          maxLength={2000}
                          value={landRecordForm.remarks}
                          onChange={(event) => updateLandRecordForm("remarks", event.target.value)}
                          className="mt-1 w-full rounded border border-input bg-background p-2 text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p
                          aria-live="polite"
                          className={`text-sm ${
                            landRecordMessage?.startsWith("Unable")
                              ? "text-destructive"
                              : "text-emerald-700"
                          }`}
                        >
                          {landRecordMessage}
                        </p>
                        <button
                          type="submit"
                          disabled={saveLandRecordMutation.isPending || !landRecordForm.record_type}
                          className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saveLandRecordMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Save className="size-4" />
                          )}
                          Save Verification
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </SectionBlock>

              <SectionBlock
                title="Ownership / interested-party verification"
                description="Verify each existing land-interest relationship against its referenced land record. This records operational verification, not legal ownership adjudication."
              >
                {ownershipQuery.isLoading ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading existing interests...
                  </p>
                ) : ownershipQuery.isError ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    Unable to load the existing ownership interests.
                  </p>
                ) : ownershipQuery.data?.length ? (
                  <div className="mt-3 divide-y divide-border">
                    {ownershipQuery.data.map((interest) => (
                      <OwnershipInterestCard
                        key={interest.id}
                        caseNo={selectedCase.id}
                        parcelId={selectedCase.parcel.id}
                        interest={interest}
                        queryKey={ownershipKey}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No existing land-interest records are associated with this parcel.
                  </p>
                )}
              </SectionBlock>

              <MeasurementVerificationSection
                caseNo={selectedCase.id}
                parcelId={selectedCase.parcel.id}
                recordedAreaSqm={selectedCase.parcel.totalAreaSqm}
              />

              <SectionBlock
                title="Active GIS impact"
                description="Read-only values from the persisted active GIS result."
              >
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Info
                    label="Recorded Area"
                    value={formatArea(selectedCase.parcel.totalAreaSqm)}
                  />
                  <Info
                    label="Affected Area"
                    value={
                      activeAffectedFeature
                        ? formatArea(
                            propertyNumber(activeAffectedFeature.properties, "affected_area_sqm"),
                          )
                        : gisLoading
                          ? "Loading"
                          : "Unavailable"
                    }
                  />
                  <Info
                    label="Affected Percentage"
                    value={
                      activeAffectedFeature
                        ? formatPercent(
                            propertyNumber(activeAffectedFeature.properties, "affected_percentage"),
                          )
                        : gisLoading
                          ? "Loading"
                          : "Unavailable"
                    }
                  />
                </div>
                {!gisLoading && !gisData?.source ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No persisted active GIS result is available for this project.
                  </p>
                ) : null}
              </SectionBlock>

              {/* Adapter-provided context; not a persisted Survey verification record. */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div
                  className={`rounded border p-3 ${
                    selectedCase.impact.structuresAffected
                      ? "border-amber-300 bg-amber-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Building className="size-3.5 text-primary" />
                    Structures affected
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedCase.impact.structuresAffected
                      ? "Yes — requires assessment"
                      : "None recorded"}
                  </p>
                </div>
                <div
                  className={`rounded border p-3 ${
                    selectedCase.impact.treesAffected
                      ? "border-emerald-300 bg-emerald-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Trees className="size-3.5 text-emerald-600" />
                    Trees / crops affected
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedCase.impact.treesAffected
                      ? "Yes — requires valuation"
                      : "None recorded"}
                  </p>
                </div>
              </div>

              {selectedCase.fieldEvidence.discrepancyFound && (
                <div className="mt-3 rounded border border-amber-300 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700">
                    <AlertTriangle className="size-3.5" />
                    Discrepancy flagged
                  </div>
                  <p className="mt-1 text-sm text-foreground">{selectedCase.fieldEvidence.notes}</p>
                </div>
              )}

              <SurveyVerificationSummary selectedCase={selectedCase} />
            </div>
          ) : (
            !isLoading && (
              <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                {caseId
                  ? "The requested case is unavailable in the shared-case list."
                  : "No shared cases are available."}
                <Link to="/officer/survey" className="text-primary underline underline-offset-2">
                  Back to Survey cases
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}

type MeasurementForm = {
  measurement_status: MeasurementStatus;
  measurement_reference: string;
  measurement_purpose: MeasurementPurpose | "";
  scheduled_date: string;
  measurement_date: string;
  measured_area_sqm: string;
  boundary_verification_status: BoundaryVerificationStatus;
  field_visit_date: string;
  field_notes: string;
  evidence_reference: string;
  remarks: string;
};

const EMPTY_MEASUREMENT_FORM: MeasurementForm = {
  measurement_status: "NOT_STARTED",
  measurement_reference: "",
  measurement_purpose: "",
  scheduled_date: "",
  measurement_date: "",
  measured_area_sqm: "",
  boundary_verification_status: "NOT_VERIFIED",
  field_visit_date: "",
  field_notes: "",
  evidence_reference: "",
  remarks: "",
};

function measurementFormFromRecord(record: MeasurementVerification | null): MeasurementForm {
  if (!record) return EMPTY_MEASUREMENT_FORM;
  return {
    measurement_status: record.measurement_status as MeasurementStatus,
    measurement_reference: record.measurement_reference ?? "",
    measurement_purpose: (record.measurement_purpose as MeasurementPurpose | null) ?? "",
    scheduled_date: record.scheduled_date ?? "",
    measurement_date: record.measurement_date ?? "",
    measured_area_sqm: record.measured_area_sqm?.toString() ?? "",
    boundary_verification_status: record.boundary_verification_status as BoundaryVerificationStatus,
    field_visit_date: record.field_visit_date ?? "",
    field_notes: record.field_notes ?? "",
    evidence_reference: record.evidence_reference ?? "",
    remarks: record.remarks ?? "",
  };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MeasurementVerificationSection({
  caseNo,
  parcelId,
  recordedAreaSqm,
}: {
  caseNo: string;
  parcelId: string;
  recordedAreaSqm: number | null;
}) {
  const actorName = useSurveyActorName();
  const queryClient = useQueryClient();
  const queryKey = measurementVerificationQueryKey(caseNo, parcelId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchMeasurementVerification(caseNo, parcelId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [form, setForm] = useState(EMPTY_MEASUREMENT_FORM);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(EMPTY_MEASUREMENT_FORM);
    setMessage(null);
  }, [caseNo, parcelId]);

  useEffect(() => {
    if (query.isLoading || query.isError) return;
    setForm(measurementFormFromRecord(query.data ?? null));
  }, [query.data, query.isError, query.isLoading]);

  const mutation = useMutation({
    mutationFn: (input: MeasurementVerificationInput) =>
      saveMeasurementVerification(caseNo, parcelId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const hasInput =
    form.measurement_status !== "NOT_STARTED" ||
    form.boundary_verification_status !== "NOT_VERIFIED" ||
    Boolean(
      form.measurement_reference.trim() ||
      form.measurement_purpose ||
      form.scheduled_date ||
      form.measurement_date ||
      form.measured_area_sqm ||
      form.field_visit_date ||
      form.field_notes.trim() ||
      form.evidence_reference.trim() ||
      form.remarks.trim(),
    );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await mutation.mutateAsync({
        measurement_status: form.measurement_status,
        measurement_reference: form.measurement_reference.trim() || null,
        measurement_purpose: form.measurement_purpose || null,
        scheduled_date: form.scheduled_date || null,
        measurement_date: form.measurement_date || null,
        measured_area_sqm: form.measured_area_sqm ? Number(form.measured_area_sqm) : null,
        boundary_verification_status: form.boundary_verification_status,
        field_visit_date: form.field_visit_date || null,
        field_notes: form.field_notes.trim() || null,
        evidence_reference: form.evidence_reference.trim() || null,
        remarks: form.remarks.trim() || null,
      });
      setMessage("Measurement / field verification saved.");
    } catch {
      setMessage("Unable to save the measurement record. Check Survey Officer authorization.");
    }
  }

  function updateForm<K extends keyof MeasurementForm>(key: K, value: MeasurementForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    mutation.reset();
  }

  return (
    <SectionBlock
      title="Measurement / Field Verification"
      description="Operational BhoomiTrack field record; this is not a direct e-Mojni integration."
    >
      {query.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading measurement record...</p>
      ) : query.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Unable to load the measurement record.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusPill
              tone={
                form.measurement_status === "COMPLETED"
                  ? "complete"
                  : form.measurement_status === "REVIEW_REQUIRED"
                    ? "issue"
                    : form.measurement_status === "NOT_STARTED"
                      ? "neutral"
                      : "progress"
              }
            >
              {titleCase(form.measurement_status)}
            </StatusPill>
            {!query.data ? (
              <p className="text-sm text-muted-foreground">
                Measurement / field verification not recorded.
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Recorded Area" value={formatArea(recordedAreaSqm)} />
            <Info
              label="Saved Measured Area"
              value={
                query.data?.measured_area_sqm == null
                  ? "Not recorded"
                  : `${query.data.measured_area_sqm.toLocaleString()} m²`
              }
            />
            <Info label="Assigned Surveyor" value="Unavailable" />
            <Info
              label="Recorded By"
              value={
                query.data
                  ? actorName(query.data.recorded_by)
                  : "Set by authenticated user on first save"
              }
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-foreground">
                Measurement Status
                <select
                  value={form.measurement_status}
                  onChange={(event) =>
                    updateForm("measurement_status", event.target.value as MeasurementStatus)
                  }
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                >
                  {MEASUREMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Measurement Type / Purpose
                <select
                  value={form.measurement_purpose}
                  onChange={(event) =>
                    updateForm("measurement_purpose", event.target.value as MeasurementPurpose | "")
                  }
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                >
                  <option value="">Not specified</option>
                  {MEASUREMENT_PURPOSES.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {titleCase(purpose)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Measurement Reference
                <input
                  maxLength={200}
                  value={form.measurement_reference}
                  onChange={(event) => updateForm("measurement_reference", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
                <span className="mt-1 block font-normal text-muted-foreground">
                  Enter an actually issued reference; do not invent an e-Mojni number.
                </span>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Measured Area (m²)
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.measured_area_sqm}
                  onChange={(event) => updateForm("measured_area_sqm", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Scheduled Date
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(event) => updateForm("scheduled_date", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Measurement Date
                <input
                  type="date"
                  value={form.measurement_date}
                  onChange={(event) => updateForm("measurement_date", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Boundary Verification
                <select
                  value={form.boundary_verification_status}
                  onChange={(event) =>
                    updateForm(
                      "boundary_verification_status",
                      event.target.value as BoundaryVerificationStatus,
                    )
                  }
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                >
                  {BOUNDARY_VERIFICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Field Visit Date
                <input
                  type="date"
                  value={form.field_visit_date}
                  onChange={(event) => updateForm("field_visit_date", event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-foreground">
              Field Notes
              <textarea
                rows={3}
                maxLength={4000}
                value={form.field_notes}
                onChange={(event) => updateForm("field_notes", event.target.value)}
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-foreground">
              Evidence Reference
              <input
                maxLength={500}
                value={form.evidence_reference}
                onChange={(event) => updateForm("evidence_reference", event.target.value)}
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              />
              <span className="mt-1 block font-normal text-muted-foreground">
                Reference only; no file upload or document repository is connected.
              </span>
            </label>
            <label className="block text-xs font-semibold text-foreground">
              Remarks
              <textarea
                rows={2}
                maxLength={2000}
                value={form.remarks}
                onChange={(event) => updateForm("remarks", event.target.value)}
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                aria-live="polite"
                className={`text-sm ${message?.startsWith("Unable") ? "text-destructive" : "text-emerald-700"}`}
              >
                {message}
              </p>
              <button
                type="submit"
                disabled={mutation.isPending || !hasInput}
                className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Measurement
              </button>
            </div>
          </form>
        </>
      )}
    </SectionBlock>
  );
}

type OwnershipVerificationForm = {
  verification_status: OwnershipVerificationStatus;
  verification_date: string;
  verification_source: OwnershipVerificationSource | "";
  record_reference: string;
  remarks: string;
};

const EMPTY_OWNERSHIP_FORM: OwnershipVerificationForm = {
  verification_status: "NOT_VERIFIED",
  verification_date: "",
  verification_source: "",
  record_reference: "",
  remarks: "",
};

function ownershipFormFromRecord(
  record: SurveyLandInterest["verification"],
): OwnershipVerificationForm {
  if (!record) return EMPTY_OWNERSHIP_FORM;
  return {
    verification_status: record.verification_status as OwnershipVerificationStatus,
    verification_date: record.verification_date ?? "",
    verification_source: (record.verification_source as OwnershipVerificationSource | null) ?? "",
    record_reference: record.record_reference ?? "",
    remarks: record.remarks ?? "",
  };
}

function ownershipStatusLabel(status: OwnershipVerificationStatus): string {
  if (status === "VERIFIED") return "Verified";
  if (status === "REVIEW_REQUIRED") return "Review required";
  return "Not verified";
}

function ownershipStatusTone(status: OwnershipVerificationStatus) {
  if (status === "VERIFIED") return "complete";
  if (status === "REVIEW_REQUIRED") return "progress";
  return "neutral";
}

function ownershipSourceLabel(source: OwnershipVerificationSource): string {
  if (source === "PROPERTY_CARD") return "Property Card";
  if (source === "FERFAR_MUTATION") return "Ferfar / Mutation";
  if (source === "E_RECORD") return "e-Record";
  if (source === "OTHER") return "Other";
  return source;
}

function OwnershipInterestCard({
  caseNo,
  parcelId,
  interest,
  queryKey,
}: {
  caseNo: string;
  parcelId: string;
  interest: SurveyLandInterest;
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ownershipFormFromRecord(interest.verification));
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: OwnershipVerificationInput) =>
      saveOwnershipInterestVerification(caseNo, parcelId, interest.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    setForm(ownershipFormFromRecord(interest.verification));
  }, [interest.id, interest.verification]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await mutation.mutateAsync({
        verification_status: form.verification_status,
        verification_date: form.verification_date || null,
        verification_source: form.verification_source || null,
        record_reference: form.record_reference.trim() || null,
        remarks: form.remarks.trim() || null,
      });
      setMessage("Verification saved.");
    } catch {
      setMessage("Unable to save this interest verification. Check Survey Officer authorization.");
    }
  }

  function updateForm<K extends keyof OwnershipVerificationForm>(
    key: K,
    value: OwnershipVerificationForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(null);
    mutation.reset();
  }

  const share =
    interest.shareNumerator != null && interest.shareDenominator != null
      ? `${interest.shareNumerator} / ${interest.shareDenominator}`
      : "Unavailable";

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{interest.partyName}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Interest type: {interest.interestType || "Unavailable"} · Recorded share: {share}
          </p>
        </div>
        <StatusPill
          tone={ownershipStatusTone(
            (interest.verification?.verification_status ??
              "NOT_VERIFIED") as OwnershipVerificationStatus,
          )}
        >
          {ownershipStatusLabel(
            (interest.verification?.verification_status ??
              "NOT_VERIFIED") as OwnershipVerificationStatus,
          )}
        </StatusPill>
      </div>
      {!interest.verification ? (
        <p className="mt-1 text-xs text-muted-foreground">No ownership verification recorded.</p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Verification Status
              <select
                value={form.verification_status}
                onChange={(event) =>
                  updateForm(
                    "verification_status",
                    event.target.value as OwnershipVerificationStatus,
                  )
                }
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              >
                <option value="NOT_VERIFIED">Not verified</option>
                <option value="VERIFIED">Verified</option>
                <option value="REVIEW_REQUIRED">Review required</option>
              </select>
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Verification Source
              <select
                value={form.verification_source}
                onChange={(event) =>
                  updateForm(
                    "verification_source",
                    event.target.value as OwnershipVerificationSource | "",
                  )
                }
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              >
                <option value="">Select source</option>
                {OWNERSHIP_VERIFICATION_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {ownershipSourceLabel(source)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Record Reference
              <input
                maxLength={200}
                value={form.record_reference}
                onChange={(event) => updateForm("record_reference", event.target.value)}
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Verification Date
              <input
                type="date"
                value={form.verification_date}
                onChange={(event) => updateForm("verification_date", event.target.value)}
                className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
              />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground">
            Remarks
            <textarea
              rows={2}
              maxLength={2000}
              value={form.remarks}
              onChange={(event) => updateForm("remarks", event.target.value)}
              className="mt-1 block w-full rounded border border-input bg-background p-2 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            className={`text-xs ${message?.startsWith("Unable") ? "text-destructive" : "text-emerald-700"}`}
          >
            {message}
          </p>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Verification
          </button>
        </div>
      </form>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-border pt-4">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </section>
  );
}
