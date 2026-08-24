import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import type { Airport } from "./logic/types.ts";
import { loadBasemapStyle } from "./map/basemap.ts";
import { addAtlasLayers, updateAirports } from "./map/layers.ts";
import { getState, subscribe } from "./app/state.ts";
import { initPanel } from "./ui/panel.ts";
import { esc } from "./app/format.ts";

const BASE = import.meta.env.BASE_URL;

export const EUROPE_BOUNDS: [[number, number], [number, number]] = [
  [-11, 34],
  [31, 61],
];
export const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [5.5, 47],
  [15.5, 55.2],
];

async function boot(): Promise<void> {
  const [airportsRes, basemap] = await Promise.all([
    fetch(`${BASE}data/airports.json`),
    loadBasemapStyle(BASE),
  ]);
  if (!airportsRes.ok) throw new Error(`airports.json: HTTP ${airportsRes.status}`);
  const airports = (await airportsRes.json()) as Airport[];

  const map = new maplibregl.Map({
    container: "map",
    style: basemap.style,
    bounds: EUROPE_BOUNDS,
    fitBoundsOptions: { padding: 20 },
    minZoom: 2.5,
    maxZoom: 12,
    attributionControl: { compact: true },
    fadeDuration: 100,
  });
  if (import.meta.env.DEV)
    (window as unknown as Record<string, unknown>)["__map"] = map;
  map.touchZoomRotate.disableRotation();
  map.dragRotate.disable();
  map.keyboard.enable();

  // "style.load" statt "load": das volle load-Event wartet auf sämtliche
  // Basemap-Tiles und kann bei langsamen Tile-Servern lange ausbleiben —
  // die Flugplatz-Punkte sollen sofort erscheinen.
  map.once("style.load", () => {
    // Falls das CSS nach der Map-Initialisierung eintraf: Größe/Ausschnitt nachziehen.
    map.resize();
    map.fitBounds(EUROPE_BOUNDS, { padding: 20, duration: 0 });
    addAtlasLayers(map);
    refreshDots();

    // Hover-Tooltip
    const tip = document.getElementById("tip")!;
    map.on("mousemove", "airports-dots", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const a = airports[f.properties["idx"] as number];
      if (!a) return;
      map.getCanvas().style.cursor = "pointer";
      tip.style.display = "block";
      tip.style.left = `${Math.min(e.point.x + 13, innerWidth - 200)}px`;
      tip.style.top = `${e.point.y + 13}px`;
      tip.innerHTML = `<span class="ic">${esc(a.i)}</span> ${esc(a.n)}`;
    });
    map.on("mouseleave", "airports-dots", () => {
      map.getCanvas().style.cursor = "";
      tip.style.display = "none";
    });
  });
  map.once("idle", () => document.getElementById("loading")?.remove());

  function refreshDots(): void {
    const s = getState();
    updateAirports(
      map,
      airports,
      s.scenario,
      { marginPct: s.marginPct, useGrass: s.useGrass },
      s.country,
    );
  }
  subscribe((_s, changed) => {
    if (
      changed.has("scenario") ||
      changed.has("marginPct") ||
      changed.has("useGrass") ||
      changed.has("country")
    )
      refreshDots();
  });

  // Zoom-Cluster
  document.getElementById("zin")!.addEventListener("click", () => map.zoomIn());
  document.getElementById("zout")!.addEventListener("click", () => map.zoomOut());
  document
    .getElementById("zde")!
    .addEventListener("click", () =>
      map.fitBounds(GERMANY_BOUNDS, { padding: 30 }),
    );
  document
    .getElementById("zeu")!
    .addEventListener("click", () =>
      map.fitBounds(EUROPE_BOUNDS, { padding: 20 }),
    );

  initPanel(airports);
  initInteractions(map, airports);
}

/** Klick-Interaktionen (Detailkarte, Reichweite, Routen-Duell) — Ausbau folgt. */
function initInteractions(_map: maplibregl.Map, _airports: Airport[]): void {}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading)
    loading.textContent =
      "Daten konnten nicht geladen werden — bitte Seite neu laden.";
});
