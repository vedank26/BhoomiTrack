import { supabase } from "@/integrations/supabase/client";
import type { SharedCaseContract } from "./case-contract";

export const CITIZEN_CASE_UPDATE_EVENT = "CITIZEN_CASE_UPDATE";

export type CitizenUpdateChannel = "portal" | "sms";
export type CitizenUpdateType =
  "case_update" | "hearing" | "objection" | "compensation" | "r_and_r";

export type CitizenCaseUpdate = {
  id: string;
  title: string;
  message: string;
  type: CitizenUpdateType;
  createdAt: string | null;
  source: string | null;
  channels: CitizenUpdateChannel[];
  sourceKind: "case_record" | "officer_update";
};

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function getCaseRecordUpdates(caseData: SharedCaseContract): CitizenCaseUpdate[] {
  const updates: CitizenCaseUpdate[] = [];

  if (caseData.hearing) {
    const hearing = caseData.hearing;
    updates.push({
      id: `case-hearing-${hearing.hearingId}`,
      title: hearing.status === "scheduled" ? "Hearing scheduled" : "Hearing information",
      message: hearing.scheduledDate
        ? `Hearing ${hearing.hearingId} is scheduled for ${formatDate(hearing.scheduledDate)}.`
        : `Hearing ${hearing.hearingId} is recorded with status ${humanize(hearing.status)}.`,
      type: "hearing",
      createdAt: null,
      source: "Case record",
      channels: ["portal"],
      sourceKind: "case_record",
    });
  }

  for (const objection of caseData.objections) {
    updates.push({
      id: `case-objection-${objection.objectionId}`,
      title: "Objection update",
      message: `Objection ${objection.objectionId}${objection.dateFiled ? ` filed: ${formatDate(objection.dateFiled)}.` : ""} Current status: ${humanize(objection.status)}.`,
      type: "objection",
      createdAt: null,
      source: "Case record",
      channels: ["portal"],
      sourceKind: "case_record",
    });
  }

  if (caseData.valuation) {
    updates.push({
      id: `case-compensation-${caseData.id}`,
      title: "Compensation information",
      message: `Estimated compensation recorded for this case is ${rupees.format(caseData.valuation.totalEstimatedValue)}.`,
      type: "compensation",
      createdAt: null,
      source: "Case record",
      channels: ["portal"],
      sourceKind: "case_record",
    });
  }

  if (caseData.rr) {
    updates.push({
      id: `case-rr-${caseData.id}`,
      title: "R&R status",
      message: `${humanize(caseData.rr.status)} is currently recorded for this case.`,
      type: "r_and_r",
      createdAt: null,
      source: "Case record",
      channels: ["portal"],
      sourceKind: "case_record",
    });
  }

  return updates;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function channelsFromMetadata(value: unknown): CitizenUpdateChannel[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is CitizenUpdateChannel => item === "portal" || item === "sms"),
    ),
  ];
}

function typeFromMetadata(value: unknown): CitizenUpdateType {
  switch (value) {
    case "hearing":
    case "objection":
    case "compensation":
    case "r_and_r":
      return value;
    default:
      return "case_update";
  }
}

/**
 * Reads the selected case's workflow events, then combines Citizen updates
 * with existing case-domain records. Database RLS is the authorization
 * boundary; the metadata and channel checks below only shape the presentation.
 */
export async function getCitizenCaseUpdates(
  caseData: SharedCaseContract,
  channel: CitizenUpdateChannel = "portal",
): Promise<CitizenCaseUpdate[]> {
  const { data: caseRow, error: caseError } = await supabase
    .from("acquisition_cases")
    .select("id")
    .eq("case_no", caseData.id)
    .maybeSingle();

  if (caseError) throw new Error(`Unable to resolve the selected case: ${caseError.message}`);
  if (!caseRow) throw new Error("The selected case is not available through the current session.");

  const { data: events, error: eventError } = await supabase
    .from("case_workflow_events")
    .select("id, event_type, metadata, occurred_at, remarks")
    .eq("case_id", caseRow.id)
    .eq("event_type", CITIZEN_CASE_UPDATE_EVENT)
    .order("occurred_at", { ascending: false });

  if (eventError) throw new Error(`Unable to load case updates: ${eventError.message}`);

  const officerUpdates: CitizenCaseUpdate[] = (events ?? []).flatMap((event) => {
    const metadata = isRecord(event.metadata) ? event.metadata : {};
    const title = typeof metadata["title"] === "string" ? metadata["title"].trim() : "";
    const message = event.remarks?.trim() ?? "";
    const channels = channelsFromMetadata(metadata["channels"]);
    if (
      metadata["visible_to_citizen"] !== true ||
      !title ||
      !message ||
      !channels.includes(channel)
    ) {
      return [];
    }
    return [
      {
        id: event.id,
        title,
        message,
        type: typeFromMetadata(metadata["update_type"]),
        createdAt: event.occurred_at,
        source: typeof metadata["source_label"] === "string" ? metadata["source_label"] : null,
        channels,
        sourceKind: "officer_update" as const,
      },
    ];
  });

  const caseRecordUpdates = getCaseRecordUpdates(caseData).filter((update) =>
    update.channels.includes(channel),
  );

  return [...officerUpdates, ...caseRecordUpdates].sort((left, right) => {
    if (!left.createdAt && !right.createdAt) return 0;
    if (!left.createdAt) return 1;
    if (!right.createdAt) return -1;
    return right.createdAt.localeCompare(left.createdAt);
  });
}
