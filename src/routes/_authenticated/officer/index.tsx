import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, PhasePlaceholder } from "@/components/layout/AppShell";
import { PageHeader, Section, MetricCard } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { StatusPill } from "@/components/ui/status-pill";
import { DbStatusPanel } from "@/components/DbStatusPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchDepartment, useAuth } from "@/lib/auth";
import { OFFICER_DEPARTMENT_META } from "@/lib/domain";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import type { SharedCaseContract } from "@/lib/shared-case/case-contract";

export const Route = createFileRoute("/_authenticated/officer/")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Officer Portal — BhoomiTrack" },
      {
        name: "description",
        content:
          "Officer operations console: today's priorities, case metrics, acquisition progress and parcels needing attention.",
      },
      { property: "og:title", content: "Officer Portal — BhoomiTrack" },
      {
        property: "og:description",
        content:
          "Operations console for acquisition cases, parcel verification and statutory stage progression.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });

    const department = await fetchDepartment(data.user.id);
    if (
      department &&
      department !== "project_authority_gis" &&
      department !== "district_administration"
    ) {
      const dest = OFFICER_DEPARTMENT_META[department]?.home;
      if (dest && dest !== "/officer") {
        throw redirect({
          to: dest as "/officer/revenue" | "/officer/survey" | "/officer/treasury" | "/officer/rr",
        });
      }
    }
  },
  component: OfficerPortal,
});

function getAttentionReason(c: SharedCaseContract): string {
  if (c.readiness === "BLOCKED") {
    if (c.fieldEvidence?.discrepancyFound) {
      return c.fieldEvidence.notes || "Field survey discrepancy found";
    }
    if (c.objections && c.objections.some((o) => o.status !== "resolved")) {
      return `Unresolved objections (${c.objections.length})`;
    }
    return "Workflow blocked awaiting external clearance";
  }

  if (c.readiness === "REVIEW_REQUIRED") {
    if (c.objections && c.objections.some((o) => o.status !== "resolved")) {
      return "Review pending objections";
    }
    return "Pending officer review before advancing workflow";
  }

  return "Proceed to next workflow stage";
}

function OfficerPortal() {
  const { department, departmentLoading } = useAuth();
  const navigate = useNavigate();
  const { caseId } = Route.useSearch();

  useEffect(() => {
    if (
      !departmentLoading &&
      department &&
      department !== "project_authority_gis" &&
      department !== "district_administration"
    ) {
      const dest = OFFICER_DEPARTMENT_META[department]?.home;
      if (dest && dest !== "/officer") {
        navigate({
          to: dest as "/officer/revenue" | "/officer/survey" | "/officer/treasury" | "/officer/rr",
          replace: true,
        });
      }
    }
  }, [department, departmentLoading, navigate]);

  const {
    data: cases = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });

  const isDistrictAdmin = department === "district_administration";
  const activeDept = isDistrictAdmin ? "district_administration" : "project_authority_gis";
  const headerEyebrow = isDistrictAdmin
    ? "District Administration / Coordination"
    : "Project Authority / Technical & GIS";
  const headerTitle = isDistrictAdmin
    ? "District Coordination Overview"
    : "Project Authority Console";
  const headerDescription = isDistrictAdmin
    ? "Action and readiness dashboard derived from canonical shared cases."
    : "Project alignment, corridor parcels, and technical GIS acquisition readiness overview.";

  // Prevent rendering district or default content while redirecting to a department route
  if (
    !departmentLoading &&
    department &&
    department !== "project_authority_gis" &&
    department !== "district_administration"
  ) {
    return null;
  }

  if (isLoading) {
    return (
      <AppShell portal="officer" department={activeDept}>
        <PageHeader
          eyebrow={headerEyebrow}
          title={headerTitle}
          description="Loading canonical cases..."
        />
        <div className="flex justify-center p-12 text-sm text-muted-foreground">
          Loading dashboard data...
        </div>
      </AppShell>
    );
  }

  if (isError || cases.length === 0) {
    return (
      <AppShell portal="officer" department={activeDept}>
        <PageHeader
          eyebrow={headerEyebrow}
          title={headerTitle}
          description="Failed to load canonical cases."
        />
        <div className="flex justify-center p-12 text-sm text-destructive">
          Error: No shared case data available.
        </div>
      </AppShell>
    );
  }

  if (isDistrictAdmin) {
    const selectedCase = caseId ? (cases.find((item) => item.id === caseId) ?? null) : null;
    return (
      <DistrictCoordinationWorkspace cases={cases} selectedCase={selectedCase} caseId={caseId} />
    );
  }

  const readyCount = cases.filter((c) => c.readiness === "READY").length;
  const reviewCount = cases.filter((c) => c.readiness === "REVIEW_REQUIRED").length;
  const blockedCount = cases.filter((c) => c.readiness === "BLOCKED").length;

  const actionQueue = [...cases]
    .sort((a, b) => {
      const score = { BLOCKED: 0, REVIEW_REQUIRED: 1, READY: 2 };
      return score[a.readiness] - score[b.readiness];
    })
    .filter((c) => c.readiness === "BLOCKED" || c.readiness === "REVIEW_REQUIRED");

  const projectContext = cases[0]?.project ?? { projectName: "Unknown", projectCode: "Unknown" };
  const uniqueDistricts = Array.from(new Set(cases.map((c) => c.parcel.district))).join(", ");

  return (
    <AppShell portal="officer" department={activeDept}>
      <PageHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        description={headerDescription}
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <Section title="Key metrics" description="Across all canonical demonstration cases.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Monitored Cases" value={cases.length.toString()} />
          <MetricCard label="Ready to Progress" value={readyCount.toString()} />
          <MetricCard label="Review Required" value={reviewCount.toString()} />
          <MetricCard label="Blocked" value={blockedCount.toString()} />
        </div>
      </Section>

      <Section
        title="Action Queue"
        description="Cases needing attention first based on workflow readiness."
      >
        <ul className="space-y-2">
          {actionQueue.length === 0 ? (
            <li className="surface-panel p-4 text-sm text-muted-foreground">
              No cases currently require urgent review or are blocked.
            </li>
          ) : (
            actionQueue.map((c) => (
              <li
                key={c.id}
                className="surface-panel grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {c.id} · Khasra {c.parcel.parcelRef} ({c.parcel.village})
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {getStageDisplayLabel(c.currentStage)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{getAttentionReason(c)}</p>
                </div>
                <StatusPill tone={c.readiness === "BLOCKED" ? "issue" : "progress"}>
                  {c.readiness.replace("_", " ")}
                </StatusPill>
              </li>
            ))
          )}
        </ul>
      </Section>

      <Section
        title="Active demonstration project"
        description={`${projectContext.projectName} · ${projectContext.projectCode}`}
        aside={<DataClassBadge dataClass="synthetic" />}
      >
        <dl className="surface-panel grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { k: "Project Name", v: projectContext.projectName },
            { k: "Project Code", v: projectContext.projectCode },
            { k: "Districts", v: uniqueDistricts },
            { k: "Monitored Cases", v: cases.length.toString() },
          ].map((row) => (
            <div key={row.k}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {row.k}
              </dt>
              <dd className="mt-1 text-sm font-medium">{row.v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="Database connectivity (Phase 2)"
        description="Live counts read through row-level security; blocked rows never reach the client."
        aside={<DataClassBadge dataClass="synthetic" />}
      >
        <DbStatusPanel />
      </Section>

      <Section title="Coming in later phases">
        <div className="grid gap-3 md:grid-cols-3">
          <PhasePlaceholder
            title="Acquisition case workspace"
            description="Create a case from a project alignment and manage its full lifecycle."
            phase="Phase 2"
          />
          <PhasePlaceholder
            title="Parcel & GIS verification"
            description="Review parcels intersecting the alignment and confirm affected area."
            phase="Phase 3"
          />
          <PhasePlaceholder
            title="Compensation & payment"
            description="Award computation, deposit tracking and disbursement status."
            phase="Phase 6"
          />
        </div>
      </Section>
    </AppShell>
  );
}

function DistrictCoordinationWorkspace({
  cases,
  selectedCase,
  caseId,
}: {
  cases: SharedCaseContract[];
  selectedCase: SharedCaseContract | null;
  caseId: string | undefined;
}) {
  const pendingCases = cases.filter((item) => item.currentStage !== "completed");
  const blockedCount = cases.filter((item) => item.readiness === "BLOCKED").length;
  const reviewCount = cases.filter((item) => item.readiness === "REVIEW_REQUIRED").length;

  if (caseId && !selectedCase) {
    return (
      <AppShell portal="officer" department="district_administration">
        <PageHeader
          eyebrow="District Administration / Coordination"
          title="Case unavailable"
          description="The requested case is not available in the shared case list for this session."
          actions={<DataClassBadge dataClass="synthetic" />}
        />
        <Link
          to="/officer"
          search={{ caseId: undefined }}
          className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
        >
          Return to coordination queue
        </Link>
      </AppShell>
    );
  }

  if (selectedCase) {
    const blocker = getCoordinationBlocker(selectedCase);
    return (
      <AppShell portal="officer" department="district_administration">
        <PageHeader
          eyebrow="District Administration / Coordination · Read only"
          title={`${selectedCase.id} coordination context`}
          description="Review shared case context and coordination signals. This view does not authorize case processing."
          actions={<DataClassBadge dataClass="synthetic" />}
        />
        <div className="mb-6">
          <Link
            to="/officer"
            search={{ caseId: undefined }}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Return to coordination queue
          </Link>
        </div>
        <Section
          title="Shared case identity"
          description="Values come from the selected shared case."
        >
          <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <Detail label="Case" value={selectedCase.id} />
            <Detail label="Parcel" value={selectedCase.parcel.parcelRef || "Unavailable"} />
            <Detail
              label="Project"
              value={
                selectedCase.project.projectName ||
                selectedCase.project.projectCode ||
                "Unavailable"
              }
            />
            <Detail label="Current stage" value={getStageDisplayLabel(selectedCase.currentStage)} />
            <Detail label="Readiness" value={selectedCase.readiness.replace(/_/g, " ")} />
          </dl>
        </Section>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section title="Blocker / exception context">
            <div className="surface-panel space-y-3 p-5">
              <p className="font-semibold">{blocker.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{blocker.detail}</p>
              {selectedCase.objections.some((objection) => objection.status !== "resolved") ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {selectedCase.objections
                    .filter((objection) => objection.status !== "resolved")
                    .map((objection) => (
                      <li key={objection.objectionId}>
                        {objection.objectionId}: {objection.summary}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          </Section>
          <Section title="Coordination ownership and R&R">
            <div className="surface-panel space-y-4 p-5">
              <Detail
                label="Responsible downstream department"
                value="Unavailable in the shared case data"
              />
              <Detail
                label="Escalation context"
                value="No escalation record is available in the shared case data"
              />
              {selectedCase.rr ? (
                <div className="border-t border-border pt-4">
                  <Detail
                    label="R&R status · adapter-backed"
                    value={selectedCase.rr.status.replace(/_/g, " ")}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coordination context only; this status is prototype adapter data.
                  </p>
                </div>
              ) : (
                <Detail label="R&R progress" value="Unavailable in the current shared case data" />
              )}
            </div>
          </Section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell portal="officer" department="district_administration">
      <PageHeader
        eyebrow="District Administration / Coordination · Read only"
        title="District Coordination Overview"
        description="Coordinate review of shared acquisition cases. This workspace provides no execution authority."
        actions={<DataClassBadge dataClass="synthetic" />}
      />
      <Section
        title="Coordination overview"
        description="Counts are derived from shared cases and adapter-backed readiness labels."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Pending acquisition cases" value={String(pendingCases.length)} />
          <MetricCard label="Blocked · prototype readiness" value={String(blockedCount)} />
          <MetricCard label="Review required · prototype readiness" value={String(reviewCount)} />
        </div>
      </Section>
      <Section
        title="Coordination queue"
        description="Select a case to inspect its shared identity and available coordination context."
      >
        <ul className="space-y-3">
          {pendingCases.length === 0 ? (
            <li className="surface-panel p-4 text-sm text-muted-foreground">
              No pending cases are available in the shared case list.
            </li>
          ) : (
            pendingCases.map((item) => {
              const blocker = getCoordinationBlocker(item);
              return (
                <li
                  key={item.id}
                  className="surface-panel flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {item.id} · {item.parcel.parcelRef || "Parcel unavailable"}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {item.project.projectName ||
                        item.project.projectCode ||
                        "Project unavailable"}
                      {" · "}
                      {getStageDisplayLabel(item.currentStage)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{blocker.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill
                      tone={
                        item.readiness === "BLOCKED"
                          ? "issue"
                          : item.readiness === "READY"
                            ? "complete"
                            : "progress"
                      }
                    >
                      {item.readiness.replace(/_/g, " ")}
                    </StatusPill>
                    <Link
                      to="/officer"
                      search={{ caseId: item.id }}
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
                    >
                      Open case details
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Readiness and case notes are prototype adapter data; confirm details with the owning
          department. Department ownership and escalation records are unavailable in the shared case
          contract.
        </p>
      </Section>
    </AppShell>
  );
}

function getCoordinationBlocker(caseData: SharedCaseContract): { title: string; detail: string } {
  if (caseData.readiness === "READY") {
    return {
      title: "No blocker recorded",
      detail: "The shared case adapter marks this case ready to progress.",
    };
  }

  const unresolvedObjections = caseData.objections.filter(
    (objection) => objection.status !== "resolved",
  );
  const note = caseData.fieldEvidence.notes?.trim();
  if (caseData.readiness === "BLOCKED") {
    return {
      title: "Blocked case",
      detail:
        note ||
        unresolvedObjections[0]?.summary ||
        "Blocker explanation is unavailable in the current shared case data.",
    };
  }

  return {
    title: "Review required",
    detail:
      note ||
      unresolvedObjections[0]?.summary ||
      "Review explanation is unavailable in the current shared case data.",
  };
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
