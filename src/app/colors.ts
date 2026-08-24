/** Kartenfarben — eigenes Modul, damit die UI sie ohne MapLibre-Import nutzen kann. */
export const COLORS = {
  ok: "#35D98F",
  none: "#333F4D",
  sf50: "#FF6B5E",
  pc12: "#52A9FF",
};

/**
 * Farben der fünf Eignungs-Stufen (siehe tierOf in logic/classify.ts).
 * Warme Familie = SF50 (gewerblich kräftig, privat gold),
 * kalte Familie = PC-12 (gewerblich blau, privat türkis), Grau = keiner.
 */
export const TIER_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  4: "#FF6B5E", // SF50 gewerblich — alle vier Szenarien
  3: "#F2C14E", // SF50 privat (PC-12 beide auch)
  2: "#52A9FF", // nur PC-12, privat + gewerblich
  1: "#2FBFC9", // nur PC-12 privat
  0: "#333F4D", // für beide zu kurz
};

export const TIER_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  4: "SF50 gewerblich — alle vier Szenarien",
  3: "SF50 privat · PC-12 beide",
  2: "nur PC-12, privat + gewerblich",
  1: "nur PC-12 privat",
  0: "für beide zu kurz",
};
