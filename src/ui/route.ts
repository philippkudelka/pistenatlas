import { classifyAirport } from "../model/verdict.ts";
import { trip } from "../model/mission.ts";
import { gcDistanceNm } from "../logic/geo.ts";
import type { AircraftId, Airport } from "../logic/types.ts";
import { esc, fmtHhMm, fmtInt } from "../app/format.ts";
import {
  activeRangeNm,
  caseLabel,
  loads,
  verdictContext,
} from "../app/compute.ts";
import { getState, setState } from "../app/state.ts";
import { COLORS } from "../app/colors.ts";
import { val } from "../model/constants.ts";

const routeEl = () => document.getElementById("route")!;

export function initRouteCard(): void {
  document.getElementById("rx")!.addEventListener("click", clearRoute);
}

export function clearRoute(): void {
  routeEl().classList.remove("open");
  setState({ routeA: null, routeB: null, routePicking: false });
}

/** Routen-Duell-Karte für die Strecke A → B anzeigen (aktiver Beladungsfall). */
export function showRouteCard(a: Airport, b: Airport): void {
  const s = getState();
  const ctx = verdictContext(s);
  const vA = classifyAirport(a, ctx);
  const vB = classifyAirport(b, ctx);
  const l = loads(s);
  const dist = gcDistanceNm(a, b);

  const col = (ac: AircraftId): string => {
    const color = ac === "sf50" ? COLORS.sf50 : COLORS.pc12;
    const name = ac === "sf50" ? "SF50 Vision Jet" : "Pilatus PC-12";
    const load = l[ac];
    if (!load.ok)
      return `<div class="rcol" style="--c:${color}"><div class="hd">${name}</div>
        <div class="big">—</div><div class="sm">Beladung ungültig: ${esc(load.errors[0] ?? "")}</div></div>`;
    const t = trip(ac, dist, s.regime, s.overrides);
    const range = activeRangeNm(s, ac) ?? 0;
    const overRange = dist > range;
    const fuelShort = t.requiredGal > load.fuelGal;
    const okPriv =
      ac === "sf50" ? vA.sf50Priv && vB.sf50Priv : vA.pc12Priv && vB.pc12Priv;
    const okCat =
      ac === "sf50" ? vA.sf50Cat && vB.sf50Cat : vA.pc12Cat && vB.pc12Cat;
    const litres = Math.round(t.tripFuelKg / 0.8);
    return `<div class="rcol" style="--c:${color}"><div class="hd">${name}</div>
      <div class="big">${overRange ? "—" : fmtHhMm(t.blockH)}</div>
      <div class="sm">${
        overRange
          ? `außerhalb der Reichweite dieses Falls (${fmtInt(range)} NM)`
          : `~${fmtInt(litres)} l · ~${fmtInt(Math.round(t.co2Kg))} kg CO₂ fossil` +
            (fuelShort ? ` · <span style="color:var(--bad)">Reserve knapp!</span>` : "")
      }</div>
      <div class="vp"><span class="pill ${okPriv ? "ok" : "no"}">privat ${okPriv ? "✓" : "✗"}</span>
      <span class="pill ${okCat ? "ok" : "no"}">gewerblich ${okCat ? "✓" : "✗"}</span></div></div>`;
  };

  const tasS = val("sf50.tasLrc", s.overrides);
  const tasF = val("sf50.tasFast", s.overrides);
  const tasP = val(s.regime === "lrc" ? "pc12.tasLrc" : "pc12.tasFast", s.overrides);
  document.getElementById("routeC")!.innerHTML =
    `<h3>${esc(a.i)} ➔ ${esc(b.i)}<span class="d">${fmtInt(Math.round(dist))} NM Großkreis · ${esc(a.m || a.n)} → ${esc(b.m || b.n)}</span></h3>
  <div id="rgrid">${col("sf50")}${col("pc12")}</div>
  <div id="rnote">Fall: <b>${caseLabel(s)}</b> · Kraftstoff/Zeit aus dem Missionsmodell (Rollen, Steigflug, Reiseflug ${s.regime === "lrc" ? `${fmtInt(tasS)}/${fmtInt(tasP)} kt` : `${fmtInt(tasF)}/${fmtInt(tasP)} kt`}, ohne Reserve ausgewiesen) · CO₂ ${val("shared.co2PerKgFuel", s.overrides)} kg je kg Jet A-1 — mit SAF entsprechend weniger · Pillen: Start- <i>und</i> Zielplatz bedienbar (massenabhängiger Bahnbedarf)? Alle Parameter unter „Annahmen“.</div>`;
  routeEl().classList.add("open");
}
