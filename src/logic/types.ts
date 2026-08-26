/** Ein Flugplatz aus public/data/airports.json (kompaktes Format, von scripts/build-data.ts erzeugt). */
export interface Airport {
  /** Ident (meist ICAO), z. B. "EDRK" */
  i: string;
  /** Name */
  n: string;
  /** Breitengrad */
  la: number;
  /** Längengrad */
  lo: number;
  /** ISO-Ländercode, z. B. "DE" */
  c: string;
  /** Ort/Gemeinde */
  m: string;
  /** längste befestigte Bahn in m (0 = keine) */
  p: number;
  /** längste Gras-/Naturbahn in m (0 = keine) */
  g: number;
  /** längste Bahn mit unbekanntem Belag in m (0 = keine) */
  u: number;
  /** Flugplatzgröße laut OurAirports: "s" small, "m" medium, "l" large */
  t: "s" | "m" | "l";
  /** Platzhöhe in ft (0 = unbekannt) */
  e: number;
  /** 1 = mutmaßlich militärisch (Namens-Heuristik) */
  mi?: 1;
}

export type AircraftId = "sf50" | "pc12";
export type Operation = "priv" | "cat";

/** Eignungs-Urteil eines Platzes für alle vier Szenarien. */
export interface Verdict {
  sf50Priv: boolean;
  sf50Cat: boolean;
  pc12Priv: boolean;
  pc12Cat: boolean;
}
