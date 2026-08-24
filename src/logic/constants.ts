/**
 * Fachliche Konstanten des Pistenatlas.
 *
 * Alle Bahnbedarfe gelten für: Meereshöhe, ISA, Windstille, trockene ebene
 * Bahn, maximale Masse; Strecken jeweils über ein 15-m-Hindernis.
 *
 * Quellen:
 *  - Cirrus SF50 Vision Jet: AFM P/N 31452-002 Rev. A1,
 *    Section 2 Limitations (u. a. nur befestigte/harte Oberflächen zulässig),
 *    Section 5 Performance inkl. "Factored Data" (Faktor 1,67 trocken —
 *    entspricht der 60-%-Regel für Jets im gewerblichen Betrieb, CAT).
 *  - Pilatus PC-12 NGX: Pilatus-Werksangaben.
 *  - Gewerbliche Zuschläge PC-12: EASA Air OPS, Flugleistungsklasse B —
 *    CAT.POL.A.305 (Start × 1,25), CAT.POL.A.330/335 (Landung ≤ 70 % LDA);
 *    Jets (SF50): CAT.POL.A.100/230.
 */

/** Bahnbedarf in Metern. `paved` = befestigte Bahn, `grass` = Gras-/Naturbahn (null = nicht zulässig). */
export interface Requirement {
  paved: number;
  grass: number | null;
}

export interface AircraftRequirements {
  /** privat / NCC — maßgeblich ist die Startstrecke (AFM, unfaktoriert) */
  priv: Requirement;
  /** gewerblich (CAT) — mit gesetzlichen Sicherheitszuschlägen */
  cat: Requirement;
}

export const REQ: Record<"sf50" | "pc12", AircraftRequirements> = {
  sf50: {
    // Start 973 m > Landung 772 m (MLM 2.517 kg) → Start maßgeblich.
    // Gras: per AFM-Limitation nicht zulässig (nur befestigte/harte Oberflächen).
    priv: { paved: 973, grass: null },
    // AFM Factored Data: 973 m × 1,67 ≈ 1.625 m Startstrecke wäre konservativ;
    // maßgeblich lt. AFM-Factored-Tabellen ist die faktorisierte Landestrecke
    // 772 m × 1,67 ≈ 1.289 m (60-%-Regel für Jets, trocken).
    cat: { paved: 1289, grass: null },
  },
  pc12: {
    // Start 758 m > Landung 661 m → Start maßgeblich. Gras: × 1,2.
    priv: { paved: 758, grass: 910 },
    // EASA Klasse B: Start × 1,25 = 948 m; Landung ≤ 70 % LDA = 944 m → Start maßgeblich.
    // Gras gewerblich: 948 m × 1,2 = 1.137 m.
    cat: { paved: 948, grass: 1137 },
  },
};

export interface AircraftPerf {
  name: string;
  /** Reise-TAS in kt */
  tas: number;
  /** Blockverbrauch in l/h */
  lph: number;
  /** true, wenn der Verbrauchswert eine Schätzung ist (kein AFM-Wert) */
  lphEstimated: boolean;
  /** Reichweite in NM (4 Pax, LRC) */
  rangeNm: number;
}

export const PERF: Record<"sf50" | "pc12", AircraftPerf> = {
  sf50: { name: "SF50 Vision Jet", tas: 305, lph: 227, lphEstimated: false, rangeNm: 1275 }, // 227 l/h: AFM-Ableitung
  pc12: { name: "Pilatus PC-12", tas: 285, lph: 245, lphEstimated: true, rangeNm: 1803 }, // ~245 l/h: Schätzung
};

/** CO₂-Emissionsfaktor fossiles Jet A-1: 3,16 kg CO₂ je kg Kraftstoff, Dichte 0,80 kg/l → kg CO₂ je Liter. */
export const CO2_PER_LITRE = 3.16 * 0.8;

/** Pauschaler Blockzeit-Zuschlag (Rollen, An-/Abflug) in Stunden: 12 Minuten. */
export const BLOCK_TIME_EXTRA_H = 12 / 60;

/** Ländernamen (deutsch) für alle Länder im Datensatz. */
export const COUNTRY_NAMES: Record<string, string> = {
  AD: "Andorra", AL: "Albanien", AT: "Österreich", AX: "Åland", BA: "Bosnien-H.",
  BE: "Belgien", BG: "Bulgarien", BY: "Belarus", CH: "Schweiz", CY: "Zypern",
  CZ: "Tschechien", DE: "Deutschland", DK: "Dänemark", EE: "Estland", ES: "Spanien",
  FI: "Finnland", FO: "Färöer", FR: "Frankreich", GB: "Großbritannien", GG: "Guernsey",
  GI: "Gibraltar", GR: "Griechenland", HR: "Kroatien", HU: "Ungarn", IE: "Irland",
  IM: "Isle of Man", IS: "Island", IT: "Italien", JE: "Jersey", LI: "Liechtenstein",
  LT: "Litauen", LU: "Luxemburg", LV: "Lettland", MC: "Monaco", MD: "Moldau",
  ME: "Montenegro", MK: "Nordmazedonien", MT: "Malta", NL: "Niederlande", NO: "Norwegen",
  PL: "Polen", PT: "Portugal", RO: "Rumänien", RS: "Serbien", SE: "Schweden",
  SI: "Slowenien", SJ: "Svalbard", SK: "Slowakei", SM: "San Marino", TR: "Türkei",
  UA: "Ukraine", VA: "Vatikan", XK: "Kosovo",
};
