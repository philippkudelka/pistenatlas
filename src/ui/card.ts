import { classifyAirport, effectivePaved } from "../model/verdict.ts";
import { requiredRunway } from "../model/runway.ts";
import { COUNTRY_NAMES } from "../app/countries.ts";
import type { Airport } from "../logic/types.ts";
import { esc, fmtInt, fmtMeters } from "../app/format.ts";
import {
  caseLabel,
  getDeclaredDistances,
  loads,
  verdictContext,
} from "../app/compute.ts";
import { getState, setState } from "../app/state.ts";
import { COLORS } from "../app/colors.ts";

const card = () => document.getElementById("card")!;

export interface CardActions {
  onRings: (a: Airport) => void;
  onRouteStart: (a: Airport) => void;
}

let actions: CardActions = { onRings: () => {}, onRouteStart: () => {} };

export function initCard(a: CardActions): void {
  actions = a;
  document.getElementById("cx")!.addEventListener("click", closeCard);
}

export function closeCard(): void {
  card().classList.remove("open");
  setState({ selected: null });
}

/** Detailkarte an Bildschirmposition (px, py) anzeigen. */
export function showCard(a: Airport, px: number, py: number): void {
  const s = getState();
  const ctx = verdictContext(s);
  const v = classifyAirport(a, ctx);
  const l = loads(s);
  const declared = getDeclaredDistances();
  const declaredM = declared[a.i];
  const paved = effectivePaved(a, declared);
  const physicalPaved = Math.max(a.p, a.t !== "s" ? a.u : 0);

  // Bedarfs-Markierungen für den AKTIVEN Fall (befestigte Bahn, mit Platzhöhe)
  const req = (ac: "sf50" | "pc12", cat: boolean): number | null => {
    const load = l[ac];
    if (!load.ok) return null;
    return requiredRunway(
      ac,
      load.tom,
      a.e,
      { cat, wet: s.wet, marginPct: s.marginPct, altMode: s.altMode },
      "paved",
      s.overrides,
    ).reqM;
  };
  const marks: Array<[string, number | null, string, number]> = [
    ["S·G", req("sf50", true), COLORS.sf50, -8],
    ["S·P", req("sf50", false), COLORS.sf50, -8],
    ["P·G", req("pc12", true), COLORS.pc12, 4],
    ["P·P", req("pc12", false), COLORS.pc12, -8],
  ];

  const maxLen = Math.max(
    2000,
    paved + 150,
    a.g + 150,
    ...marks.map(([, m]) => (m ?? 0) + 100),
  );
  const pct = (valM: number) => Math.min(100, (valM / maxLen) * 100);
  const ticks = marks
    .filter(([, m]) => m !== null)
    .map(
      ([label, m, color, dy]) =>
        `<div class="tick" style="left:${pct(m!)}%;background:${color}"><span style="color:${color};top:${dy}px">${label}</span></div>`,
    )
    .join("");

  const rows = (
    [
      ["SF50", "privat", v.sf50Priv, COLORS.sf50, l.sf50.ok],
      ["SF50", "gewerbl.", v.sf50Cat, COLORS.sf50, l.sf50.ok],
      ["PC-12", "privat", v.pc12Priv, COLORS.pc12, l.pc12.ok],
      ["PC-12", "gewerbl.", v.pc12Cat, COLORS.pc12, l.pc12.ok],
    ] as const
  )
    .map(
      ([ac, op, ok, color, loadOk]) =>
        `<div class="mrow" style="border-left:3px solid ${color}"><span class="w">${op}<em>${ac}</em></span><span class="pill ${ok ? "ok" : "no"}">${!loadOk ? "BELADUNG!" : ok ? "NUTZBAR" : "ZU KURZ"}</span></div>`,
    )
    .join("");

  const lengthLine = declaredM !== undefined
    ? `Deklariert (TORA/LDA) <b>${fmtMeters(declaredM)}</b> · gebaut ${fmtMeters(physicalPaved)}`
    : `Befestigt ${fmtMeters(paved)}`;

  document.getElementById("cardC")!.innerHTML = `<h2>${esc(a.n)}${a.mi ? ` <span class="pill no" style="vertical-align:2px">MIL</span>` : ""}</h2>
  <div class="icao"><b>${esc(a.i)}</b> · ${a.m ? `${esc(a.m)} · ` : ""}${COUNTRY_NAMES[a.c] ?? a.c} · ${fmtInt(a.e)} ft</div>
  <div class="rwviz"><div class="scale">
    ${paved ? `<div class="rw pav" style="width:${pct(paved)}%"></div>` : ""}
    ${a.g ? `<div class="rw grs" style="width:${pct(a.g)}%"></div>` : ""}
    ${ticks}</div>
  <div class="len"><span>${lengthLine}${a.g ? ` · Gras ${fmtMeters(a.g)}` : ""}</span></div></div>
  <div class="mtx">${rows}</div>
  <p class="note" style="margin-top:8px">Fall: ${caseLabel(s)} · Markierungen = Bahnbedarf auf ${fmtInt(a.e)} ft${declaredM === undefined ? " · TORA/LDA können kürzer sein als die gebaute Bahn (AIP prüfen)" : ""}</p>
  <div class="acts">
    <button id="bRing">◎ Reichweite ab hier</button>
    <button id="bRoute" class="hot">➔ Routen-Duell</button>
  </div>`;

  const el = card();
  el.classList.add("open");
  const cw = 340;
  const ch = el.offsetHeight || 330;
  const panelEdge = innerWidth > 760 ? 360 : 12;
  el.style.left = `${Math.max(panelEdge, Math.min(px + 16, innerWidth - cw - 12))}px`;
  el.style.top = `${Math.max(12, Math.min(py - 40, innerHeight - ch - 12))}px`;

  document.getElementById("bRing")!.addEventListener("click", () => actions.onRings(a));
  document.getElementById("bRoute")!.addEventListener("click", () => actions.onRouteStart(a));
}

/** Karte neu zeichnen (z. B. nach Modell-Änderung), falls offen. */
export function refreshCard(): void {
  const s = getState();
  if (s.selected && card().classList.contains("open")) {
    const left = parseFloat(card().style.left) || innerWidth / 2;
    const top = parseFloat(card().style.top) || innerHeight / 2;
    showCard(s.selected, left, top + 40);
  }
}
