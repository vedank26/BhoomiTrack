import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const MEASUREMENT_STATUSES = [
  "NOT_STARTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEW_REQUIRED",
] as const;

export const MEASUREMENT_PURPOSES = [
  "BOUNDARY_VERIFICATION",
  "PARCEL_MEASUREMENT",
  "ACQUISITION_FIELD_VERIFICATION",
  "OTHER",
] as const;

export const BOUNDARY_VERIFICATION_STATUSES = [
  "NOT_VERIFIED",
  "VERIFIED",
  "REVIEW_REQUIRED",
] as const;

export type MeasurementStatus = (typeof MEASUREMENT_STATUSES)[number];
export type MeasurementPurpose = (typeof MEASUREMENT_PURPOSES)[number];
export type BoundaryVerificationStatus = (typeof BOUNDARY_VERIFICATION_STATUSES)[number];
export type MeasurementVerification =
  Database["public"]["Tables"]["survey_measurement_verifications"]["Row"];

export type MeasurementVerificationInput = {
  measurement_status: MeasurementStatus;
  measurement_reference: string | null;
  measurement_purpose: MeasurementPurpose | null;
  scheduled_date: string | null;
  measurement_date: string | null;
  measured_area_sqm: number | null;
  boundary_verification_status: BoundaryVerificationStatus;
  field_visit_date: string | null;
  field_notes: string | null;
  evidence_reference: string | null;
  remarks: string | null;
};

export const measurementVerificationQueryKey = (caseNo: string, parcelId: string) =>
  ["survey", "measurement-verification", caseNo, parcelId] as const;

async function resolveCaseId(caseNo: string, expectedParcelId: string): Promise<string> {
  const { data, error } = await supabase
    .from("acquisition_cases")
    .select("id, parcel_id")
    .eq("case_no", caseNo)
    .maybeSingle();

  if (error || !data || data.parcel_id !== expectedParcelId) {
    throw new Error("Unable to resolve the selected case and parcel.");
  }
  return data.id;
}

export async function fetchMeasurementVerification(
  caseNo: string,
  parcelId: string,
): Promise<MeasurementVerification | null> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_measurement_verifications")
    .select("*")
    .eq("case_id", caseId)
    .eq("parcel_id", parcelId)
    .maybeSingle();

  if (error) throw new Error("Unable to load measurement verification.");
  return data;
}

export async function saveMeasurementVerification(
  caseNo: string,
  parcelId: string,
  input: MeasurementVerificationInput,
): Promise<MeasurementVerification> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_measurement_verifications")
    .upsert(
      {
        case_id: caseId,
        parcel_id: parcelId,
        ...input,
      },
      { onConflict: "case_id,parcel_id" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error("Unable to save measurement verification.");
  return data;
}
