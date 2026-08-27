/**
 * Annahmen-Panel: rendert ALLE Modellkonstanten live mit den aktuell wirksamen
 * Werten (inkl. Nutzeränderungen), Quelle je Wert, editierbare Werte als
 * Eingabefeld mit Einzel-Reset.
 */
import {
  CONSTANTS,
  val,
  type ConstantKey,
  type ModelConstant,
} from "../model/constants.ts";
import { getState, setState, subscribe } from "../app/state.ts";
import { esc } from "../app/format.ts";

const numFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 });

/** Gruppen-Überschriften für die Lesbarkeit; Label-Präfixe werden gekürzt. */
const GROUPS: Array<[string, (key: string) => boolean, string]> = [
  ["Cirrus SF50 Vision Jet", (k) => k.startsWith("sf50."), "SF50 · "],
  ["Pilatus PC-12 NGX", (k) => k.startsWith("pc12."), "PC-12 · "],
  ["Beladung, Bahnbedarf & Routen", (k) => k.startsWith("shared."), ""],
];

function render(): void {
  const list = document.getElementById("assumeList")!;
  const overrides = getState().overrides;
  const rows: string[] = [];
  for (const [title, match, strip] of GROUPS) {
    rows.push(
      `<div class="lbl" style="margin:12px 0 2px">${title}</div>`,
    );
    for (const key of (Object.keys(CONSTANTS) as ConstantKey[]).filter(match))
      rows.push(row(key, strip, overrides));
  }
  list.innerHTML = rows.join("");
  wire(list);
}

function row(
  key: ConstantKey,
  strip: string,
  overrides: ReturnType<typeof getState>["overrides"],
): string {
  const c: ModelConstant = CONSTANTS[key];
  const label = c.label.startsWith(strip) ? c.label.slice(strip.length) : c.label;
  const effective = val(key, overrides);
  const changed = overrides[key] !== undefined;
  const value = c.editable
    ? `<input type="number" step="any" data-key="${key}" value="${effective}" aria-label="${esc(c.label)}"
         style="width:76px;padding:2px 4px;font-size:11px;text-align:right;color:var(--pc12)">` +
      (changed
        ? `<button data-reset="${key}" title="Zurücksetzen auf ${numFmt.format(c.value)}" aria-label="${esc(c.label)} zurücksetzen" style="border:0;background:none;color:#F2C14E;cursor:pointer">↺</button>`
        : "")
    : `<span class="mono" style="font-size:11px">${numFmt.format(effective)}</span>`;
  return `<div style="display:flex;align-items:baseline;gap:6px;padding:3px 0;border-bottom:1px solid var(--edge);font-size:11px">
      <span style="flex:1;color:${changed ? "var(--ink)" : "var(--mut)"}">${esc(label)}${c.note ? ` <span style="color:var(--dim)" title="${esc(c.note)}">ⓘ</span>` : ""}</span>
      ${value}
      <span class="mono" style="color:var(--dim);font-size:10px;width:56px">${esc(c.unit)}</span>
      <span style="font-size:9px;font-weight:700;letter-spacing:.05em;color:${c.source === "Schätzung" ? "var(--bad)" : "var(--dim)"};width:70px;text-align:right">${c.source}</span>
    </div>`;
}

function wire(list: HTMLElement): void {
  list.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((inp) =>
    inp.addEventListener("change", () => {
      const key = inp.dataset["key"] as ConstantKey;
      const n = Number(inp.value);
      if (!Number.isFinite(n)) return;
      const next = { ...getState().overrides };
      if (n === CONSTANTS[key].value) delete next[key];
      else next[key] = n;
      setState({ overrides: next });
    }),
  );
  list.querySelectorAll<HTMLButtonElement>("button[data-reset]").forEach((b) =>
    b.addEventListener("click", () => {
      const next = { ...getState().overrides };
      delete next[b.dataset["reset"] as ConstantKey];
      setState({ overrides: next });
    }),
  );
}

export function initAssumptions(): void {
  const details = document.getElementById("assumeD") as HTMLDetailsElement;
  details.addEventListener("toggle", () => {
    if (details.open) render();
  });
  subscribe((_s, changed) => {
    if (changed.has("overrides") && details.open) render();
  });
}
