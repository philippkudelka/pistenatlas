import "./style.css";
import type { Airport } from "./logic/types.ts";
import { initPanel } from "./ui/panel.ts";
import { initToast } from "./ui/toast.ts";
import { initIntro } from "./ui/intro.ts";

/**
 * Startreihenfolge: Panel + Hero rendern sofort aus den Daten; das schwere
 * Karten-Bundle (MapLibre) wird erst danach nachgeladen, damit der erste
 * Eindruck auch auf Mobilgeräten schnell steht.
 */
async function boot(): Promise<void> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/airports.json`);
  if (!res.ok) throw new Error(`airports.json: HTTP ${res.status}`);
  const airports = (await res.json()) as Airport[];

  initPanel(airports);
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
