import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, MetricCard } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import {
  ArrowRight,
  Building,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";

export const Route = createFileRoute("/_authenticated/officer/rr/")({
  head: () => ({
    meta: [
      { title: "R&R Dashboard — BhoomiTrack" },
      {
        name: "description",
        content:
          "Rehabilitation and Resettlement Department dashboard: displaced family tracking, housing allotments, and livelihood support.",
      },
    ],
  }),
  component: RRDashboard,
});

function RRDashboard() {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const rrCases = cases
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
      housingAllottedCount: c.rr!.housingAllotted,
      status: c.rr!.status,
    }));

  const totalAffected = rrCases.reduce((sum, item) => sum + item.affectedFamilies, 0);
  const totalHousingAllotted = rrCases.reduce((sum, item) => sum + item.housingAllottedCount, 0);
  const activeSchemes = rrCases.filter(
    (item) =>
      item.status.includes("pending") ||
      item.status.includes("review") ||
      item.status.includes("partial"),
  ).length;

  return (
    <AppShell portal="officer" department="rr">
      <PageHeader
        eyebrow="Rehabilitation & Resettlement · Officer Portal"
        title="Rehabilitation & Resettlement Console"
        description="Statutory socioeconomic resettlement schemes, displaced family enumeration, housing unit allotments, and livelihood rehabilitation."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <div className="surface-panel mb-6 border-l-4 border-l-sky-600 bg-sky-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-sky-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">
              What Rehabilitation & Resettlement Owns
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              As the Rehabilitation & Resettlement authority under the statutory resettlement
              framework, your department is responsible for ensuring welfare and restoration of
              affected families.
            </p>
            <ul className="mt-3 grid gap-2 text-xs text-foreground/90 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-sky-600" />
                <span>
                  Executes the approved resettlement scheme for families displaced by land
                  acquisition.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-sky-600" />
                <span>
                  Enumerates and tracks affected vs. physically displaced families across each
                  acquisition case.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-sky-600" />
                <span>
                  Manages constructed housing unit allotments and infrastructure in resettlement
                  enclaves.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-sky-600" />
                <span>
                  Processes livelihood grants, skill development, and one-time disturbance
                  allowances.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Section
        title="Resettlement scheme metrics"
        description="Aggregated progress across all active projects."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total affected families"
            value={String(totalAffected)}
            note="Enumerated in baseline survey"
          />
          <MetricCard label="Displaced families" value="—" note="Not available in current demo" />
          <MetricCard
            label="Housing units allotted"
            value={String(totalHousingAllotted)}
            note="In resettlement enclaves"
          />
          <MetricCard
            label="Active R&R schemes"
            value={String(activeSchemes)}
            note="Under active execution"
          />
        </div>
      </Section>

      <Section
        title="Cases requiring resettlement tracking"
        description="Cases with enumerated displaced or affected families."
        aside={<DataClassBadge dataClass="synthetic" />}
      >
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading cases...</p>}
          <p className="text-xs text-muted-foreground">
            R&amp;R counts and statuses below are synthetic adapter context.
          </p>

          {rrCases.map((item) => (
            <div
              key={item.id}
              className="surface-panel flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {item.caseId}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    Parcel: {item.parcelRef || "Unavailable"} · Survey:{" "}
                    {item.surveyNo || "Unavailable"} · Gat: {item.gatNo || "Unavailable"} · Khasra:{" "}
                    {item.khasraNo || "Unavailable"} ({item.village})
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {item.projectCode || "Project code unavailable"} ·{" "}
                  {item.projectName || "Project name unavailable"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Affected: <strong className="text-foreground">{item.affectedFamilies}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Displaced: <strong className="text-muted-foreground">—</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Housing allotted:{" "}
                    <strong className="text-foreground">{item.housingAllottedCount}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusPill
                  tone={
                    item.status === "completed" || item.status === "not_applicable"
                      ? "complete"
                      : item.status.includes("pending")
                        ? "progress"
                        : "neutral"
                  }
                >
                  {item.status.replace(/_/g, " ")}
                </StatusPill>
                <Link
                  to="/officer/rr/families"
                  search={{ caseId: item.caseId }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  Update R&R <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="R&R workspaces" description="Direct working pages.">
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/officer/rr/families"
            className="surface-panel group block p-5 transition-all hover:border-sky-600/50"
          >
            <div className="flex items-center justify-between">
              <Users className="size-5 text-sky-600 transition-transform group-hover:scale-110" />
              <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-sky-600" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              Affected & Displaced Families Register
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Track family counts, update housing unit allocations, record livelihood grants, and
              certify resettlement completion.
            </p>
          </a>

          <div className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <HeartHandshake className="size-5 text-emerald-600" />
              <Building className="size-4 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              Resettlement support pipeline
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Housing, repair grants, and livelihood restoration are tracked until each family is
              fully rehabilitated.
            </p>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
