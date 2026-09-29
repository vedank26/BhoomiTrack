import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, MapPinned, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard, PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { fetchProjectGisData } from "@/lib/gis";
import type { GeoJsonFeature } from "@/lib/gis";
import { useCitizenCase, CitizenCaseContext } from "@/lib/shared-case/citizen-case";
import { getStageDisplayLabel } from "@/lib/shared-case/case-stage-map";
import { resolveCitizenCasePresentation } from "@/lib/shared-case/citizen-demo-data";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/citizen/")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  beforeLoad: () => requireRole("citizen"),
  component: CitizenPortal,
});

function featureByParcel(features: GeoJsonFeature[], parcelId: string, parcelRef: string) {
  return features.find((feature) => {
    const properties = feature.properties;
    return (
      String(properties["id"] ?? "") === parcelId ||
      (parcelRef !== "" && String(properties["parcel_ref"] ?? "") === parcelRef)
    );
  });
}

function numericProperty(feature: GeoJsonFeature | undefined, key: string): number | null {
  const raw = feature?.properties[key];
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function CitizenPortal() {
  const navigate = useNavigate({ from: "/citizen" });
  const { caseId } = Route.useSearch();
  const query = useCitizenCase();
  const cases = query.data?.cases ?? [];
  const caseData = query.data?.selected ?? null;
  const gisQuery = useQuery({
    queryKey: ["citizen-parcel-impact", caseData?.project.id, caseData?.parcel.id],
    enabled: Boolean(caseData?.project.id && caseData.parcel.id),
    queryFn: () => fetchProjectGisData(caseData!.project.id),
  });

  const openCase = (selectedId: string) => {
    void navigate({ to: "/citizen/case", search: { caseId: selectedId } });
  };

  const parcelFeature = caseData
    ? featureByParcel(
        gisQuery.data?.parcels.features ?? [],
        caseData.parcel.id,
        caseData.parcel.parcelRef,
      )
    : undefined;
  const affectedFeature = caseData
    ? featureByParcel(
        gisQuery.data?.affectedParcels.features ?? [],
        caseData.parcel.id,
        caseData.parcel.parcelRef,
      )
    : undefined;
  const presentation = caseData
    ? resolveCitizenCasePresentation(caseData, {
        affectedAreaSqm:
          numericProperty(affectedFeature, "affected_area_sqm") ??
          numericProperty(parcelFeature, "affected_area_sqm"),
        affectedPercentage:
          numericProperty(affectedFeature, "affected_percentage") ??
          numericProperty(parcelFeature, "affected_percentage"),
      })
    : null;
  const recordedArea = presentation?.recordedAreaSqm ?? null;
  const affectedArea = presentation?.affectedAreaSqm ?? null;
  const affectedPercent = presentation?.affectedPercentage ?? null;
  const citizenPartyName = presentation?.citizenPartyName ? "Citizen" : "Unavailable";
  const portalRelationshipLabel = presentation?.portalRelationshipLabel ?? "Unavailable";
  const surveyGat = [presentation?.surveyNo, presentation?.gatNo]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
  const location = [presentation?.village, presentation?.district, presentation?.state]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen portal"
        title="My Land"
        description="Your parcel and acquisition case at a glance."
      />

      {query.isLoading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Loading citizen case">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="surface-panel h-28 animate-pulse bg-muted" />
          ))}
        </div>
      ) : null}
      {!query.isLoading && query.error ? (
        <div
          className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive"
          role="alert"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" aria-hidden="true" />
            The Citizen case could not be loaded.
          </div>
          <p className="mt-2">
            {query.error instanceof Error ? query.error.message : "Citizen data is unavailable."}
          </p>
        </div>
      ) : null}
      {!query.isLoading && !query.error && !caseData ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          {caseId
            ? `Case ${caseId} is not available to this account.`
            : cases.length > 1
              ? "Select a Citizen-visible case from the portal navigation."
              : "No Citizen-visible case is available."}
        </div>
      ) : null}

      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />

          <Section
            title="Parcel summary"
            description="The selected case and parcel identity from the shared case record."
          >
            <div className="surface-panel flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Selected parcel
                </p>
                <h2 className="mt-2 break-words font-serif text-2xl font-bold">
                  {presentation?.parcelRef || "Parcel unavailable"}
                </h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {caseData.id} · {caseData.project.projectName || "Project unavailable"}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Recorded landholder: </span>
                  <span className="font-semibold">
                    {presentation?.recordedLandholder || "Unavailable"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {caseData.landType || "Land type unavailable"}
                </p>
              </div>
              <Link
                to="/citizen/case"
                search={{ caseId: caseData.id }}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Open case <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </Section>

          <Section
            title="Area impact"
            description="Recorded and affected areas from the verified parcel assessment, when available."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Recorded area"
                value={
                  recordedArea === null
                    ? "Unavailable"
                    : `${recordedArea.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
                }
              />
              <MetricCard
                label="Affected area"
                value={
                  affectedArea === null
                    ? "Unavailable"
                    : `${affectedArea.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
                }
              />
              <MetricCard
                label="Affected"
                value={affectedPercent === null ? "Unavailable" : `${affectedPercent.toFixed(1)}%`}
              />
            </div>
            {!gisQuery.isLoading && (affectedArea === null || affectedPercent === null) ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Some affected-area details are unavailable for this case.
              </p>
            ) : null}
          </Section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Land record">
              <dl className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
                <Detail label="Survey / Gat No." value={surveyGat || "Unavailable"} />
                <Detail label="Land type" value={caseData.landType || "Unavailable"} />
                <Detail label="Case" value={caseData.id} />
                <Detail label="Current stage" value={getStageDisplayLabel(caseData.currentStage)} />
                <Detail
                  label="Owner reference"
                  value={presentation?.ownerReference || "Unavailable"}
                />
                <Detail
                  label="Land record"
                  value={presentation?.landRecordReference ? "Prototype reference" : "Unavailable"}
                />
                <Detail label="Location" value={location || "Unavailable"} />
                <Detail
                  label="Geometry status"
                  value={presentation?.geometryStatus || "Unavailable"}
                />
              </dl>
            </Section>
            <Section title="Case relationship">
              <div className="surface-panel space-y-4 p-5">
                <Detail label="Citizen / Party" value={citizenPartyName} />
                <Detail label="Portal relationship" value={portalRelationshipLabel} />
                <p className="border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
                  This Citizen access relationship does not by itself establish legal ownership.
                </p>
              </div>
            </Section>
          </div>

          <Section title="Current case status">
            <div className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Readiness
                  </p>
                  <p className="mt-1 font-semibold">{caseData.readiness}</p>
                </div>
              </div>
              <StatusPill tone="progress">{getStageDisplayLabel(caseData.currentStage)}</StatusPill>
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPinned className="size-4" aria-hidden="true" />{" "}
                {presentation?.village || "Village unavailable"}
              </p>
              <button
                type="button"
                onClick={() => openCase(caseData.id)}
                className="min-h-11 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                View case details
              </button>
            </div>
          </Section>
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
