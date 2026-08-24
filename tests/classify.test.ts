import { describe, expect, it } from "vitest";
import {
  classify,
  dotClass,
  effectivePaved,
  type ClassifyOptions,
} from "../src/logic/classify.ts";
import type { Airport } from "../src/logic/types.ts";

const base: ClassifyOptions = { marginPct: 0, useGrass: true };

function ap(over: Partial<Airport>): Airport {
  return {
    i: "TEST",
    n: "Testplatz",
    la: 50,
    lo: 8,
    c: "DE",
    m: "Testort",
    p: 0,
    g: 0,
    u: 0,
    t: "s",
    ...over,
  };
}

describe("Grenzwerte exakt auf der Schwelle (befestigt)", () => {
  it("SF50 privat: 973 m reicht, 972 m nicht", () => {
    expect(classify(ap({ p: 973 }), base).sf50Priv).toBe(true);
    expect(classify(ap({ p: 972 }), base).sf50Priv).toBe(false);
  });
  it("SF50 gewerblich: 1.289 m reicht, 1.288 m nicht", () => {
    expect(classify(ap({ p: 1289 }), base).sf50Cat).toBe(true);
    expect(classify(ap({ p: 1288 }), base).sf50Cat).toBe(false);
  });
  it("PC-12 privat: 758 m reicht, 757 m nicht", () => {
    expect(classify(ap({ p: 758 }), base).pc12Priv).toBe(true);
    expect(classify(ap({ p: 757 }), base).pc12Priv).toBe(false);
  });
  it("PC-12 gewerblich: 948 m reicht, 947 m nicht", () => {
    expect(classify(ap({ p: 948 }), base).pc12Cat).toBe(true);
    expect(classify(ap({ p: 947 }), base).pc12Cat).toBe(false);
  });
});

describe("Alle vier Szenarien für typische Plätze", () => {
  it("EDRK-artig (1.175 m befestigt): alles außer SF50 gewerblich", () => {
    const v = classify(ap({ p: 1175 }), base);
    expect(v).toEqual({
      sf50Priv: true,
      sf50Cat: false,
      pc12Priv: true,
      pc12Cat: true,
    });
  });
  it("EDDF-artig (4.000 m): alle vier nutzbar", () => {
    const v = classify(ap({ p: 4000 }), base);
    expect(v).toEqual({
      sf50Priv: true,
      sf50Cat: true,
      pc12Priv: true,
      pc12Cat: true,
    });
  });
  it("800-m-Platz: nur PC-12 privat", () => {
    const v = classify(ap({ p: 800 }), base);
    expect(v).toEqual({
      sf50Priv: false,
      sf50Cat: false,
      pc12Priv: true,
      pc12Cat: false,
    });
  });
  it("500-m-Platz: keines", () => {
    const v = classify(ap({ p: 500 }), base);
    expect(v).toEqual({
      sf50Priv: false,
      sf50Cat: false,
      pc12Priv: false,
      pc12Cat: false,
    });
  });
});

describe("Gras-Regeln", () => {
  it("SF50 nie auf Gras, egal wie lang (AFM-Limitation)", () => {
    const v = classify(ap({ g: 3000 }), base);
    expect(v.sf50Priv).toBe(false);
    expect(v.sf50Cat).toBe(false);
  });
  it("PC-12 privat auf Gras: 910 m reicht, 909 m nicht", () => {
    expect(classify(ap({ g: 910 }), base).pc12Priv).toBe(true);
    expect(classify(ap({ g: 909 }), base).pc12Priv).toBe(false);
  });
  it("PC-12 gewerblich auf Gras: 1.137 m reicht, 1.136 m nicht", () => {
    expect(classify(ap({ g: 1137 }), base).pc12Cat).toBe(true);
    expect(classify(ap({ g: 1136 }), base).pc12Cat).toBe(false);
  });
  it("Gras abgeschaltet: PC-12 verliert reine Grasplätze", () => {
    const noGrass = { ...base, useGrass: false };
    expect(classify(ap({ g: 2000 }), noGrass).pc12Priv).toBe(false);
    // Befestigte Bahn bleibt unberührt
    expect(classify(ap({ p: 800, g: 2000 }), noGrass).pc12Priv).toBe(true);
  });
  it("EDRY-artig (1.677 m befestigt + 1.000 m Gras): Gras hilft der PC-12 nicht extra, alles über befestigt", () => {
    const v = classify(ap({ p: 1677, g: 1000 }), base);
    expect(v).toEqual({
      sf50Priv: true,
      sf50Cat: true,
      pc12Priv: true,
      pc12Cat: true,
    });
  });
});

describe("Sicherheitsmarge", () => {
  it("multipliziert den Bedarf: SF50 privat mit +10 % braucht 1.070,3 m", () => {
    const m10 = { ...base, marginPct: 10 };
    expect(classify(ap({ p: 1071 }), m10).sf50Priv).toBe(true);
    expect(classify(ap({ p: 1070 }), m10).sf50Priv).toBe(false); // 973 × 1,1 = 1.070,3
  });
  it("gilt auch für Gras: PC-12 privat +20 % braucht 1.092 m Gras", () => {
    const m20 = { ...base, marginPct: 20 };
    expect(classify(ap({ g: 1092 }), m20).pc12Priv).toBe(true);
    expect(classify(ap({ g: 1091 }), m20).pc12Priv).toBe(false);
  });
  it("+30 % (Maximum): SF50 gewerblich braucht 1.675,7 m", () => {
    const m30 = { ...base, marginPct: 30 };
    expect(classify(ap({ p: 1676 }), m30).sf50Cat).toBe(true);
    expect(classify(ap({ p: 1675 }), m30).sf50Cat).toBe(false);
  });
});

describe("Unbekannter Belag", () => {
  it("zählt bei small airports nicht als befestigt", () => {
    const a = ap({ u: 2000, t: "s" });
    expect(effectivePaved(a)).toBe(0);
    expect(classify(a, base).sf50Priv).toBe(false);
  });
  it("zählt bei medium/large airports als befestigt", () => {
    expect(effectivePaved(ap({ u: 2000, t: "m" }))).toBe(2000);
    expect(effectivePaved(ap({ u: 2000, t: "l" }))).toBe(2000);
    expect(classify(ap({ u: 2000, t: "m" }), base).sf50Cat).toBe(true);
  });
  it("längste Bahn gewinnt: befestigt 1.500 m schlägt unbekannt 1.000 m", () => {
    expect(effectivePaved(ap({ p: 1500, u: 1000, t: "m" }))).toBe(1500);
  });
});

describe("Punktfarbe (dotClass)", () => {
  it("grün, wenn das Szenario erfüllt ist", () => {
    const v = classify(ap({ p: 1300 }), base);
    expect(dotClass(v, 1)).toBe("ok");
  });
  it("blau im SF50-Szenario, wenn nur die PC-12 hinkäme", () => {
    const v = classify(ap({ p: 1000 }), base); // SF50 cat nein, PC-12 cat ja
    expect(dotClass(v, 1)).toBe("alt");
  });
  it("kein Blau in PC-12-Szenarien", () => {
    const v = classify(ap({ p: 800 }), base); // PC-12 priv ja, cat nein
    expect(dotClass(v, 3)).toBe("none");
  });
  it("gedimmt, wenn für beide zu kurz", () => {
    const v = classify(ap({ p: 400 }), base);
    expect(dotClass(v, 0)).toBe("none");
  });
});
