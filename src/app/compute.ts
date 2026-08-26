/**
 * Ableitungen aus dem App-Zustand: aktiver Beladungsfall je Muster,
 * Urteils-Kontext und die Fallbeschreibung für Ergebnis-Fußzeilen.
 */
import { computeLoading, type LoadResult } from "../model/loading.ts";
import { rangeNm } from "../model/mission.ts";
import type { VerdictContext } from "../model/verdict.ts";
import type { AircraftId } from "../logic/types.ts";
import { fmtInt } from "./format.ts";
import type { AppState } from "./state.ts";

/** deklarierte Distanzen (TORA/LDA) — beim Boot aus data/declared_distances.json gefüllt */
let declared: Record<string, number> = {};

export function setDeclaredDistances(map: Record<string, number>): void {
  declared = map;
}

export function getDeclaredDistances(): Record<string, number> {
  return declared;
}

export function loads(s: AppState): Record<AircraftId, LoadResult> {
  const input = {
    persons: s.persons,
    tankMode: s.tankMode,
    tankFraction: s.tankFraction,
  };
  return {
    sf50: computeLoading("sf50", input, s.overrides),
    pc12: computeLoading("pc12", input, s.overrides),
  };
}

export function verdictContext(s: AppState): VerdictContext {
  return {
    loads: loads(s),
    wet: s.wet,
    marginPct: s.marginPct,
    altMode: s.altMode,
    useGrass: s.useGrass,
    declared,
    overrides: s.overrides,
  };
}

/** Reichweite des aktiven Falls in NM (null, wenn Beladung ungültig). */
export function activeRangeNm(s: AppState, ac: AircraftId): number | null {
  const load = loads(s)[ac];
  if (!load.ok) return null;
  return rangeNm(ac, load.fuelGal, s.regime, s.overrides);
}

/** Kurzbeschreibung des Beladungsfalls, z. B. "4 Pers. · Tank 79 % · Sparflug · trocken". */
export function caseLabel(s: AppState, ac?: AircraftId): string {
  const tank =
    s.tankMode === "max"
      ? ac
        ? `Tank ${Math.round(loads(s)[ac].tankPct * 100)} %`
        : "max. Tank"
      : `Tank ${Math.round(s.tankFraction * 100)} %`;
  const parts = [
    `${s.persons} Pers.`,
    tank,
    s.regime === "lrc" ? "Sparflug" : "Schnellflug",
    s.wet ? "nass" : "trocken",
  ];
  if (s.marginPct) parts.push(`Marge +${fmtInt(s.marginPct)} %`);
  if (s.altMode === "conservative") parts.push("Höhe konservativ");
  return parts.join(" · ");
}
