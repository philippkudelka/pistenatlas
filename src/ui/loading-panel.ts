/** Beladungszeile + Beladungspanel: der aktive Fall, sichtbar und editierbar. */
import { activeRangeNm, loads } from "../app/compute.ts";
import { fmtInt } from "../app/format.ts";
import { getState, setState, subscribe, modelChanged } from "../app/state.ts";
import { COLORS } from "../app/colors.ts";

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const PRESETS: Record<string, { persons: number; tankMode: "max" | "fraction"; tankFraction: number }> = {
  v2: { persons: 2, tankMode: "max", tankFraction: 1 }, // 2 Personen, voll (Referenz V2)
  v3: { persons: 4, tankMode: "max", tankFraction: 1 }, // 4 Personen, max. Tank (V3)
  v4: { persons: 6, tankMode: "max", tankFraction: 1 }, // 6 Personen, max. Tank (V4)
};

function updateView(): void {
  const s = getState();
  const l = loads(s);

  // Chips in der Summary-Zeile — der vollständige aktive Fall auf einen Blick
  const tankChip =
    s.tankMode === "max" ? "max. Tank" : `Tank ${Math.round(s.tankFraction * 100)} %`;
  // Personenzahl steht als eigener Regler direkt darüber — hier nicht doppeln
  const chips: Array<[string, boolean]> = [
    [tankChip, false],
    [s.regime === "lrc" ? "Sparflug" : "Schnellflug", false],
    [s.wet ? "nass" : "trocken", s.wet],
  ];
  if (s.marginPct) chips.push([`Marge +${s.marginPct} %`, false]);
  if (s.altMode === "conservative") chips.push(["Höhe +9 %", false]);
  if (!l.sf50.ok || !l.pc12.ok) chips.push(["Beladung prüfen!", true]);
  el("loadChips").innerHTML = chips
    .map(([t, warn]) => `<span${warn ? ' class="warn"' : ""}>${t}</span>`)
    .join("");

  el("personsV").textContent = String(s.persons);
  el<HTMLInputElement>("tank").disabled = s.tankMode === "max";
  el("tankV").textContent =
    s.tankMode === "max" ? "max" : `${Math.round(s.tankFraction * 100)}%`;
  el("regLrc").setAttribute("aria-pressed", String(s.regime === "lrc"));
  el("regFast").setAttribute("aria-pressed", String(s.regime === "fast"));

  // Ergebniszeile je Muster: Startmasse, Tank, Reichweite bzw. Fehler
  const line = (ac: "sf50" | "pc12"): string => {
    const load = l[ac];
    const color = ac === "sf50" ? COLORS.sf50 : COLORS.pc12;
    const name = ac === "sf50" ? "SF50" : "PC-12";
    if (!load.ok)
      return `<span style="color:${color}">${name}</span>: <span style="color:var(--bad)">${load.errors[0] ?? "ungültig"}</span>`;
    const nm = activeRangeNm(s, ac);
    return `<span style="color:${color}">${name}</span>: Startmasse ${fmtInt(Math.round(load.tom))} kg · Tank ${Math.round(load.tankPct * 100)} % (${fmtInt(Math.round(load.fuelKg))} kg) · Reichweite ${nm === null ? "—" : `${fmtInt(nm)} NM`}`;
  };
  el("loadInfo").innerHTML = `${line("sf50")}<br>${line("pc12")}`;

  // Preset-Chips markieren
  document
    .querySelectorAll<HTMLButtonElement>("#loadPresets button")
    .forEach((b) => {
      const p = PRESETS[b.dataset["preset"] ?? ""];
      const active = p
        ? s.persons === p.persons && s.tankMode === p.tankMode
        : s.tankMode === "fraction";
      b.style.borderStyle = active ? "solid" : "dashed";
      b.style.color = active ? "var(--ink)" : "";
    });
}

export function initLoadingPanel(): void {
  document
    .querySelectorAll<HTMLButtonElement>("#loadPresets button")
    .forEach((b) =>
      b.addEventListener("click", () => {
        const key = b.dataset["preset"]!;
        if (key === "free") {
          setState({ tankMode: "fraction", tankFraction: 1 });
        } else {
          const p = PRESETS[key]!;
          setState(p);
        }
      }),
    );

  const persons = el<HTMLInputElement>("persons");
  persons.addEventListener("input", () =>
    setState({ persons: Number(persons.value) }),
  );

  const tank = el<HTMLInputElement>("tank");
  tank.addEventListener("input", () =>
    setState({ tankMode: "fraction", tankFraction: Number(tank.value) / 100 }),
  );
  const tankMax = el<HTMLInputElement>("tankMax");
  tankMax.addEventListener("change", () =>
    setState({ tankMode: tankMax.checked ? "max" : "fraction" }),
  );

  el("regLrc").addEventListener("click", () => setState({ regime: "lrc" }));
  el("regFast").addEventListener("click", () => setState({ regime: "fast" }));
  const wet = el<HTMLInputElement>("wet");
  wet.addEventListener("change", () => setState({ wet: wet.checked }));
  const altMode = el<HTMLSelectElement>("altMode");
  altMode.addEventListener("change", () =>
    setState({ altMode: altMode.value as "afm" | "conservative" }),
  );

  subscribe((s, changed) => {
    if (modelChanged(changed) || changed.has("regime")) {
      // Regler mit Zustand synchron halten (Presets ändern mehrere Werte)
      persons.value = String(s.persons);
      tankMax.checked = s.tankMode === "max";
      if (s.tankMode === "fraction")
        tank.value = String(Math.round(s.tankFraction * 100));
      updateView();
    }
  });
  updateView();
}
