/**
 * SIH26016 — shared domain vocabulary.
 *
 * Single source of naming conventions for every phase. Database enums,
 * route names and UI labels MUST derive from these constants so that later
 * phases (GIS, workflow, AI) stay aligned with the Master Specification.
 */

export const APP = {
  code: "BhoomiTrack",
  shortName: "BhoomiTrack",
  name: "Integrated Land Acquisition & Management Platform",
  fullName: "BhoomiTrack — Integrated Land Acquisition & Management Platform",
  tagline: "One parcel — one acquisition case — one traceable lifecycle.",
  specVersion: "Master System Specification v1.0",
} as const;

/** Prototype user roles (spec §4.1). */
export const ROLES = ["officer", "ministry", "citizen"] as const;
export type Role = (typeof ROLES)[number];

/** Group A Department-scoped Officer Accounts. */
export const OFFICER_DEPARTMENTS = [
  "project_authority_gis",
  "survey_land_records",
  "land_acquisition",
  "treasury_finance",
  "rr",
  "district_administration",
] as const;
export type OfficerDepartment = (typeof OFFICER_DEPARTMENTS)[number];

export const OFFICER_DEPARTMENT_META: Record<
  OfficerDepartment,
  { label: string; purpose: string; home: string }
> = {
  project_authority_gis: {
    label: "Project Authority / Technical & GIS",
    purpose: "Project setup, alignment input, GIS entry point.",
    home: "/officer",
  },
  survey_land_records: {
    label: "Survey & Land Records",
    purpose: "Boundary verification, parcel classification and field issues.",
    home: "/officer/survey",
  },
  land_acquisition: {
    label: "Land Acquisition",
    purpose: "Intake, scrutiny, notifications, objections and declaration.",
    home: "/officer/revenue",
  },
  treasury_finance: {
    label: "Treasury / Finance",
    purpose: "Compensation disbursement, award tracking and lapse risk.",
    home: "/officer/treasury",
  },
  rr: {
    label: "Rehabilitation & Resettlement",
    purpose: "Affected family welfare, housing and livelihood support.",
    home: "/officer/rr",
  },
  district_administration: {
    label: "District Administration / Coordination",
    purpose: "District overview, coordination and escalations.",
    home: "/officer",
  },
};

export const AGENCIES = [
  "national_highways",
  "railways",
  "msrdc",
  "mmrda",
  "port_authority",
  "metro_rail",
  "state_highways_pwd",
  "other_infrastructure",
] as const;
export type Agency = (typeof AGENCIES)[number];

export const AGENCY_META: Record<
  Agency,
  { label: string; status: "Active Prototype" | "Preview" }
> = {
  national_highways: { label: "National Highways", status: "Active Prototype" },
  railways: { label: "Railways", status: "Preview" },
  msrdc: { label: "MSRDC", status: "Preview" },
  mmrda: { label: "MMRDA / Urban Infrastructure", status: "Preview" },
  port_authority: { label: "Port / Port Authority", status: "Preview" },
  metro_rail: { label: "Metro Rail", status: "Preview" },
  state_highways_pwd: { label: "State Highways / PWD", status: "Preview" },
  other_infrastructure: { label: "Other Infrastructure", status: "Preview" },
};

export const ROLE_META: Record<
  Role,
  { label: string; purpose: string; home: "/officer" | "/ministry" | "/citizen" }
> = {
  officer: {
    label: "Officer / Admin",
    purpose: "Create and progress acquisition cases",
    home: "/officer",
  },
  ministry: {
    label: "Ministry / Oversight",
    purpose: "Monitor aggregated progress and risk",
    home: "/ministry",
  },
  citizen: {
    label: "Citizen",
    purpose: "Understand and participate in your own case",
    home: "/citizen",
  },
};

/**
 * National Highway demo workflow path (spec §5.1).
 * The engine stays configurable — this is one configured sequence, not a
 * hard-coded universal legal order.
 */
export const CASE_STAGES = [
  { key: "project_alignment", code: "—", label: "Project & alignment" },
  { key: "parcel_identification", code: "—", label: "Parcel identification" },
  { key: "notification_3a", code: "3A", label: "Notification" },
  { key: "survey_3b", code: "3B", label: "Survey / investigation" },
  { key: "objection_3c", code: "3C", label: "Objection & hearing" },
  { key: "declaration_3d", code: "3D", label: "Declaration & vesting" },
  { key: "compensation_3g", code: "3G", label: "Compensation award" },
  { key: "payment_3h", code: "3H", label: "Deposit & payment" },
  { key: "possession_3e", code: "3E", label: "Possession" },
  { key: "closure", code: "—", label: "Closure" },
] as const;

export type CaseStageKey = (typeof CASE_STAGES)[number]["key"];

/** Data classes (spec §7.1). Every dataset shown in the UI must carry one. */
export const DATA_CLASSES = {
  real_public_aggregate: {
    label: "Real — public aggregate",
    short: "REAL",
    note: "Official public statistics / open datasets.",
  },
  representative: {
    label: "Representative",
    short: "REPRESENTATIVE",
    note: "Structure resembles government records; represents no real citizen.",
  },
  synthetic: {
    label: "Synthetic",
    short: "SYNTHETIC",
    note: "Fully fabricated demo names, parcels, cases, payments.",
  },
  authorized_integration: {
    label: "Authorized integration — future",
    short: "AUTHORIZED",
    note: "Only via official authorized APIs. Not used in the prototype.",
  },
} as const;

export type DataClass = keyof typeof DATA_CLASSES;

/** Risk bands used by AI decision support (spec §10). */
export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/**
 * Prototype seed mode. When true, the UI presents clearly labelled
 * synthetic/representative demo data instead of authoritative records.
 */
export const SEED_MODE = true;
