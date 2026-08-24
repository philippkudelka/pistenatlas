import type { Map as MlMap } from "maplibre-gl";
import type { Airport } from "../logic/types.ts";
import { esc } from "../app/format.ts";

/**
 * Suche mit Vorschlagsliste (ICAO-Präfix, Name, Ort) und Schnellsprung-Buttons.
 * `onPick` zentriert die Karte und öffnet die Detailkarte.
 */
export function initSearch(
  map: MlMap,
  airports: Airport[],
  onPick: (a: Airport) => void,
): void {
  const input = document.getElementById("search") as HTMLInputElement;
  const list = document.getElementById("sres")!;

  const close = (): void => {
    list.classList.remove("open");
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
  };

  const pick = (a: Airport): void => {
    close();
    input.value = "";
    const targetZoom = Math.max(map.getZoom(), 7.5);
    map.flyTo({ center: [a.lo, a.la], zoom: targetZoom, duration: 900 });
    map.once("moveend", () => onPick(a));
  };

  input.addEventListener("input", () => {
    const q = input.value.trim().toUpperCase();
    if (q.length < 2) {
      close();
      return;
    }
    const hits = airports
      .filter(
        (a) =>
          a.i.toUpperCase().startsWith(q) ||
          a.n.toUpperCase().includes(q) ||
          a.m.toUpperCase().includes(q),
      )
      .slice(0, 8);
    list.classList.add("open");
    input.setAttribute("aria-expanded", "true");
    list.innerHTML = hits.length
      ? hits
          .map(
            (a, ix) =>
              `<button role="option" data-ix="${ix}"><span class="ic">${esc(a.i)}</span><span class="nm">${esc(a.n)}${a.m ? ` · ${esc(a.m)}` : ""}</span></button>`,
          )
          .join("")
      : `<button disabled>kein Treffer</button>`;
    list.querySelectorAll<HTMLButtonElement>("button[data-ix]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = hits[Number(b.dataset["ix"])];
        if (a) pick(a);
      }),
    );
  });

  // Pfeil runter springt in die Liste, Esc schließt sie
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list.querySelector<HTMLButtonElement>("button[data-ix]")?.focus();
    } else if (e.key === "Escape") close();
  });
  list.addEventListener("keydown", (e) => {
    const buttons = [
      ...list.querySelectorAll<HTMLButtonElement>("button[data-ix]"),
    ];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" && i < buttons.length - 1) {
      e.preventDefault();
      buttons[i + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i > 0) buttons[i - 1]?.focus();
      else input.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target as Node) && e.target !== input) close();
  });

  // Schnellsprung Koblenz/Speyer
  document.querySelectorAll<HTMLButtonElement>(".quick button").forEach((b) =>
    b.addEventListener("click", () => {
      const a = airports.find((x) => x.i === b.dataset["ap"]);
      if (a) pick(a);
    }),
  );
}
