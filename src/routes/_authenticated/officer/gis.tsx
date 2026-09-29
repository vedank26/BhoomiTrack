import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { requireRole } from "@/lib/route-guards";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, MetricCard } from "@/components/layout/PageHeader";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { GisMap, type LayerVisibility } from "@/components/gis/GisMap";
import {
  buildAlignmentImpact,
  calculateProjectedGeometryAreaSqm,
  EMPTY_FEATURE_COLLECTION,
  fetchBaselineProjectId,
  fetchProjectGisBaselineData,
  ANALYSIS_CORRIDOR_BUFFER_M,
  fetchProjectGisData,
  fetchParcelOwnership,
  formatArea,
  formatPercent,
  formatShare,
  calculateAffectedPercentage,
  publishProjectGisResult,
  validateEngineerGeoJson,
  type ParcelProperties,
} from "@/lib/gis";
import { Button } from "@/components/ui/button";
import { caseQueryKeys, listSharedCases } from "@/lib/shared-case/case-store";

export const Route = createFileRoute("/_authenticated/officer/gis")({
  beforeLoad: () => requireRole("officer"),
  head: () => ({
    meta: [
      { title: "Officer GIS — BhoomiTrack" },
      {
        name: "description",
        content:
          "Upload engineer GeoJSON alignment, inspect parcel impact and review all database-backed parcel boundaries in the officer GIS workspace.",
      },
      { property: "og:title", content: "Officer GIS — BhoomiTrack" },
      {
        property: "og:description",
        content:
          "Officer GIS view for uploading engineer alignment and calculating parcel intersections based on parcel geometry from the database.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfficerGisPage,
});

const DEFAULT_LAYERS: LayerVisibility = {
  engineerPoints: true,
  alignment: true,
  parcels: true,
  affected: true,
  corridor: true,
};

const SYNTHETIC_EXTENSION_FILE = "colaba_crooked_route_plus_1km_demo.geojson";

function OfficerGisPage() {
  const queryClient = useQueryClient();
  const { department } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectLookupError, setProjectLookupError] = useState<Error | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcelSearch, setParcelSearch] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [engineerAlignment, setEngineerAlignment] = useState<ReturnType<
    typeof validateEngineerGeoJson
  > | null>(null);

  useEffect(() => {
    let active = true;
    void fetchBaselineProjectId()
      .then((id) => {
        if (active && id) setProjectId(id);
      })
      .catch((lookupError: unknown) => {
        if (active)
          setProjectLookupError(
            lookupError instanceof Error
              ? lookupError
              : new Error("GIS project lookup unavailable."),
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const {
    data: activeGis,
    isLoading: activeLoading,
    error: activeError,
  } = useQuery({
    queryKey: ["officer-gis-active-result", projectId],
    queryFn: () => fetchProjectGisData(projectId as string),
    enabled: !!projectId,
    retry: false,
  });
  const {
    data: baselineGis,
    isLoading: baselineLoading,
    error: baselineError,
  } = useQuery({
    queryKey: ["officer-gis-baseline", projectId],
    queryFn: () => fetchProjectGisBaselineData(projectId as string),
    enabled: !!projectId,
    retry: false,
  });
  const gis = activeGis?.project ? activeGis : baselineGis;
  const isLoading = activeLoading || baselineLoading;
  const error = activeError && baselineError ? baselineError : null;
  const { data: sharedCases = [] } = useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: listSharedCases,
  });
  const projectRecord = gis?.project ?? null;
  const parcelDataset = gis?.parcels ?? EMPTY_FEATURE_COLLECTION;
  const pendingAnalysisCount = parcelDataset.features.filter(
    (feature) => feature.properties["spatial_status"] === "pending_analysis",
  ).length;
  const workflowStatusByParcelId = useMemo(() => {
    const statuses = new Map<string, "completed" | "pending" | "under_review" | "blocked">();
    for (const caseData of sharedCases) {
      statuses.set(
        caseData.parcel.id,
        caseData.readiness === "BLOCKED"
          ? "blocked"
          : caseData.readiness === "REVIEW_REQUIRED"
            ? "under_review"
            : caseData.currentStage === "completed" &&
                caseData.fieldEvidence.surveyCompleted &&
                (caseData.award?.status ?? "") === "completed" &&
                caseData.payment.every((payment) => payment.status === "paid") &&
                (caseData.rr?.status ?? "") === "completed" &&
                (caseData.possession?.status ?? "") === "taken" &&
                (caseData.landRecord?.status ?? "") === "mutation_complete"
              ? "completed"
              : "pending",
      );
    }
    return statuses;
  }, [sharedCases]);

  const persistedAffectedIds = useMemo(() => {
    const affectedFeatures = gis?.source
      ? gis.affectedParcels.features
      : parcelDataset.features.filter(
          (feature) => feature.properties["spatial_status"] === "candidate_affected",
        );
    return new Set(affectedFeatures.map((feature) => String(feature.properties["id"] ?? "")));
  }, [gis, parcelDataset]);

  const searchCaseIdsByParcel = useMemo(() => {
    const byParcel = new Map<string, string[]>();
    for (const sharedCase of sharedCases) {
      const ids = byParcel.get(sharedCase.parcel.id) ?? [];
      ids.push(sharedCase.id);
      byParcel.set(sharedCase.parcel.id, ids);
    }
    return byParcel;
  }, [sharedCases]);

  const matchingParcels = useMemo(() => {
    const normalizedSearch = parcelSearch.trim().toLocaleLowerCase();
    return parcelDataset.features.filter((feature) => {
      const id = String(feature.properties["id"] ?? "");
      const caseIds = searchCaseIdsByParcel.get(id) ?? [];
      const searchValues = [
        ...caseIds,
        feature.properties["parcel_ref"],
        feature.properties["survey_no"],
        feature.properties["gat_no"],
      ];
      const matchesSearch =
        !normalizedSearch ||
        searchValues.some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(normalizedSearch),
        );
      const matchesWorkflow =
        workflowFilter === "all" || workflowStatusByParcelId.get(id) === workflowFilter;
      const matchesImpact =
        impactFilter === "all" ||
        (impactFilter === "affected"
          ? persistedAffectedIds.has(id)
          : !persistedAffectedIds.has(id));
      return matchesSearch && matchesWorkflow && matchesImpact;
    });
  }, [
    parcelDataset,
    parcelSearch,
    searchCaseIdsByParcel,
    workflowFilter,
    workflowStatusByParcelId,
    impactFilter,
    persistedAffectedIds,
  ]);

  useEffect(() => {
    const hasActiveFilter =
      Boolean(parcelSearch.trim()) || workflowFilter !== "all" || impactFilter !== "all";
    if (!hasActiveFilter) return;
    if (matchingParcels.length === 1) {
      const onlyMatchId = String(matchingParcels[0]?.properties["id"] ?? "");
      if (onlyMatchId) setSelectedParcelId(onlyMatchId);
      return;
    }
    if (
      selectedParcelId &&
      !matchingParcels.some(
        (feature) => String(feature.properties["id"] ?? "") === selectedParcelId,
      )
    ) {
      setSelectedParcelId(null);
    }
  }, [parcelSearch, workflowFilter, impactFilter, matchingParcels, selectedParcelId]);

  const impact = useMemo(() => {
    if (!engineerAlignment || !parcelDataset.features.length) {
      return {
        affectedParcels: EMPTY_FEATURE_COLLECTION,
        corridor: EMPTY_FEATURE_COLLECTION,
        affectedIds: new Set<string>(),
        parcelAffectedAreaMap: new Map(),
        summary: {
          affectedCount: 0,
          totalAffectedAreaSqm: 0,
          totalParcelsDisplayed: parcelDataset.features.length,
        },
      };
    }
    return buildAlignmentImpact(parcelDataset, engineerAlignment.alignment);
  }, [engineerAlignment, parcelDataset]);
  const displayedImpact = useMemo(() => {
    if (engineerAlignment) return impact;
    const affectedParcels = gis?.source
      ? gis.affectedParcels
      : {
          type: "FeatureCollection" as const,
          features: parcelDataset.features.filter(
            (feature) => feature.properties["spatial_status"] === "candidate_affected",
          ),
        };
    const affectedIds = new Set(
      affectedParcels.features.map((feature) => String(feature.properties["id"] ?? "")),
    );
    const parcelAffectedAreaMap = new Map<string, number>();
    for (const feature of affectedParcels.features) {
      parcelAffectedAreaMap.set(
        String(feature.properties["id"] ?? ""),
        Number(feature.properties["affected_area_sqm"] ?? 0),
      );
    }
    return {
      affectedParcels,
      corridor: gis?.corridor ?? EMPTY_FEATURE_COLLECTION,
      affectedIds,
      parcelAffectedAreaMap,
      summary: {
        affectedCount: gis?.summary.candidate_affected ?? affectedParcels.features.length,
        totalAffectedAreaSqm:
          gis?.summary.total_affected_area_sqm ??
          affectedParcels.features.reduce(
            (sum, feature) => sum + Number(feature.properties["affected_area_sqm"] ?? 0),
            0,
          ),
        totalParcelsDisplayed: gis?.summary.parcels_displayed ?? parcelDataset.features.length,
      },
    };
  }, [engineerAlignment, impact, gis, parcelDataset]);
  const isSyntheticExtension = selectedFileName.toLowerCase() === SYNTHETIC_EXTENSION_FILE;

  const selectedParcel = useMemo<ParcelProperties | null>(() => {
    if (!parcelDataset || !selectedParcelId) return null;
    const feature = parcelDataset.features.find(
      (f) => String(f.properties["id"] ?? "") === selectedParcelId,
    );
    return feature ? (feature.properties as unknown as ParcelProperties) : null;
  }, [parcelDataset, selectedParcelId]);
  const selectedAffectedParcel = useMemo(
    () =>
      selectedParcelId
        ? (displayedImpact.affectedParcels.features.find(
            (feature) => String(feature.properties["id"] ?? "") === selectedParcelId,
          ) ?? null)
        : null,
    [displayedImpact.affectedParcels, selectedParcelId],
  );
  const selectedParcelAreaSqm = useMemo(() => {
    if (!selectedParcelId) return null;
    const feature = parcelDataset.features.find(
      (candidate) => String(candidate.properties["id"] ?? "") === selectedParcelId,
    );
    if (!feature) return null;
    const recordedArea = Number(feature.properties["total_area_sqm"]);
    return Number.isFinite(recordedArea) && recordedArea > 0 ? recordedArea : null;
  }, [parcelDataset, selectedParcelId]);

  const selectedParcelAffectedPercentage = useMemo(() => {
    const value =
      engineerAlignment || gis?.source
        ? selectedAffectedParcel?.properties["affected_percentage"]
        : selectedParcel?.affected_percentage;
    if (value === null || value === undefined) return null;
    const percentage = Number(value);
    return Number.isFinite(percentage) ? percentage : null;
  }, [engineerAlignment, gis?.source, selectedAffectedParcel, selectedParcel]);

  const selectedParcelAffectedAreaSqm = useMemo(() => {
    const value =
      engineerAlignment || gis?.source
        ? selectedAffectedParcel?.properties["affected_area_sqm"]
        : selectedParcel?.affected_area_sqm;
    if (value === null || value === undefined) return null;
    const area = Number(value);
    return Number.isFinite(area) ? area : null;
  }, [engineerAlignment, gis?.source, selectedAffectedParcel, selectedParcel]);

  const selectedParcelGeometryStatus = useMemo(() => {
    if (selectedAffectedParcel) {
      const status = selectedAffectedParcel.properties["geometry_status"];
      return status === "valid" ? "Valid geometry" : status ? String(status) : null;
    }
    if (engineerAlignment) {
      return impact.affectedIds.has(selectedParcelId ?? "")
        ? "Intersected by uploaded alignment"
        : "Analyzed unaffected";
    }
    if (gis?.source) {
      const status = selectedParcel?.geometry_status;
      return status ? String(status) : null;
    }
    return selectedParcel?.spatial_status === "pending_analysis"
      ? "Pending final analysis"
      : selectedParcel?.spatial_status === "analyzed_unaffected"
        ? "Analyzed unaffected"
        : selectedParcel?.spatial_status === "candidate_affected"
          ? "Intersected by uploaded alignment"
          : selectedParcel?.spatial_status === "unaffected"
            ? "Unaffected"
            : null;
  }, [
    selectedAffectedParcel,
    engineerAlignment,
    impact.affectedIds,
    selectedParcelId,
    gis?.source,
    selectedParcel,
  ]);

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedParcelId(null);
    if (!file) {
      setSelectedFileName("");
      setFileError("No file selected.");
      setFileSuccess(null);
      setEngineerAlignment(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".geojson")) {
      setSelectedFileName(file.name);
      setFileError("Only .geojson files are accepted.");
      setFileSuccess(null);
      setEngineerAlignment(null);
      return;
    }

    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      const validated = validateEngineerGeoJson(parsed);
      const uploadedSyntheticExtension = file.name.toLowerCase() === SYNTHETIC_EXTENSION_FILE;
      setSelectedFileName(file.name);
      setFileError(null);
      setFileSuccess(
        uploadedSyntheticExtension
          ? `Synthetic ~1 km extension DEMO loaded with ${validated.points.length} points. Combined alignment is now active.`
          : `Loaded ${validated.points.length} engineer points. Ready to generate alignment.`,
      );
      setEngineerAlignment(validated);
      setLayers((prev) => ({
        ...prev,
        engineerPoints: true,
        alignment: true,
        affected: true,
        corridor: true,
      }));
    } catch (error) {
      setSelectedFileName(file.name);
      setFileError(error instanceof Error ? error.message : "Invalid GeoJSON file.");
      setFileSuccess(null);
      setEngineerAlignment(null);
      setLayers((prev) => ({ ...prev, engineerPoints: false, alignment: false, affected: false }));
    }
  };

  const handleGenerateAlignment = () => {
    if (!engineerAlignment) {
      setFileError("Please upload a valid .geojson file first.");
      setFileSuccess(null);
      return;
    }
    setLayers((prev) => ({
      ...prev,
      engineerPoints: true,
      alignment: true,
      affected: true,
    }));
    setFileSuccess(
      "Engineer alignment generated successfully. Parcel impact recalculated from the uploaded geometry.",
    );
    setFileError(null);
    void publishProjectGisResult(
      projectId as string,
      selectedFileName,
      engineerAlignment,
      parcelDataset,
      impact,
    )
      .then(async () => {
        setFileSuccess(
          "Engineer alignment generated and published as the active project GIS result.",
        );
        await queryClient.invalidateQueries({
          queryKey: ["officer-gis-active-result", projectId],
        });
      })
      .catch((publishError: unknown) =>
        setFileError(
          publishError instanceof Error ? publishError.message : "GIS result publish failed.",
        ),
      );
  };

  return (
    <AppShell portal="officer">
      <PageHeader
        eyebrow="Officer / Admin · GIS"
        title="Officer GIS"
        description="Upload an engineer alignment GeoJSON, verify the exact route, and identify which existing database parcels intersect the proposed highway corridor."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      {isLoading ? (
        <Section title="Loading parcel dataset">
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            Loading current parcel geometry from the authoritative database…
          </p>
        </Section>
      ) : projectLookupError || error ? (
        <Section title="GIS data unavailable">
          <p className="surface-panel p-4 text-sm text-destructive">
            {(projectLookupError ?? (error as Error)).message}
          </p>
        </Section>
      ) : !projectRecord ? (
        <Section title="No project data found">
          <p className="surface-panel p-4 text-sm text-muted-foreground">
            No project parcel dataset is available. Please confirm the project exists in the
            database.
          </p>
        </Section>
      ) : (
        <>
          {department === "project_authority_gis" ? (
            <Section
              title="Proposed Alignment Upload"
              description="Use the engineer-provided GeoJSON as the only source of the proposed route. Parcel data remains from the database."
            >
              <div className="surface-panel grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Upload Proposed Alignment GeoJSON
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".geojson,application/geo+json,application/json"
                    onChange={handleFileSelection}
                    className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                  />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Selected file:</span>{" "}
                    {selectedFileName || "none"}
                  </div>
                  {engineerAlignment ? (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Number of points:</span>{" "}
                      {engineerAlignment.points.length}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateAlignment}
                  disabled={!engineerAlignment}
                >
                  Generate Alignment
                </Button>
              </div>

              {fileError || fileSuccess ? (
                <div
                  className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                    fileError
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}
                >
                  {fileError || fileSuccess}
                </div>
              ) : null}
            </Section>
          ) : null}

          <Section
            title={projectRecord.project_name}
            description={`${projectRecord.project_code} · ${projectRecord.state} · ${projectRecord.districts.join(", ")}`}
            aside={<DataClassBadge dataClass="synthetic" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Engineer Points"
                value={engineerAlignment ? String(engineerAlignment.points.length) : "—"}
                note="Uploaded from GeoJSON"
              />
              <MetricCard
                label="Alignment Length"
                value={
                  engineerAlignment
                    ? `${engineerAlignment.lengthKm.toFixed(2)} km`
                    : gis
                      ? `${gis.summary.alignment_length_km.toFixed(2)} km`
                      : "—"
                }
                note="GeoJSON route length"
              />
              <MetricCard
                label="Total Parcels Displayed"
                value={String(displayedImpact.summary.totalParcelsDisplayed)}
                note="All available parcel records"
              />
              <MetricCard
                label="Candidate Affected Parcel Count"
                value={gis ? String(displayedImpact.summary.affectedCount) : "—"}
                note={
                  pendingAnalysisCount
                    ? `${pendingAnalysisCount} pending final analysis`
                    : "Intersected by corridor"
                }
              />
              <MetricCard
                label="Analysis Corridor Buffer"
                value={`${ANALYSIS_CORRIDOR_BUFFER_M} m`}
                note="Distance on each side of alignment"
              />
              <MetricCard
                label="Total Affected Area"
                value={gis ? formatArea(displayedImpact.summary.totalAffectedAreaSqm) : "—"}
                note="Derived from the uploaded alignment corridor"
              />
            </div>
          </Section>

          <Section
            title="GIS Map"
            description={
              isSyntheticExtension
                ? "DEMO / SYNTHETIC ALIGNMENT ANALYSIS. The uploaded combined alignment is the only active highway layer; parcel boundaries stay as stored in the database."
                : "The uploaded engineer GeoJSON generates the current highway alignment. Parcel boundaries stay as stored in the database, and only intersected parcels are highlighted."
            }
          >
            <div className="mb-3 grid gap-3 rounded border border-border bg-card p-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(11rem,0.35fr)_minmax(11rem,0.35fr)_auto] lg:items-end">
              <label className="block text-xs font-semibold text-foreground">
                Search parcel or case
                <span className="relative mt-1 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={parcelSearch}
                    onChange={(event) => setParcelSearch(event.target.value)}
                    placeholder="Search parcel, case, Survey No. or Gat No."
                    className="h-9 w-full rounded border border-input bg-background pl-9 pr-3 text-sm font-normal"
                  />
                </span>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                Workflow Status
                <select
                  value={workflowFilter}
                  onChange={(event) => setWorkflowFilter(event.target.value)}
                  className="mt-1 h-9 w-full rounded border border-input bg-background px-2 text-sm font-normal"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="pending">In Progress</option>
                  <option value="under_review">Under Review</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-foreground">
                GIS Impact
                <select
                  value={impactFilter}
                  onChange={(event) => setImpactFilter(event.target.value)}
                  className="mt-1 h-9 w-full rounded border border-input bg-background px-2 text-sm font-normal"
                >
                  <option value="all">All</option>
                  <option value="affected">Affected</option>
                  <option value="not_affected">Not Affected</option>
                </select>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setParcelSearch("");
                  setWorkflowFilter("all");
                  setImpactFilter("all");
                }}
              >
                <RotateCcw aria-hidden="true" />
                Clear Filters
              </Button>
              <div className="text-xs text-muted-foreground lg:col-span-4" aria-live="polite">
                Showing {matchingParcels.length.toLocaleString()} of{" "}
                {parcelDataset.features.length.toLocaleString()} parcels
              </div>
              {(parcelSearch.trim() || workflowFilter !== "all" || impactFilter !== "all") &&
              !isLoading ? (
                matchingParcels.length === 0 ? (
                  <p className="text-sm text-muted-foreground lg:col-span-4">No parcels found.</p>
                ) : (
                  <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded border border-border lg:col-span-4">
                    {matchingParcels.map((feature) => {
                      const id = String(feature.properties["id"] ?? "");
                      const caseIds = searchCaseIdsByParcel.get(id) ?? [];
                      const workflowStatus = workflowStatusByParcelId.get(id);
                      const statusLabel =
                        workflowStatus === "completed"
                          ? "Completed"
                          : workflowStatus === "pending"
                            ? "In Progress"
                            : workflowStatus === "under_review"
                              ? "Under Review"
                              : workflowStatus === "blocked"
                                ? "Blocked"
                                : "Unavailable";
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedParcelId(id)}
                            aria-pressed={selectedParcelId === id}
                            className={`grid w-full gap-1 px-3 py-2 text-left text-xs hover:bg-muted/60 sm:grid-cols-[minmax(10rem,0.8fr)_minmax(11rem,1fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)_auto] sm:items-center ${selectedParcelId === id ? "bg-emerald-50/70 dark:bg-emerald-950/20" : ""}`}
                          >
                            <span className="font-semibold text-foreground">
                              {caseIds.length ? caseIds.join(", ") : "No linked case"} —{" "}
                              {String(feature.properties["parcel_ref"] ?? "Unavailable")}
                            </span>
                            <span className="text-muted-foreground">
                              Survey: {String(feature.properties["survey_no"] ?? "Unavailable")} ·
                              Gat: {String(feature.properties["gat_no"] ?? "Unavailable")}
                            </span>
                            <span className="text-muted-foreground">Workflow: {statusLabel}</span>
                            <span className="text-muted-foreground">
                              GIS: {persistedAffectedIds.has(id) ? "Affected" : "Not Affected"}
                            </span>
                            {selectedParcelId === id ? (
                              <span className="font-semibold text-emerald-700">Selected</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </div>
            <div className="surface-panel p-4">
              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layers.engineerPoints}
                    onChange={(e) => setLayers((v) => ({ ...v, engineerPoints: e.target.checked }))}
                  />
                  <span className="inline-block size-2.5 rounded-full bg-orange-500" />
                  Engineer Points
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layers.alignment}
                    onChange={(e) => setLayers((v) => ({ ...v, alignment: e.target.checked }))}
                  />
                  <span className="inline-block size-2.5 rounded-full bg-blue-600" />
                  Proposed Highway Alignment
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layers.parcels}
                    onChange={(e) => setLayers((v) => ({ ...v, parcels: e.target.checked }))}
                  />
                  <span className="inline-block size-2.5 rounded-sm border border-slate-500 bg-slate-200" />
                  Parcel Boundaries
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layers.affected}
                    onChange={(e) => setLayers((v) => ({ ...v, affected: e.target.checked }))}
                  />
                  <span className="inline-block size-2.5 rounded-sm border border-red-600 bg-red-300" />
                  Affected Parcels
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layers.corridor}
                    onChange={(e) => setLayers((v) => ({ ...v, corridor: e.target.checked }))}
                  />
                  <span className="inline-block size-2.5 rounded-sm border border-amber-500 bg-amber-200" />
                  Analysis Corridor
                </label>
              </div>

              <GisMap
                alignment={
                  engineerAlignment?.alignment ?? gis?.alignment ?? EMPTY_FEATURE_COLLECTION
                }
                engineerPoints={
                  engineerAlignment?.engineerPoints ??
                  gis?.engineerPoints ??
                  EMPTY_FEATURE_COLLECTION
                }
                parcels={parcelDataset}
                affectedParcels={displayedImpact.affectedParcels}
                corridor={engineerAlignment?.corridor ?? gis?.corridor ?? EMPTY_FEATURE_COLLECTION}
                layers={layers}
                selectedParcelId={selectedParcelId}
                onSelectParcel={setSelectedParcelId}
                workflowStatusByParcelId={workflowStatusByParcelId}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Overall workflow:</span>
              <span className="text-emerald-700">Fully completed</span>
              <span className="text-amber-700">In progress</span>
              <span className="text-blue-700">Under review</span>
              <span className="text-red-700">Blocked</span>
            </div>
          </Section>

          <Section
            title="Selected parcel"
            description={
              selectedParcel
                ? "This parcel record comes directly from the database; only the highlighted status is derived from the uploaded alignment."
                : "Click a parcel on the map to inspect its original database record."
            }
          >
            {selectedParcel ? (
              <>
                <dl className="surface-panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Parcel ID
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{selectedParcel.parcel_ref}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Survey / Gat / Khasra
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {[selectedParcel.survey_no, selectedParcel.gat_no, selectedParcel.khasra_no]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Village · District
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {selectedParcel.village} · {selectedParcel.district}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recorded Total Area
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatArea(selectedParcelAreaSqm)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Affected Area (Calculated)
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatArea(selectedParcelAffectedAreaSqm)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Affected Percentage
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {formatPercent(selectedParcelAffectedPercentage)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Community / State
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{selectedParcel.state}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Geometry Status
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {selectedParcelGeometryStatus ?? "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-8">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Land Ownership
                  </h3>
                  <ParcelOwnershipSection parcelId={selectedParcel.id} />
                </div>
              </>
            ) : (
              <p className="surface-panel p-4 text-sm text-muted-foreground">No parcel selected.</p>
            )}
          </Section>

          <Section title="GIS Data Provenance">
            <div className="surface-panel space-y-2 p-4 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">
                  Parcel geometry remains authoritative.
                </span>{" "}
                It is read from the database and never replaced by the uploaded alignment file.
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  The uploaded GeoJSON is the only route source.
                </span>{" "}
                It is validated, ordered by point_order or feature order, and drawn exactly as
                supplied.
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  Only intersected parcels are highlighted.
                </span>{" "}
                Unaffected parcels remain visible with their normal parcel-boundary styling.
              </p>
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
}

function ParcelOwnershipSection({ parcelId }: { parcelId: string }) {
  const {
    data: ownership,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["parcel-ownership", parcelId],
    queryFn: () => fetchParcelOwnership(parcelId),
    enabled: !!parcelId,
  });

  if (isLoading) {
    return (
      <div className="surface-panel p-4 text-sm text-muted-foreground">
        Loading ownership records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-panel p-4 text-sm text-destructive">
        Error loading ownership: {(error as Error).message}
      </div>
    );
  }

  if (!ownership || ownership.length === 0) {
    return (
      <div className="surface-panel p-4 text-sm text-muted-foreground">
        No ownership records found for this parcel.
      </div>
    );
  }

  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/50 bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Interest Type</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Ownership</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Verification</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Land Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {ownership.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3 font-medium">
                  {record.party.display_name}
                  <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                    {record.party.party_ref}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{record.interest_type.replace("_", "-")}</td>
                <td className="px-4 py-3 font-medium">
                  {formatShare(record.share_numerator, record.share_denominator)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      record.verification.toLowerCase() === "verified"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {record.verification}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{record.record_ref || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
