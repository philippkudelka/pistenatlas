import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

/**
 * Basiskarte: OpenFreeMap "dark" (key-los, Vektortiles), zur Laufzeit in das
 * tiefe Blauschwarz des Pistenatlas getintet. Ist OpenFreeMap nicht erreichbar,
 * fällt die App auf eine im Repo gehostete Grenzen-GeoJSON zurück.
 */
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

const BG = "#0A0E15";
const WATER = "#070B12";
const BOUNDARY = "#2E3D4E";

/** Achromatische Grautöne (r≈g≈b) nach Blaugrau gleicher Helligkeit verschieben. */
function tintColor(value: string): string {
  let r: number, g: number, b: number;
  let m = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (m) {
    const v = parseInt(m[1]!, 16);
    r = v >> 16;
    g = (v >> 8) & 255;
    b = v & 255;
  } else if ((m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value.trim()))) {
    r = +m[1]!;
    g = +m[2]!;
    b = +m[3]!;
  } else if ((m = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\)$/.exec(value.trim()))) {
    // nur achromatische HSL-Werte tinten
    if (+m[2]! > 12) return value;
    const l = +m[3]!;
    const alpha = m[4] !== undefined ? +m[4]! : 1;
    return `hsla(216, 26%, ${l}%, ${alpha})`;
  } else return value;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 18) return value; // bereits farbig → unangetastet
  const l = Math.round(((max + min) / 2 / 255) * 100);
  const alphaMatch = /rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(value);
  const alpha = alphaMatch ? +alphaMatch[1]! : 1;
  return `hsla(216, 26%, ${l}%, ${alpha})`;
}

function tintPaintValue(v: unknown): unknown {
  if (typeof v === "string" && /^(#|rgb|hsl)/.test(v.trim())) return tintColor(v);
  if (Array.isArray(v)) return v.map(tintPaintValue);
  return v;
}

function tintStyle(style: StyleSpecification): StyleSpecification {
  style.layers = style.layers.filter(
    (l) => !("source" in l && l.source === "ne2_shaded"),
  );
  delete (style.sources as Record<string, unknown>)["ne2_shaded"];
  for (const layer of style.layers) {
    const paint = (layer as { paint?: Record<string, unknown> }).paint;
    if (paint)
      for (const k of Object.keys(paint)) {
        if (k.endsWith("-color")) paint[k] = tintPaintValue(paint[k]);
      }
    if (layer.id === "background" && layer.type === "background")
      layer.paint = { ...layer.paint, "background-color": BG };
    if (layer.id === "water" && layer.type === "fill")
      layer.paint = { ...layer.paint, "fill-color": WATER, "fill-antialias": false };
    if (layer.id === "waterway" && layer.type === "line")
      layer.paint = { ...layer.paint, "line-color": WATER };
    if (layer.id.startsWith("boundary") && layer.type === "line")
      layer.paint = { ...layer.paint, "line-color": BOUNDARY };
  }
  return style;
}

/** Minimal-Stil aus der eingecheckten Grenzen-GeoJSON (kein Netz nötig). */
function fallbackStyle(baseUrl: string): StyleSpecification {
  const layers: LayerSpecification[] = [
    { id: "background", type: "background", paint: { "background-color": BG } },
    {
      id: "land",
      type: "fill",
      source: "borders",
      paint: { "fill-color": "#151D28" },
    },
    {
      id: "coast",
      type: "line",
      source: "borders",
      paint: { "line-color": BOUNDARY, "line-width": 0.9 },
    },
  ];
  return {
    version: 8,
    // Glyphs werden für Symbol-Layer (Ring-Beschriftung) auch im Fallback gebraucht.
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      borders: { type: "geojson", data: `${baseUrl}data/europe-borders.json` },
    },
    layers,
  };
}

export async function loadBasemapStyle(
  baseUrl: string,
): Promise<{ style: StyleSpecification; fallback: boolean }> {
  try {
    const res = await fetch(OPENFREEMAP_STYLE, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const style = (await res.json()) as StyleSpecification;
    return { style: tintStyle(style), fallback: false };
  } catch (err) {
    console.warn("OpenFreeMap nicht erreichbar, nutze lokale Grenzen:", err);
    return { style: fallbackStyle(baseUrl), fallback: true };
  }
}
