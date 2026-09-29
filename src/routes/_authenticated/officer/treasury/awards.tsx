import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { Lock, ShieldCheck } from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/treasury/awards")({
  head: () => ({
    meta: [
      { title: "Declared Awards — Treasury / Finance" },
      {
        name: "description",
        content:
          "Read-only award context for cases in the acquisition workflow. Award determination belongs to the Revenue Department / LAO.",
      },
    ],
  }),
  component: TreasuryAwardsPage,
});

function TreasuryAwardsPage() {
  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  return (
    <AppShell portal="officer" department="treasury_finance">
      <PageHeader
        eyebrow="Treasury / Finance Department"
        title="Compensation Award Context"
        description="Treasury reads award context for payment workflow. Award determination belongs to the Revenue Department / LAO."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <div className="surface-panel mb-4 flex items-center gap-3 border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <Lock className="size-4 shrink-0 text-amber-600" />
        <span>
          <strong>Read-only boundary:</strong> Demo adapter values are not official government award
          records. Missing award fields are shown as unavailable.
        </span>
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-3">Case ID</th>
              <th className="p-3">Project</th>
              <th className="p-3">Parcel / Village</th>
              <th className="p-3">Survey / Gat / Khasra</th>
              <th className="p-3">Award reference</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Declared date</th>
              <th className="p-3">Award context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={8}>
                  Loading shared cases…
                </td>
              </tr>
            ) : null}
            {isError ? (
              <tr>
                <td className="p-3 text-destructive" colSpan={8}>
                  Shared case data is unavailable.
                </td>
              </tr>
            ) : null}
            {!isLoading && !isError && cases.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={8}>
                  No cases are available to this session.
                </td>
              </tr>
            ) : null}
            {cases.map((item) => {
              const award = item.award;
              const parcel = item.parcel;
              return (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-semibold text-primary">{item.id}</td>
                  <td className="p-3 text-foreground">
                    <span className="font-semibold">
                      {item.project.projectCode || "Unavailable"}
                    </span>
                    <span className="block text-[0.7rem] text-muted-foreground">
                      {item.project.projectName || "Project name unavailable"}
                    </span>
                  </td>
                  <td className="p-3 text-foreground">
                    <span className="font-semibold">{parcel.parcelRef || "Unavailable"}</span>
                    <span className="block text-[0.7rem] text-muted-foreground">
                      {parcel.village || "Village unavailable"}
                      {parcel.district ? `, ${parcel.district}` : ""}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {[parcel.surveyNo, parcel.gatNo, parcel.khasraNo].filter(Boolean).join(" · ") ||
                      "Unavailable"}
                  </td>
                  <td className="p-3 text-foreground">{award?.awardNo ?? "Unavailable"}</td>
                  <td className="p-3 font-medium text-foreground">
                    {award ? `₹${award.finalAmount.toLocaleString()}` : "Unavailable"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {award?.dateDeclared ?? "Unavailable"}
                  </td>
                  <td className="p-3">
                    <StatusPill tone={award ? "progress" : "neutral"}>
                      {award ? `Synthetic · ${award.status}` : "Unavailable"}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 surface-panel border-l-4 border-l-amber-600 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Treasury responsibility</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Treasury receives declared award information, monitors due dates, and prepares payment
              execution. It does not approve or revise an award.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
