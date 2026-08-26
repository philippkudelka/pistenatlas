/**
 * Datenpipeline: lädt OurAirports (airports.csv, runways.csv), filtert Europa,
 * berechnet je Platz die längste befestigte / unbefestigte / unbekannte Bahn
 * und schreibt public/data/airports.json (kompakt).
 *
 * Aufruf:  npm run data   (benötigt Node ≥ 22.18, Internetzugang)
 *
 * Die generierte Datei wird eingecheckt — die App lädt sie statisch,
 * ein Refresh ist nur nötig, wenn aktuellere OurAirports-Daten gewünscht sind.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { COUNTRY_NAMES } from "../src/logic/constants.ts";

const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const RUNWAYS_URL =
  "https://davidmegginson.github.io/ourairports-data/runways.csv";
const OUT = "public/data/airports.json";

const EURO_COUNTRIES = new Set(Object.keys(COUNTRY_NAMES));
const TYPES = new Set(["small_airport", "medium_airport", "large_airport"]);
// Grobe Bounding-Box gegen Ausreißer (schließt Kanaren und Azoren ein).
const BBOX = { latMin: 27, latMax: 82, lonMin: -32, lonMax: 52 };

const FT_TO_M = 0.3048;

/** CSV-Parser mit Anführungszeichen-Unterstützung (OurAirports nutzt "..."-Felder mit Kommas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type SurfaceClass = "paved" | "natural" | "unknown" | "unusable";

/**
 * Belags-Klassifikation. OurAirports-Belagsangaben sind Freitext;
 * die Listen decken die gängigen Codes und Landessprachen-Varianten ab.
 * Wasser/Schnee/Eis zählen gar nicht; alles Unbekannte wird als "unknown"
 * geführt (zählt nur bei medium/large als befestigt, siehe classify.ts).
 */
function classifySurface(raw: string): SurfaceClass {
  const s = raw.trim().toUpperCase();
  if (!s || s === "UNK" || s === "U" || s === "UNKNOWN") return "unknown";
  const has = (...words: string[]) => words.some((w) => s.includes(w));
  if (has("WATER", "SNOW", "ICE")) return "unusable";
  if (
    has(
      "ASP", // ASP, ASPH, ASPHALT
      "ASF", // ASFALT
      "CONC",
      "CON", // CON, CONCRETE
      "BETON",
      "PEM",
      "BIT", // BITUMEN
      "TAR", // TARMAC
      "MAC", // MACADAM
      "PAV", // PAVED
      "SEALED",
      "BRICK",
      "CEMENT",
      "HARD",
    )
  )
    return "paved";
  if (
    has(
      "GRASS",
      "GRS",
      "TURF",
      "SOD",
      "EARTH",
      "SOIL",
      "DIRT",
      "CLAY",
      "SAND",
      "GRAVEL",
      "GVL",
      "GRV",
      "GRE",
      "CORAL",
      "LATERITE",
      "FIELD",
      "MOWED",
      "GRAS", // GRAS(S), deutsche Schreibweise
      "UNPAVED",
      "NATURAL",
    )
  )
    return "natural";
  return "unknown";
}

async function fetchText(url: string): Promise<string> {
  console.log(`Lade ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${url} → ${res.status}`);
  return res.text();
}

function col(header: string[], name: string): number {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Spalte "${name}" nicht gefunden`);
  return i;
}

const [airportsCsv, runwaysCsv] = await Promise.all([
  fetchText(AIRPORTS_URL),
  fetchText(RUNWAYS_URL),
]);

// --- Pisten je Platz aggregieren -------------------------------------------
const rRows = parseCsv(runwaysCsv);
const rHead = rRows[0]!;
const rIdent = col(rHead, "airport_ident");
const rLen = col(rHead, "length_ft");
const rSurf = col(rHead, "surface");
const rClosed = col(rHead, "closed");

interface RunwayAgg {
  paved: number;
  natural: number;
  unknown: number;
}
const runways = new Map<string, RunwayAgg>();
for (let i = 1; i < rRows.length; i++) {
  const r = rRows[i]!;
  if (r.length < 5 || r[rClosed] === "1") continue;
  const lenFt = Number(r[rLen]);
  if (!Number.isFinite(lenFt) || lenFt <= 0) continue;
  const m = Math.round(lenFt * FT_TO_M);
  const cls = classifySurface(r[rSurf] ?? "");
  if (cls === "unusable") continue;
  const ident = r[rIdent]!;
  let agg = runways.get(ident);
  if (!agg) {
    agg = { paved: 0, natural: 0, unknown: 0 };
    runways.set(ident, agg);
  }
  if (cls === "paved") agg.paved = Math.max(agg.paved, m);
  else if (cls === "natural") agg.natural = Math.max(agg.natural, m);
  else agg.unknown = Math.max(agg.unknown, m);
}

// --- Flugplätze filtern -----------------------------------------------------
const aRows = parseCsv(airportsCsv);
const aHead = aRows[0]!;
const aIdent = col(aHead, "ident");
const aType = col(aHead, "type");
const aName = col(aHead, "name");
const aLat = col(aHead, "latitude_deg");
const aLon = col(aHead, "longitude_deg");
const aCountry = col(aHead, "iso_country");
const aCity = col(aHead, "municipality");
const aElev = col(aHead, "elevation_ft");

/**
 * Militär-Heuristik über den Namen (wie im Referenz-Excel dokumentiert:
 * "Namens-Heuristik, ggf. unvollständig"). Kennzeichnet, schließt nicht aus —
 * der Filter dafür sitzt im UI (Default: eingeschlossen mit Kennzeichnung).
 */
const MILITARY_RE =
  /\b(air ?base|airbase|fliegerhorst|heeresflugplatz|military|air force|army|naval|navy|luftwaffe|air station|caserma|base aerea|base aérea|base aerienne|base aérienne|raf |afb)\b/i;

interface OutAirport {
  i: string;
  n: string;
  la: number;
  lo: number;
  c: string;
  m: string;
  p: number;
  g: number;
  u: number;
  t: "s" | "m" | "l";
  /** Platzhöhe in ft (0, wenn unbekannt) */
  e: number;
  /** 1 = mutmaßlich militärisch (Namens-Heuristik), sonst nicht gesetzt */
  mi?: 1;
}

const out: OutAirport[] = [];
for (let i = 1; i < aRows.length; i++) {
  const a = aRows[i]!;
  if (a.length < 10) continue;
  const type = a[aType]!;
  const country = a[aCountry]!;
  if (!TYPES.has(type) || !EURO_COUNTRIES.has(country)) continue;
  const la = Number(a[aLat]);
  const lo = Number(a[aLon]);
  if (
    !Number.isFinite(la) ||
    !Number.isFinite(lo) ||
    la < BBOX.latMin ||
    la > BBOX.latMax ||
    lo < BBOX.lonMin ||
    lo > BBOX.lonMax
  )
    continue;
  const ident = a[aIdent]!;
  const rw = runways.get(ident);
  if (!rw || (rw.paved === 0 && rw.natural === 0 && rw.unknown === 0)) continue;
  const name = a[aName]!;
  const elevFt = Number(a[aElev]);
  const entry: OutAirport = {
    i: ident,
    n: name,
    la: Math.round(la * 1000) / 1000,
    lo: Math.round(lo * 1000) / 1000,
    c: country,
    m: a[aCity] ?? "",
    p: rw.paved,
    g: rw.natural,
    u: rw.unknown,
    t: type[0] as "s" | "m" | "l",
    e: Number.isFinite(elevFt) ? Math.round(elevFt) : 0,
  };
  if (MILITARY_RE.test(name)) entry.mi = 1;
  out.push(entry);
}
out.sort((x, y) => x.i.localeCompare(y.i));

// --- Stichprobenprüfung (Abbruch bei Abweichung) ----------------------------
function check(ident: string, expect: Partial<OutAirport>): void {
  const a = out.find((x) => x.i === ident);
  if (!a) throw new Error(`Stichprobe fehlgeschlagen: ${ident} fehlt im Datensatz`);
  for (const [k, v] of Object.entries(expect)) {
    const got = a[k as keyof OutAirport];
    if (got !== v)
      throw new Error(
        `Stichprobe fehlgeschlagen: ${ident}.${k} = ${got}, erwartet ${v}`,
      );
  }
  console.log(`  ✓ ${ident}: p=${a.p} g=${a.g} u=${a.u} e=${a.e} ft`);
}
console.log("Stichprobenprüfung:");
check("EDRK", { p: 1175, e: 640 }); // Koblenz-Winningen: 1.175 m befestigt, 640 ft
check("EDRY", { p: 1677, g: 1000, e: 312 }); // Speyer: 1.677 m + 1.000 m Gras, 312 ft
check("EDDF", { p: 4000 }); // Frankfurt: 4.000 m

// --- Schreiben --------------------------------------------------------------
mkdirSync("public/data", { recursive: true });
const json = JSON.stringify(out);
writeFileSync(OUT, json);
const kb = Math.round(json.length / 1024);
console.log(`\n${out.length} Flugplätze → ${OUT} (${kb} KB)`);
if (kb > 600) throw new Error(`Datei zu groß: ${kb} KB > 600 KB`);
const de = out.filter((a) => a.c === "DE").length;
const mil = out.filter((a) => a.mi).length;
console.log(`davon Deutschland: ${de}, als militärisch gekennzeichnet: ${mil}`);
