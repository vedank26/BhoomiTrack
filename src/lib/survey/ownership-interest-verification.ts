import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const OWNERSHIP_VERIFICATION_SOURCES = [
  "7/12",
  "8A",
  "PROPERTY_CARD",
  "FERFAR_MUTATION",
  "E_RECORD",
  "OTHER",
] as const;

export type OwnershipVerificationSource = (typeof OWNERSHIP_VERIFICATION_SOURCES)[number];
export type OwnershipVerificationStatus = "NOT_VERIFIED" | "VERIFIED" | "REVIEW_REQUIRED";

type OwnershipVerification =
  Database["public"]["Tables"]["survey_ownership_interest_verifications"]["Row"];

export type SurveyLandInterest = {
  id: string;
  partyId: string;
  partyName: string;
  interestType: string;
  shareNumerator: number | null;
  shareDenominator: number | null;
  verification: OwnershipVerification | null;
};

export type OwnershipVerificationInput = {
  verification_status: OwnershipVerificationStatus;
  verification_date: string | null;
  verification_source: OwnershipVerificationSource | null;
  record_reference: string | null;
  remarks: string | null;
};

export const ownershipInterestVerificationQueryKey = (caseNo: string, parcelId: string) =>
  ["survey", "ownership-interest-verifications", caseNo, parcelId] as const;

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

export async function fetchOwnershipInterests(
  caseNo: string,
  parcelId: string,
): Promise<SurveyLandInterest[]> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const [
    { data: interests, error: interestError },
    { data: verifications, error: verificationError },
  ] = await Promise.all([
    supabase
      .from("land_interests")
      .select(
        "id, parcel_id, party_id, interest_type, share_numerator, share_denominator, party:parties(id, display_name)",
      )
      .eq("parcel_id", parcelId),
    supabase
      .from("survey_ownership_interest_verifications")
      .select("*")
      .eq("case_id", caseId)
      .eq("parcel_id", parcelId),
  ]);

  if (interestError || verificationError) {
    throw new Error("Unable to load ownership interests and verification records.");
  }

  const verificationByInterest = new Map(
    ((verifications ?? []) as OwnershipVerification[]).map((record) => [
      record.interest_id,
      record,
    ]),
  );

  return (interests ?? [])
    .map((interest) => {
      const party = Array.isArray(interest.party) ? interest.party[0] : interest.party;
      return {
        id: interest.id,
        partyId: interest.party_id,
        partyName: party?.display_name ?? "Unavailable",
        interestType: interest.interest_type,
        shareNumerator: interest.share_numerator,
        shareDenominator: interest.share_denominator,
        verification: verificationByInterest.get(interest.id) ?? null,
      };
    })
    .sort((left, right) => left.partyName.localeCompare(right.partyName));
}

export async function saveOwnershipInterestVerification(
  caseNo: string,
  parcelId: string,
  interestId: string,
  input: OwnershipVerificationInput,
): Promise<OwnershipVerification> {
  const caseId = await resolveCaseId(caseNo, parcelId);
  const { data, error } = await supabase
    .from("survey_ownership_interest_verifications")
    .upsert(
      {
        case_id: caseId,
        parcel_id: parcelId,
        interest_id: interestId,
        ...input,
      },
      { onConflict: "case_id,interest_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Unable to save ownership interest verification.");
  }
  return data;
}
