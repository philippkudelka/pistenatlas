import type { Airport, AircraftId, Verdict } from "../logic/types.ts";
import type { Overrides } from "./constants.ts";
import type { LoadResult } from "./loading.ts";
import { requiredRunway, type RunwayConditions } from "./runway.ts";

/** Kontext für das Platz-Urteil: aktiver Beladungsfall + Randbedingungen. */
export interface VerdictContext {
  loads: Record<AircraftId, LoadResult>;
  wet: boolean;
  marginPct: number;
  altMode: "afm" | "conservative";
  /** Gras-/Naturpisten mitzählen (nur PC-12) */
  useGrass: boolean;
  /** deklarierte Distanzen (TORA/LDA) je ICAO in m — ersetzen die physische Länge */
  declared: Record<string, number>;
  overrides: Overrides;
}

/**
 * Effektiv nutzbare befestigte Bahnlänge: deklarierte Distanz (falls bekannt)
 * vor physischer Länge; unbekannter Belag zählt nur bei medium/large airports
 * als befestigt.
 */
export function effectivePaved(a: Airport, declared: Record<string, number>): number {
  const declaredM = declared[a.i];
  if (declaredM !== undefined) return declaredM;
  return Math.max(a.p, a.t !== "s" ? a.u : 0);
}

function usable(
  a: Airport,
  ac: AircraftId,
  cat: boolean,
  ctx: VerdictContext,
): boolean {
  const load = ctx.loads[ac];
  if (!load.ok) return false;
  const cond: RunwayConditions = {
    cat,
    wet: ctx.wet,
    marginPct: ctx.marginPct,
    altMode: ctx.altMode,
  };
  const paved = effectivePaved(a, ctx.declared);
  if (
    paved > 0 &&
    paved >= requiredRunway(ac, load.tom, a.e, cond, "paved", ctx.overrides).reqM
  )
    return true;
  if (ac === "pc12" && ctx.useGrass && a.g > 0)
    return (
      a.g >= requiredRunway(ac, load.tom, a.e, cond, "grass", ctx.overrides).reqM
    );
  return false;
}

/** Urteil für alle vier Szenarien im aktiven Beladungsfall. */
export function classifyAirport(a: Airport, ctx: VerdictContext): Verdict {
  return {
    sf50Priv: usable(a, "sf50", false, ctx),
    sf50Cat: usable(a, "sf50", true, ctx),
    pc12Priv: usable(a, "pc12", false, ctx),
    pc12Cat: usable(a, "pc12", true, ctx),
  };
}

/** Die vier Szenarien in fester Reihenfolge (Index = Szenario-Nummer der UI). */
export const SCENARIOS = [
  { id: 0, ac: "sf50", op: "priv", key: "sf50Priv", label: "SF50 privat" },
  { id: 1, ac: "sf50", op: "cat", key: "sf50Cat", label: "SF50 gewerblich" },
  { id: 2, ac: "pc12", op: "priv", key: "pc12Priv", label: "PC-12 privat" },
  { id: 3, ac: "pc12", op: "cat", key: "pc12Cat", label: "PC-12 gewerblich" },
] as const;

export type ScenarioId = 0 | 1 | 2 | 3;

/** Schlüssel des Vergleichs-Szenarios (anderes Muster, gleiche Betriebsart). */
export function counterpartKey(id: ScenarioId): keyof Verdict {
  const other = id < 2 ? id + 2 : id - 2;
  return SCENARIOS[other as ScenarioId].key;
}

/**
 * Eignungs-Stufe fürs Farbsystem — Rangfolge (höchste erfüllte Stufe):
 *  4 SF50 gewerblich · 3 SF50 privat · 2 PC-12 gewerblich · 1 PC-12 privat · 0 keiner.
 * Anders als bei festen Bahnbedarfen ist die Leiter im Beladungsmodell nicht
 * mehr streng geschachtelt (unterschiedliche Massen je Muster) — die Farbe
 * nennt daher nur die höchste Stufe, das vollständige Urteil steht in der
 * Detailkarte.
 */
export type Tier = 0 | 1 | 2 | 3 | 4;

export function tierOf(v: Verdict): Tier {
  if (v.sf50Cat) return 4;
  if (v.sf50Priv) return 3;
  if (v.pc12Cat) return 2;
  if (v.pc12Priv) return 1;
  return 0;
}
