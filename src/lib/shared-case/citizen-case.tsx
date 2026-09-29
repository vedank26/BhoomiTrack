import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getCaseById, listSharedCases } from "./case-store";
import type { SharedCaseContract } from "./case-contract";
import { getStageDisplayLabel } from "./case-stage-map";
import { resolveCitizenCasePresentation } from "./citizen-demo-data";

export function useCitizenCase() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const caseId = String((location.search as { caseId?: string }).caseId ?? "");

  const query = useQuery({
    queryKey: ["citizen-selected-case", user?.id ?? null, caseId],
    queryFn: async () => {
      // Keep the existing citizen identity binding and let RLS determine visibility.
      const { error: bindError } = await supabase.rpc("bind_demo_party");
      if (bindError) {
        throw new Error(`Citizen context unavailable: ${bindError.message}`);
      }

      const cases = await listSharedCases();
      const selected = caseId
        ? cases.some((caseData) => caseData.id === caseId)
          ? await getCaseById(caseId)
          : null
        : cases.length === 1
          ? cases[0]
          : null;
      return { cases, selected };
    },
  });

  useEffect(() => {
    const selected = query.data?.selected;
    if (!caseId && query.data?.cases.length === 1 && selected) {
      void navigate({ search: { caseId: selected.id }, replace: true } as never);
    }
  }, [caseId, navigate, query.data]);

  return query;
}

export function CitizenCaseContext({
  caseData,
  compact = false,
}: {
  caseData: SharedCaseContract;
  compact?: boolean;
}) {
  const presentation = resolveCitizenCasePresentation(caseData);

  return (
    <div
      className={`mb-6 grid gap-4 rounded-xl border border-border bg-muted/30 text-sm sm:grid-cols-2 xl:grid-cols-3 ${compact ? "p-3" : "p-4"}`}
    >
      <ContextValue label="Case" value={caseData.id} />
      <ContextValue label="Parcel" value={presentation.parcelRef || "Unavailable"} />
      <ContextValue label="Project" value={caseData.project.projectName || "Unavailable"} />
      <ContextValue label="Current stage" value={getStageDisplayLabel(caseData.currentStage)} />
      <ContextValue
        label="Recorded landholder"
        value={presentation.recordedLandholder || "Unavailable"}
      />
      <ContextValue label="Owner reference" value={presentation.ownerReference || "Unavailable"} />
      <ContextValue
        label="Recorded interest"
        value={presentation.recordedInterestType || "Unavailable"}
      />
      <ContextValue
        label="Owner verification"
        value={presentation.ownerVerification || "Unavailable"}
      />
      <ContextValue
        label="Citizen / Party"
        value={presentation.citizenPartyName ? "Citizen" : "Unavailable"}
      />
      <div className="sm:col-span-2 xl:col-span-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Portal relationship
        </span>
        <p className="mt-1 font-semibold">
          {presentation.portalRelationshipLabel || "Unavailable"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This Citizen access relationship does not by itself establish legal ownership.
        </p>
      </div>
    </div>
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

export function CitizenCaseState({
  loading,
  error,
  caseData,
}: {
  loading: boolean;
  error: unknown;
  caseData: SharedCaseContract | null;
}) {
  if (loading)
    return (
      <p className="surface-panel p-4 text-sm text-muted-foreground">Loading selected case…</p>
    );
  if (error)
    return (
      <p className="surface-panel p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "Citizen case data is unavailable."}
      </p>
    );
  if (!caseData)
    return (
      <p className="surface-panel p-4 text-sm text-muted-foreground">
        No case is currently available for this Citizen portal.
      </p>
    );
  return null;
}
