import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { CheckCircle2, IndianRupee, ShieldCheck } from "lucide-react";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/treasury/payments")({
  head: () => ({
    meta: [
      { title: "Payment Tracking — Treasury / Finance" },
      {
        name: "description",
        content:
          "Review payment context associated with acquisition cases. Demo adapter values are not official payment records.",
      },
    ],
  }),
  component: TreasuryPaymentsPage,
});

function TreasuryPaymentsPage() {
  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });
  const payments = cases.flatMap((caseItem) =>
    caseItem.payment.map((payment) => ({ caseItem, payment })),
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const selected = payments.find(({ payment }) => payment.paymentId === selectedPaymentId) ?? null;

  return (
    <AppShell portal="officer" department="treasury_finance">
      <PageHeader
        eyebrow="Treasury / Finance Department"
        title="Compensation Payment Context"
        description="Review adapter-backed payment workflow context using canonical acquisition case and parcel identity."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <div className="surface-panel mb-4 p-3 text-xs text-muted-foreground">
        Payment entries below are synthetic demo adapter data, not verified bank or government
        records. Cases without entries are not represented as paid or pending.
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-3">Case ID</th>
              <th className="p-3">Project</th>
              <th className="p-3">Parcel reference</th>
              <th className="p-3">Survey / Gat / Khasra</th>
              <th className="p-3">Payment reference</th>
              <th className="p-3">Demo amount</th>
              <th className="p-3">Demo status</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={9}>
                  Loading shared cases…
                </td>
              </tr>
            ) : null}
            {isError ? (
              <tr>
                <td className="p-3 text-destructive" colSpan={9}>
                  Shared case data is unavailable.
                </td>
              </tr>
            ) : null}
            {!isLoading && !isError && payments.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={9}>
                  No payment context is available for these cases.
                </td>
              </tr>
            ) : null}
            {payments.map(({ caseItem, payment }) => (
              <tr key={payment.paymentId} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-semibold text-primary">{caseItem.id}</td>
                <td className="p-3 text-foreground">
                  <span className="font-semibold">
                    {caseItem.project.projectCode || "Unavailable"}
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    {caseItem.project.projectName || "Project name unavailable"}
                  </span>
                </td>
                <td className="p-3 text-foreground">
                  <span className="font-semibold">
                    {caseItem.parcel.parcelRef || "Unavailable"}
                  </span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    {caseItem.parcel.village || "Village unavailable"}
                    {caseItem.parcel.district ? `, ${caseItem.parcel.district}` : ""}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {[caseItem.parcel.surveyNo, caseItem.parcel.gatNo, caseItem.parcel.khasraNo]
                    .filter(Boolean)
                    .join(" · ") || "Unavailable"}
                </td>
                <td className="p-3 font-mono text-foreground">{payment.paymentId}</td>
                <td className="p-3 font-bold text-foreground">
                  ₹{payment.disbursedAmount.toLocaleString()}
                </td>
                <td className="p-3">
                  <StatusPill tone={payment.status === "paid" ? "complete" : "progress"}>
                    Synthetic · {payment.status}
                  </StatusPill>
                </td>
                <td className="p-3 text-muted-foreground">{payment.datePaid ?? "Unavailable"}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentId(payment.paymentId)}
                    className="inline-flex items-center gap-1 rounded bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="mt-6 surface-panel border-l-4 border-l-emerald-600 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-emerald-700" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground">Selected demo payment context</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.caseItem.id} · {selected.caseItem.parcel.parcelRef} ·{" "}
                {selected.payment.paymentId}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <IndianRupee className="size-3.5 text-primary" />
                    Demo amount
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    ₹{selected.payment.disbursedAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Demo status
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Synthetic · {selected.payment.status}
                  </p>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Date
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selected.payment.datePaid ?? "Unavailable"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
