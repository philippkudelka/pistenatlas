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

## Fachlogik

- Alle Bahnbedarfe/Leistungsdaten sind **dokumentierte Konstanten mit
  Quellenkommentar** in `src/logic/constants.ts`. Nie Zahlen inline
  hartcodieren; nie Werte ändern ohne Quellenangabe im Kommentar.
- Klassifikation (`src/logic/classify.ts`) und Geodäsie (`src/logic/geo.ts`)
  sind reine Funktionen ohne DOM/Map-Abhängigkeit und vollständig getestet
  (`tests/`). Änderungen an der Fachlogik brauchen Tests, besonders
  Grenzwerte exakt auf der Schwelle.
- SF50 darf **nie** auf Gras (AFM-Limitation) — das ist keine Einstellung.

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
  `{i,n,la,lo,c,m,p,g,u,t}` — dokumentiert in `src/logic/types.ts`.
- Die Stichprobenprüfung im Skript (EDRK/EDRY/EDDF) nicht entfernen; bei
  Abweichung bricht das Skript bewusst ab.
- Datei muss < 500 KB bleiben.

## Qualität

- `npm test` und `tsc --noEmit` müssen vor jedem Commit grün sein
  (der Build führt beides aus, CI ebenfalls).
- Lighthouse mobil: Performance und Accessibility ≥ 90 halten. Größte
  Hebel: Entry-Bundle klein halten, Fonts nicht render-blockierend,
  `prefers-reduced-motion` respektieren (alle Animationen sind in
  entsprechenden Media Queries).
- Base-Pfad `/pistenatlas/` (GitHub Pages) darf nicht verloren gehen —
  Daten-URLs immer über `import.meta.env.BASE_URL`.
