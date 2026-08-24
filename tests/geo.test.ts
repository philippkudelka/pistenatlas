import { describe, expect, it } from "vitest";
import { destPoint, gcDistanceNm, gcPath } from "../src/logic/geo.ts";

// Koblenz-Winningen und Palma de Mallorca
const EDRK = { la: 50.325, lo: 7.528 };
const LEPA = { la: 39.552, lo: 2.739 };

describe("Großkreisdistanz", () => {
  it("EDRK–LEPA ≈ 678 NM", () => {
    const d = gcDistanceNm(EDRK, LEPA);
    expect(d).toBeGreaterThan(670);
    expect(d).toBeLessThan(686);
  });
  it("identische Punkte → 0", () => {
    expect(gcDistanceNm(EDRK, EDRK)).toBe(0);
  });
  it("symmetrisch", () => {
    expect(gcDistanceNm(EDRK, LEPA)).toBeCloseTo(gcDistanceNm(LEPA, EDRK), 9);
  });
  it("1° Breitengrad ≈ 60 NM", () => {
    const d = gcDistanceNm({ la: 50, lo: 8 }, { la: 51, lo: 8 });
    expect(d).toBeCloseTo(60, 0);
  });
});

describe("destPoint", () => {
  it("60 NM nach Norden ≈ +1° Breite, Länge unverändert", () => {
    const [la, lo] = destPoint(EDRK.la, EDRK.lo, 0, 60);
    expect(la).toBeCloseTo(EDRK.la + 1, 1);
    expect(lo).toBeCloseTo(EDRK.lo, 4);
  });
  it("Distanz zum Zielpunkt stimmt", () => {
    const [la, lo] = destPoint(EDRK.la, EDRK.lo, 137, 500);
    expect(gcDistanceNm(EDRK, { la, lo })).toBeCloseTo(500, 0);
  });
});

describe("gcPath", () => {
  it("beginnt am Start, endet am Ziel", () => {
    const pts = gcPath(EDRK, LEPA);
    expect(pts[0]![0]).toBeCloseTo(EDRK.lo, 2);
    expect(pts[0]![1]).toBeCloseTo(EDRK.la, 2);
    expect(pts.at(-1)![0]).toBeCloseTo(LEPA.lo, 2);
    expect(pts.at(-1)![1]).toBeCloseTo(LEPA.la, 2);
  });
  it("Teilstrecken summieren sich zur Gesamtdistanz", () => {
    const pts = gcPath(EDRK, LEPA, 32);
    let sum = 0;
    for (let i = 1; i < pts.length; i++) {
      sum += gcDistanceNm(
        { lo: pts[i - 1]![0], la: pts[i - 1]![1] },
        { lo: pts[i]![0], la: pts[i]![1] },
      );
    }
    expect(sum).toBeCloseTo(gcDistanceNm(EDRK, LEPA), 3);
  });
});
