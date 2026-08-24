import {
  classify,
  counterpartKey,
  SCENARIOS,
  type ScenarioId,
} from "../logic/classify.ts";
import { COUNTRY_NAMES } from "../logic/constants.ts";
import type { Airport, Verdict } from "../logic/types.ts";
import { fmtInt } from "../app/format.ts";
import { getState, setState, subscribe, type AppState } from "../app/state.ts";
import { COLORS } from "../app/colors.ts";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/** Zwischengespeicherte Urteile für den aktuellen Optionsstand. */
let verdicts: Verdict[] = [];
let verdictKey = "";
function ensureVerdicts(airports: Airport[], s: AppState): Verdict[] {
  const key = `${s.marginPct}|${s.useGrass}`;
  if (key !== verdictKey) {
    const opt = { marginPct: s.marginPct, useGrass: s.useGrass };
    verdicts = airports.map((a) => classify(a, opt));
    verdictKey = key;
  }
  return verdicts;
}

/* animierter Zähler */
let tweenFrom = 0;
let tweenRaf = 0;
function tween(elem: HTMLElement, target: number): void {
  cancelAnimationFrame(tweenRaf);
  if (reducedMotion) {
    tweenFrom = target;
    elem.textContent = fmtInt(target);
    return;
  }
  const from = tweenFrom;
  const t0 = performance.now();
  const step = (now: number) => {
    const u = Math.min(1, (now - t0) / 500);
    const e = 1 - (1 - u) ** 3;
    elem.textContent = fmtInt(Math.round(from + (target - from) * e));
    if (u < 1) tweenRaf = requestAnimationFrame(step);
  };
  tweenRaf = requestAnimationFrame(step);
  tweenFrom = target;
}

function updateHero(airports: Airport[], s: AppState): void {
  const v = ensureVerdicts(airports, s);
  const meta = SCENARIOS[s.scenario];
  const isSf = meta.ac === "sf50";
  const otherKey = counterpartKey(s.scenario);
  let nSelf = 0;
  let nOther = 0;
  let dSelf = 0;
  let dOther = 0;
  for (let i = 0; i < airports.length; i++) {
    const a = airports[i]!;
    if (s.country && a.c !== s.country) continue;
    const verdict = v[i]!;
    if (verdict[meta.key]) {
      nSelf++;
      if (a.c === "DE") dSelf++;
    }
    if (verdict[otherKey]) {
      nOther++;
      if (a.c === "DE") dOther++;
    }
  }
  const where = s.country ? (COUNTRY_NAMES[s.country] ?? s.country) : "Europa";
  const acColor = isSf ? COLORS.sf50 : COLORS.pc12;
  const acName = isSf ? "SF50" : "PC-12";
  const op = meta.op === "priv" ? "privat" : "gewerblich";
  tween(el("hNum"), nSelf);
  const deSuffix =
    !s.country || s.country === "DE"
      ? ` · davon <b class="mono">${fmtInt(dSelf)}</b> in Deutschland`
      : "";
  el("hTxt").innerHTML =
    `Flugplätze in ${where} kann ${isSf ? "der" : "die"} <b style="color:${acColor}">${acName}</b> ${op} nutzen${deSuffix}`;
  const diff = nOther - nSelf;
  el("hCmp").innerHTML = isSf
    ? diff > 0
      ? `Zum Vergleich: die <b style="color:${COLORS.pc12}">PC-12</b> käme ${op} auf <b>${fmtInt(nOther)}</b> Plätze (+${fmtInt(diff)}${!s.country || s.country === "DE" ? `, in DE +${fmtInt(dOther - dSelf)}` : ""}) — die blauen Punkte zeigen, wo nur sie hinkommt.`
      : `Die PC-12 käme ${op} auf ${fmtInt(nOther)} Plätze.`
    : `Zum Vergleich: der <b style="color:${COLORS.sf50}">SF50</b> käme ${op} nur auf <b>${fmtInt(nOther)}</b> Plätze (${fmtInt(diff)})${!s.country || s.country === "DE" ? `, in Deutschland <b>${fmtInt(dOther)}</b> statt ${fmtInt(dSelf)}` : ""}.`;
}

function updateLegend(s: AppState): void {
  const meta = SCENARIOS[s.scenario];
  const isSf = meta.ac === "sf50";
  const op = meta.op === "priv" ? "privat" : "gewerblich";
  el("legend").innerHTML =
    `<div class="lt">Legende</div>` +
    `<span class="dot" style="color:${COLORS.ok};background:${COLORS.ok}" aria-hidden="true"></span>Piste reicht: <b style="color:var(--ink)">${meta.label}</b>` +
    (isSf
      ? `<br><span class="dot" style="color:${COLORS.alt};background:${COLORS.alt}" aria-hidden="true"></span>nur PC-12 käme hin (${op})`
      : "") +
    `<br><span class="dot" style="color:${COLORS.none};background:${COLORS.none};box-shadow:none" aria-hidden="true"></span>für beide zu kurz` +
    `<div class="hint">Punkt anklicken → Details, Reichweite &amp; Routen-Duell · ? oben rechts erklärt die Karte</div>`;
}

function updateRank(airports: Airport[], s: AppState): void {
  const details = el<HTMLDetailsElement>("rankD");
  if (!details.open) return;
  const v = ensureVerdicts(airports, s);
  const priv = SCENARIOS[s.scenario].op === "priv";
  const sfKey: keyof Verdict = priv ? "sf50Priv" : "sf50Cat";
  const pcKey: keyof Verdict = priv ? "pc12Priv" : "pc12Cat";
  const by = new Map<string, { sf: number; pc: number }>();
  for (let i = 0; i < airports.length; i++) {
    const a = airports[i]!;
    if (s.country && a.c !== s.country) continue;
    let e = by.get(a.c);
    if (!e) {
      e = { sf: 0, pc: 0 };
      by.set(a.c, e);
    }
    if (v[i]![sfKey]) e.sf++;
    if (v[i]![pcKey]) e.pc++;
  }
  const top = [...by.entries()].sort((x, y) => y[1].pc - x[1].pc).slice(0, 12);
  const mx = Math.max(...top.map(([, e]) => e.pc), 1);
  el("rank").innerHTML =
    `<div style="font-size:9.5px;color:var(--dim);margin-bottom:2px">je Land: <span style="color:${COLORS.sf50}">SF50</span> / <span style="color:${COLORS.pc12}">PC-12</span> (${priv ? "privat" : "gewerblich"})</div>` +
    top
      .map(
        ([c, e]) =>
          `<div class="rrow"><div class="hd"><b>${COUNTRY_NAMES[c] ?? c}</b><span class="mono">${fmtInt(e.sf)} / ${fmtInt(e.pc)}</span></div>` +
          `<div class="bars"><div class="bar"><i style="width:${(e.sf / mx) * 100}%;background:${COLORS.sf50}"></i></div>` +
          `<div class="bar"><i style="width:${(e.pc / mx) * 100}%;background:${COLORS.pc12}"></i></div></div></div>`,
      )
      .join("");
}

export function initPanel(airports: Airport[]): void {
  el("subline").textContent =
    `Wer kann wo starten und landen? ${fmtInt(airports.length)} europäische Flugplätze gegen den Bahnbedarf beider Muster — privat und gewerblich.`;

  // Szenario-Buttons
  const views = el("views");
  views.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      views
        .querySelectorAll("button")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      setState({ scenario: Number(b.dataset["v"]) as ScenarioId });
    }),
  );

  // Filter
  const marginInput = el<HTMLInputElement>("margin");
  marginInput.addEventListener("input", () => {
    el("marginV").textContent = `+${marginInput.value}%`;
    setState({ marginPct: Number(marginInput.value) });
  });
  el<HTMLInputElement>("grass").addEventListener("change", (e) =>
    setState({ useGrass: (e.target as HTMLInputElement).checked }),
  );
  const countrySel = el<HTMLSelectElement>("country");
  [...new Set(airports.map((a) => a.c))]
    .sort((a, b) =>
      (COUNTRY_NAMES[a] ?? a).localeCompare(COUNTRY_NAMES[b] ?? b, "de"),
    )
    .forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = COUNTRY_NAMES[c] ?? c;
      countrySel.appendChild(o);
    });
  countrySel.addEventListener("change", () =>
    setState({ country: countrySel.value }),
  );

  el<HTMLDetailsElement>("rankD").addEventListener("toggle", () =>
    updateRank(airports, getState()),
  );

  // Mobile: Panel ein-/ausblenden
  const toggle = el("toggle");
  toggle.addEventListener("click", () => {
    const open = el("panel").classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  subscribe((s, changed) => {
    if (
      changed.has("scenario") ||
      changed.has("marginPct") ||
      changed.has("useGrass") ||
      changed.has("country")
    ) {
      updateHero(airports, s);
      updateLegend(s);
      updateRank(airports, s);
    }
  });

  updateHero(airports, getState());
  updateLegend(getState());
}
