import { describe, expect, it } from "vitest";
import {
  CONSTANTS,
  kgPerGal,
  val,
  type ConstantKey,
} from "../src/model/constants.ts";
import { computeLoading } from "../src/model/loading.ts";
import { rangeNm, trip } from "../src/model/mission.ts";
import { requiredRunway, type RunwayConditions } from "../src/model/runway.ts";
import {
  classifyAirport,
  effectivePaved,
  tierOf,
  type VerdictContext,
} from "../src/model/verdict.ts";
import type { Airport } from "../src/logic/types.ts";

const DRY: RunwayConditions = { cat: false, wet: false, marginPct: 0, altMode: "afm" };

// ---------------------------------------------------------------- Konstanten
describe("Konstanten-Register (keine offene Variable)", () => {
  it("jeder Eintrag hat Quelle, Einheit, Label und editable-Flag", () => {
    for (const [key, c] of Object.entries(CONSTANTS)) {
      expect(c.source, `${key} ohne Quelle`).toMatch(/^(AFM|Werksangabe|EASA|Schätzung)$/);
      expect(c.unit, `${key} ohne Einheit`).toBeTruthy();
      expect(c.label, `${key} ohne Label`).toBeTruthy();
      expect(typeof c.editable, `${key} ohne editable`).toBe("boolean");
      expect(Number.isFinite(c.value), `${key} ohne Zahlwert`).toBe(true);
    }
  });
  it("Overrides greifen und lassen sich zurücksetzen", () => {
    expect(val("sf50.bew")).toBe(1610);
    expect(val("sf50.bew", { "sf50.bew": 1660 })).toBe(1660);
  });
  it("kg/gal wird aus Masse/Volumen hergeleitet (~3,06)", () => {
    expect(kgPerGal("sf50")).toBeCloseTo(907 / 296, 6);
    expect(kgPerGal("pc12")).toBeCloseTo(1226 / 402, 6);
  });
});

// ------------------------------------------------------------------ Beladung
describe("Beladungsmodell", () => {
  it("SF50, 2 Personen, max. Tank → voller Tank (907 kg), MTOM eingehalten", () => {
    const r = computeLoading("sf50", { persons: 2, tankMode: "max", tankFraction: 1 });
    expect(r.ok).toBe(true);
    expect(r.zfw).toBe(1610 + 2 * 100);
    expect(r.fuelKg).toBe(907); // Raum wäre 912 kg → Tank limitiert
    expect(r.tankPct).toBe(1);
    expect(r.tom).toBe(2717);
  });
  it("SF50, 4 Personen, max. Tank → MTOM limitiert (712 kg, 79 %)", () => {
    const r = computeLoading("sf50", { persons: 4, tankMode: "max", tankFraction: 1 });
    expect(r.ok).toBe(true);
    expect(r.fuelKg).toBe(2722 - 2010);
    expect(r.tom).toBe(2722);
    expect(r.tankPct).toBeCloseTo(712 / 907, 3);
  });
  it("SF50, 7 Personen → MZFW-Fehler statt stillem Clamping", () => {
    const r = computeLoading("sf50", { persons: 7, tankMode: "max", tankFraction: 1 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("MZFW");
  });
  it("SF50, 8 Personen → Sitzplatz-Fehler", () => {
    const r = computeLoading("sf50", { persons: 8, tankMode: "max", tankFraction: 1 });
    expect(r.errors.join(" ")).toContain("maximal 7");
  });
  it("fester Tankanteil, der MTOM sprengt → Fehler mit maximal möglichem Anteil", () => {
    const r = computeLoading("sf50", { persons: 4, tankMode: "fraction", tankFraction: 1 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("MTOM überschritten");
    expect(r.errors.join(" ")).toContain("78 %");
  });
  it("PC-12, 4 Personen, max. Tank → voller Tank möglich (1.226 kg)", () => {
    const r = computeLoading("pc12", { persons: 4, tankMode: "max", tankFraction: 1 });
    expect(r.ok).toBe(true);
    expect(r.fuelKg).toBe(1226);
    expect(r.tom).toBe(3066 + 400 + 1226);
  });
  it("höhere Leermasse (Override) reduziert den maximal möglichen Kraftstoff", () => {
    const r = computeLoading(
      "sf50",
      { persons: 4, tankMode: "max", tankFraction: 1 },
      { "sf50.bew": 1660 },
    );
    expect(r.fuelKg).toBe(2722 - (1660 + 400));
  });
});

// -------------------------------------------------------- Reichweite (Mission)
describe("Reichweiten-Kalibrierung (Pflichttests)", () => {
  it("SF50 „2 Personen, voll, Sparflug“ = 1.275 NM ± 3 %", () => {
    const load = computeLoading("sf50", { persons: 2, tankMode: "max", tankFraction: 1 });
    const nm = rangeNm("sf50", load.fuelGal, "lrc");
    expect(Math.abs(nm - 1275) / 1275).toBeLessThanOrEqual(0.03);
  });
  it("PC-12 „4 Personen, voll, Sparflug“ = 1.803 NM ± 3 %", () => {
    const load = computeLoading("pc12", { persons: 4, tankMode: "max", tankFraction: 1 });
    const nm = rangeNm("pc12", load.fuelGal, "lrc");
    expect(Math.abs(nm - 1803) / 1803).toBeLessThanOrEqual(0.03);
  });
  it("SF50, 4 Personen, max. Tank, Sparflug ≈ 972 NM (Referenz-V3)", () => {
    const load = computeLoading("sf50", { persons: 4, tankMode: "max", tankFraction: 1 });
    const nm = rangeNm("sf50", load.fuelGal, "lrc");
    // Referenz rechnet mit 70+20 kg/Person und MTOW 2727 → 972 NM; hier 85+15 kg
    // und MTOM 2.722 (AFM) → etwas weniger Sprit, gleiche Größenordnung.
    expect(nm).toBeGreaterThan(880);
    expect(nm).toBeLessThan(1000);
  });
  it("zu wenig Kraftstoff für Reserven → Reichweite 0", () => {
    expect(rangeNm("sf50", 60, "lrc")).toBe(0);
  });
  it("Schnellflug ist kürzer als Sparflug", () => {
    const load = computeLoading("sf50", { persons: 2, tankMode: "max", tankFraction: 1 });
    expect(rangeNm("sf50", load.fuelGal, "fast")).toBeLessThan(
      rangeNm("sf50", load.fuelGal, "lrc"),
    );
  });
});

describe("Streckenrechnung (Routen-Duell)", () => {
  it("EDRK–LEPA-artige 678 NM, SF50 Sparflug: Zeit und Kraftstoff plausibel", () => {
    const t = trip("sf50", 678, "lrc");
    expect(t.blockH).toBeCloseTo(678 / 240 + 0.2, 2);
    // 10 taxi + 50 climb + (588/240)*40 = 158 gal
    expect(t.tripFuelGal).toBeCloseTo(158, 0);
    expect(t.requiredGal).toBeCloseTo(198, 0);
    expect(t.co2Kg).toBeCloseTo(t.tripFuelKg * 3.16, 6);
  });
  it("Strecke kürzer als der Steigflug skaliert den Steigflug-Kraftstoff", () => {
    const t = trip("sf50", 45, "lrc");
    expect(t.tripFuelGal).toBeCloseTo(10 + 50 * 0.5, 6);
  });
});

// ---------------------------------------------------------------- Bahnbedarf
describe("Bahnbedarf: Massenskalierung", () => {
  it("bei MTOM gilt der AFM-Basiswert (Start maßgeblich, SF50 973 m)", () => {
    const r = requiredRunway("sf50", 2722, 0, DRY, "paved");
    expect(r.startM).toBe(973);
    expect(r.reqM).toBe(973);
  });
  it("leichtere Startmasse senkt quadratisch (2.367 kg → 736 m)", () => {
    const r = requiredRunway("sf50", 2367, 0, DRY, "paved");
    expect(r.startM).toBe(Math.round(973 * (2367 / 2722) ** 2));
  });
  it("Landemasse = Startmasse − Roll-/Steigflugkraftstoff, gedeckelt auf MLM", () => {
    const heavy = requiredRunway("sf50", 2722, 0, DRY, "paved");
    expect(heavy.landingMass).toBe(2517); // 2722 − 184 kg Burn > MLM → MLM
    const light = requiredRunway("sf50", 2200, 0, DRY, "paved");
    expect(light.landingMass).toBeCloseTo(2200 - 60 * (907 / 296), 0);
  });
});

describe("Bahnbedarf: Höhenzuschlag", () => {
  it("AFM-Option: +4 %/1.000 ft (640 ft → ×1,0256)", () => {
    const sl = requiredRunway("sf50", 2722, 0, DRY, "paved");
    const koblenz = requiredRunway("sf50", 2722, 640, DRY, "paved");
    expect(koblenz.startM).toBe(Math.round(973 * (1 + 0.04 * 0.64)));
    expect(koblenz.startM).toBeGreaterThan(sl.startM);
  });
  it("konservative Option: +9 %/1.000 ft", () => {
    const r = requiredRunway("sf50", 2722, 1000, { ...DRY, altMode: "conservative" }, "paved");
    expect(r.startM).toBe(Math.round(973 * 1.09));
  });
});

describe("Bahnbedarf: Betriebsart, nass, Gras, Marge", () => {
  it("SF50 CAT trocken: Landung × 1,67 wird maßgeblich (MTOM: 1.289 m)", () => {
    const r = requiredRunway("sf50", 2722, 0, { ...DRY, cat: true }, "paved");
    expect(r.landM).toBe(Math.round(772 * 1.67));
    expect(r.reqM).toBe(1289);
  });
  it("SF50 CAT nass: Faktor 1,92", () => {
    const r = requiredRunway("sf50", 2722, 0, { ...DRY, cat: true, wet: true }, "paved");
    expect(r.landM).toBe(Math.round(772 * 1.92));
  });
  it("PC-12 CAT: Start × 1,25 (948 m), Landung ≤ 70 % LDA", () => {
    const r = requiredRunway("pc12", 4740, 0, { ...DRY, cat: true }, "paved");
    expect(r.startM).toBe(Math.round(758 * 1.25));
    expect(r.landM).toBe(Math.round(661 * 1.4286));
    expect(r.reqM).toBe(r.startM); // Landung 944 m < Start 948 m → Start maßgeblich
  });
  it("PC-12 Gras privat: Start × 1,2 (910 m bei MTOM)", () => {
    const r = requiredRunway("pc12", 4740, 0, DRY, "grass");
    expect(r.startM).toBe(Math.round(758 * 1.2));
  });
  it("Marge +30 % multipliziert das Endergebnis", () => {
    const r = requiredRunway("sf50", 2722, 0, { ...DRY, marginPct: 30 }, "paved");
    expect(r.startM).toBe(Math.round(973 * 1.3));
  });
  it("privat nass: Landung × 1,15 (Empfehlung)", () => {
    const r = requiredRunway("sf50", 2722, 0, { ...DRY, wet: true }, "paved");
    expect(r.landM).toBe(Math.round(772 * ((2517 / 2517) ** 2) * 1.15));
  });
});

// -------------------------------------------------------------- Platz-Urteil
function ap(over: Partial<Airport>): Airport {
  return {
    i: "TEST", n: "Testplatz", la: 50, lo: 8, c: "DE", m: "Testort",
    p: 0, g: 0, u: 0, t: "s", e: 0,
    ...over,
  };
}

function ctx(over: Partial<VerdictContext> = {}): VerdictContext {
  return {
    loads: {
      sf50: computeLoading("sf50", { persons: 2, tankMode: "max", tankFraction: 1 }),
      pc12: computeLoading("pc12", { persons: 2, tankMode: "max", tankFraction: 1 }),
    },
    wet: false, marginPct: 0, altMode: "afm", useGrass: true,
    declared: {}, overrides: {},
    ...over,
  };
}

describe("Platz-Urteil", () => {
  it("Grenzwert exakt auf der Schwelle (SF50 privat, 2 P voll: 970 m nötig)", () => {
    const c = ctx();
    const need = requiredRunway("sf50", c.loads.sf50.tom, 0, DRY, "paved").reqM;
    expect(classifyAirport(ap({ p: need }), c).sf50Priv).toBe(true);
    expect(classifyAirport(ap({ p: need - 1 }), c).sf50Priv).toBe(false);
  });
  it("SF50 nie auf Gras, egal wie lang", () => {
    const v = classifyAirport(ap({ g: 4000 }), ctx());
    expect(v.sf50Priv).toBe(false);
    expect(v.sf50Cat).toBe(false);
  });
  it("PC-12 nutzt Gras, wenn eingeschaltet", () => {
    const c = ctx();
    expect(classifyAirport(ap({ g: 1200 }), c).pc12Priv).toBe(true);
    expect(classifyAirport(ap({ g: 1200 }), ctx({ useGrass: false })).pc12Priv).toBe(false);
  });
  it("deklarierte Distanz überschreibt die physische Länge (EDRY-Fall)", () => {
    const edry = ap({ i: "EDRY", p: 1677, e: 312 });
    const c = ctx({
      loads: {
        sf50: computeLoading("sf50", { persons: 4, tankMode: "max", tankFraction: 1 }),
        pc12: computeLoading("pc12", { persons: 4, tankMode: "max", tankFraction: 1 }),
      },
      declared: { EDRY: 1400 },
    });
    expect(effectivePaved(edry, c.declared)).toBe(1400);
    // SF50 CAT braucht bei 312 ft ~1.306 m → 1.400 m deklariert reicht knapp,
    // 1.300 m würde nicht reichen
    const req = requiredRunway("sf50", c.loads.sf50.tom, 312, { ...DRY, cat: true }, "paved").reqM;
    expect(req).toBeGreaterThan(1250);
    expect(classifyAirport(edry, c).sf50Cat).toBe(1400 >= req);
  });
  it("ungültige Beladung (MZFW verletzt) → alle Urteile false für das Muster", () => {
    const c = ctx({
      loads: {
        sf50: computeLoading("sf50", { persons: 7, tankMode: "max", tankFraction: 1 }),
        pc12: computeLoading("pc12", { persons: 7, tankMode: "max", tankFraction: 1 }),
      },
    });
    const v = classifyAirport(ap({ p: 4000 }), c);
    expect(v.sf50Priv).toBe(false);
    expect(v.pc12Priv).toBe(true); // PC-12 trägt 7 Personen problemlos
  });
  it("Platzhöhe kann das Urteil kippen", () => {
    const c = ctx();
    const seaLevelNeed = requiredRunway("sf50", c.loads.sf50.tom, 0, DRY, "paved").reqM;
    const border = ap({ p: seaLevelNeed });
    expect(classifyAirport(border, c).sf50Priv).toBe(true);
    expect(classifyAirport({ ...border, e: 3000 }, c).sf50Priv).toBe(false);
  });
  it("Stufen-Rangfolge: SF50cat > SF50priv > PC12cat > PC12priv > keiner", () => {
    expect(tierOf({ sf50Cat: true, sf50Priv: true, pc12Cat: true, pc12Priv: true })).toBe(4);
    expect(tierOf({ sf50Cat: false, sf50Priv: true, pc12Cat: true, pc12Priv: true })).toBe(3);
    expect(tierOf({ sf50Cat: false, sf50Priv: false, pc12Cat: true, pc12Priv: true })).toBe(2);
    expect(tierOf({ sf50Cat: false, sf50Priv: false, pc12Cat: false, pc12Priv: true })).toBe(1);
    expect(tierOf({ sf50Cat: false, sf50Priv: false, pc12Cat: false, pc12Priv: false })).toBe(0);
  });
});
