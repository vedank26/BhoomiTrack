import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, MetricCard } from "@/components/layout/PageHeader";
import { Loader2 } from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";

export const Route = createFileRoute("/_authenticated/officer/survey/")({
  head: () => ({
    meta: [
      { title: "Survey & Land Records Dashboard — BhoomiTrack" },
      {
        name: "description",
        content: "Survey and Land Records case and parcel identity overview.",
      },
    ],
  }),
  component: SurveyDashboard,
});

function SurveyDashboard() {
  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  return (
    <AppShell portal="officer" department="survey_land_records">
      <PageHeader
        eyebrow="Survey & Land Records · Officer Portal"
        title="Survey & Land Records Console"
        description="Shared acquisition case identities and parcel records used across BhoomiTrack."
      />

      <Section title="Shared cases" description="Select a case to review its parcel dossier.">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Cases available"
            value={isLoading ? "…" : isError ? "Unavailable" : String(cases.length)}
            note="Visible through the shared-case source"
          />
          <MetricCard
            label="Field survey status"
            value="Not recorded"
            note="No persisted Survey status source"
          />
          <MetricCard
            label="Open ground issues"
            value="Not recorded"
            note="No persisted Survey issue source"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : isError ? (
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            Shared cases are unavailable.
          </p>
        ) : cases.length === 0 ? (
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            No shared cases are available.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  {[
                    "Case ID",
                    "Project",
                    "Parcel Reference",
                    "Location",
                    "Cadastral IDs",
                    "Recorded Area",
                    "Current Stage",
                    "Land Type",
                    "",
                  ].map((heading) => (
                    <th key={heading || "open"} className="px-3 py-2 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-semibold">{c.id || "Unavailable"}</td>
                    <td className="px-3 py-3">
                      {c.project.projectCode || "Unavailable"}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {c.project.projectName || "Unavailable"}
                      </span>
                    </td>
                    <td className="px-3 py-3">{c.parcel.parcelRef || "Unavailable"}</td>
                    <td className="px-3 py-3">
                      {c.parcel.village || "Unavailable"}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {c.parcel.tehsil || "Unavailable"} · {c.parcel.district || "Unavailable"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      Survey: {c.parcel.surveyNo || "Unavailable"}
                      <br />
                      Gat: {c.parcel.gatNo || "Unavailable"}
                      <br />
                      Khasra: {c.parcel.khasraNo || "Unavailable"}
                    </td>
                    <td className="px-3 py-3">
                      {c.parcel.totalAreaSqm == null
                        ? "Unavailable"
                        : `${c.parcel.totalAreaSqm.toLocaleString()} m²`}
                    </td>
                    <td className="px-3 py-3">{getStageDisplayLabel(c.currentStage)}</td>
                    <td className="px-3 py-3">{c.landType || "Unavailable"}</td>
                    <td className="px-3 py-3">
                      <Link
                        to="/officer/survey/parcels"
                        search={{ caseId: c.id }}
                        className="text-xs font-semibold text-primary underline underline-offset-2"
                      >
                        Open dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </AppShell>
  );
}
