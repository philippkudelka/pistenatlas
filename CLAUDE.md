# Pistenatlas — Projektkonventionen

## Was das ist

Karten-App: Pisteneignung europäischer Flugplätze für Cirrus SF50 und Pilatus
PC-12, privat und gewerblich. Zielgruppe: ein Investor (Nicht-Pilot) und
Luftfahrt-Fachleute. UI-Sprache ist Deutsch, deutsche Zahlformate
(`Intl.NumberFormat("de-DE")` via `src/app/format.ts`).

## Leitprinzip UX (nicht verhandelbar)

Eine sichtbare Frage, ein Bedienelement, ein dominantes Ergebnis: Szenario
wählen → eine große Zahl + Vergleichssatz. Alles Sekundäre ist eingeklappt
(`<details>`). Keine parallelen Modi, keine Dashboard-Überladung.

## Fachlogik — „keine offene Variable“ (hartes Prinzip)

- **ALLE Modellkonstanten** leben in `src/model/constants.ts` als
  `{value, unit, source, editable}` — Quellen: AFM / Werksangabe / EASA /
  Schätzung. Ein Unit-Test erzwingt die Quelle je Eintrag. Magic Numbers
  außerhalb dieses Moduls sind verboten; neue Zahlen IMMER dort eintragen.
- Das Annahmen-Panel (`src/ui/assumptions.ts`) rendert das Register live;
  editierbare Werte laufen über `state.overrides` und `val(key, overrides)`.
- Jede Ergebnisanzeige trägt eine Fall-Fußzeile (`caseLabel()` aus
  `src/app/compute.ts`). Neue Anzeigen ohne Fallangabe sind ein Regelverstoß.
- Fachmodell rein und getestet: `src/model/{loading,runway,mission,verdict}.ts`
  — Beladung (harte MTOM/MZFW-Fehler, kein Clamping), Bahnbedarf
  ((TOM/MTOM)², Höhenzuschlag, CAT/nass/Gras/Marge), Missionsreichweite.
- **Kalibriertests nicht anfassen:** SF50 2P/voll/Sparflug = 1.275 NM ± 3 %,
  PC-12 4P/voll/Sparflug = 1.803 NM ± 3 % (tests/model.test.ts). Wer
  Verbrauchs-/Reserve-Parameter ändert, muss die Kalibrierung halten.
- SF50 darf **nie** auf Gras (AFM-Limitation) — das ist keine Einstellung.
- SF50-Startstrecke ist der AFM-Wert 973 m, NICHT die 858 m der Website.
- Deklarierte Distanzen (`public/data/declared_distances.json`) schlagen die
  physische Pistenlänge; Einträge nur mit Quellenvermerk ergänzen.
- Kein Klarname des Investors irgendwo im Repo oder UI.

## Architektur

- `src/main.ts` lädt nur Daten + Panel/Intro (schneller First Paint).
  MapLibre hängt am **dynamic import** von `src/map/init.ts` — keine
  statischen Importe von `maplibre-gl` (auch nicht transitiv!) außerhalb von
  `src/map/`. UI-Module nehmen Farben aus `src/app/colors.ts`.
- Zustand zentral in `src/app/state.ts` (setState/subscribe), UI-Module
  reagieren auf `changed`-Sets.
- Basiskarte: OpenFreeMap „dark“, zur Laufzeit getintet
  (`src/map/basemap.ts`); Fallback auf `public/data/europe-borders.json`.
  Keine API-Keys, keine bezahlten Dienste einführen.

## Daten

- `public/data/airports.json` wird von `scripts/build-data.ts` erzeugt
  (`npm run data`) und **eingecheckt**. Format: kompakte Objekte
  `{i,n,la,lo,c,m,p,g,u,t,e,mi?}` — dokumentiert in `src/logic/types.ts`
  (e = Platzhöhe ft, mi = Militär-Heuristik).
- Die Stichprobenprüfung im Skript (EDRK/EDRY/EDDF inkl. Elevation) nicht
  entfernen; bei Abweichung bricht das Skript bewusst ab.
- Datei muss < 600 KB bleiben.

## Qualität

- `npm test` und `tsc --noEmit` müssen vor jedem Commit grün sein
  (der Build führt beides aus, CI ebenfalls).
- Lighthouse mobil: Performance und Accessibility ≥ 90 halten. Größte
  Hebel: Entry-Bundle klein halten, Fonts nicht render-blockierend,
  `prefers-reduced-motion` respektieren (alle Animationen sind in
  entsprechenden Media Queries).
- Base-Pfad `/pistenatlas/` (GitHub Pages) darf nicht verloren gehen —
  Daten-URLs immer über `import.meta.env.BASE_URL`.
