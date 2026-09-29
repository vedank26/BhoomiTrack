/**
 * SIH26016 — Shared Case Store
 *
 * The SINGLE source of truth for SharedCaseContract objects consumed by:
 *   Officer, Citizen, Ministry, Survey, Revenue/LAO, Treasury, R&R
 *
 * Architecture:
 *   VERIFIED SUPABASE CORE (acquisition_cases ⋈ projects ⋈ parcels ⋈ land_interests ⋈ parties)
 *           +
 *   ADAPTER FIXTURE FIELDS (case-fixtures.ts — no verified Supabase source yet)
 *           ↓
 *   SharedCaseContract
 *           ↓
 *   UI route/page
 *
 * Rules:
 *   - Core fields (project, parcel, landType, ownership, currentStage) come from Supabase.
 *   - Adapter fields (impact, readiness, objections, hearing, valuation, award,
 *     payment, rr, possession, landRecord, fieldEvidence) come from case-fixtures.ts.
 *   - Fixture values NEVER overwrite verified DB values.
 *   - Person 1 can replace `impact` and `readiness` by updating the merge logic
 *     in `assembleCaseContract` below without touching any UI page.
 *
 * Missing DB records return null. The store does not create records, weaken RLS,
 * or fall back silently to fixture-only data for core fields. Canonical IDs are
 * retained only as optional demo adapter data; any database case can use this
 * contract without a code change.
 *
 * DO NOT import React components here.
 * DO NOT invent database columns here.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SharedCaseContract, OwnershipRecord } from "./case-contract";
import { CASE_ADAPTER_FIXTURES } from "./case-fixtures";

// ---------------------------------------------------------------------------
// Raw DB row types inferred from the generated types
// ---------------------------------------------------------------------------
type AcquisitionCaseRow = {
  id: string;
  case_no: string;
  current_stage: SharedCaseContract["currentStage"];
  method: string;
  project_id: string;
  parcel_id: string;
  project: {
    id: string;
    project_code: string;
    project_name: string;
  } | null;
  parcel: {
    id: string;
    parcel_ref: string;
    survey_no: string | null;
    gat_no: string | null;
    khasra_no: string | null;
    village: string;
    tehsil: string | null;
    district: string;
    total_area_sqm: number | null;
    land_use: string | null;
    land_interests: {
      interest_type: string;
      verification: string;
      share_numerator: number | null;
      share_denominator: number | null;
      party: {
        id: string;
        display_name: string;
      } | null;
    }[];
  } | null;
};

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a single acquisition case by its database case_no
 * including its related project, parcel, and ownership (land_interests → parties).
 *
 * Returns null if the row does not exist — callers must handle null.
 * RLS is respected: the calling user's session determines visibility.
 */
async function fetchCaseByNo(caseNo: string): Promise<AcquisitionCaseRow | null> {
  const { data, error } = await supabase
    .from("acquisition_cases")
    .select(
      `
      id,
      case_no,
      current_stage,
      method,
      project_id,
      parcel_id,
      project:projects(id, project_code, project_name),
      parcel:parcels(
        id,
        parcel_ref,
        survey_no,
        gat_no,
        khasra_no,
        village,
        tehsil,
        district,
        total_area_sqm,
        land_use,
        land_interests(
          interest_type,
          verification,
          share_numerator,
          share_denominator,
          party:parties(id, display_name)
        )
      )
    `,
    )
    .eq("case_no", caseNo)
    .maybeSingle();

  if (error) {
    console.error(`[case-store] fetchCaseByNo("${caseNo}") error:`, error.message);
    return null;
  }

  return data as AcquisitionCaseRow | null;
}

/**
 * Fetches every acquisition case visible to the current authenticated user.
 * RLS remains the source of truth for which cases are available.
 */
async function fetchAllCases(): Promise<AcquisitionCaseRow[]> {
  const { data, error } = await supabase
    .from("acquisition_cases")
    .select(
      `
      id,
      case_no,
      current_stage,
      method,
      project_id,
      parcel_id,
      project:projects(id, project_code, project_name),
      parcel:parcels(
        id,
        parcel_ref,
        survey_no,
        gat_no,
        khasra_no,
        village,
        tehsil,
        district,
        total_area_sqm,
        land_use,
        land_interests(
          interest_type,
          verification,
          share_numerator,
          share_denominator,
          party:parties(id, display_name)
        )
      )
    `,
    )
    .order("case_no", { ascending: true });

  if (error) {
    console.error("[case-store] fetchAllCases error:", error.message);
    return [];
  }

  return (data ?? []) as AcquisitionCaseRow[];
}

// ---------------------------------------------------------------------------
// Assembly — merge DB core + fixture adapter fields → SharedCaseContract
// ---------------------------------------------------------------------------

/**
 * Merges a verified Supabase DB row with the adapter fixture fields.
 *
 * MERGE RULE:
 *   - DB values always win for the verified core fields.
 *   - Fixture values fill adapter-backed fields only.
 *   - Impact and readiness are placed behind the adapter boundary so
 *     Person 1 can replace them without touching any page component.
 */
function assembleCaseContract(row: AcquisitionCaseRow, caseNo: string): SharedCaseContract {
  const fixture = CASE_ADAPTER_FIXTURES[caseNo as keyof typeof CASE_ADAPTER_FIXTURES] ?? {
    impact: { structuresAffected: false, treesAffected: false, livelihoodImpact: null },
    fieldEvidence: { surveyCompleted: false, discrepancyFound: false, notes: null },
    readiness: "REVIEW_REQUIRED" as const,
    objections: [],
    hearing: null,
    valuation: null,
    award: null,
    payment: [],
    rr: null,
    possession: null,
    landRecord: null,
  };

  // --- Verified core: project ---
  const project: SharedCaseContract["project"] = {
    id: row.project?.id ?? row.project_id,
    projectCode: row.project?.project_code ?? "",
    projectName: row.project?.project_name ?? "",
  };

  // --- Verified core: parcel ---
  const parcel: SharedCaseContract["parcel"] = {
    id: row.parcel?.id ?? row.parcel_id,
    parcelRef: row.parcel?.parcel_ref ?? "",
    surveyNo: row.parcel?.survey_no ?? null,
    gatNo: row.parcel?.gat_no ?? null,
    khasraNo: row.parcel?.khasra_no ?? null,
    village: row.parcel?.village ?? "",
    tehsil: row.parcel?.tehsil ?? null,
    district: row.parcel?.district ?? "",
    totalAreaSqm: row.parcel?.total_area_sqm ?? null,
    affectedAreaSqm: null, // sourced from project_parcels.affected_area_sqm in Phase 4
  };

  // --- Verified core: landType (from parcel.land_use) ---
  const landType = row.parcel?.land_use ?? "Unknown";

  // --- Verified core: ownership (land_interests → parties) ---
  const ownership: OwnershipRecord[] =
    row.parcel?.land_interests?.map((li) => ({
      partyId: li.party?.id ?? "",
      displayName: li.party?.display_name ?? "Unknown",
      interestType: li.interest_type,
      verification: li.verification,
      shareNumerator: li.share_numerator,
      shareDenominator: li.share_denominator,
    })) ?? [];

  // --- Verified core: currentStage ---
  const currentStage = row.current_stage;

  // --- Adapter-backed fields (fixture) ---
  // Person 1 integration point: replace fixture.impact and fixture.readiness
  // here with real GIS/readiness data when available. No page changes required.
  const {
    impact,
    readiness,
    fieldEvidence,
    objections,
    hearing,
    valuation,
    award,
    payment,
    rr,
    possession,
    landRecord,
  } = fixture;

  return {
    id: row.case_no,
    project,
    parcel,
    landType,
    impact, // ← Person 1 integration boundary
    ownership,
    fieldEvidence,
    readiness, // ← Person 1 integration boundary
    currentStage,
    objections,
    hearing,
    valuation,
    award,
    payment,
    rr,
    possession,
    landRecord,
  };
}

// ---------------------------------------------------------------------------
// Public store API
// ---------------------------------------------------------------------------

/**
 * Query key factory for TanStack Query.
 * Use these to avoid string typos and enable precise cache invalidation.
 */
export const caseQueryKeys = {
  all: ["shared-cases"] as const,
  list: () => [...caseQueryKeys.all, "list"] as const,
  detail: (caseNo: string) => [...caseQueryKeys.all, "detail", caseNo] as const,
};

/**
 * Fetch and assemble all shared cases visible through the current session.
 *
 * Usage (in a route or component):
 *   const { data } = useQuery({ queryKey: caseQueryKeys.list(), queryFn: listSharedCases });
 *
 * Cases whose DB row does not yet exist in acquisition_cases are silently
 * omitted from the result. The caller receives only assembled, complete
 * SharedCaseContract objects.
 */
export async function listSharedCases(): Promise<SharedCaseContract[]> {
  const rows = await fetchAllCases();
  return rows.map((row) => assembleCaseContract(row, row.case_no));
}

/**
 * Fetch and assemble a single shared case by its database case ID.
 *
 * Returns null when:
 *   - The case_no does not exist in acquisition_cases (no DB record yet), OR
 *   - RLS denies the calling user access to the row.
 *
 * The caller must handle null — do not display a partial contract.
 *
 * Usage:
 *   const { data } = useQuery({
 *     queryKey: caseQueryKeys.detail("P-001"),
 *     queryFn: () => getCaseById("P-001"),
 *   });
 */
export async function getCaseById(caseNo: string): Promise<SharedCaseContract | null> {
  if (!caseNo.trim()) return null;
  const row = await fetchCaseByNo(caseNo);
  if (!row) return null;
  return assembleCaseContract(row, row.case_no);
}
