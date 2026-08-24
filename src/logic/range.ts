import {
  FUEL_DENSITY,
  KG_PER_PAX,
  PAX_REF,
  PERF,
} from "./constants.ts";
import type { AircraftId } from "./types.ts";

/**
 * Reichweite in NM bei gegebener Passagierzahl — vereinfachtes MTOW-Modell:
 *
 * Die Herstellerangaben (PERF.rangeNm) gelten für PAX_REF Passagiere und
 * praktisch volle Tanks. Jeder weitere Passagier (KG_PER_PAX kg inkl. Gepäck)
 * muss bei MTOW gegen Kraftstoff getauscht werden; der Reichweitenverlust
 * ergibt sich aus dem Reiseverbrauch je NM (lph / TAS × Dichte):
 *   SF50  ≈ 168 NM je Passagier, PC-12 ≈ 145 NM je Passagier.
 * Weniger Passagiere bringen KEINE Mehr-Reichweite — die Tanks sind bei der
 * Referenzangabe bereits voll (konservative Näherung).
 *
 * Liefert null, wenn die Passagierzahl die Sitzplätze übersteigt
 * (SF50: max. 5 Erwachsene).
 */
export function rangeAtPax(ac: AircraftId, pax: number): number | null {
  const perf = PERF[ac];
  if (pax > perf.seatsMax) return null;
  const fuelKgPerNm = (perf.lph / perf.tas) * FUEL_DENSITY;
  const lostNm = (Math.max(0, pax - PAX_REF) * KG_PER_PAX) / fuelKgPerNm;
  return Math.round(perf.rangeNm - lostNm);
}
