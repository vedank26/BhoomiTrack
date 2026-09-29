import { createFileRoute } from "@tanstack/react-router";
import { FileText, FolderOpen, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import { resolveCitizenCasePresentation } from "@/lib/shared-case/citizen-demo-data";

export const Route = createFileRoute("/_authenticated/citizen/documents")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
});

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const presentation = caseData ? resolveCitizenCasePresentation(caseData) : null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="Documents"
        description="Review documents published for your selected acquisition case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section
            title="Document center"
            description="Case-specific documents available through the Citizen portal."
          >
            <div className="surface-panel overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/30 p-5 sm:p-6">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Documents for selected case
                  </p>
                  <h2 className="mt-2 break-words font-serif text-xl font-bold">{caseData.id}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Parcel {presentation?.parcelRef || "Unavailable"}
                  </p>
                </div>
                <StatusPill tone="neutral">Not available</StatusPill>
              </div>
              <div className="px-5 py-10 text-center sm:px-8 sm:py-12">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                  <FolderOpen className="size-7" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold">
                  No case-specific documents are currently available through the Citizen portal.
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Documents published for this case will appear here when they are available. No
                  document records or download links are provided by the current case data.
                </p>
              </div>
            </div>
          </Section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Document access">
              <div className="surface-panel flex gap-3 p-5">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Only documents associated with your selected case are shown in the Citizen portal.
                </p>
              </div>
            </Section>
            <Section title="Case references">
              <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
                <Reference label="Case" value={caseData.id} />
                <Reference label="Parcel" value={presentation?.parcelRef || "Unavailable"} />
              </dl>
            </Section>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-4" aria-hidden="true" />
            Availability here describes the Citizen portal records; it does not indicate whether
            documents exist elsewhere.
          </p>
        </>
      ) : null}
    </AppShell>
  );
}

function Reference({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}
