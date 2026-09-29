import { describe, expect, it } from "vitest";
import {
  ANALYSIS_CORRIDOR_BUFFER_M,
  buildAlignmentImpact,
  getDefaultDemoGisData,
  validateEngineerGeoJson,
} from "./gis";

describe("validateEngineerGeoJson", () => {
  it("accepts a valid GeoJSON FeatureCollection with ordered point coordinates in WGS84", () => {
    const valid = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { point_order: 1 }, geometry: { type: "Point", coordinates: [73.775, 18.532] } },
        { type: "Feature", properties: { point_order: 2 }, geometry: { type: "Point", coordinates: [73.78, 18.536] } },
        { type: "Feature", properties: { point_order: 3 }, geometry: { type: "Point", coordinates: [73.785, 18.54] } },
      ],
    };

    const result = validateEngineerGeoJson(valid);

    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual([73.775, 18.532]);
    expect(result.points[1]).toEqual([73.78, 18.536]);
    expect(result.points[2]).toEqual([73.785, 18.54]);
    expect(result.alignment.features[0]?.geometry.type).toBe("LineString");
  });

  it("rejects invalid coordinates and missing point geometry", () => {
    const invalid = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { point_order: 1 }, geometry: { type: "Point", coordinates: [181, 10] } },
        { type: "Feature", properties: { point_order: 2 }, geometry: { type: "Point", coordinates: [73.78, 18.536] } },
      ],
    };

    expect(() => validateEngineerGeoJson(invalid)).toThrow(/longitude|latitude|coordinates/i);
  });

  it("preserves all 13 supplied-style points and uses the canonical corridor", () => {
    const source = {
      type: "FeatureCollection",
      features: Array.from({ length: 13 }, (_, index) => ({
        type: "Feature",
        properties: { point_order: index + 1 },
        geometry: { type: "Point", coordinates: [72.83 + index * 0.0001, 18.92 + index * 0.0001] },
      })),
    };

    const result = validateEngineerGeoJson(source);

    expect(result.points).toHaveLength(13);
    expect(result.alignment.features[0]?.geometry.coordinates).toEqual(result.points);
    expect(result.corridor.features[0]?.properties["buffer_m"]).toBe(ANALYSIS_CORRIDOR_BUFFER_M);
  });

  it("includes a default demo GIS dataset with visible route impact", () => {
    const demo = getDefaultDemoGisData();

    expect(demo.alignment.features).toHaveLength(1);
    expect(demo.parcels.features.length).toBeGreaterThan(0);
    expect(demo.summary.total_affected_area_sqm).toBeGreaterThan(0);
    expect(demo.summary.candidate_affected).toBeGreaterThan(0);
  });

  it("uses positive geometry intersection area and ignores stored affected area", () => {
    const alignment = validateEngineerGeoJson({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { point_order: 1 }, geometry: { type: "Point", coordinates: [72.82, 18.91] } },
        { type: "Feature", properties: { point_order: 2 }, geometry: { type: "Point", coordinates: [72.83, 18.91] } },
      ],
    });
    const parcel = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[72.824, 18.909], [72.826, 18.909], [72.826, 18.911], [72.824, 18.911], [72.824, 18.909]]],
      },
      properties: {
        id: "parcel-1",
        parcel_ref: "MH-AWARD-0001",
        total_area_sqm: 100000,
        affected_area_sqm: 999999,
      },
    } as const;

    const impact = buildAlignmentImpact({ type: "FeatureCollection", features: [parcel] }, alignment.alignment);

    expect(impact.summary.affectedCount).toBe(1);
    expect(impact.summary.totalAffectedAreaSqm).toBeLessThan(999999);
    expect(impact.affectedParcels.features[0]?.properties["affected_area_sqm"]).toBe(
      impact.parcelAffectedAreaMap.get("parcel-1"),
    );
  });

});
