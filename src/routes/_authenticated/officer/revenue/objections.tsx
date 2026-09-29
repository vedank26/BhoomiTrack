import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { AlertCircle, CheckCircle2, Clock3, UserCheck, Loader2 } from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/revenue/objections")({
  head: () => ({
    meta: [
      { title: "Objections & Hearings — Land Acquisition" },
      {
        name: "description",
        content:
          "Review landowner objections, schedule hearings, and record resolutions for Land Acquisition cases.",
      },
    ],
  }),
  component: RevenueObjectionsPage,
});

function RevenueObjectionsPage() {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const objectionsList = useMemo(() => {
    return cases.flatMap((c) =>
      (c.objections || []).map((obj) => ({
        id: obj.objectionId,
        caseId: c.id,
        projectCode: c.project.projectCode,
        projectName: c.project.projectName,
        parcelRef: c.parcel.parcelRef,
        hearingDate: c.hearing?.scheduledDate ?? null,
        category: "Objection", // Fallback since category isn't in contract
        raisedBy: c.ownership[0]?.displayName ?? "Unknown Landowner",
        filedAt: obj.dateFiled,
        status: obj.status,
        summary: obj.summary,
      })),
    );
  }, [cases]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && objectionsList.length > 0) {
      setSelectedId(objectionsList[0]?.id ?? null);
    }
  }, [objectionsList, selectedId]);

  const selectedObjection = useMemo(
    () => objectionsList.find((item) => item.id === selectedId) ?? objectionsList[0],
    [selectedId, objectionsList],
  );

  return (
    <AppShell portal="officer" department="land_acquisition">
      <PageHeader
        eyebrow="Land Acquisition · Officer Portal"
        title="Landowner Objections & Statutory Hearings"
        description="Review objections, validate valuation challenges, and record the final order or hearing outcome for each affected parcel."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Registered objections ({objectionsList.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            objectionsList.map((objection) => {
              const isSelected = objection.id === selectedObjection?.id;
              return (
                <button
                  key={objection.id}
                  type="button"
                  onClick={() => setSelectedId(objection.id)}
                  className={`surface-panel block w-full p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary">{objection.caseId}</span>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                        {objection.category}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {objection.projectCode || "Project code unavailable"} ·{" "}
                        {objection.projectName || "Project name unavailable"} ·{" "}
                        {objection.parcelRef || "Parcel reference unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Raised by: <strong className="text-foreground">{objection.raisedBy}</strong>{" "}
                        — Filed on {objection.filedAt}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        objection.status === "resolved"
                          ? "complete"
                          : objection.status === "under_review"
                            ? "progress"
                            : "issue"
                      }
                    >
                      {objection.status.replace("_", " ")}
                    </StatusPill>
                  </div>

                  <p className="mt-2 rounded border border-border bg-secondary/30 p-2 text-xs text-foreground/80">
                    “{objection.summary}”
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-5">
          {selectedObjection ? (
            <div className="surface-panel p-6">
              <div className="border-b border-border pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Hearing docket
                </span>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {selectedObjection.caseId} — {selectedObjection.category}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedObjection.projectCode || "Project code unavailable"} ·{" "}
                  {selectedObjection.projectName || "Project name unavailable"} ·{" "}
                  {selectedObjection.parcelRef || "Parcel reference unavailable"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Objector: {selectedObjection.raisedBy}
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertCircle className="size-3.5 text-primary" />
                    Statement received
                  </div>
                  <p className="mt-2 text-sm text-foreground">{selectedObjection.summary}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="size-3.5 text-primary" />
                      Hearing window
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {selectedObjection.hearingDate ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="rounded border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <UserCheck className="size-3.5 text-primary" />
                      Decision status
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {selectedObjection.status.replace("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="rounded border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  The hearing record should document the verification findings, valuation
                  comparison, and statutory reasoned order before final award rectification.
                </div>
              </div>
            </div>
          ) : (
            !isLoading && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No objection selected.
              </div>
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}
