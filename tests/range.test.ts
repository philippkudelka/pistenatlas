import { describe, expect, it } from "vitest";
import { rangeAtPax } from "../src/logic/range.ts";

describe("Reichweite nach Passagierzahl (MTOW-Modell)", () => {
  it("bei 4 Passagieren gelten die Herstellerangaben", () => {
    expect(rangeAtPax("sf50", 4)).toBe(1275);
    expect(rangeAtPax("pc12", 4)).toBe(1803);
  });
  it("weniger Passagiere bringen keine Mehr-Reichweite (Tanks voll)", () => {
    expect(rangeAtPax("sf50", 1)).toBe(1275);
    expect(rangeAtPax("pc12", 2)).toBe(1803);
  });
  it("SF50: 5. Passagier kostet ≈ 168 NM", () => {
    // 100 kg ÷ (227 l/h ÷ 305 kt × 0,8 kg/l) ≈ 168 NM
    expect(rangeAtPax("sf50", 5)).toBe(1107);
  });
  it("SF50: mehr als 5 Passagiere unmöglich", () => {
    expect(rangeAtPax("sf50", 6)).toBeNull();
    expect(rangeAtPax("sf50", 8)).toBeNull();
  });
  it("PC-12: jeder Passagier ab dem 5. kostet ≈ 145 NM", () => {
    expect(rangeAtPax("pc12", 5)).toBe(1658);
    expect(rangeAtPax("pc12", 8)).toBe(1221);
  });
  it("PC-12: 8 Passagiere sind das Maximum", () => {
    expect(rangeAtPax("pc12", 9)).toBeNull();
  });
});
