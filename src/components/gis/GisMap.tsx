import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PARCEL_LABEL_ZOOM, type GeoJsonFeatureCollection } from "@/lib/gis";

export type LayerVisibility = {
  engineerPoints: boolean;
  alignment: boolean;
  parcels: boolean;
  affected: boolean;
  corridor: boolean;
};

type Props = {
  alignment: GeoJsonFeatureCollection;
  engineerPoints: GeoJsonFeatureCollection;
  parcels: GeoJsonFeatureCollection;
  affectedParcels: GeoJsonFeatureCollection;
  corridor: GeoJsonFeatureCollection;
  layers: LayerVisibility;
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
  workflowStatusByParcelId?: ReadonlyMap<
    string,
    "completed" | "pending" | "under_review" | "blocked"
  >;
};
const ALIGNMENT_STYLE: L.PathOptions = {
  color: "#2563eb",
  weight: 4,
  opacity: 1,
  lineCap: "round",
  lineJoin: "round",
};
const PARCEL_STYLE: L.PathOptions = {
  color: "#64748b",
  weight: 1.5,
  fillColor: "#e2e8f0",
  fillOpacity: 0.35,
};
const AFFECTED_STYLE: L.PathOptions = {
  color: "#dc2626",
  weight: 2,
  fillColor: "#fca5a5",
  fillOpacity: 0.55,
};
const SELECTED_STYLE: L.PathOptions = {
  color: "#7c3aed",
  weight: 3,
  fillColor: "#c4b5fd",
  fillOpacity: 0.6,
};
const CORRIDOR_STYLE: L.PathOptions = {
  color: "#f59e0b",
  weight: 1,
  dashArray: "6 4",
  fillColor: "#fbbf24",
  fillOpacity: 0.12,
};
const WORKFLOW_STATUS_COLORS = {
  completed: "#16a34a",
  pending: "#f59e0b",
  under_review: "#2563eb",
  blocked: "#dc2626",
} as const;
const WORKFLOW_STATUS_FILLS = {
  completed: "#86efac",
  pending: "#fcd34d",
  under_review: "#93c5fd",
  blocked: "#fca5a5",
} as const;
const ENGINEER_POINT_STYLE = {
  radius: 7,
  color: "#7f1d1d",
  fillColor: "#ef4444",
  fillOpacity: 0.95,
  weight: 2,
};

type LayerRefs = {
  alignment?: L.GeoJSON;
  engineerPoints?: L.GeoJSON;
  parcels?: L.GeoJSON;
  affectedParcels?: L.GeoJSON;
  corridor?: L.GeoJSON;
};

export function GisMap({
  alignment,
  engineerPoints,
  parcels,
  affectedParcels,
  corridor,
  layers,
  selectedParcelId,
  onSelectParcel,
  workflowStatusByParcelId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupsRef = useRef<LayerRefs>({});
  const selectedParcelIdRef = useRef(selectedParcelId);
  const layersRef = useRef(layers);
  const onSelectParcelRef = useRef(onSelectParcel);

  selectedParcelIdRef.current = selectedParcelId;
  layersRef.current = layers;
  onSelectParcelRef.current = onSelectParcel;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.setView([18.91, 72.82], 11);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      groupsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(groupsRef.current).forEach((layer) => layer?.removeFrom(map));
    const affectedIds = new Set(
      affectedParcels.features.map((feature) => String(feature.properties["id"] ?? "")),
    );
    const parcelStyle = (feature?: GeoJSON.Feature): L.PathOptions => {
      const id = String(feature?.properties?.["id"] ?? "");
      if (id === selectedParcelIdRef.current) return SELECTED_STYLE;
      const base = affectedIds.has(id) ? AFFECTED_STYLE : PARCEL_STYLE;
      const workflowStatus = workflowStatusByParcelId?.get(id);
      return workflowStatus
        ? {
            ...base,
            color: WORKFLOW_STATUS_COLORS[workflowStatus],
            fillColor: WORKFLOW_STATUS_FILLS[workflowStatus],
            fillOpacity: 0.45,
            weight: 3,
          }
        : base;
    };
    const selectFromFeature = (feature: GeoJSON.Feature) => {
      const id = String(feature.properties?.["id"] ?? "");
      if (id) onSelectParcelRef.current(id);
    };
    const alignmentLayer = L.geoJSON(alignment as never, {
      interactive: false,
      style: () => ALIGNMENT_STYLE,
    });
    const engineerPointsLayer = L.geoJSON(engineerPoints as never, {
      interactive: false,
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, { ...ENGINEER_POINT_STYLE, interactive: false }),
    });
    const corridorLayer = L.geoJSON(corridor as never, {
      interactive: false,
      style: () => CORRIDOR_STYLE,
    });
    const affectedParcelLayer = L.geoJSON(affectedParcels as never, {
      style: () => AFFECTED_STYLE,
      onEachFeature: (feature, layer) =>
        layer.on("click", () => selectFromFeature(feature as GeoJSON.Feature)),
    });
    const parcelLayer = L.geoJSON(parcels as never, {
      style: parcelStyle,
      onEachFeature: (feature, layer) =>
        layer.on("click", () => selectFromFeature(feature as GeoJSON.Feature)),
    });
    groupsRef.current = {
      alignment: alignmentLayer,
      engineerPoints: engineerPointsLayer,
      parcels: parcelLayer,
      affectedParcels: affectedParcelLayer,
      corridor: corridorLayer,
    };
    const current = layersRef.current;
    const entries: Array<[keyof LayerRefs, boolean]> = [
      ["parcels", current.parcels],
      ["affectedParcels", current.affected && affectedParcels.features.length > 0],
      ["corridor", current.corridor && corridor.features.length > 0],
      ["alignment", current.alignment && alignment.features.length > 0],
      ["engineerPoints", current.engineerPoints && engineerPoints.features.length > 0],
    ];
    entries.forEach(([key, visible]) => {
      const layer = groupsRef.current[key];
      if (layer) {
        if (visible) layer.addTo(map);
        else layer.removeFrom(map);
      }
    });

    const bounds = L.featureGroup(
      [alignmentLayer, affectedParcelLayer].filter((layer) => layer.getLayers().length > 0),
    ).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.08), { animate: false });
  }, [alignment, engineerPoints, parcels, affectedParcels, corridor, workflowStatusByParcelId]);

  useEffect(() => {
    const map = mapRef.current;
    const parcelLayer = groupsRef.current.parcels;
    if (!map || !parcelLayer) return;
    parcelLayer.eachLayer((layer) => {
      const path = layer as L.Path & { feature?: GeoJSON.Feature };
      const id = String(path.feature?.properties?.["id"] ?? "");
      const affected = affectedParcels.features.some(
        (feature) => String(feature.properties["id"] ?? "") === id,
      );
      path.setStyle(
        id === selectedParcelId
          ? SELECTED_STYLE
          : workflowStatusByParcelId?.has(id)
            ? {
                ...(affected ? AFFECTED_STYLE : PARCEL_STYLE),
                color: WORKFLOW_STATUS_COLORS[workflowStatusByParcelId.get(id)!],
                fillColor: WORKFLOW_STATUS_FILLS[workflowStatusByParcelId.get(id)!],
                fillOpacity: 0.45,
                weight: 3,
              }
            : affected
              ? AFFECTED_STYLE
              : PARCEL_STYLE,
      );
    });
  }, [selectedParcelId, affectedParcels, workflowStatusByParcelId]);

  useEffect(() => {
    const map = mapRef.current;
    const parcelLayer = groupsRef.current.parcels;
    if (!map || !parcelLayer || !selectedParcelId) return;

    parcelLayer.eachLayer((layer) => {
      const featureLayer = layer as L.Path & {
        feature?: GeoJSON.Feature;
        getBounds?: () => L.LatLngBounds;
      };
      if (String(featureLayer.feature?.properties?.["id"] ?? "") !== selectedParcelId) return;
      const bounds = featureLayer.getBounds?.();
      if (bounds?.isValid()) {
        map.fitBounds(bounds.pad(0.2), { maxZoom: 19, animate: false });
      }
    });
  }, [
    selectedParcelId,
    parcels,
    alignment,
    engineerPoints,
    affectedParcels,
    corridor,
    workflowStatusByParcelId,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const parcelLayer = groupsRef.current.parcels;
    if (!map || !parcelLayer) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const updateVisibleLabels = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const zoomedIn = map.getZoom() >= PARCEL_LABEL_ZOOM;
        const mapBounds = map.getBounds();
        parcelLayer.eachLayer((layer) => {
          const path = layer as L.Path & {
            feature?: GeoJSON.Feature;
            getBounds?: () => L.LatLngBounds;
          };
          const featureBounds = path.getBounds?.();
          const visible = Boolean(featureBounds?.isValid() && featureBounds.intersects(mapBounds));
          const id = String(path.feature?.properties?.["id"] ?? "");
          if (zoomedIn && visible && id) {
            const label = String(path.feature?.properties?.["parcel_ref"] ?? "").match(
              /-(\d+)$/,
            )?.[1];
            if (label && !path.getTooltip()) {
              path.bindTooltip(label, {
                permanent: true,
                interactive: false,
                direction: "center",
                className: "parcel-label",
                offset: [0, 0],
              });
            }
            path.openTooltip();
          } else {
            path.closeTooltip();
            path.unbindTooltip();
          }
        });
      }, 120);
    };
    map.on("zoomend", updateVisibleLabels);
    map.on("moveend", updateVisibleLabels);
    updateVisibleLabels();
    return () => {
      if (timer) clearTimeout(timer);
      map.off("zoomend", updateVisibleLabels);
      map.off("moveend", updateVisibleLabels);
    };
  }, [alignment, engineerPoints, parcels, affectedParcels, corridor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibility: Array<[keyof LayerRefs, boolean]> = [
      ["parcels", layers.parcels],
      ["affectedParcels", layers.affected],
      ["corridor", layers.corridor],
      ["alignment", layers.alignment],
      ["engineerPoints", layers.engineerPoints],
    ];
    visibility.forEach(([key, visible]) => {
      const layer = groupsRef.current[key];
      if (layer) {
        if (visible) layer.addTo(map);
        else layer.removeFrom(map);
      }
    });
  }, [layers]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] w-full overflow-hidden rounded-lg border border-border"
      aria-label="Officer GIS map"
    />
  );
}
