import "./style.css";
import type { Airport } from "./logic/types.ts";
import { initPanel } from "./ui/panel.ts";
import { initToast } from "./ui/toast.ts";
import { initIntro } from "./ui/intro.ts";
import { initLoadingPanel } from "./ui/loading-panel.ts";
import { initAssumptions } from "./ui/assumptions.ts";
import { setDeclaredDistances } from "./app/compute.ts";

/**
 * Startreihenfolge: Panel + Hero rendern sofort aus den Daten; das schwere
 * Karten-Bundle (MapLibre) wird erst danach nachgeladen, damit der erste
 * Eindruck auch auf Mobilgeräten schnell steht.
 */
async function boot(): Promise<void> {
  const [res, declaredRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/airports.json`),
    fetch(`${import.meta.env.BASE_URL}data/declared_distances.json`),
  ]);
  if (!res.ok) throw new Error(`airports.json: HTTP ${res.status}`);
  const airports = (await res.json()) as Airport[];
  if (declaredRes.ok) {
    const raw = (await declaredRes.json()) as Record<
      string,
      { declared_m?: number } | string
    >;
    const map: Record<string, number> = {};
    for (const [icao, entry] of Object.entries(raw))
      if (typeof entry === "object" && typeof entry.declared_m === "number")
        map[icao] = entry.declared_m;
    setDeclaredDistances(map);
  }

  initPanel(airports);
  initLoadingPanel();
  initAssumptions();
  initToast();
  initIntro();

  const startMap = () =>
    import("./map/init.ts")
      .then((m) => m.initMap(airports))
      .catch((err) => {
        console.error(err);
        const loading = document.getElementById("loading");
        if (loading)
          loading.textContent =
            "Karte konnte nicht geladen werden — bitte Seite neu laden.";
      });

  // Nach dem load-Event (bzw. sofort, falls schon vorbei) in einer Idle-Lücke starten.
  const whenIdle = () =>
    "requestIdleCallback" in window
      ? requestIdleCallback(() => void startMap(), { timeout: 1500 })
      : setTimeout(() => void startMap(), 200);
  if (document.readyState === "complete") whenIdle();
  else addEventListener("load", whenIdle, { once: true });
}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading)
    loading.textContent =
      "Daten konnten nicht geladen werden — bitte Seite neu laden.";
});
