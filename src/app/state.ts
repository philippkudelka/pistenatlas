import type { ScenarioId } from "../model/verdict.ts";
import type { Overrides } from "../model/constants.ts";
import type { Regime } from "../model/mission.ts";
import type { Airport } from "../logic/types.ts";

/** Zentraler App-Zustand mit simplem Publish/Subscribe. */
export interface AppState {
  scenario: ScenarioId;
  /** Sicherheitsmarge in Prozent (0–30) */
  marginPct: number;
  /** Gras-/Naturpisten mitzählen (nur PC-12) */
  useGrass: boolean;
  /** ISO-Ländercode oder "" für alle */
  country: string;
  /** Militärplätze anzeigen (Kennzeichnung bleibt immer) */
  includeMilitary: boolean;

  // --- Beladungsfall (gilt für beide Muster) ---
  /** Insassen inkl. Pilot */
  persons: number;
  /** "max" = maximal möglicher Kraftstoff, "fraction" = fester Tankanteil */
  tankMode: "max" | "fraction";
  /** Tankanteil 0–1 (nur bei tankMode "fraction") */
  tankFraction: number;
  /** nasse Bahn */
  wet: boolean;
  /** Höhenzuschlag: "afm" (+4 %/1.000 ft) oder "conservative" (+9 %) */
  altMode: "afm" | "conservative";
  /** Reiseflug-Regime für Reichweite/Routen: Sparflug oder Schnellflug */
  regime: Regime;
  /** Nutzeränderungen an Modellkonstanten (Annahmen-Panel) */
  overrides: Overrides;

  // --- Auswahl / Interaktion ---
  selected: Airport | null;
  ringsFor: Airport | null;
  routeA: Airport | null;
  routeB: Airport | null;
  routePicking: boolean;
}

export type Listener = (state: AppState, changed: Set<keyof AppState>) => void;

const state: AppState = {
  scenario: 1,
  marginPct: 0,
  useGrass: true,
  country: "",
  includeMilitary: true,
  persons: 4,
  tankMode: "max",
  tankFraction: 1,
  wet: false,
  altMode: "afm",
  regime: "lrc",
  overrides: {},
  selected: null,
  ringsFor: null,
  routeA: null,
  routeB: null,
  routePicking: false,
};

/** Zustands-Schlüssel, die das Platz-Urteil (und damit Karte/Hero) ändern. */
export const MODEL_KEYS: readonly (keyof AppState)[] = [
  "marginPct",
  "useGrass",
  "persons",
  "tankMode",
  "tankFraction",
  "wet",
  "altMode",
  "overrides",
] as const;

export function modelChanged(changed: Set<keyof AppState>): boolean {
  return MODEL_KEYS.some((k) => changed.has(k));
}

const listeners: Listener[] = [];

export function getState(): Readonly<AppState> {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  const changed = new Set<keyof AppState>();
  for (const [k, v] of Object.entries(patch) as [keyof AppState, never][]) {
    if (state[k] !== v) {
      (state[k] as unknown) = v;
      changed.add(k);
    }
  }
  if (changed.size) for (const fn of listeners) fn(state, changed);
}

export function subscribe(fn: Listener): void {
  listeners.push(fn);
}
