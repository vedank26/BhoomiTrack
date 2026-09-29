import type { SharedCaseContract } from "./case-contract";
import { CANONICAL_CASE_IDS, type CanonicalCaseId } from "./case-fixtures";

interface CitizenDemoParcelPresentation {
  parcelRef: string;
  recordedLandholder: string;
  ownerReference: string;
  interestType: string;
  ownerVerification: string;
  surveyNo: string;
  gatNo: string;
  recordedAreaSqm: number;
  affectedAreaSqm: number;
  affectedPercentage: number;
  village: string;
  district: string;
  state: string;
  geometryStatus: string;
  landRecordReference: string;
}

const CITIZEN_DEMO_PRESENTATION: Partial<Record<CanonicalCaseId, CitizenDemoParcelPresentation>> = {
  "P-001": {
    parcelRef: "MH-AWARD-2030",
    recordedLandholder: "Sonali Khot",
    ownerReference: "OWNER-2030-01",
    interestType: "owner",
    ownerVerification: "unverified",
    surveyNo: "20",
    gatNo: "20",
    recordedAreaSqm: 1846.6,
    affectedAreaSqm: 1839.92,
    affectedPercentage: 99.6,
    village: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    geometryStatus: "Valid geometry",
    landRecordReference: "A-WARD-SYNTHETIC-OWNER",
  },
};

export interface CitizenGisPresentation {
  affectedAreaSqm?: number | null;
  affectedPercentage?: number | null;
}

export interface CitizenCasePresentation {
  parcelRef: string | null;
  recordedLandholder: string | null;
  ownerReference: string | null;
  recordedInterestType: string | null;
  ownerVerification: string | null;
  citizenPartyName: string | null;
  portalRelationshipType: string | null;
  portalRelationshipVerification: string | null;
  portalRelationshipLabel: string | null;
  surveyNo: string | null;
  gatNo: string | null;
  recordedAreaSqm: number | null;
  affectedAreaSqm: number | null;
  affectedPercentage: number | null;
  village: string | null;
  district: string | null;
  state: string | null;
  geometryStatus: string | null;
  landRecordReference: string | null;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function knownDisplayName(value: string) {
  const normalized = nonEmpty(value);
  return normalized && normalized.toLowerCase() !== "unknown" ? normalized : null;
}

export function resolveCitizenCasePresentation(
  caseData: SharedCaseContract,
  gis: CitizenGisPresentation = {},
): CitizenCasePresentation {
  const canonicalId = CANONICAL_CASE_IDS.find((id) => id === caseData.id);
  const demoCandidate = canonicalId ? CITIZEN_DEMO_PRESENTATION[canonicalId] : undefined;
  // Never apply P-001 presentation values to a different parcel mapping.
  const demo =
    demoCandidate &&
    (!caseData.parcel.parcelRef || caseData.parcel.parcelRef === demoCandidate.parcelRef)
      ? demoCandidate
      : undefined;

  const recordedOwners = caseData.ownership.filter(
    (item) => item.interestType === "owner" || item.interestType === "co_owner",
  );
  const landholderNames = recordedOwners
    .map((item) => knownDisplayName(item.displayName))
    .filter((name): name is string => Boolean(name));
  const relationship = caseData.ownership.find((item) => item.interestType === "other");
  const relationshipType = nonEmpty(relationship?.interestType);
  const relationshipVerification = nonEmpty(relationship?.verification);

  return {
    parcelRef: nonEmpty(caseData.parcel.parcelRef) ?? demo?.parcelRef ?? null,
    recordedLandholder: landholderNames.join("; ") || demo?.recordedLandholder || null,
    ownerReference: demo?.ownerReference ?? null,
    recordedInterestType:
      recordedOwners.map((item) => titleCase(item.interestType)).join("; ") ||
      (demo ? titleCase(demo.interestType) : null),
    ownerVerification:
      recordedOwners.map((item) => titleCase(item.verification)).join("; ") ||
      (demo ? titleCase(demo.ownerVerification) : null),
    citizenPartyName: knownDisplayName(relationship?.displayName ?? ""),
    portalRelationshipType: relationshipType,
    portalRelationshipVerification: relationshipVerification,
    portalRelationshipLabel:
      relationshipType && relationshipVerification
        ? `${titleCase(relationshipType)} · ${titleCase(relationshipVerification)}`
        : null,
    surveyNo: nonEmpty(caseData.parcel.surveyNo) ?? demo?.surveyNo ?? null,
    gatNo: nonEmpty(caseData.parcel.gatNo) ?? demo?.gatNo ?? null,
    recordedAreaSqm: caseData.parcel.totalAreaSqm ?? demo?.recordedAreaSqm ?? null,
    affectedAreaSqm:
      gis.affectedAreaSqm ?? caseData.parcel.affectedAreaSqm ?? demo?.affectedAreaSqm ?? null,
    affectedPercentage: gis.affectedPercentage ?? demo?.affectedPercentage ?? null,
    village: nonEmpty(caseData.parcel.village) ?? demo?.village ?? null,
    district: nonEmpty(caseData.parcel.district) ?? demo?.district ?? null,
    state: demo?.state ?? null,
    geometryStatus: demo?.geometryStatus ?? null,
    landRecordReference: demo?.landRecordReference ?? null,
  };
}
