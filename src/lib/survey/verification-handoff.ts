import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LandRecord = Database["public"]["Tables"]["survey_land_record_verifications"]["Row"];
type OwnershipVerification =
  Database["public"]["Tables"]["survey_ownership_interest_verifications"]["Row"];
type Measurement = Database["public"]["Tables"]["survey_measurement_verifications"]["Row"];
type Issue = Database["public"]["Tables"]["survey_issues"]["Row"];
type WorkflowEvent = Database["public"]["Tables"]["case_workflow_events"]["Row"];

export type SurveyVerificationSummary = {
  caseId: string;
  parcelId: string;
  landRecord: LandRecord | null;
  interests: Array<{
    id: string;
    partyName: string;
    interestType: string;
    verification: OwnershipVerification | null;
  }>;
  measurement: Measurement | null;
  issues: Issue[];
  handoff: WorkflowEvent | null;
  handoffEnabled: boolean;
};

export const surveyHandoffQueryKey = (caseNo: string, parcelId: string) =>
  ["survey", "verification-handoff", caseNo, parcelId] as const;

export async function fetchSurveyVerificationSummary(
  caseNo: string,
  expectedParcelId: string,
): Promise<SurveyVerificationSummary> {
  const { data: linkedCase, error: caseError } = await supabase
    .from("acquisition_cases")
    .select("id, parcel_id")
    .eq("case_no", caseNo)
    .maybeSingle();

  if (caseError || !linkedCase || linkedCase.parcel_id !== expectedParcelId) {
    throw new Error("Unable to resolve the selected shared case and parcel.");
  }

  const [
    landRecordResult,
    interestsResult,
    ownershipResult,
    measurementResult,
    issuesResult,
    eventResult,
    handoffEnabledResult,
  ] = await Promise.all([
    supabase
      .from("survey_land_record_verifications")
      .select("*")
      .eq("case_id", linkedCase.id)
      .eq("parcel_id", linkedCase.parcel_id)
      .maybeSingle(),
    supabase
      .from("land_interests")
      .select("id, interest_type, party:parties(display_name)")
      .eq("parcel_id", linkedCase.parcel_id),
    supabase
      .from("survey_ownership_interest_verifications")
      .select("*")
      .eq("case_id", linkedCase.id)
      .eq("parcel_id", linkedCase.parcel_id),
    supabase
      .from("survey_measurement_verifications")
      .select("*")
      .eq("case_id", linkedCase.id)
      .eq("parcel_id", linkedCase.parcel_id)
      .maybeSingle(),
    supabase
      .from("survey_issues")
      .select("*")
      .eq("case_id", linkedCase.id)
      .eq("parcel_id", linkedCase.parcel_id)
      .order("raised_at", { ascending: false }),
    supabase
      .from("case_workflow_events")
      .select("*")
      .eq("case_id", linkedCase.id)
      .eq("event_type", "SURVEY_VERIFICATION_SUBMITTED")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("survey_verification_handoff_enabled"),
  ]);

  if (
    landRecordResult.error ||
    interestsResult.error ||
    ownershipResult.error ||
    measurementResult.error ||
    issuesResult.error ||
    eventResult.error
  ) {
    throw new Error("Unable to load the persisted Survey verification summary.");
  }

  const verifications = new Map(
    ((ownershipResult.data ?? []) as OwnershipVerification[]).map((row) => [row.interest_id, row]),
  );
  const interests = (interestsResult.data ?? []).map((row) => {
    const party = Array.isArray(row.party) ? row.party[0] : row.party;
    return {
      id: row.id,
      partyName: party?.display_name ?? "Unavailable",
      interestType: row.interest_type,
      verification: verifications.get(row.id) ?? null,
    };
  });

  return {
    caseId: linkedCase.id,
    parcelId: linkedCase.parcel_id,
    landRecord: landRecordResult.data,
    interests,
    measurement: measurementResult.data,
    issues: (issuesResult.data ?? []) as Issue[],
    handoff: eventResult.data as WorkflowEvent | null,
    handoffEnabled: handoffEnabledResult.data === true && !handoffEnabledResult.error,
  };
}

export async function submitSurveyVerification(
  summary: SurveyVerificationSummary,
  parcelRef: string,
): Promise<void> {
  if (!summary.handoffEnabled) {
    throw new Error("The Survey handoff migration is not enabled in this database.");
  }
  const { error } = await supabase.from("case_workflow_events").insert({
    case_id: summary.caseId,
    stage: "survey",
    event_type: "SURVEY_VERIFICATION_SUBMITTED",
    action: "SUBMIT_TO_LAND_ACQUISITION",
    metadata: {
      parcel_id: summary.parcelId,
      parcel_ref: parcelRef,
      destination_department: "land_acquisition",
    },
    remarks: null,
  });

  if (error) throw new Error(error.message);
}
