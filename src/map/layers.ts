import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import type { Airport } from "../logic/types.ts";
import type { Tier } from "../model/verdict.ts";
import { destPoint, gcPath } from "../logic/geo.ts";

import { COLORS, TIER_COLORS } from "../app/colors.ts";
export { COLORS };

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

  // Punkt-Glow (nur Plätze, die das gewählte Szenario erfüllen) + Punkte
  map.addLayer({
    id: "airports-glow",
    type: "circle",
    source: "airports",
    filter: ["all", [">", ["get", "tier"], 0], ["==", ["get", "on"], 1]],
    paint: {
      "circle-color": tierColorExpr(),
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
      "circle-color": tierColorExpr(),
      "circle-radius": radiusExpr(1),
      "circle-opacity": dotOpacityExpr(false),
      "circle-stroke-width": [
        "case",
        ["==", ["get", "on"], 1],
        0.6,
        0,
      ],
      "circle-stroke-color": "rgba(255,255,255,.35)",
    },
    layout: {
      // erfüllende Punkte über gedimmten, höhere Stufe über niedriger
      "circle-sort-key": ["+", ["get", "tier"], ["*", ["get", "on"], 5]],
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

/** Farbe je Eignungs-Stufe (Property "tier", 0–4). */
function tierColorExpr(): maplibregl.ExpressionSpecification {
  return [
    "match",
    ["get", "tier"],
    4,
    TIER_COLORS[4],
    3,
    TIER_COLORS[3],
    2,
    TIER_COLORS[2],
    1,
    TIER_COLORS[1],
    TIER_COLORS[0],
  ] as maplibregl.ExpressionSpecification;
}

/**
 * Deckkraft: volle Farbe, wenn der Platz das gewählte Szenario erfüllt
 * ("on" = 1), sonst gedimmt; graue Stufe 0 immer schwach.
 * `routeDim` dimmt zusätzlich während des Routen-Duells.
 */
function dotOpacityExpr(routeDim: boolean): maplibregl.ExpressionSpecification {
  const onFull = routeDim ? 0.28 : 1;
  const off = routeDim ? 0.1 : 0.3;
  const zero = routeDim ? 0.08 : 0.25;
  return [
    "case",
    ["==", ["get", "tier"], 0],
    zero,
    ["==", ["get", "on"], 1],
    onFull,
    off,
  ] as maplibregl.ExpressionSpecification;
}

/** Zoomabhängiger Punktradius; erfüllende Punkte größer, Stufe 0 klein. */
function radiusExpr(
  factor: number,
): maplibregl.DataDrivenPropertyValueSpecification<number> {
  const size = (base: number) =>
    [
      "case",
      ["==", ["get", "tier"], 0],
      base * 0.45,
      ["==", ["get", "on"], 1],
      base,
      base * 0.7,
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

/**
 * Punkte zeichnen: Farbe = Eignungs-Stufe, "on" = erfüllt das gewählte
 * Szenario (volle Deckkraft). Die Klassifikation liefert der Aufrufer —
 * dieses Modul kennt nur Darstellung.
 */
export function updateAirports(
  map: MlMap,
  airports: Airport[],
  dotOf: (a: Airport, idx: number) => { tier: Tier; on: boolean } | null,
): void {
  const features = [];
  for (let idx = 0; idx < airports.length; idx++) {
    const a = airports[idx]!;
    const dot = dotOf(a, idx);
    if (!dot) continue;
    features.push({
      type: "Feature" as const,
      properties: { idx, tier: dot.tier, on: dot.on ? 1 : 0 },
      geometry: { type: "Point" as const, coordinates: [a.lo, a.la] },
    });
  }
  (map.getSource("airports") as GeoJSONSource).setData({
    type: "FeatureCollection",
    features,
  });
}

/** Ein Reichweiten-Ring: Radius in NM plus fertige Fall-Beschriftung. */
export interface RingSpec {
  rangeNm: number;
  label: string;
  color: string;
}

/**
 * Reichweiten-Ringe um einen Platz (oder alles entfernen). Radius und
 * Beschriftung (Beladungsfall!) liefert der Aufrufer.
 */
export function updateRings(
  map: MlMap,
  a: Airport | null,
  rings: RingSpec[],
): void {
  const features = [];
  if (a) {
    for (const spec of rings) {
      const ring: [number, number][] = [];
      for (let brg = 0; brg <= 360; brg += 3) {
        const [la, lo] = destPoint(a.la, a.lo, brg, spec.rangeNm);
        ring.push([lo, la]);
      }
      features.push({
        type: "Feature" as const,
        properties: { color: spec.color },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      });
      const [lla, llo] = destPoint(a.la, a.lo, 25, spec.rangeNm);
      features.push({
        type: "Feature" as const,
        properties: { color: spec.color, label: spec.label },
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
  map.setPaintProperty("airports-dots", "circle-opacity", dotOpacityExpr(dim));
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
