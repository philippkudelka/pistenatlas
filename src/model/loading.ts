import { kgPerGal, val, type Overrides } from "./constants.ts";
import type { AircraftId } from "../logic/types.ts";

/** Beladungs-Eingaben (für beide Muster identisch angewandt). */
export interface LoadInput {
  /** Insassen inkl. Pilot */
  persons: number;
  /** Tankmodus: "max" = maximal möglich (MTOM-begrenzt), "fraction" = fester Anteil des Maximaltanks */
  tankMode: "max" | "fraction";
  /** nur bei tankMode "fraction": Anteil 0–1 des maximalen Kraftstoffs */
  tankFraction: number;
}

export interface LoadResult {
  ok: boolean;
  /** harte Verstöße (MTOM/MZFW/Sitze) — keine stillen Clamps */
  errors: string[];
  /** Zero Fuel Weight in kg */
  zfw: number;
  /** getankter Kraftstoff in kg / US gal */
  fuelKg: number;
  fuelGal: number;
  /** Startmasse in kg */
  tom: number;
  /** Tankfüllung als Anteil des Maximaltanks (0–1) */
  tankPct: number;
  /** Zuladung Personen+Gepäck in kg */
  payloadKg: number;
}

/**
 * Beladungsrechnung: ZFW = Leermasse + Personen × (Masse/Person + Gepäck/Person);
 * maximal zulässiger Kraftstoff = min(Maximaltank, MTOM − ZFW).
 * Verstöße gegen MTOM/MZFW/Sitzplatzzahl sind Fehler, kein stilles Begrenzen.
 */
export function computeLoading(
  ac: AircraftId,
  input: LoadInput,
  o: Overrides = {},
): LoadResult {
  const errors: string[] = [];
  const seats = val(`${ac}.seats`, o);
  const bew = val(`${ac}.bew`, o);
  const mzfw = val(`${ac}.mzfw`, o);
  const mtom = val(`${ac}.mtom`, o);
  const maxFuelKg = val(`${ac}.maxFuelKg`, o);
  const perPerson = val("shared.kgPerPerson", o) + val("shared.bagPerPerson", o);

  if (input.persons < 1) errors.push("Mindestens eine Person (Pilot).");
  if (input.persons > seats)
    errors.push(
      `${ac === "sf50" ? "SF50" : "PC-12"}: maximal ${seats} Insassen — ${input.persons} angefragt.`,
    );

  const payloadKg = input.persons * perPerson;
  const zfw = bew + payloadKg;
  if (zfw > mzfw)
    errors.push(
      `MZFW überschritten: ZFW ${Math.round(zfw)} kg > ${mzfw} kg — weniger Personen oder Gepäck.`,
    );

  const roomForFuel = mtom - zfw;
  let fuelKg: number;
  if (input.tankMode === "max") {
    fuelKg = Math.max(0, Math.min(maxFuelKg, roomForFuel));
    if (roomForFuel <= 0)
      errors.push("Keine Kraftstoffkapazität mehr — Startmasse wäre schon ohne Sprit über MTOM.");
  } else {
    fuelKg = Math.max(0, Math.min(1, input.tankFraction)) * maxFuelKg;
    if (zfw + fuelKg > mtom)
      errors.push(
        `MTOM überschritten: ${Math.round(zfw + fuelKg)} kg > ${mtom} kg — Tankanteil verringern (max. ${Math.max(0, Math.floor((roomForFuel / maxFuelKg) * 100))} %).`,
      );
  }

  const tom = zfw + fuelKg;
  return {
    ok: errors.length === 0,
    errors,
    zfw,
    fuelKg,
    fuelGal: fuelKg / kgPerGal(ac, o),
    tom,
    tankPct: maxFuelKg > 0 ? fuelKg / maxFuelKg : 0,
    payloadKg,
  };
}
