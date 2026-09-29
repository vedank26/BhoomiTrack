/**
 * SIH26016 — Shared Case Fixtures
 *
 * SYNTHETIC ONLY. No real landowner, citizen, bank, or government record is
 * represented here. Every surface that renders this data must carry a
 * DataClassBadge with `synthetic`.
 *
 * These fixtures provide the ADAPTER-BACKED areas of SharedCaseContract that
 * currently have no verified persisted Supabase source:
 *   impact, fieldEvidence, readiness, objections, hearing,
 *   valuation, award, payment, rr, possession, landRecord
 *
 * The store (case-store.ts) merges these onto top of the verified DB core so
 * that UI pages always receive a complete SharedCaseContract without any `any`
 * or `undefined` coercions.
 *
 * Person 1 may later replace `impact` and `readiness` by updating the store's
 * merge layer without modifying individual page components.
 *
 * DO NOT add database columns here.
 * DO NOT add React imports or UI styling here.
 */

import type {
  ImpactAnalysis,
  FieldEvidence,
  ObjectionRecord,
  HearingRecord,
  ValuationRecord,
  AwardRecord,
  PaymentRecord,
  RRRecord,
  PossessionRecord,
  LandRecordUpdate,
  ReadinessState,
} from "./case-contract";

// ---------------------------------------------------------------------------
// Adapter-backed fields type — excludes every field sourced from Supabase
// ---------------------------------------------------------------------------
export interface CaseAdapterFields {
  impact: ImpactAnalysis;
  fieldEvidence: FieldEvidence;
  /** Temporary readiness — Person 1 will replace with real GIS output. */
  readiness: ReadinessState;
  objections: ObjectionRecord[];
  hearing: HearingRecord | null;
  valuation: ValuationRecord | null;
  award: AwardRecord | null;
  payment: PaymentRecord[];
  rr: RRRecord | null;
  possession: PossessionRecord | null;
  landRecord: LandRecordUpdate | null;
}

// ---------------------------------------------------------------------------
// Canonical demo case IDs
// ---------------------------------------------------------------------------
export const CANONICAL_CASE_IDS = ["P-001", "P-018", "P-024", "P-030"] as const;
export type CanonicalCaseId = (typeof CANONICAL_CASE_IDS)[number];

// ---------------------------------------------------------------------------
// Fixtures — one entry per canonical demo ID
// Readiness values intentionally cover all three states so the UI can
// demonstrate every possible state across the four canonical cases.
// ---------------------------------------------------------------------------
export const CASE_ADAPTER_FIXTURES: Record<CanonicalCaseId, CaseAdapterFields> = {
  "P-001": {
    readiness: "READY",
    impact: {
      structuresAffected: false,
      treesAffected: true,
      livelihoodImpact: "Loss of fruit-tree income (mango, orange orchards).",
    },
    fieldEvidence: {
      surveyCompleted: true,
      discrepancyFound: false,
      notes: "Boundary matches revenue record. No disputes recorded.",
    },
    objections: [
      {
        objectionId: "OBJ-P001-001",
        dateFiled: "2026-08-20",
        status: "pending_hearing",
        summary: "Objection to affected area measurement — landowner claims 0.32 ha, not 0.38 ha.",
      },
    ],
    hearing: {
      hearingId: "HRG-P001-001",
      scheduledDate: "2026-10-15",
      status: "scheduled",
      outcome: null,
    },
    valuation: {
      baseValue: 280000,
      multiplier: 1.5,
      totalEstimatedValue: 420000,
    },
    award: null,
    payment: [],
    rr: {
      eligibleFamilies: 1,
      housingAllotted: 0,
      status: "eligibility_review",
    },
    possession: null,
    landRecord: null,
  },

  "P-018": {
    readiness: "REVIEW_REQUIRED",
    impact: {
      structuresAffected: true,
      treesAffected: false,
      livelihoodImpact: "Partial loss of roadside commercial structure.",
    },
    fieldEvidence: {
      surveyCompleted: true,
      discrepancyFound: true,
      notes:
        "GIS boundary differs from revenue survey by approx 4.2 metres at north edge. Flagged for re-survey.",
    },
    objections: [],
    hearing: null,
    valuation: {
      baseValue: 3500000,
      multiplier: 1.25,
      totalEstimatedValue: 4375000,
    },
    award: {
      awardNo: "AWD-P018-2026",
      dateDeclared: "2026-09-01",
      finalAmount: 4375000,
      status: "declared",
    },
    payment: [
      {
        paymentId: "PAY-P018-001",
        disbursedAmount: 2000000,
        datePaid: "2026-09-10",
        status: "paid",
      },
      {
        paymentId: "PAY-P018-002",
        disbursedAmount: 2375000,
        datePaid: null,
        status: "pending",
      },
    ],
    rr: {
      eligibleFamilies: 2,
      housingAllotted: 1,
      status: "partial_settlement",
    },
    possession: null,
    landRecord: {
      mutationRef: "MUT-2026-018",
      status: "pending_mutation",
      updatedDate: null,
    },
  },

  "P-024": {
    readiness: "BLOCKED",
    impact: {
      structuresAffected: true,
      treesAffected: true,
      livelihoodImpact:
        "Full displacement — residential structure and agricultural land both affected.",
    },
    fieldEvidence: {
      surveyCompleted: false,
      discrepancyFound: false,
      notes: "Field survey blocked due to access dispute. Rescheduled pending local resolution.",
    },
    objections: [
      {
        objectionId: "OBJ-P024-001",
        dateFiled: "2026-07-10",
        status: "under_review",
        summary: "Objection to project boundary inclusion — landowner disputes project necessity.",
      },
      {
        objectionId: "OBJ-P024-002",
        dateFiled: "2026-07-25",
        status: "pending_hearing",
        summary: "Objection to land classification — seeks reclassification from dry to irrigated.",
      },
    ],
    hearing: {
      hearingId: "HRG-P024-001",
      scheduledDate: null,
      status: "awaiting_schedule",
      outcome: null,
    },
    valuation: null,
    award: null,
    payment: [],
    rr: {
      eligibleFamilies: 3,
      housingAllotted: 0,
      status: "pending_survey",
    },
    possession: null,
    landRecord: null,
  },

  "P-030": {
    readiness: "READY",
    impact: {
      structuresAffected: false,
      treesAffected: false,
      livelihoodImpact: null,
    },
    fieldEvidence: {
      surveyCompleted: true,
      discrepancyFound: false,
      notes: "Survey complete. No structural or livelihood impact beyond land area.",
    },
    objections: [],
    hearing: null,
    valuation: {
      baseValue: 1600000,
      multiplier: 1.5,
      totalEstimatedValue: 2400000,
    },
    award: {
      awardNo: "AWD-P030-2026",
      dateDeclared: "2026-08-15",
      finalAmount: 2400000,
      status: "accepted",
    },
    payment: [
      {
        paymentId: "PAY-P030-001",
        disbursedAmount: 2400000,
        datePaid: "2026-08-28",
        status: "paid",
      },
    ],
    rr: {
      eligibleFamilies: 0,
      housingAllotted: 0,
      status: "not_applicable",
    },
    possession: {
      dateTaken: "2026-09-05",
      status: "taken",
      remarks: "Peaceful possession. Handover documented.",
    },
    landRecord: {
      mutationRef: "MUT-2026-030",
      status: "mutation_complete",
      updatedDate: "2026-09-12",
    },
  },
} as const satisfies Record<CanonicalCaseId, CaseAdapterFields>;
