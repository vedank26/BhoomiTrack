import { createFileRoute } from "@tanstack/react-router";
import { IndianRupee, Landmark, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

export const Route = createFileRoute("/_authenticated/citizen/compensation")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const valuation = caseData?.valuation ?? null;
  const award = caseData?.award ?? null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Compensation"
        description="Review valuation and award information associated with your selected case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          {valuation ? (
            <>
              <Section
                title="Compensation overview"
                description="Estimated amount supplied by the selected case data."
              >
                <div className="surface-panel relative overflow-hidden border-primary/20 p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Estimated total
                      </p>
                      <p className="mt-3 break-words font-serif text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                        {rupees.format(valuation.totalEstimatedValue)}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Valuation information recorded for this prototype case.
                      </p>
                    </div>
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IndianRupee className="size-6" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Section>

              <Section
                title="Valuation context"
                description="Base value and multiplier recorded for this case."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="surface-panel p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Base value
                    </p>
                    <p className="mt-3 font-serif text-2xl font-bold tabular-nums">
                      {rupees.format(valuation.baseValue)}
                    </p>
                  </article>
                  <article className="surface-panel p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Applicable multiplier
                    </p>
                    <p className="mt-3 font-serif text-2xl font-bold tabular-nums">
                      {valuation.multiplier}×
                    </p>
                  </article>
                </div>
              </Section>
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-border p-6">
              <h2 className="font-serif text-lg font-semibold">
                Valuation information is unavailable for this case.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A supported valuation will appear here when it is present in the selected case data.
              </p>
            </div>
          )}

          <Section title="Payment / award status">
            <div className="surface-panel p-5">
              <ul className="space-y-3">
                {award ? (
                  <li className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Landmark className="size-4 text-primary" aria-hidden="true" /> Award status
                      {` · ${award.awardNo}`}
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {award.dateDeclared || "Declaration date unavailable"} ·{" "}
                        {rupees.format(award.finalAmount)}
                      </span>
                      <StatusPill tone="neutral">{award.status.replace(/_/g, " ")}</StatusPill>
                    </span>
                  </li>
                ) : (
                  <li className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Landmark className="size-4 text-primary" aria-hidden="true" /> Award status
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Not available in the current case data
                    </span>
                  </li>
                )}
                {caseData.payment.length > 0 ? (
                  caseData.payment.map((payment) => (
                    <li
                      key={payment.paymentId}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <WalletCards className="size-4 text-primary" aria-hidden="true" /> Payment{" "}
                        {payment.paymentId}
                      </span>
                      <StatusPill tone="neutral">{payment.status.replace(/_/g, " ")}</StatusPill>
                    </li>
                  ))
                ) : (
                  <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <WalletCards className="size-4 text-primary" aria-hidden="true" /> Payment
                      status
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Not available in the current case data
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </Section>

          <Section title="Important">
            <div className="surface-panel p-5 text-sm leading-relaxed text-muted-foreground">
              The amounts shown are valuation information for this case. Award and payment records
              are shown separately when available.
            </div>
          </Section>
        </>
      ) : null}
    </AppShell>
  );
}
