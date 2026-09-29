import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { AlertTriangle, CheckCircle2, HeartHandshake, Home, Save, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";

export const Route = createFileRoute("/_authenticated/officer/rr/families")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Affected Families — R&R Department" },
      {
        name: "description",
        content:
          "Track affected and displaced family welfare, housing allotments, and livelihood support under the R&R programme.",
      },
    ],
  }),
  component: RRFamiliesPage,
});

function RRFamiliesPage() {
  const { caseId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: cases = [], isLoading } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const rrCases = useMemo(() => {
    return cases
      .filter((c): c is SharedCaseContract => !!c.rr)
      .map((c) => ({
        id: c.id,
        caseId: c.id,
        projectCode: c.project.projectCode,
        projectName: c.project.projectName,
        parcelRef: c.parcel.parcelRef,
        surveyNo: c.parcel.surveyNo,
        gatNo: c.parcel.gatNo,
        khasraNo: c.parcel.khasraNo,
        village: c.parcel.village,
        affectedFamilies: c.rr!.eligibleFamilies,
        status: c.rr!.status,
        housingAllottedCount: c.rr!.housingAllotted,
        livelihoodNotes: "—",
      }));
  }, [cases]);

  const selectedCase = caseId
    ? (rrCases.find((caseItem) => caseItem.id === caseId) ?? null)
    : (rrCases[0] ?? null);

  const [affectedCount, setAffectedCount] = useState<number>(0);
  const [rrStatus, setRRStatus] = useState<string>("in_progress");
  const [housingCount, setHousingCount] = useState<number>(0);
  const [livelihoodNotes, setLivelihoodNotes] = useState<string>("");

  useEffect(() => {
    if (selectedCase) {
      setAffectedCount(selectedCase.affectedFamilies);
      setRRStatus(selectedCase.status);
      setHousingCount(selectedCase.housingAllottedCount);
      setLivelihoodNotes(selectedCase.livelihoodNotes);
    }
  }, [selectedCase]);

  function selectCase(caseItem: (typeof rrCases)[0]) {
    void navigate({ search: (previous) => ({ ...previous, caseId: caseItem.id }) });
  }

  function handleSaveRR(event: React.FormEvent) {
    event.preventDefault();
    // No backend write, purely read-only demo.
  }

  return (
    <AppShell portal="officer" department="rr">
      <PageHeader
        eyebrow="Rehabilitation & Resettlement Department"
        title="Affected & Displaced Families Management"
        description="Synthetic R&R adapter context associated with shared acquisition cases; this prototype does not persist updates."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Acquisition Cases with R&R Scheme ({rrCases.length})
          </h2>

          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {rrCases.map((caseItem) => {
            const isSelected = selectedCase?.id === caseItem.id;

            return (
              <div
                key={caseItem.id}
                onClick={() => selectCase(caseItem)}
                className={`surface-panel cursor-pointer p-4 transition-all ${
                  isSelected
                    ? "border-sky-600 bg-sky-50/10 ring-1 ring-sky-600"
                    : "hover:border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-sky-700">{caseItem.caseId}</span>
                    <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                      Parcel: {caseItem.parcelRef || "Unavailable"} · Khasra:{" "}
                      {caseItem.khasraNo || "Unavailable"} · {caseItem.village}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {caseItem.projectCode || "Project code unavailable"} ·{" "}
                      {caseItem.projectName || "Project name unavailable"}
                    </p>
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      Survey: {caseItem.surveyNo || "Unavailable"} · Gat:{" "}
                      {caseItem.gatNo || "Unavailable"}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      caseItem.status === "completed" || caseItem.status === "not_applicable"
                        ? "complete"
                        : caseItem.status.includes("pending")
                          ? "progress"
                          : "neutral"
                    }
                  >
                    {caseItem.status.replace(/_/g, " ")}
                  </StatusPill>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 rounded bg-secondary/50 p-2 text-center text-xs">
                  <div>
                    <span className="block text-[0.65rem] font-semibold uppercase text-muted-foreground">
                      Affected
                    </span>
                    <span className="font-bold text-foreground">{caseItem.affectedFamilies}</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] font-semibold uppercase text-muted-foreground">
                      Displaced
                    </span>
                    <span className="font-bold text-muted-foreground">—</span>
                  </div>
                  <div>
                    <span className="block text-[0.65rem] font-semibold uppercase text-muted-foreground">
                      Housing
                    </span>
                    <span className="font-bold text-foreground">
                      {caseItem.housingAllottedCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="surface-panel space-y-5 p-6">
              <div className="border-b border-border pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      Resettlement Scheme Dossier
                    </span>
                    <h2 className="mt-1 text-xl font-bold font-serif text-foreground">
                      {selectedCase.caseId}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedCase.projectCode || "Project code unavailable"} ·{" "}
                      {selectedCase.projectName || "Project name unavailable"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Parcel: {selectedCase.parcelRef || "Unavailable"} · Survey:{" "}
                      {selectedCase.surveyNo || "Unavailable"} · Gat:{" "}
                      {selectedCase.gatNo || "Unavailable"} · Khasra:{" "}
                      {selectedCase.khasraNo || "Unavailable"} ({selectedCase.village})
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      selectedCase.status === "completed" ||
                      selectedCase.status === "not_applicable"
                        ? "complete"
                        : "progress"
                    }
                  >
                    {selectedCase.status.replace(/_/g, " ")}
                  </StatusPill>
                </div>
              </div>

              <form onSubmit={handleSaveRR} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Total Affected Families (PAFs) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={affectedCount}
                      onChange={(event) => setAffectedCount(Number(event.target.value))}
                      className="mt-1 w-full rounded border border-input bg-background p-2 text-xs"
                    />
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      Total families suffering loss of land, livelihood, or shelter.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Physically Displaced Families (PDFs)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Not available in demo"
                      className="mt-1 w-full rounded border border-input bg-muted p-2 text-xs text-muted-foreground"
                    />
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      Detail currently unsupported by shared contract.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      R&R Scheme Execution Status
                    </label>
                    <input
                      type="text"
                      value={rrStatus.replace(/_/g, " ")}
                      disabled
                      className="mt-1 w-full rounded border border-input bg-muted p-2 text-xs text-muted-foreground capitalize"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground flex items-center gap-1">
                      <Home className="size-3.5 text-sky-600" />
                      Housing Units Allotted
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={housingCount}
                      onChange={(event) => setHousingCount(Number(event.target.value))}
                      className="mt-1 w-full rounded border border-input bg-background p-2 text-xs"
                    />
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      Constructed dwelling units or developed plots handed over.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HeartHandshake className="size-3.5 text-sky-600" />
                    Livelihood Support & Grant Processing Notes
                  </label>
                  <textarea
                    rows={3}
                    value={livelihoodNotes}
                    disabled
                    placeholder="Not available in demo..."
                    className="mt-1 w-full rounded border border-input bg-muted p-2 text-xs text-muted-foreground"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-2 rounded bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    <Save className="size-3.5" />
                    Simulate Update
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="surface-panel p-8 text-center text-sm text-muted-foreground">
              {caseId
                ? `No R&R adapter context is available for requested case ${caseId}.`
                : "No R&R case context is available."}
            </div>
          )}
        </div>
      </div>

      <Section
        title="R&R readout"
        description="Quick completion indicators for welfare and rehabilitation tracking."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="surface-panel p-4">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="size-3.5 text-sky-600" />
              Affected families
            </div>
            <p className="mt-3 text-2xl font-bold font-serif text-foreground">
              {rrCases.reduce((sum, caseItem) => sum + caseItem.affectedFamilies, 0)}
            </p>
          </div>
          <div className="surface-panel p-4">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <Home className="size-3.5 text-sky-600" />
              Housing units
            </div>
            <p className="mt-3 text-2xl font-bold font-serif text-foreground">
              {rrCases.reduce((sum, caseItem) => sum + caseItem.housingAllottedCount, 0)}
            </p>
          </div>
          <div className="surface-panel p-4">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Completed schemes
            </div>
            <p className="mt-3 text-2xl font-bold font-serif text-foreground">
              {
                rrCases.filter(
                  (caseItem) =>
                    caseItem.status === "completed" || caseItem.status === "not_applicable",
                ).length
              }
            </p>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
