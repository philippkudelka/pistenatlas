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
 * Kartenfarbe eines Platzes im gewählten Szenario:
 *  "ok"   – Piste reicht für das Szenario (grün)
 *  "alt"  – reicht nicht für den SF50, aber die PC-12 käme hin (blau; nur bei SF50-Szenarien)
 *  "none" – zu kurz (gedimmt)
 */
export type DotClass = "ok" | "alt" | "none";

export function dotClass(v: Verdict, scenario: ScenarioId): DotClass {
  const self = v[SCENARIOS[scenario].key];
  if (self) return "ok";
  if (scenario < 2 && v[counterpartKey(scenario)]) return "alt";
  return "none";
}
