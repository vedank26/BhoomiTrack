export type ReadinessState = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export type DatabaseWorkflowStage =
  | "identification"
  | "preliminary_notification"
  | "survey"
  | "objection"
  | "hearing"
  | "declaration"
  | "award"
  | "compensation"
  | "possession"
  | "completed";

export interface ProjectContext {
  id: string;
  projectCode: string;
  projectName: string;
}

export interface ParcelContext {
  id: string;
  parcelRef: string;
  surveyNo: string | null;
  gatNo: string | null;
  khasraNo: string | null;
  village: string;
  tehsil: string | null;
  district: string;
  totalAreaSqm: number | null;
  affectedAreaSqm: number | null;
}

export interface OwnershipRecord {
  partyId: string;
  displayName: string;
  interestType: string;
  verification: string;
  shareNumerator: number | null;
  shareDenominator: number | null;
}

export interface ImpactAnalysis {
  structuresAffected: boolean;
  treesAffected: boolean;
  livelihoodImpact: string | null;
}

export interface FieldEvidence {
  surveyCompleted: boolean;
  discrepancyFound: boolean;
  notes: string | null;
}

export interface ObjectionRecord {
  objectionId: string;
  dateFiled: string;
  status: string;
  summary: string;
}

export interface HearingRecord {
  hearingId: string;
  scheduledDate: string | null;
  status: string;
  outcome: string | null;
}

export interface ValuationRecord {
  baseValue: number;
  multiplier: number;
  totalEstimatedValue: number;
}

export interface AwardRecord {
  awardNo: string;
  dateDeclared: string | null;
  finalAmount: number;
  status: string;
}

export interface PaymentRecord {
  paymentId: string;
  disbursedAmount: number;
  datePaid: string | null;
  status: string;
}

export interface RRRecord {
  eligibleFamilies: number;
  housingAllotted: number;
  status: string;
}

export interface PossessionRecord {
  dateTaken: string | null;
  status: string;
  remarks: string | null;
}

export interface LandRecordUpdate {
  mutationRef: string | null;
  status: string;
  updatedDate: string | null;
}

export interface SharedCaseContract {
  /** The unique database-provided case ID (for example, P-001) */
  id: string;

  /** 1. Project/corridor context */
  project: ProjectContext;

  /** 2. Parcel identity and land geometry/reference information */
  parcel: ParcelContext;

  /** 3. Land type/category required by the workflow */
  landType: string;

  /** 4. Impact analysis data (initially mockable) */
  impact: ImpactAnalysis;

  /** 5. Owner/interest-holder information */
  ownership: OwnershipRecord[];

  /** 6. Survey/field evidence reference or status */
  fieldEvidence: FieldEvidence;

  /** 7. Readiness state from Person 1 */
  readiness: ReadinessState;

  /** 8. Current acquisition workflow stage (database enum value) */
  currentStage: DatabaseWorkflowStage;

  /** 9. Objection information/status */
  objections: ObjectionRecord[];

  /** 10. Hearing information/status */
  hearing: HearingRecord | null;

  /** 11. Valuation information/status */
  valuation: ValuationRecord | null;

  /** 12. Award information/status */
  award: AwardRecord | null;

  /** 13. Payment information/status */
  payment: PaymentRecord[];

  /** 14. R&R information/status */
  rr: RRRecord | null;

  /** 15. Possession information/status */
  possession: PossessionRecord | null;

  /** 16. Land-record information/status */
  landRecord: LandRecordUpdate | null;
}
