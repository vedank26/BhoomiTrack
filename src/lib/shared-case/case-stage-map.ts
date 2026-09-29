import { DatabaseWorkflowStage } from "./case-contract";

export const STAGE_DISPLAY_LABELS: Record<DatabaseWorkflowStage, string> = {
  identification: "Parcel Identification",
  preliminary_notification: "Preliminary Notification",
  survey: "Survey & Investigation",
  objection: "Objection",
  hearing: "Hearing",
  declaration: "Declaration & Vesting",
  award: "Award Determination",
  compensation: "Compensation Calculation",
  possession: "Possession Taking",
  completed: "Completed",
};

/**
 * Safely converts a database workflow stage enum to its human-readable display label.
 */
export function getStageDisplayLabel(stage: DatabaseWorkflowStage): string {
  return STAGE_DISPLAY_LABELS[stage] ?? "Unknown Stage";
}
