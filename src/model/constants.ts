/**
 * ALLE Modellkonstanten des Pistenatlas — die einzige Stelle im Code, an der
 * fachliche Zahlen stehen. Jeder Eintrag trägt Wert, Einheit, Quelle und die
 * Angabe, ob er im UI editierbar ist. Ein Unit-Test erzwingt, dass kein
 * Eintrag ohne Quelle existiert; das Annahmen-Panel rendert diese Liste live.
 *
 * Quellen-Etiketten:
 *  AFM         – Flughandbuch Cirrus SF50, P/N 31452-002 Rev. A1
 *  Werksangabe – Hersteller-Veröffentlichung (Cirrus/Pilatus)
 *  EASA        – EASA Air OPS (CAT.POL.A.100/230 Jets, .305/.330/.335 Klasse B)
 *  Schätzung   – begründete Annahme; im Kommentar/Hinweis hergeleitet
 */

export type Source = "AFM" | "Werksangabe" | "EASA" | "Schätzung";

export interface ModelConstant {
  label: string;
  value: number;
  unit: string;
  source: Source;
  editable: boolean;
  note?: string;
}

export const CONSTANTS = {
  // ---------------------------------------------------------------- SF50
  "sf50.mtom": {
    label: "SF50 · Max. Startmasse (MTOM)",
    value: 2722, unit: "kg", source: "AFM", editable: false,
    note: "6.000 lb",
  },
  "sf50.mlm": {
    label: "SF50 · Max. Landemasse",
    value: 2517, unit: "kg", source: "AFM", editable: false,
  },
  "sf50.mzfw": {
    label: "SF50 · Max. Masse ohne Kraftstoff (MZFW)",
    value: 2223, unit: "kg", source: "Werksangabe", editable: false,
  },
  "sf50.bew": {
    label: "SF50 · Leermasse",
    value: 1610, unit: "kg", source: "Werksangabe", editable: true,
    note: "Standardausstattung — real ausgerüstete Maschinen wiegen oft 30–70 kg mehr",
  },
  "sf50.maxFuelKg": {
    label: "SF50 · Max. ausfliegbarer Kraftstoff",
    value: 907, unit: "kg", source: "AFM", editable: false,
    note: "296 US gal",
  },
  "sf50.maxFuelGal": {
    label: "SF50 · Max. Kraftstoff (Volumen)",
    value: 296, unit: "US gal", source: "AFM", editable: false,
  },
  "sf50.todaBase": {
    label: "SF50 · Startstrecke über 15 m (SL, ISA, MTOM)",
    value: 973, unit: "m", source: "AFM", editable: false,
    note: "AFM-Wert — nicht die 858 m der Hersteller-Website",
  },
  "sf50.ldaBase": {
    label: "SF50 · Landestrecke über 15 m (max. Landemasse)",
    value: 772, unit: "m", source: "AFM", editable: false,
  },
  "sf50.tasFast": {
    label: "SF50 · Reise-TAS Schnellflug (FL310)",
    value: 311, unit: "KTAS", source: "Werksangabe", editable: true,
  },
  "sf50.tasLrc": {
    label: "SF50 · Reise-TAS Sparflug (LRC)",
    value: 240, unit: "KTAS", source: "Schätzung", editable: true,
    note: "AFM-nah, aus Referenz-Analyse",
  },
  "sf50.burnFast": {
    label: "SF50 · Verbrauch Schnellflug",
    value: 65, unit: "gal/h", source: "Schätzung", editable: true,
    note: "AFM-nah",
  },
  "sf50.burnLrc": {
    label: "SF50 · Verbrauch Sparflug (LRC)",
    value: 40, unit: "gal/h", source: "Schätzung", editable: true,
    note: "AFM-nah; kalibriert auf Herstellerreichweite 1.275 NM",
  },
  "sf50.taxiFuel": {
    label: "SF50 · Kraftstoff Rollen/Start",
    value: 10, unit: "gal", source: "Schätzung", editable: true,
  },
  "sf50.climbFuel": {
    label: "SF50 · Kraftstoff Steigflug auf FL310",
    value: 50, unit: "gal", source: "Schätzung", editable: true,
  },
  "sf50.climbDist": {
    label: "SF50 · Strecke im Steigflug",
    value: 90, unit: "NM", source: "Schätzung", editable: true,
  },
  "sf50.reserveLrc": {
    label: "SF50 · Reserve Sparflug (45 min + Anflug)",
    value: 40, unit: "gal", source: "Schätzung", editable: true,
  },
  "sf50.reserveFast": {
    label: "SF50 · Reserve Schnellflug (NBAA-nah)",
    value: 55, unit: "gal", source: "Schätzung", editable: true,
  },
  "sf50.seats": {
    label: "SF50 · Max. Insassen (inkl. Pilot)",
    value: 7, unit: "Personen", source: "Werksangabe", editable: false,
    note: "5 Erwachsene + 2 Kindersitze; hier als hartes Maximum geführt",
  },
  "sf50.rangeRef": {
    label: "SF50 · Herstellerreichweite (Kalibrierziel)",
    value: 1275, unit: "NM", source: "Werksangabe", editable: false,
    note: "gilt für ~2 Personen, voll betankt, Sparflug",
  },

  // ---------------------------------------------------------------- PC-12
  "pc12.mtom": {
    label: "PC-12 · Max. Startmasse (MTOM)",
    value: 4740, unit: "kg", source: "Werksangabe", editable: false,
  },
  "pc12.mlm": {
    label: "PC-12 · Max. Landemasse",
    value: 4500, unit: "kg", source: "Werksangabe", editable: false,
  },
  "pc12.mzfw": {
    label: "PC-12 · Max. Masse ohne Kraftstoff (MZFW)",
    value: 4100, unit: "kg", source: "Werksangabe", editable: false,
  },
  "pc12.bew": {
    label: "PC-12 · Leermasse",
    value: 3066, unit: "kg", source: "Schätzung", editable: true,
    note: "abgeleitet aus Werksangabe „Zuladung voll betankt 448 kg“",
  },
  "pc12.maxFuelKg": {
    label: "PC-12 · Max. ausfliegbarer Kraftstoff",
    value: 1226, unit: "kg", source: "Werksangabe", editable: false,
    note: "402 US gal",
  },
  "pc12.maxFuelGal": {
    label: "PC-12 · Max. Kraftstoff (Volumen)",
    value: 402, unit: "US gal", source: "Werksangabe", editable: false,
  },
  "pc12.todaBase": {
    label: "PC-12 · Startstrecke über 15 m (SL, ISA, MTOM)",
    value: 758, unit: "m", source: "Werksangabe", editable: false,
  },
  "pc12.ldaBase": {
    label: "PC-12 · Landestrecke über 15 m (max. Landemasse)",
    value: 661, unit: "m", source: "Werksangabe", editable: false,
  },
  "pc12.tasFast": {
    label: "PC-12 · Reise-TAS Schnellflug",
    value: 285, unit: "KTAS", source: "Werksangabe", editable: true,
  },
  "pc12.tasLrc": {
    label: "PC-12 · Reise-TAS Sparflug (LRC)",
    value: 220, unit: "KTAS", source: "Schätzung", editable: true,
  },
  "pc12.burnFast": {
    label: "PC-12 · Verbrauch Schnellflug",
    value: 66, unit: "gal/h", source: "Schätzung", editable: true,
  },
  "pc12.burnLrc": {
    label: "PC-12 · Verbrauch Sparflug (LRC)",
    value: 41, unit: "gal/h", source: "Schätzung", editable: true,
    note: "kalibriert auf Werksreichweite 1.803 NM (Ansatzwert wäre ~45 gal/h)",
  },
  "pc12.taxiFuel": {
    label: "PC-12 · Kraftstoff Rollen/Start",
    value: 8, unit: "gal", source: "Schätzung", editable: true,
  },
  "pc12.climbFuel": {
    label: "PC-12 · Kraftstoff Steigflug (FL280)",
    value: 35, unit: "gal", source: "Schätzung", editable: true,
  },
  "pc12.climbDist": {
    label: "PC-12 · Strecke im Steigflug",
    value: 60, unit: "NM", source: "Schätzung", editable: true,
  },
  "pc12.reserveLrc": {
    label: "PC-12 · Reserve Sparflug (45 min + Anflug)",
    value: 34, unit: "gal", source: "Schätzung", editable: true,
  },
  "pc12.reserveFast": {
    label: "PC-12 · Reserve Schnellflug (NBAA-nah)",
    value: 45, unit: "gal", source: "Schätzung", editable: true,
  },
  "pc12.seats": {
    label: "PC-12 · Max. Passagiere + Pilot",
    value: 10, unit: "Personen", source: "Werksangabe", editable: false,
  },
  "pc12.rangeRef": {
    label: "PC-12 · Werksreichweite (Kalibrierziel)",
    value: 1803, unit: "NM", source: "Werksangabe", editable: false,
    note: "gilt für 4 Passagiere, voll betankt, Sparflug",
  },

  // ------------------------------------------------------------- Beladung
  "shared.kgPerPerson": {
    label: "Masse je Person (inkl. Handgepäck)",
    value: 85, unit: "kg", source: "Schätzung", editable: true,
    note: "EASA-Standardmassen-nah",
  },
  "shared.bagPerPerson": {
    label: "Gepäck je Person",
    value: 15, unit: "kg", source: "Schätzung", editable: true,
  },

  // ------------------------------------------------ Bahnbedarf-Faktoren
  "shared.altFactorAfm": {
    label: "Höhenzuschlag je 1.000 ft Platzhöhe (AFM-nah)",
    value: 0.04, unit: "Faktor/1.000 ft", source: "AFM", editable: false,
    note: "aus den AFM-Höhentabellen abgeleitet — Standardoption",
  },
  "shared.altFactorConservative": {
    label: "Höhenzuschlag je 1.000 ft Platzhöhe (konservativ)",
    value: 0.09, unit: "Faktor/1.000 ft", source: "Schätzung", editable: false,
    note: "konservative Alternative aus der Referenz-Analyse",
  },
  "shared.catJetLandFactor": {
    label: "CAT-Landefaktor Jet, trocken (60-%-Regel)",
    value: 1.67, unit: "Faktor", source: "EASA", editable: false,
    note: "CAT.POL.A.230",
  },
  "shared.catJetLandFactorWet": {
    label: "CAT-Landefaktor Jet, nass",
    value: 1.92, unit: "Faktor", source: "EASA", editable: false,
    note: "CAT.POL.A.230 (nass = 115 % der trockenen Anforderung)",
  },
  "shared.catBStartFactor": {
    label: "CAT-Startfaktor Klasse B (PC-12)",
    value: 1.25, unit: "Faktor", source: "EASA", editable: false,
    note: "CAT.POL.A.305",
  },
  "shared.catBLandFactor": {
    label: "CAT-Landefaktor Klasse B (PC-12): Landung ≤ 70 % LDA",
    value: 1.4286, unit: "Faktor", source: "EASA", editable: false,
    note: "CAT.POL.A.330/335 — als Faktor 1/0,7",
  },
  "shared.wetLandFactorB": {
    label: "Nass-Zuschlag Landung Klasse B (zusätzlich)",
    value: 1.15, unit: "Faktor", source: "EASA", editable: false,
    note: "CAT.POL.A.335",
  },
  "shared.wetLandFactorPrivate": {
    label: "Nass-Zuschlag Landung privat (beide Muster)",
    value: 1.15, unit: "Faktor", source: "Schätzung", editable: true,
    note: "Empfehlung analog Klasse B; privat nicht vorgeschrieben",
  },
  "shared.grassStartFactor": {
    label: "Gras-Zuschlag Start (nur PC-12)",
    value: 1.2, unit: "Faktor", source: "Werksangabe", editable: false,
  },
  "shared.grassLandFactor": {
    label: "Gras-Zuschlag Landung (nur PC-12)",
    value: 1.15, unit: "Faktor", source: "Werksangabe", editable: false,
  },

  // ------------------------------------------------------ Routen-Duell
  "shared.co2PerKgFuel": {
    label: "CO₂ je kg Jet A-1 (fossil)",
    value: 3.16, unit: "kg CO₂/kg", source: "EASA", editable: false,
    note: "Standard-Emissionsfaktor (ICAO/EASA)",
  },
  "shared.blockTimeExtraMin": {
    label: "Blockzeit-Zuschlag (Rollen, An-/Abflug)",
    value: 12, unit: "min", source: "Schätzung", editable: true,
  },
} as const satisfies Record<string, ModelConstant>;

export type ConstantKey = keyof typeof CONSTANTS;

/** Laufzeit-Overrides (Nutzeränderungen im Annahmen-Panel). */
export type Overrides = Partial<Record<ConstantKey, number>>;

/** Effektiver Wert einer Konstante unter Berücksichtigung von Overrides. */
export function val(key: ConstantKey, overrides: Overrides = {}): number {
  const o = overrides[key];
  return o !== undefined ? o : CONSTANTS[key].value;
}

/** kg je US gal, hergeleitet aus max. Kraftstoff (Masse/Volumen) je Muster. */
export function kgPerGal(ac: "sf50" | "pc12", overrides: Overrides = {}): number {
  return val(`${ac}.maxFuelKg`, overrides) / val(`${ac}.maxFuelGal`, overrides);
}
