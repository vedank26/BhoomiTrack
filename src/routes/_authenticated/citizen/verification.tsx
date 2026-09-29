import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleDashed, Info, MapPinned } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { fetchProjectGisData } from "@/lib/gis";
import type { GeoJsonFeature } from "@/lib/gis";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";
import { resolveCitizenCasePresentation } from "@/lib/shared-case/citizen-demo-data";

export const Route = createFileRoute("/_authenticated/citizen/verification")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : undefined,
  }),
  component: Page,
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

function formatArea(value: number | null) {
  return value === null
    ? "Unavailable"
    : `${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

function verificationTone(value: string): "complete" | "issue" | "progress" | "neutral" {
  switch (value.toLowerCase()) {
    case "verified":
      return "complete";
    case "disputed":
      return "issue";
    case "pending":
    case "unverified":
      return "progress";
    default:
      return "neutral";
  }
}

function Page() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;
  const gisQuery = useQuery({
    queryKey: ["citizen-verification-parcel", caseData?.project.id, caseData?.parcel.id],
    enabled: Boolean(caseData?.project.id && caseData.parcel.id),
    queryFn: () => fetchProjectGisData(caseData!.project.id),
  });
  const normalFeature = caseData
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
  const gisFeature = affectedFeature ?? normalFeature;
  const presentation = caseData
    ? resolveCitizenCasePresentation(caseData, {
        affectedAreaSqm: numericProperty(gisFeature, "affected_area_sqm"),
        affectedPercentage: numericProperty(gisFeature, "affected_percentage"),
      })
    : null;
  const recordedArea = presentation?.recordedAreaSqm ?? null;
  const affectedArea = presentation?.affectedAreaSqm ?? null;
  const affectedPercent = presentation?.affectedPercentage ?? null;
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
        title="Land Verification"
        description="Review the parcel, land record and Citizen case relationship associated with your selected case."
      />
      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? (
        <>
          <CitizenCaseContext caseData={caseData} />
          <Section
            title="Parcel record"
            description="Parcel details and the available project impact assessment for your selected case."
          >
            <dl className="surface-panel grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
              <Detail label="Parcel" value={presentation?.parcelRef || "Unavailable"} />
              <Detail label="Survey / Gat" value={surveyGat || "Unavailable"} />
              <Detail label="Land type" value={caseData.landType || "Unavailable"} />
              <Detail label="Location" value={location || "Unavailable"} />
              <Detail
                label="Land record"
                value={presentation?.landRecordReference ? "Prototype reference" : "Unavailable"}
              />
              <Detail
                label="Geometry status"
                value={presentation?.geometryStatus || "Unavailable"}
              />
              <Detail label="Recorded area" value={formatArea(recordedArea)} />
              <Detail label="Affected area" value={formatArea(affectedArea)} />
              <Detail
                label="Affected"
                value={affectedPercent === null ? "Unavailable" : `${affectedPercent.toFixed(1)}%`}
              />
            </dl>
            {!gisQuery.isLoading && (affectedArea === null || affectedPercent === null) ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Some affected-area details are unavailable for this case.
              </p>
            ) : null}
          </Section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Case relationship">
              <div className="surface-panel space-y-4 p-5">
                <Detail
                  label="Recorded landholder"
                  value={presentation?.recordedLandholder || "Unavailable"}
                />
                <Detail
                  label="Owner reference"
                  value={presentation?.ownerReference || "Unavailable"}
                />
                <Detail
                  label="Owner verification"
                  value={presentation?.ownerVerification || "Unavailable"}
                />
                <Detail
                  label="Citizen / Party"
                  value={presentation?.citizenPartyName ? "Citizen" : "Unavailable"}
                />
                {presentation?.portalRelationshipType ? (
                  <>
                    <Detail
                      label="Portal relationship"
                      value={presentation.portalRelationshipType.replace(/_/g, " ")}
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Verification
                      </p>
                      <div className="mt-2">
                        <StatusPill
                          tone={
                            presentation.portalRelationshipVerification === "verified"
                              ? "complete"
                              : presentation.portalRelationshipVerification === "unverified"
                                ? "progress"
                                : "neutral"
                          }
                        >
                          {presentation.portalRelationshipVerification?.replace(/_/g, " ") ??
                            "Unavailable"}
                        </StatusPill>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No Citizen portal relationship is available in the selected case data.
                  </p>
                )}
              </div>
            </Section>
            <Section title="Important clarification">
              <div className="surface-panel flex gap-3 p-5">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your Citizen portal access is linked to this parcel through the case relationship.
                  The portal relationship shown here does not by itself establish legal ownership.
                </p>
              </div>
            </Section>
          </div>

          <Section
            title="Verification status"
            description="Recorded identifies data present in the selected case. It does not mean that the record has been legally verified."
          >
            <ul className="surface-panel divide-y divide-border p-5">
              <StatusRow
                icon={<MapPinned className="size-4" aria-hidden="true" />}
                label="Parcel identification"
                value={presentation?.parcelRef ? "Recorded" : "Unavailable"}
              />
              <StatusRow
                icon={<Check className="size-4" aria-hidden="true" />}
                label="Land-interest relationship"
                value={caseData.ownership.length > 0 ? "Recorded" : "Unavailable"}
              />
              <StatusRow
                icon={<CircleDashed className="size-4" aria-hidden="true" />}
                label="Interest verification"
                value={
                  presentation?.portalRelationshipVerification?.replace(/_/g, " ") ?? "Unavailable"
                }
                verification={presentation?.portalRelationshipVerification ?? null}
              />
            </ul>
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
      <dd className="mt-1 break-words text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  verification = null,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verification?: string | null;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <StatusPill tone={verification ? verificationTone(verification) : "neutral"}>
        {value}
      </StatusPill>
    </li>
  );
}
