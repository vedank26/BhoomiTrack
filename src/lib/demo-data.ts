/**
 * SIH26016 — Phase 0 demonstration data.
 *
 * SYNTHETIC ONLY. No real landowner, citizen, bank or government record is
 * represented here. Every surface that renders this data must display a
 * DataClassBadge with `synthetic` (or `representative` for structural data).
 */

export const DEMO_PROJECT = {
  code: "DEMO-MH-001",
  name: "Mumbai–Pune Infrastructure Corridor",
  authority: "Demonstration Project Authority",
  state: "Maharashtra",
  districts: ["Pune", "Raigad"],
  lengthKm: 94.5,
  currentStage: "objection_3c",
} as const;

export type StatusTone = "complete" | "progress" | "issue" | "neutral";

export const OFFICER_METRICS = [
  { key: "cases", label: "Active acquisition cases", value: "12" },
  { key: "parcels", label: "Parcels identified", value: "1,284" },
  { key: "objections", label: "Open objections", value: "37" },
  { key: "review", label: "Cases needing review", value: "5" },
] as const;

export const OFFICER_PRIORITIES: {
  ref: string;
  title: string;
  detail: string;
  tone: StatusTone;
  label: string;
}[] = [
  {
    ref: "AC-2026-0031",
    title: "Objection hearing window closes soon",
    detail: "Pune · Village Wagholi · 24 objections pending scheduling",
    tone: "issue",
    label: "Action required",
  },
  {
    ref: "AC-2026-0027",
    title: "Parcel boundary discrepancy flagged",
    detail: "Raigad · 3 parcels where GIS extent differs from record extent",
    tone: "issue",
    label: "Action required",
  },
  {
    ref: "AC-2026-0019",
    title: "Award computation awaiting review",
    detail: "Pune · Village Urse · 48 parcels ready for verification",
    tone: "progress",
    label: "Attention",
  },
];

export const WORKFLOW_PROGRESS: {
  stage: string;
  code: string;
  tone: StatusTone;
  label: string;
}[] = [
  { stage: "Project & alignment", code: "—", tone: "complete", label: "Completed" },
  { stage: "Parcel identification", code: "—", tone: "complete", label: "Completed" },
  { stage: "Notification", code: "3A", tone: "complete", label: "Completed" },
  { stage: "Survey / investigation", code: "3B", tone: "complete", label: "Completed" },
  { stage: "Objection & hearing", code: "3C", tone: "progress", label: "In progress" },
  { stage: "Declaration & vesting", code: "3D", tone: "neutral", label: "Not started" },
  { stage: "Compensation award", code: "3G", tone: "neutral", label: "Not started" },
  { stage: "Deposit & payment", code: "3H", tone: "neutral", label: "Not started" },
  { stage: "Possession", code: "3E", tone: "neutral", label: "Not started" },
  { stage: "Closure", code: "—", tone: "neutral", label: "Not started" },
];

export const MINISTRY_METRICS = [
  { key: "projects", label: "Projects monitored", value: "6" },
  { key: "parcels", label: "Affected parcels", value: "4,910" },
  { key: "objections", label: "Objections filed", value: "212" },
  { key: "compensation", label: "Award disbursed", value: "41%" },
] as const;

export const MINISTRY_PROGRESS: { label: string; percent: number; tone: StatusTone }[] = [
  { label: "Parcel identification", percent: 92, tone: "complete" },
  { label: "Notification issued", percent: 74, tone: "progress" },
  { label: "Objections resolved", percent: 48, tone: "progress" },
  { label: "Compensation disbursed", percent: 41, tone: "progress" },
  { label: "R&R entitlements settled", percent: 22, tone: "issue" },
  { label: "Possession taken", percent: 15, tone: "neutral" },
];

export const MINISTRY_RISK: {
  project: string;
  signal: string;
  tone: StatusTone;
  label: string;
}[] = [
  {
    project: "Mumbai–Pune Corridor (DEMO)",
    signal: "Objection backlog growing faster than hearing capacity",
    tone: "issue",
    label: "High delay risk",
  },
  {
    project: "Coastal Link Segment B (DEMO)",
    signal: "Award computation pending beyond configured target",
    tone: "progress",
    label: "Watch",
  },
  {
    project: "Ring Road Phase II (DEMO)",
    signal: "Stage progression on schedule",
    tone: "complete",
    label: "On track",
  },
];

export const CITIZEN_CASE = {
  caseRef: "AC-2026-0031",
  parcelRef: "MH-PUN-WGH-114/2",
  projectName: "Pune–Shirur 6-Lane Expressway (NH-753F)",
  projectAuthority: "National Highways Authority of India (NHAI) & CALA Haveli",
  titleholderName: "Rajesh Kumar Singh",
  village: "Wagholi",
  taluka: "Haveli",
  district: "Pune",
  state: "Maharashtra",
  khataNo: "892/A",
  surveyNo: "114",
  hissaNo: "2",
  totalArea: "1.42 hectare",
  affectedArea: "0.38 hectare",
  affectedPercentage: "26.7%",
  landClassification: "Jirayat Agricultural (Class I Perennial Irrigated)",
  stage: "Objection & hearing (3C)",
  currentStage: "Section 3C — Objection Window Open",
  notificationDate: "15 June 2026",
  objectionDeadline: "15 September 2026",
  compensationStatus: "Award determination pending",
  rrStatus: "R&R eligibility review pending",
  dbtStatus: "Bank account verified; ready for disbursement",
  nextStepBy: "Within the notified objection window",
} as const;

export const CITIZEN_TIMELINE: {
  title: string;
  plain: string;
  tone: StatusTone;
  label: string;
  date?: string;
  stageCode?: string;
}[] = [
  {
    title: "Project notified",
    plain: "The government announced the road project covering your area.",
    tone: "complete",
    label: "Completed",
    date: "15 Jun 2026",
    stageCode: "3A",
  },
  {
    title: "Your land identified",
    plain: "A survey marked which part of your land is affected.",
    tone: "complete",
    label: "Completed",
    date: "20 Jul 2026",
    stageCode: "3B",
  },
  {
    title: "Objection window open",
    plain: "You may raise an objection about the land or its measurement.",
    tone: "progress",
    label: "Action available",
    date: "10 Aug – 15 Sep 2026",
    stageCode: "3C",
  },
  {
    title: "Compensation decided",
    plain: "The amount payable to you will be calculated and published.",
    tone: "neutral",
    label: "Not started",
    date: "Target: Nov 2026",
    stageCode: "3G",
  },
  {
    title: "Payment made",
    plain: "Money is deposited and paid to the recorded interest holders.",
    tone: "neutral",
    label: "Not started",
    date: "Target: Dec 2026",
    stageCode: "3H",
  },
];
