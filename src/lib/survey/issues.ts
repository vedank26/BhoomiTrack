import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const SURVEY_ISSUE_TYPES = [
  "LAND_RECORD_MISMATCH",
  "PARCEL_IDENTITY_MISMATCH",
  "CADASTRAL_MISMATCH",
  "OWNERSHIP_RECORD_MISMATCH",
  "MEASUREMENT_DISCREPANCY",
  "BOUNDARY_DISCREPANCY",
  "FIELD_VERIFICATION_REQUIRED",
  "MISSING_RECORD",
  "OTHER",
] as const;

export const SURVEY_ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type SurveyIssueType = (typeof SURVEY_ISSUE_TYPES)[number];
export type SurveyIssueSeverity = (typeof SURVEY_ISSUE_SEVERITIES)[number];
export type SurveyIssueStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";
export type SurveyIssue = Database["public"]["Tables"]["survey_issues"]["Row"];

export type CreateSurveyIssueInput = {
  issue_type: SurveyIssueType;
  severity: SurveyIssueSeverity;
  description: string;
  evidence_reference: string | null;
  remarks: string | null;
};

export const surveyIssuesQueryKey = (caseId: string, parcelId: string) =>
  ["survey", "issues", caseId, parcelId] as const;

async function resolveCase(caseNo: string, expectedParcelId: string) {
  const { data, error } = await supabase
    .from("acquisition_cases")
    .select("id, parcel_id")
    .eq("case_no", caseNo)
    .maybeSingle();

  if (error || !data || data.parcel_id !== expectedParcelId) {
    throw new Error("Unable to resolve the selected case and parcel.");
  }
  return data;
}

export async function fetchSurveyIssues(caseNo: string, parcelId: string): Promise<SurveyIssue[]> {
  const linkedCase = await resolveCase(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_issues")
    .select("*")
    .eq("case_id", linkedCase.id)
    .eq("parcel_id", linkedCase.parcel_id)
    .order("raised_at", { ascending: false });

  if (error) throw new Error("Unable to load persisted survey issues.");
  return data ?? [];
}

export async function createSurveyIssue(
  caseNo: string,
  parcelId: string,
  input: CreateSurveyIssueInput,
): Promise<SurveyIssue> {
  const linkedCase = await resolveCase(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_issues")
    .insert({ ...input, case_id: linkedCase.id, parcel_id: linkedCase.parcel_id })
    .select("*")
    .single();

  if (error || !data) throw new Error("Unable to create survey issue.");
  return data;
}

export async function markSurveyIssueUnderReview(issueId: string): Promise<SurveyIssue> {
  const { data, error } = await supabase
    .from("survey_issues")
    .update({ status: "UNDER_REVIEW" })
    .eq("id", issueId)
    .select("*")
    .single();

  if (error || !data) throw new Error("Unable to update survey issue status.");
  return data;
}

export async function resolveSurveyIssue(
  issueId: string,
  resolution: string,
): Promise<SurveyIssue> {
  const { data, error } = await supabase
    .from("survey_issues")
    .update({ status: "RESOLVED", resolution: resolution.trim() })
    .eq("id", issueId)
    .select("*")
    .single();

  if (error || !data) throw new Error("Unable to resolve survey issue.");
  return data;
}
