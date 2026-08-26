import { kgPerGal, val, type Overrides } from "./constants.ts";
import type { AircraftId } from "../logic/types.ts";

export type Regime = "lrc" | "fast";

/**
 * Missionsmodell (wie Referenz-Analyse, kalibriert auf die Herstellerangaben):
 * Kraftstoff = Rollen/Start + Steigflug + Reiseflug + Reserve.
 * Reichweite = Steigflugstrecke + (nutzbarer Reisekraftstoff / Verbrauch) × TAS.
 *
 * Kalibrier-Unit-Tests: SF50 „2 Personen, voll, Sparflug“ → 1.275 NM ± 3 %;
 * PC-12 „4 Passagiere, voll, Sparflug“ → 1.803 NM ± 3 %.
 */
export function rangeNm(
  ac: AircraftId,
  fuelGal: number,
  regime: Regime,
  o: Overrides = {},
): number {
  const reserve = val(`${ac}.${regime === "lrc" ? "reserveLrc" : "reserveFast"}`, o);
  const burn = val(`${ac}.${regime === "lrc" ? "burnLrc" : "burnFast"}`, o);
  const tas = val(`${ac}.${regime === "lrc" ? "tasLrc" : "tasFast"}`, o);
  const cruiseGal =
    fuelGal - val(`${ac}.taxiFuel`, o) - val(`${ac}.climbFuel`, o) - reserve;
  if (cruiseGal <= 0) return 0; // Reserven nicht darstellbar → nicht fliegbar
  return Math.round(val(`${ac}.climbDist`, o) + (cruiseGal / burn) * tas);
}

export interface TripResult {
  /** Blockzeit in Stunden (Distanz/TAS + Zuschlag) */
  blockH: number;
  /** verbrauchter Kraftstoff (ohne Reserve) in gal / kg / l */
  tripFuelGal: number;
  tripFuelKg: number;
  /** benötigter Kraftstoff inkl. Reserve in gal */
  requiredGal: number;
  /** CO₂ fossil in kg */
  co2Kg: number;
}

/** Kraftstoff-/Zeitrechnung für eine konkrete Strecke im gewählten Regime. */
export function trip(
  ac: AircraftId,
  distNm: number,
  regime: Regime,
  o: Overrides = {},
): TripResult {
  const burn = val(`${ac}.${regime === "lrc" ? "burnLrc" : "burnFast"}`, o);
  const tas = val(`${ac}.${regime === "lrc" ? "tasLrc" : "tasFast"}`, o);
  const reserve = val(`${ac}.${regime === "lrc" ? "reserveLrc" : "reserveFast"}`, o);
  const climbDist = val(`${ac}.climbDist`, o);
  const cruiseDist = Math.max(0, distNm - climbDist);
  const tripFuelGal =
    val(`${ac}.taxiFuel`, o) +
    val(`${ac}.climbFuel`, o) * Math.min(1, distNm / climbDist) +
    (cruiseDist / tas) * burn;
  const tripFuelKg = tripFuelGal * kgPerGal(ac, o);
  return {
    blockH: distNm / tas + val("shared.blockTimeExtraMin", o) / 60,
    tripFuelGal,
    tripFuelKg,
    requiredGal: tripFuelGal + reserve,
    co2Kg: tripFuelKg * val("shared.co2PerKgFuel", o),
  };
}
