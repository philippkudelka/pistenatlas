import { REQ, type Requirement } from "./constants.ts";
import type { Airport, Verdict } from "./types.ts";

/** Einstellungen, die die Klassifikation beeinflussen. */
export interface ClassifyOptions {
  /** Sicherheitsmarge in Prozent (0–30); multipliziert alle Bahnbedarfe. */
  marginPct: number;
  /** Gras-/Naturpisten mitzählen (betrifft nur die PC-12). */
  useGrass: boolean;
}

/**
 * Effektiv nutzbare befestigte Bahnlänge eines Platzes.
 * Unbekannter Belag zählt nur bei medium/large airports als befestigt —
 * bei kleinen Plätzen ist "unbekannt" zu oft eine Naturbahn.
 */
export function effectivePaved(a: Airport): number {
  return Math.max(a.p, a.t !== "s" ? a.u : 0);
}

function meets(a: Airport, req: Requirement, opt: ClassifyOptions): boolean {
  const factor = 1 + opt.marginPct / 100;
  if (effectivePaved(a) >= req.paved * factor) return true;
  return opt.useGrass && req.grass !== null && a.g >= req.grass * factor;
}

/** Urteil für alle vier Szenarien (SF50/PC-12 × privat/gewerblich). */
export function classify(a: Airport, opt: ClassifyOptions): Verdict {
  return {
    sf50Priv: meets(a, REQ.sf50.priv, opt),
    sf50Cat: meets(a, REQ.sf50.cat, opt),
    pc12Priv: meets(a, REQ.pc12.priv, opt),
    pc12Cat: meets(a, REQ.pc12.cat, opt),
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
 * Eignungs-Stufe eines Platzes (szenario-unabhängig). Die Bahnbedarfe bauen
 * streng aufeinander auf (SF50 gewerblich 1.289 m ⟹ SF50 privat 973 m ⟹
 * PC-12 gewerblich 948 m ⟹ PC-12 privat 758 m; Gras betrifft nur die PC-12),
 * daher bilden die Urteile eine Leiter:
 *  4 – SF50 gewerblich (damit alle vier Szenarien)
 *  3 – SF50 privat (PC-12 kann dann beides)
 *  2 – nur PC-12, privat + gewerblich
 *  1 – nur PC-12 privat
 *  0 – für beide zu kurz
 */
export type Tier = 0 | 1 | 2 | 3 | 4;

export function tierOf(v: Verdict): Tier {
  if (v.sf50Cat) return 4;
  if (v.sf50Priv) return 3;
  if (v.pc12Cat) return 2;
  if (v.pc12Priv) return 1;
  return 0;
}
