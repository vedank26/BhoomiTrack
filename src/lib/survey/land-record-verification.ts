import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const LAND_RECORD_TYPES = [
  "7/12",
  "8A",
  "PROPERTY_CARD",
  "FERFAR_MUTATION",
  "E_RECORD",
  "OTHER",
] as const;

export type LandRecordType = (typeof LAND_RECORD_TYPES)[number];
export type LandRecordVerificationStatus = "NOT_VERIFIED" | "VERIFIED" | "REVIEW_REQUIRED";

export type LandRecordVerification =
  Database["public"]["Tables"]["survey_land_record_verifications"]["Row"];

export type LandRecordVerificationInput = {
  record_type: LandRecordType;
  record_reference: string | null;
  record_date: string | null;
  record_source: string | null;
  verification_status: LandRecordVerificationStatus;
  verification_date: string | null;
  remarks: string | null;
};

export const landRecordVerificationQueryKey = (caseNo: string, parcelId: string) =>
  ["survey", "land-record-verification", caseNo, parcelId] as const;

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

export async function fetchLandRecordVerification(
  caseNo: string,
  parcelId: string,
): Promise<LandRecordVerification | null> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_land_record_verifications")
    .select("*")
    .eq("case_id", caseId)
    .eq("parcel_id", parcelId)
    .maybeSingle();

  if (error) throw new Error("Unable to load land record verification.");
  return data;
}

export async function saveLandRecordVerification(
  caseNo: string,
  parcelId: string,
  verification: LandRecordVerificationInput,
): Promise<LandRecordVerification> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_land_record_verifications")
    .upsert(
      {
        case_id: caseId,
        parcel_id: parcelId,
        ...verification,
      },
      { onConflict: "case_id" },
    )
    .select("*")
    .single();

  if (error || !data) throw new Error("Unable to save land record verification.");
  return data;
}
