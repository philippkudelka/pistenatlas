import { classify } from "../logic/classify.ts";
import {
  BLOCK_TIME_EXTRA_H,
  CO2_PER_LITRE,
  PERF,
} from "../logic/constants.ts";
import { gcDistanceNm } from "../logic/geo.ts";
import type { AircraftId, Airport } from "../logic/types.ts";
import { esc, fmtHhMm, fmtInt } from "../app/format.ts";
import { getState, setState } from "../app/state.ts";
import { COLORS } from "../app/colors.ts";

const routeEl = () => document.getElementById("route")!;

export function initRouteCard(): void {
  document.getElementById("rx")!.addEventListener("click", clearRoute);
}

export function clearRoute(): void {
  routeEl().classList.remove("open");
  setState({ routeA: null, routeB: null, routePicking: false });
}

/** Routen-Duell-Karte für die Strecke A → B anzeigen. */
export function showRouteCard(a: Airport, b: Airport): void {
  const s = getState();
  const opt = { marginPct: s.marginPct, useGrass: s.useGrass };
  const vA = classify(a, opt);
  const vB = classify(b, opt);
  const dist = gcDistanceNm(a, b);

  const col = (ac: AircraftId): string => {
    const perf = PERF[ac];
    const blockH = dist / perf.tas + BLOCK_TIME_EXTRA_H;
    const fuel = Math.round(blockH * perf.lph);
    const co2 = Math.round(fuel * CO2_PER_LITRE);
    const okPriv =
      ac === "sf50" ? vA.sf50Priv && vB.sf50Priv : vA.pc12Priv && vB.pc12Priv;
    const okCat =
      ac === "sf50" ? vA.sf50Cat && vB.sf50Cat : vA.pc12Cat && vB.pc12Cat;
    const overRange = dist > perf.rangeNm;
    return `<div class="rcol" style="--c:${ac === "sf50" ? COLORS.sf50 : COLORS.pc12}"><div class="hd">${perf.name}</div>
      <div class="big">${overRange ? "—" : fmtHhMm(blockH)}</div>
      <div class="sm">${
        overRange
          ? `außerhalb der Reichweite (${fmtInt(perf.rangeNm)} NM)`
          : `~${fmtInt(fuel)} l · ~${fmtInt(co2)} kg CO₂ fossil`
      }</div>
      <div class="vp"><span class="pill ${okPriv ? "ok" : "no"}">privat ${okPriv ? "✓" : "✗"}</span>
      <span class="pill ${okCat ? "ok" : "no"}">gewerblich ${okCat ? "✓" : "✗"}</span></div></div>`;
  };

  document.getElementById("routeC")!.innerHTML =
    `<h3>${esc(a.i)} ➔ ${esc(b.i)}<span class="d">${fmtInt(Math.round(dist))} NM Großkreis · ${esc(a.m || a.n)} → ${esc(b.m || b.n)}</span></h3>
  <div id="rgrid">${col("sf50")}${col("pc12")}</div>
  <div id="rnote">Blockzeit = Distanz / Reise-TAS (SF50 305 kt, PC-12 285 kt) + 12 min; Verbrauch SF50 227 l/h (AFM-Ableitung), PC-12 ~245 l/h (Schätzung); CO₂ 3,16 kg je kg Jet A-1 — mit SAF entsprechend weniger. Pillen: können Start- <i>und</i> Zielplatz bedient werden (aktuelle Marge)?</div>`;
  routeEl().classList.add("open");
}
