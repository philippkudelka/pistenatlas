import type { ScenarioId } from "../logic/classify.ts";
import type { Airport } from "../logic/types.ts";

/** Zentraler App-Zustand mit simplem Publish/Subscribe. */
export interface AppState {
  scenario: ScenarioId;
  marginPct: number;
  useGrass: boolean;
  /** ISO-Ländercode oder "" für alle */
  country: string;
  /** ausgewählter Platz (Detailkarte) */
  selected: Airport | null;
  /** Platz, um den Reichweiten-Ringe liegen */
  ringsFor: Airport | null;
  /** Routen-Duell */
  routeA: Airport | null;
  routeB: Airport | null;
  /** true, während auf den zweiten Klick fürs Routen-Duell gewartet wird */
  routePicking: boolean;
}

export type Listener = (state: AppState, changed: Set<keyof AppState>) => void;

const state: AppState = {
  scenario: 1,
  marginPct: 0,
  useGrass: true,
  country: "",
  selected: null,
  ringsFor: null,
  routeA: null,
  routeB: null,
  routePicking: false,
};

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
