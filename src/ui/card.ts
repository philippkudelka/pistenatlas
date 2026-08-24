import { classify, effectivePaved } from "../logic/classify.ts";
import { COUNTRY_NAMES, REQ } from "../logic/constants.ts";
import type { Airport } from "../logic/types.ts";
import { esc, fmtMeters } from "../app/format.ts";
import { getState, setState } from "../app/state.ts";
import { COLORS } from "../map/layers.ts";

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
  const opt = { marginPct: s.marginPct, useGrass: s.useGrass };
  const v = classify(a, opt);
  const paved = effectivePaved(a);
  const factor = 1 + s.marginPct / 100;

  // Skala des Pistenbalkens: längste Bahn bzw. höchster Bedarf + Luft
  const maxLen = Math.max(2000, paved + 150, a.g + 150, 1450 * factor);
  const pct = (val: number) => Math.min(100, (val / maxLen) * 100);

  const ticks = (
    [
      ["S·G", REQ.sf50.cat.paved, COLORS.sf50, -8],
      ["S·P", REQ.sf50.priv.paved, COLORS.sf50, -8],
      ["P·G", REQ.pc12.cat.paved, COLORS.pc12, 4],
      ["P·P", REQ.pc12.priv.paved, COLORS.pc12, -8],
    ] as const
  )
    .map(
      ([label, val, color, dy]) =>
        `<div class="tick" style="left:${pct(val * factor)}%;background:${color}"><span style="color:${color};top:${dy}px">${label}</span></div>`,
    )
    .join("");

  const rows = (
    [
      ["SF50", "privat", v.sf50Priv, COLORS.sf50],
      ["SF50", "gewerbl.", v.sf50Cat, COLORS.sf50],
      ["PC-12", "privat", v.pc12Priv, COLORS.pc12],
      ["PC-12", "gewerbl.", v.pc12Cat, COLORS.pc12],
    ] as const
  )
    .map(
      ([ac, op, ok, color]) =>
        `<div class="mrow" style="border-left:3px solid ${color}"><span class="w">${op}<em>${ac}</em></span><span class="pill ${ok ? "ok" : "no"}">${ok ? "NUTZBAR" : "ZU KURZ"}</span></div>`,
    )
    .join("");

  document.getElementById("cardC")!.innerHTML = `<h2>${esc(a.n)}</h2>
  <div class="icao"><b>${esc(a.i)}</b> · ${a.m ? `${esc(a.m)} · ` : ""}${COUNTRY_NAMES[a.c] ?? a.c}</div>
  <div class="rwviz"><div class="scale">
    ${paved ? `<div class="rw pav" style="width:${pct(paved)}%"></div>` : ""}
    ${a.g ? `<div class="rw grs" style="width:${pct(a.g)}%"></div>` : ""}
    ${ticks}</div>
  <div class="len"><span>Befestigt ${fmtMeters(paved)}${a.g ? ` · Gras ${fmtMeters(a.g)}` : ""}</span><span>${s.marginPct ? `Marge +${s.marginPct} %` : ""}</span></div></div>
  <div class="mtx">${rows}</div>
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

/** Karte neu zeichnen (z. B. nach Margen-Änderung), falls offen. */
export function refreshCard(): void {
  const s = getState();
  if (s.selected && card().classList.contains("open")) {
    const left = parseFloat(card().style.left) || innerWidth / 2;
    const top = parseFloat(card().style.top) || innerHeight / 2;
    showCard(s.selected, left, top + 40);
  }
}
