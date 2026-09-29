import { createFileRoute } from "@tanstack/react-router";
import { Info, ReceiptText, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

export const Route = createFileRoute("/_authenticated/citizen/payment-discrepancy")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment Discrepancy — Citizen Portal" },
      {
        name: "description",
        content: "Review payment discrepancy information for your selected case.",
      },
    ],
  }),
  component: CitizenPaymentDiscrepancyPage,
});

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function CitizenPaymentDiscrepancyPage() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const valuation = caseData?.valuation ?? null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Payment Discrepancy"
        description="Payment discrepancy information for the selected case, when available."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section
            title="Payment status"
            description="Payment and discrepancy details are shown only when a case-specific record is available."
          >
            <div className="surface-panel grid gap-5 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Payment discrepancy
                </p>
                <p className="mt-3 text-sm font-semibold">
                  Payment discrepancy data is not available for this case.
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Payment record
                </p>
                {caseData.payment.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {caseData.payment.map((payment) => (
                      <li
                        key={payment.paymentId}
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <WalletCards className="size-4 text-primary" aria-hidden="true" />
                            {payment.paymentId}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            ₹{payment.disbursedAmount.toLocaleString("en-IN")}
                            {payment.datePaid ? ` · ${payment.datePaid}` : ""}
                          </p>
                        </div>
                        {payment.status ? (
                          <StatusPill tone="neutral">
                            {payment.status.replace(/_/g, " ")}
                          </StatusPill>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm font-semibold">
                    Not available in the current case data
                  </p>
                )}
              </div>
            </div>
          </Section>

          {valuation ? (
            <Section title="Related compensation">
              <div className="surface-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Estimated compensation
                    </p>
                    <p className="mt-2 break-words font-serif text-3xl font-bold tabular-nums sm:text-4xl">
                      {rupees.format(valuation.totalEstimatedValue)}
                    </p>
                  </div>
                  <ReceiptText className="size-6 text-primary" aria-hidden="true" />
                </div>
                <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <Detail label="Base value" value={rupees.format(valuation.baseValue)} />
                  <Detail label="Multiplier" value={`${valuation.multiplier}×`} />
                </dl>
              </div>
            </Section>
          ) : (
            <Section title="Related compensation">
              <div className="surface-panel p-5 text-sm text-muted-foreground">
                Compensation information is unavailable in the current case data.
              </div>
            </Section>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Case reference">
              <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
                <Detail label="Case" value={caseData.id} />
                <Detail label="Parcel" value={caseData.parcel.parcelRef || "Unavailable"} />
              </dl>
            </Section>
            <Section title="About payment records">
              <div className="surface-panel flex gap-3 p-5">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The compensation information shown here is the supported valuation record for this
                  case. Payment and discrepancy details appear when a case-specific record is
                  available.
                </p>
              </div>
            </Section>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}
