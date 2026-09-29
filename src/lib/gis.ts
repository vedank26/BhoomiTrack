/**
 * SIH26016 — Phase 3 GIS core.
 *
 * Types and data access for the Officer → GIS interactive project land map.
 * Data is read from the authoritative Phase 2 tables through the
 * `get_project_gis_data` RPC (RLS applies). Only non-personal GIS fields are
 * returned — no owner, bank or citizen-identifying data.
 */
import * as turf from "@turf/turf";
import { supabase } from "@/integrations/supabase/client";

export type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type GisProject = {
  id: string;
  project_code: string;
  project_name: string;
  state: string;
  districts: string[];
  status: string;
  is_synthetic: boolean;
};

export type ParcelProperties = {
  id: string;
  parcel_ref: string;
  survey_no: string | null;
  gat_no: string | null;
  khasra_no: string | null;
  village: string;
  district: string;
  state: string;
  total_area_sqm: number | null;
  is_synthetic: boolean;
  affected_area_sqm: number | null;
  affected_percentage: number | null;
  geometry_status?: string;
  spatial_status: "candidate_affected" | "pending_analysis" | "analyzed_unaffected" | "unaffected";
};

export type GisSummary = {
  alignment_length_km: number;
  parcels_displayed: number;
  candidate_affected: number;
  total_affected_area_sqm: number;
};

export type GisResultSource = {
  result_id: string;
  version_ref: string;
  source_ref: string;
  source_metadata: Record<string, unknown>;
  corridor_m: number;
};

export type GisData = {
  project: GisProject | null;
  alignment: GeoJsonFeatureCollection;
  engineerPoints: GeoJsonFeatureCollection;
  parcels: GeoJsonFeatureCollection;
  affectedParcels: GeoJsonFeatureCollection;
  corridor: GeoJsonFeatureCollection;
  source: GisResultSource | null;
  summary: GisSummary;
};

export const EMPTY_FEATURE_COLLECTION: GeoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export const PARCEL_LABEL_ZOOM = 15;
export const ANALYSIS_CORRIDOR_BUFFER_M = 30;

export type EngineerAlignmentValidation = {
  points: [number, number][];
  alignment: GeoJsonFeatureCollection;
  engineerPoints: GeoJsonFeatureCollection;
  corridor: GeoJsonFeatureCollection;
  lengthKm: number;
};

function isValidCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function readCrsName(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj["name"] === "string") return obj["name"] as string;
    const properties = obj["properties"] as Record<string, unknown> | undefined;
    if (typeof properties?.["name"] === "string") return String(properties["name"]);
  }
  return "";
}

export function validateEngineerGeoJson(input: unknown): EngineerAlignmentValidation {
  if (!input || typeof input !== "object") {
    throw new Error("Uploaded file must contain valid GeoJSON content.");
  }

  const payload = input as Record<string, unknown>;
  const crsName = readCrsName(payload["crs"]);
  if (crsName && !/EPSG:4326|WGS84|CRS84|urn:ogc:def:crs:EPSG::4326/i.test(crsName)) {
    throw new Error("GeoJSON CRS must be WGS84 / EPSG:4326.");
  }

  if (payload["type"] !== "FeatureCollection" || !Array.isArray(payload["features"])) {
    throw new Error("Uploaded file must be a GeoJSON FeatureCollection.");
  }

  const features = payload["features"] as unknown[];
  if (features.length < 2) {
    throw new Error("At least 2 point features are required for an engineer alignment.");
  }

  const ordered = features.map((feature, index) => {
    if (!feature || typeof feature !== "object") {
      throw new Error(`Feature ${index + 1} is invalid.`);
    }

    const item = feature as Record<string, unknown>;
    if (item["type"] !== "Feature") {
      throw new Error(`Feature ${index + 1} must be a GeoJSON Feature.`);
    }

    const geometry = item["geometry"] as Record<string, unknown> | undefined;
    if (!geometry || geometry["type"] !== "Point") {
      throw new Error(`Feature ${index + 1} does not contain Point geometry.`);
    }

    const coordinates = geometry["coordinates"];
    if (!isValidCoordinatePair(coordinates)) {
      throw new Error(
        `Feature ${index + 1} has invalid coordinates. Expected [longitude, latitude].`,
      );
    }

    const [longitude, latitude] = coordinates as [number, number];
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Feature ${index + 1} longitude is out of range [-180, 180].`);
    }
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Feature ${index + 1} latitude is out of range [-90, 90].`);
    }

    const properties = item["properties"] as Record<string, unknown> | undefined;
    const rawPointOrder =
      properties && typeof properties === "object" ? properties["point_order"] : undefined;

    const pointOrder = Number(rawPointOrder ?? index + 1);
    if (!Number.isFinite(pointOrder)) {
      throw new Error(`Feature ${index + 1} has an invalid point_order value.`);
    }

    return { pointOrder, coordinates: [longitude, latitude] as [number, number] };
  });

  ordered.sort((a, b) => a.pointOrder - b.pointOrder);

  const points = ordered.map((point) => point.coordinates);
  const alignment: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points,
        },
        properties: {
          source: "engineer_upload",
          point_count: points.length,
        },
      },
    ],
  };

  const engineerPoints: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: points.map((point, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: point,
      },
      properties: {
        point_order: index + 1,
        longitude: point[0],
        latitude: point[1],
      },
    })),
  };

  const line = turf.lineString(points);
  const corridor = turf.buffer(line, ANALYSIS_CORRIDOR_BUFFER_M, { units: "meters" });
  if (!corridor) throw new Error("Unable to construct the engineer analysis corridor.");
  const alignedCorridor: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: corridor.geometry as GeoJsonGeometry,
        properties: {
          buffer_m: ANALYSIS_CORRIDOR_BUFFER_M,
          source: "engineer_upload",
        },
      },
    ],
  };

  return {
    points,
    alignment,
    engineerPoints: EMPTY_FEATURE_COLLECTION,
    corridor: alignedCorridor,
    lengthKm: turf.length(line, { units: "kilometers" }),
  };
}

export function getDefaultDemoGisData(): GisData {
  const points: [number, number][] = [
    [73.76, 18.52],
    [73.765, 18.521],
    [73.771, 18.5215],
    [73.777, 18.521],
    [73.782, 18.522],
    [73.786, 18.525],
    [73.788, 18.529],
    [73.787, 18.533],
    [73.784, 18.537],
    [73.78, 18.541],
    [73.778, 18.546],
    [73.779, 18.551],
    [73.782, 18.555],
    [73.788, 18.557],
    [73.794, 18.557],
    [73.8, 18.555],
    [73.806, 18.552],
    [73.812, 18.551],
    [73.818, 18.552],
    [73.823, 18.555],
    [73.827, 18.559],
    [73.829, 18.564],
    [73.83, 18.569],
    [73.832, 18.573],
    [73.836, 18.576],
  ];

  const alignment: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: points },
        properties: { source: "demo_seed", name: "Mumbai–Pune demo alignment" },
      },
    ],
  };

  const parcels: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [73.765, 18.518],
              [73.775, 18.518],
              [73.775, 18.525],
              [73.765, 18.525],
              [73.765, 18.518],
            ],
          ],
        },
        properties: {
          id: "DEMO-PCL-001",
          parcel_ref: "DEMO-PCL-001",
          survey_no: "Survey 18/2",
          gat_no: "18",
          khasra_no: "2",
          village: "Kasarwadi",
          district: "Pune",
          state: "Maharashtra",
          total_area_sqm: 280000,
          is_synthetic: true,
          affected_area_sqm: 40000,
          affected_percentage: 14.2,
          spatial_status: "candidate_affected",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [73.78, 18.532],
              [73.79, 18.532],
              [73.79, 18.54],
              [73.78, 18.54],
              [73.78, 18.532],
            ],
          ],
        },
        properties: {
          id: "DEMO-PCL-002",
          parcel_ref: "DEMO-PCL-002",
          survey_no: "Survey 22/1",
          gat_no: "22",
          khasra_no: "1",
          village: "Kasarwadi",
          district: "Pune",
          state: "Maharashtra",
          total_area_sqm: 450000,
          is_synthetic: true,
          affected_area_sqm: 52000,
          affected_percentage: 11.6,
          spatial_status: "candidate_affected",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [73.795, 18.54],
              [73.805, 18.54],
              [73.805, 18.55],
              [73.795, 18.55],
              [73.795, 18.54],
            ],
          ],
        },
        properties: {
          id: "DEMO-PCL-003",
          parcel_ref: "DEMO-PCL-003",
          survey_no: "Survey 31/4",
          gat_no: "31",
          khasra_no: "4",
          village: "Wakad",
          district: "Pune",
          state: "Maharashtra",
          total_area_sqm: 800000,
          is_synthetic: true,
          affected_area_sqm: 61000,
          affected_percentage: 7.6,
          spatial_status: "candidate_affected",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [73.815, 18.555],
              [73.825, 18.555],
              [73.825, 18.565],
              [73.815, 18.565],
              [73.815, 18.555],
            ],
          ],
        },
        properties: {
          id: "DEMO-PCL-004",
          parcel_ref: "DEMO-PCL-004",
          survey_no: "Survey 44/3",
          gat_no: "44",
          khasra_no: "3",
          village: "Wakad",
          district: "Pune",
          state: "Maharashtra",
          total_area_sqm: 350000,
          is_synthetic: true,
          affected_area_sqm: 25000,
          affected_percentage: 7.1,
          spatial_status: "candidate_affected",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [73.838, 18.5825],
              [73.841, 18.5835],
              [73.839, 18.5855],
              [73.838, 18.5825],
            ],
          ],
        },
        properties: {
          id: "DEMO-PCL-005",
          parcel_ref: "DEMO-PCL-005",
          survey_no: "Survey 51/1",
          gat_no: "51",
          khasra_no: "1",
          village: "Tathawade",
          district: "Pune",
          state: "Maharashtra",
          total_area_sqm: 2200,
          is_synthetic: true,
          affected_area_sqm: 0,
          affected_percentage: 0,
          spatial_status: "unaffected",
        },
      },
    ],
  };

  const corridor = turf.buffer(turf.lineString(points), 12, { units: "meters" });
  if (!corridor) throw new Error("Unable to construct the demo analysis corridor.");

  const affected = parcels.features.filter((feature) => {
    try {
      return turf.booleanIntersects(feature as never, corridor as never);
    } catch {
      return false;
    }
  });

  const totalAffectedAreaSqm = affected.reduce((sum, feature) => {
    try {
      const intersection = turf.intersect(feature as never, corridor as never);
      if (!intersection) return sum;
      return sum + turf.area(intersection);
    } catch {
      return sum;
    }
  }, 0);

  return {
    project: {
      id: "demo-project",
      project_code: "DEMO-MH-001",
      project_name: "Mumbai–Pune Infrastructure Corridor",
      state: "Maharashtra",
      districts: ["Pune", "Raigad"],
      status: "active",
      is_synthetic: true,
    },
    alignment,
    engineerPoints: EMPTY_FEATURE_COLLECTION,
    parcels,
    affectedParcels: EMPTY_FEATURE_COLLECTION,
    corridor: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: corridor.geometry as GeoJsonGeometry,
          properties: { buffer_m: 12, source: "demo_seed" },
        },
      ],
    },
    source: null,
    summary: {
      alignment_length_km: turf.length(turf.lineString(points), { units: "kilometers" }),
      parcels_displayed: parcels.features.length,
      candidate_affected: affected.length,
      total_affected_area_sqm: totalAffectedAreaSqm,
    },
  };
}

export function getIntersectionAreaSqm(
  feature: GeoJsonFeature,
  corridor: { type: "Feature"; geometry: GeoJsonGeometry },
): number {
  try {
    const intersection = turf.intersect(
      turf.featureCollection([feature as never, corridor as never]),
    );
    if (!intersection) return 0;
    const area = calculateProjectedGeometryAreaSqm(intersection.geometry as GeoJsonGeometry);
    return Number.isFinite(area) && area > 0 ? area : 0;
  } catch {
    return 0;
  }
}

const UTM43N_FALSE_EASTING_M = 500000;
const UTM43N_SCALE = 0.9996;
const UTM43N_CENTRAL_MERIDIAN_DEGREES = 75;
type Position = [number, number];

function projectWgs84ToUtm43North([longitude, latitude]: Position): Position {
  const radians = Math.PI / 180;
  const lat = latitude * radians;
  const lon = longitude * radians;
  const centralMeridian = UTM43N_CENTRAL_MERIDIAN_DEGREES * radians;
  const semiMajor = 6378137;
  const flattening = 1 / 298.257223563;
  const eccentricitySquared = flattening * (2 - flattening);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const radiusPrimeVertical = semiMajor / Math.sqrt(1 - eccentricitySquared * sinLat ** 2);
  const radiusMeridian =
    (semiMajor * (1 - eccentricitySquared)) / (1 - eccentricitySquared * sinLat ** 2) ** 1.5;
  const t = tanLat ** 2;
  const c = secondEccentricitySquared * cosLat ** 2;
  const a = cosLat * (lon - centralMeridian);
  const e4 = eccentricitySquared ** 2;
  const e6 = eccentricitySquared ** 3;
  const meridianArc =
    radiusMeridian *
    (lat * (1 - eccentricitySquared / 4 - (3 * e4) / 64 - (5 * e6) / 256) -
      ((3 * eccentricitySquared) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * lat) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * lat) -
      ((35 * e6) / 3072) * Math.sin(6 * lat));
  return [
    UTM43N_FALSE_EASTING_M +
      UTM43N_SCALE *
        radiusPrimeVertical *
        (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t ** 2 + 72 * c) * a ** 5) / 120),
    UTM43N_SCALE *
      (meridianArc +
        radiusPrimeVertical * tanLat * (a ** 2 / 2 + ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24)),
  ];
}

function ringAreaSqm(ring: unknown): number {
  if (!Array.isArray(ring) || ring.length < 4) return 0;
  const projected = ring
    .filter((position): position is Position => Array.isArray(position) && position.length >= 2)
    .map(([longitude, latitude]) => projectWgs84ToUtm43North([longitude, latitude]));
  let area = 0;
  for (let index = 0; index < projected.length - 1; index += 1) {
    const left = projected[index];
    const right = projected[index + 1];
    if (!left || !right) continue;
    area += left[0] * right[1] - right[0] * left[1];
  }
  return Math.abs(area) / 2;
}

export function calculateProjectedGeometryAreaSqm(geometry: GeoJsonGeometry): number {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return 0;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(polygons)) return 0;
  return polygons.reduce<number>((total, polygon) => {
    if (!Array.isArray(polygon)) return total;
    const [outer, ...holes] = polygon as unknown[];
    const holeArea = holes.reduce<number>((sum, hole) => sum + ringAreaSqm(hole), 0);
    return total + Math.max(0, ringAreaSqm(outer) - holeArea);
  }, 0);
}

export type ParcelAreaAudit = {
  checked: number;
  validGeometry: number;
  emptyGeometry: number;
  invalidGeometry: number;
  missingOrNonPositiveArea: number;
  materialMismatches: Array<{ parcelRef: string; storedSqm: number; derivedSqm: number }>;
};

export function auditParcelAreas(
  parcels: GeoJsonFeatureCollection,
  toleranceSqm = 0.1,
): ParcelAreaAudit {
  const result: ParcelAreaAudit = {
    checked: parcels.features.length,
    validGeometry: 0,
    emptyGeometry: 0,
    invalidGeometry: 0,
    missingOrNonPositiveArea: 0,
    materialMismatches: [],
  };
  for (const feature of parcels.features) {
    if (!feature.geometry || !feature.geometry.coordinates) {
      result.emptyGeometry += 1;
      continue;
    }
    const derivedSqm = calculateProjectedGeometryAreaSqm(feature.geometry);
    if (!Number.isFinite(derivedSqm) || derivedSqm <= 0) {
      result.invalidGeometry += 1;
      continue;
    }
    result.validGeometry += 1;
    const storedSqm = Number(feature.properties["total_area_sqm"] ?? 0);
    if (!Number.isFinite(storedSqm) || storedSqm <= 0) {
      result.missingOrNonPositiveArea += 1;
      continue;
    }
    const tolerance = Math.max(toleranceSqm, derivedSqm * 0.0001);
    if (Math.abs(storedSqm - derivedSqm) > tolerance) {
      result.materialMismatches.push({
        parcelRef: String(feature.properties["parcel_ref"] ?? ""),
        storedSqm,
        derivedSqm,
      });
    }
  }
  return result;
}

export function buildAlignmentImpact(
  parcels: GeoJsonFeatureCollection,
  alignment: GeoJsonFeatureCollection,
): {
  affectedParcels: GeoJsonFeatureCollection;
  corridor: GeoJsonFeatureCollection;
  affectedIds: Set<string>;
  parcelAffectedAreaMap: Map<string, number>;
  summary: { affectedCount: number; totalAffectedAreaSqm: number; totalParcelsDisplayed: number };
} {
  if (!alignment.features.length) {
    return {
      affectedParcels: EMPTY_FEATURE_COLLECTION,
      corridor: EMPTY_FEATURE_COLLECTION,
      affectedIds: new Set(),
      parcelAffectedAreaMap: new Map(),
      summary: {
        affectedCount: 0,
        totalAffectedAreaSqm: 0,
        totalParcelsDisplayed: parcels.features.length,
      },
    };
  }

  const lineGeometry = alignment.features[0]?.geometry;
  if (!lineGeometry || lineGeometry.type !== "LineString") {
    return {
      affectedParcels: EMPTY_FEATURE_COLLECTION,
      corridor: EMPTY_FEATURE_COLLECTION,
      affectedIds: new Set(),
      parcelAffectedAreaMap: new Map(),
      summary: {
        affectedCount: 0,
        totalAffectedAreaSqm: 0,
        totalParcelsDisplayed: parcels.features.length,
      },
    };
  }

  const corridor = turf.buffer(
    turf.lineString(lineGeometry.coordinates as [number, number][]),
    ANALYSIS_CORRIDOR_BUFFER_M,
    {
      units: "meters",
    },
  );
  if (!corridor) {
    return {
      affectedParcels: EMPTY_FEATURE_COLLECTION,
      corridor: EMPTY_FEATURE_COLLECTION,
      affectedIds: new Set(),
      parcelAffectedAreaMap: new Map(),
      summary: {
        affectedCount: 0,
        totalAffectedAreaSqm: 0,
        totalParcelsDisplayed: parcels.features.length,
      },
    };
  }

  const parcelAreas = parcels.features.map((feature) => {
    const geometry = feature.geometry as Record<string, unknown>;
    if (!geometry || geometry["type"] === "Point") return { feature, area: 0 };

    try {
      return { feature, area: getIntersectionAreaSqm(feature, corridor as never) };
    } catch {
      return { feature, area: 0 };
    }
  });

  const affectedFeatures = parcelAreas
    .filter(({ area }) => area > 0)
    .sort(({ feature: left }, { feature: right }) =>
      String(left.properties["parcel_ref"] ?? "").localeCompare(
        String(right.properties["parcel_ref"] ?? ""),
      ),
    )
    .map(({ feature, area }) => {
      const recordedArea = Number(feature.properties["total_area_sqm"]);
      const percentageDenominator =
        Number.isFinite(recordedArea) && recordedArea > 0
          ? recordedArea
          : calculateProjectedGeometryAreaSqm(feature.geometry);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          affected_area_sqm: area,
          affected_percentage: calculateAffectedPercentage(area, percentageDenominator),
          spatial_status: "candidate_affected",
          geometry_status: "valid",
        },
      } as GeoJsonFeature;
    });

  const corridorFeatureCollection: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: corridor.geometry as GeoJsonGeometry,
        properties: {
          buffer_m: ANALYSIS_CORRIDOR_BUFFER_M,
          source: "engineer_upload",
        },
      },
    ],
  };

  const affectedIds = new Set(
    affectedFeatures.map((feature) =>
      String((feature.properties["id"] as string | undefined) ?? ""),
    ),
  );

  const parcelAffectedAreaMap = new Map<string, number>();
  let totalAffectedAreaSqm = 0;
  for (const feature of affectedFeatures) {
    const parcelId = String((feature.properties["id"] as string | undefined) ?? "");
    const areaForParcel = Number(feature.properties["affected_area_sqm"] ?? 0);
    parcelAffectedAreaMap.set(parcelId, areaForParcel);
    totalAffectedAreaSqm += areaForParcel;
  }

  return {
    affectedParcels: {
      type: "FeatureCollection",
      features: affectedFeatures,
    },
    corridor: corridorFeatureCollection,
    affectedIds,
    parcelAffectedAreaMap,
    summary: {
      affectedCount: affectedFeatures.length,
      totalAffectedAreaSqm,
      totalParcelsDisplayed: parcels.features.length,
    },
  };
}

export async function fetchProjectGisData(projectId: string): Promise<GisData> {
  const { data, error } = await supabase.rpc("get_project_gis_data", {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(`GIS data unavailable: ${error.message}`);
  }

  const raw = (data ?? {}) as unknown as Partial<GisData> & {
    summary?:
      | (Partial<GisSummary> & {
          affectedCount?: number;
          totalAffectedAreaSqm?: number;
          totalParcelsDisplayed?: number;
        })
      | null;
  };
  return {
    project: raw.project ?? null,
    alignment: raw.alignment ?? EMPTY_FEATURE_COLLECTION,
    engineerPoints: raw.engineerPoints ?? EMPTY_FEATURE_COLLECTION,
    parcels: raw.parcels ?? EMPTY_FEATURE_COLLECTION,
    affectedParcels: raw.affectedParcels ?? EMPTY_FEATURE_COLLECTION,
    corridor: raw.corridor ?? EMPTY_FEATURE_COLLECTION,
    source: raw.source ?? null,
    summary: {
      alignment_length_km: raw.summary?.alignment_length_km ?? 0,
      parcels_displayed: raw.summary?.parcels_displayed ?? raw.summary?.totalParcelsDisplayed ?? 0,
      candidate_affected: raw.summary?.candidate_affected ?? raw.summary?.affectedCount ?? 0,
      total_affected_area_sqm:
        raw.summary?.total_affected_area_sqm ?? raw.summary?.totalAffectedAreaSqm ?? 0,
    },
  };
}

export async function fetchProjectGisBaselineData(projectId: string): Promise<GisData> {
  const { data, error } = await supabase.rpc(
    "get_project_gis_baseline" as never,
    {
      p_project_id: projectId,
    } as never,
  );
  if (error) throw new Error(`GIS baseline unavailable: ${error.message}`);
  const raw = (data ?? {}) as unknown as Partial<GisData>;
  return {
    project: raw.project ?? null,
    alignment: EMPTY_FEATURE_COLLECTION,
    engineerPoints: EMPTY_FEATURE_COLLECTION,
    parcels: raw.parcels ?? EMPTY_FEATURE_COLLECTION,
    affectedParcels: EMPTY_FEATURE_COLLECTION,
    corridor: EMPTY_FEATURE_COLLECTION,
    source: null,
    summary: raw.summary ?? {
      alignment_length_km: 0,
      parcels_displayed: 0,
      candidate_affected: 0,
      total_affected_area_sqm: 0,
    },
  };
}

export async function publishProjectGisResult(
  projectId: string,
  sourceRef: string,
  result: EngineerAlignmentValidation,
  parcels: GeoJsonFeatureCollection,
  impact: ReturnType<typeof buildAlignmentImpact>,
) {
  const { data, error } = await supabase.rpc(
    "publish_project_gis_result" as never,
    {
      p_project_id: projectId,
      p_version_ref: "active-uploaded-demo",
      p_source_ref: sourceRef,
      p_source_metadata: { source: "engineer_upload", point_count: result.points.length },
      p_parcels: parcels,
      p_affected_parcels: impact.affectedParcels,
      p_alignment: result.alignment,
      p_engineer_points: result.engineerPoints,
      p_corridor: result.corridor,
      p_summary: { ...impact.summary, alignment_length_km: result.lengthKm },
    } as never,
  );
  if (error) throw new Error(`GIS result publish failed: ${error.message}`);
  return data as string;
}

export async function fetchBaselineProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("project_code", "A-WARD-MH-001")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data.id;
}

export function formatArea(sqm: number | null | undefined): string {
  if (sqm === null || sqm === undefined) return "—";
  return `${sqm.toFixed(2)} m²`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

export function calculateAffectedPercentage(
  affectedAreaSqm: number,
  totalAreaSqm: number | null | undefined,
): number {
  if (!totalAreaSqm || totalAreaSqm <= 0) return 0;
  return (affectedAreaSqm / totalAreaSqm) * 100;
}

// ─── Ownership ────────────────────────────────────────────────────────────────

export type OwnershipInterest = {
  id: string;
  interest_type: string;
  share_numerator: number | null;
  share_denominator: number | null;
  verification: string;
  record_ref: string | null;
  party: {
    display_name: string;
    party_ref: string;
  };
};

/**
 * Fetch all land_interests (with joined party data) for a given parcel UUID.
 * Uses the existing anon/publishable Supabase client — RLS applies.
 * Returns records ordered: owner first, co_owner after.
 */
export async function fetchParcelOwnership(parcelId: string): Promise<OwnershipInterest[]> {
  const { data, error } = await supabase
    .from("land_interests")
    .select(
      `id,
       interest_type,
       share_numerator,
       share_denominator,
       verification,
       record_ref,
       parties ( display_name, party_ref )`,
    )
    .eq("parcel_id", parcelId)
    .in("interest_type", ["owner", "co_owner"])
    .order("interest_type", { ascending: true }); // 'co_owner' < 'owner' alphabetically; re-sort below

  if (error) throw new Error(`Ownership query failed: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    interest_type: string;
    share_numerator: number | null;
    share_denominator: number | null;
    verification: string;
    record_ref: string | null;
    parties: { display_name: string; party_ref: string } | null;
  }>;

  // Sort: owner first, then co_owner
  rows.sort((a, b) => {
    if (a.interest_type === b.interest_type) return 0;
    return a.interest_type === "owner" ? -1 : 1;
  });

  return rows
    .filter((r) => r.parties !== null)
    .map((r) => ({
      id: r.id,
      interest_type: r.interest_type,
      share_numerator: r.share_numerator,
      share_denominator: r.share_denominator,
      verification: r.verification,
      record_ref: r.record_ref,
      party: r.parties as { display_name: string; party_ref: string },
    }));
}

/**
 * Format a share fraction (numerator / denominator) as a percentage string.
 * e.g. 1/2 → "50.00%", 1/3 → "33.33%", 1/1 → "100.00%"
 */
export function formatShare(numerator: number | null, denominator: number | null): string {
  if (numerator === null || denominator === null || denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}
