import { kgPerGal, val, type Overrides } from "./constants.ts";
import type { AircraftId } from "../logic/types.ts";

/** Randbedingungen für den Bahnbedarf. */
export interface RunwayConditions {
  /** gewerblicher Betrieb (CAT) mit gesetzlichen Faktoren */
  cat: boolean;
  /** nasse Bahn */
  wet: boolean;
  /** Sicherheitsmarge in Prozent (0–30), multipliziert das Endergebnis */
  marginPct: number;
  /** Höhenzuschlag je 1.000 ft: "afm" (+4 %) oder "conservative" (+9 %) */
  altMode: "afm" | "conservative";
}

export interface RunwayRequirement {
  /** Startstrecke über 15 m in m (skaliert, mit allen Zuschlägen) */
  startM: number;
  /** Landestrecke über 15 m in m (skaliert, mit allen Zuschlägen) */
  landM: number;
  /** maßgeblicher Bahnbedarf = max(Start, Landung) */
  reqM: number;
  /** angesetzte Landemasse in kg (Dokumentation) */
  landingMass: number;
}

/**
 * Bahnbedarf, massen-, höhen- und betriebsartabhängig.
 *
 * - Basisstrecken (AFM/Werk) skalieren mit (Startmasse/MTOM)² bzw.
 *   (Landemasse/max. Landemasse)².
 * - Landemasse-Abschätzung (dokumentiert): Landung KURZ NACH DEM START ist
 *   der konservative Fall fürs Platz-Urteil — Landemasse = Startmasse minus
 *   Roll-/Steigflug-Kraftstoff, hart gedeckelt auf die max. Landemasse
 *   (Landungen über MLM sind unzulässig). Nicht die leergeflogene Maschine.
 * - Höhenzuschlag wirkt auf Start UND Landung.
 * - CAT: Jet (SF50) Landung × 1,67 (nass 1,92); Klasse B (PC-12)
 *   Start × 1,25, Landung ≤ 70 % LDA (Faktor 1/0,7), nass zusätzlich × 1,15.
 * - privat nass: Landung × 1,15 (Empfehlung, Schätzung).
 * - Gras (nur PC-12): Start × 1,2, Landung × 1,15.
 * - Marge multipliziert das Endergebnis.
 */
export function requiredRunway(
  ac: AircraftId,
  tomKg: number,
  elevFt: number,
  cond: RunwayConditions,
  surface: "paved" | "grass",
  o: Overrides = {},
): RunwayRequirement {
  const mtom = val(`${ac}.mtom`, o);
  const mlm = val(`${ac}.mlm`, o);
  const altPer1000 =
    cond.altMode === "afm"
      ? val("shared.altFactorAfm", o)
      : val("shared.altFactorConservative", o);
  const altF = 1 + (altPer1000 * Math.max(0, elevFt)) / 1000;
  const margin = 1 + cond.marginPct / 100;

  // Start
  let start =
    val(`${ac}.todaBase`, o) * (tomKg / mtom) ** 2 * altF;
  if (cond.cat && ac === "pc12") start *= val("shared.catBStartFactor", o);
  if (surface === "grass") start *= val("shared.grassStartFactor", o);

  // Landung — Landemasse: Startmasse minus Roll-/Steigflugkraftstoff, ≤ MLM
  const minBurnKg =
    (val(`${ac}.taxiFuel`, o) + val(`${ac}.climbFuel`, o)) * kgPerGal(ac, o);
  const landingMass = Math.min(mlm, Math.max(0, tomKg - minBurnKg));
  let land =
    val(`${ac}.ldaBase`, o) * (landingMass / mlm) ** 2 * altF;
  if (ac === "sf50") {
    if (cond.cat)
      land *= cond.wet
        ? val("shared.catJetLandFactorWet", o)
        : val("shared.catJetLandFactor", o);
    else if (cond.wet) land *= val("shared.wetLandFactorPrivate", o);
  } else {
    if (cond.cat) land *= val("shared.catBLandFactor", o);
    if (cond.wet)
      land *= cond.cat
        ? val("shared.wetLandFactorB", o)
        : val("shared.wetLandFactorPrivate", o);
  }
  if (surface === "grass") land *= val("shared.grassLandFactor", o);

  const startM = Math.round(start * margin);
  const landM = Math.round(land * margin);
  return { startM, landM, reqM: Math.max(startM, landM), landingMass };
}
