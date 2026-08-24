import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import type { Airport } from "../logic/types.ts";
import {
  classify,
  dotClass,
  type ClassifyOptions,
  type ScenarioId,
} from "../logic/classify.ts";
import { destPoint, gcPath } from "../logic/geo.ts";
import { PERF } from "../logic/constants.ts";
import { fmtInt } from "../app/format.ts";

export const COLORS = {
  ok: "#35D98F",
  alt: "#52A9FF",
  none: "#333F4D",
  sf50: "#FF6B5E",
  pc12: "#52A9FF",
};

/** Alle Atlas-Quellen und -Layer auf der geladenen Karte anlegen. */
export function addAtlasLayers(map: MlMap): void {
  map.addSource("airports", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("rings", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("route", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // Reichweiten-Ringe (unter den Punkten)
  map.addLayer({
    id: "rings-fill",
    type: "fill",
    source: "rings",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.06 },
  });
  map.addLayer({
    id: "rings-line",
    type: "line",
    source: "rings",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "line-color": ["get", "color"],
      "line-width": 1.5,
      "line-opacity": 0.65,
      "line-dasharray": [3, 2.5],
    },
  });
  map.addLayer({
    id: "rings-label",
    type: "symbol",
    source: "rings",
    filter: ["==", ["geometry-type"], "Point"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 11,
      "text-anchor": "left",
      "text-offset": [0.5, 0],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#0A0E15",
      "text-halo-width": 1.5,
    },
  });

  // Routen-Linie
  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": "rgba(255,255,255,.85)",
      "line-width": 2,
      "line-dasharray": [2.5, 2],
    },
  });

  // Punkt-Glow (nur nutzbare Plätze) + Punkte
  map.addLayer({
    id: "airports-glow",
    type: "circle",
    source: "airports",
    filter: ["!=", ["get", "cls"], "none"],
    paint: {
      "circle-color": ["match", ["get", "cls"], "ok", COLORS.ok, COLORS.alt],
      "circle-blur": 1.1,
      "circle-opacity": 0.4,
      "circle-radius": radiusExpr(2.4),
    },
  });
  map.addLayer({
    id: "airports-dots",
    type: "circle",
    source: "airports",
    paint: {
      "circle-color": [
        "match",
        ["get", "cls"],
        "ok",
        COLORS.ok,
        "alt",
        COLORS.alt,
        COLORS.none,
      ],
      "circle-radius": radiusExpr(1),
      "circle-opacity": ["case", ["==", ["get", "cls"], "none"], 0.4, 1],
      "circle-stroke-width": [
        "case",
        ["==", ["get", "cls"], "none"],
        0,
        0.6,
      ],
      "circle-stroke-color": "rgba(255,255,255,.35)",
    },
    layout: {
      "circle-sort-key": ["match", ["get", "cls"], "ok", 2, "alt", 1, 0],
    },
  });

  // Routen-Endpunkte (A/B) über den Punkten
  map.addLayer({
    id: "route-ends",
    type: "circle",
    source: "route",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": "rgba(10,14,21,.9)",
      "circle-radius": 8,
      "circle-stroke-width": 1.6,
      "circle-stroke-color": "#FFFFFF",
    },
  });
  map.addLayer({
    id: "route-ends-label",
    type: "symbol",
    source: "route",
    filter: ["==", ["geometry-type"], "Point"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 9,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#FFFFFF" },
  });
}

/** Zoomabhängiger Punktradius; Basisgröße je Klasse, Faktor für den Glow. */
function radiusExpr(
  factor: number,
): maplibregl.DataDrivenPropertyValueSpecification<number> {
  const size = (base: number) =>
    [
      "match",
      ["get", "cls"],
      "ok",
      base,
      "alt",
      base * 0.85,
      base * 0.45,
    ] as maplibregl.ExpressionSpecification;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    3,
    size(2.6 * factor),
    6,
    size(4.2 * factor),
    9,
    size(6.5 * factor),
  ] as maplibregl.ExpressionSpecification;
}

/** Punkte gemäß Szenario/Optionen einfärben und (bei Länderfilter) ausblenden. */
export function updateAirports(
  map: MlMap,
  airports: Airport[],
  scenario: ScenarioId,
  opt: ClassifyOptions,
  country: string,
): void {
  const features = [];
  for (let idx = 0; idx < airports.length; idx++) {
    const a = airports[idx]!;
    if (country && a.c !== country) continue;
    features.push({
      type: "Feature" as const,
      properties: { idx, cls: dotClass(classify(a, opt), scenario) },
      geometry: { type: "Point" as const, coordinates: [a.lo, a.la] },
    });
  }
  (map.getSource("airports") as GeoJSONSource).setData({
    type: "FeatureCollection",
    features,
  });
}

/** Reichweiten-Ringe beider Muster um einen Platz (oder alles entfernen). */
export function updateRings(map: MlMap, a: Airport | null): void {
  const features = [];
  if (a) {
    for (const ac of ["pc12", "sf50"] as const) {
      const ring: [number, number][] = [];
      for (let brg = 0; brg <= 360; brg += 3) {
        const [la, lo] = destPoint(a.la, a.lo, brg, PERF[ac].rangeNm);
        ring.push([lo, la]);
      }
      const color = COLORS[ac === "sf50" ? "sf50" : "pc12"];
      features.push({
        type: "Feature" as const,
        properties: { color },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      });
      const [lla, llo] = destPoint(a.la, a.lo, 25, PERF[ac].rangeNm);
      features.push({
        type: "Feature" as const,
        properties: {
          color,
          label: `${ac === "sf50" ? "SF50" : "PC-12"} ${fmtInt(PERF[ac].rangeNm)} NM`,
        },
        geometry: { type: "Point" as const, coordinates: [llo, lla] },
      });
    }
  }
  (map.getSource("rings") as GeoJSONSource).setData({
    type: "FeatureCollection",
    features,
  });
}

/** Großkreis-Route und A/B-Marker (b=null: nur A-Marker; a=null: alles weg). */
export function updateRoute(
  map: MlMap,
  a: Airport | null,
  b: Airport | null,
): void {
  const features = [];
  if (a && b) {
    features.push({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: gcPath(a, b) },
    });
  }
  if (a)
    features.push({
      type: "Feature" as const,
      properties: { label: "A" },
      geometry: { type: "Point" as const, coordinates: [a.lo, a.la] },
    });
  if (b)
    features.push({
      type: "Feature" as const,
      properties: { label: "B" },
      geometry: { type: "Point" as const, coordinates: [b.lo, b.la] },
    });
  (map.getSource("route") as GeoJSONSource).setData({
    type: "FeatureCollection",
    features,
  });
  // Während des Duells alle übrigen Punkte dimmen
  const dim = !!(a && b);
  map.setPaintProperty(
    "airports-dots",
    "circle-opacity",
    dim
      ? ["case", ["==", ["get", "cls"], "none"], 0.12, 0.28]
      : ["case", ["==", ["get", "cls"], "none"], 0.4, 1],
  );
  map.setPaintProperty("airports-glow", "circle-opacity", dim ? 0.1 : 0.4);
}

/** Pulsierender Auswahl-Marker (CSS-animiert, respektiert reduced motion). */
let selMarker: maplibregl.Marker | null = null;
export function updateSelectionMarker(map: MlMap, a: Airport | null): void {
  if (selMarker) {
    selMarker.remove();
    selMarker = null;
  }
  if (a) {
    const el = document.createElement("div");
    el.className = "pulse";
    selMarker = new maplibregl.Marker({ element: el })
      .setLngLat([a.lo, a.la])
      .addTo(map);
  }
}
