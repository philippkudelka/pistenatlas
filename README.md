# Pistenatlas SF50 × PC-12

**Live:** https://philippkudelka.github.io/pistenatlas/

Vergleicht für ~3.000 europäische Flugplätze, ob ihre Pisten für zwei
Flugzeugmuster reichen: **Cirrus SF50 Vision Jet** und **Pilatus PC-12 NGX** —
jeweils privat (NCC) und gewerblich (CAT). Dazu Reichweiten-Ringe ab jedem
Platz und ein Routen-Duell (Blockzeit, Verbrauch, CO₂ beider Muster).

Eine Planungshilfe zur Vorauswahl für Standort- und Musterentscheidungen —
**keine Flugvorbereitung**.

## Rechengrundlage

Bahnbedarf für Meereshöhe, ISA, Windstille, trockene ebene Bahn, maximale
Masse; Strecken über ein 15-m-Hindernis:

| | SF50 | PC-12 NGX |
|---|---|---|
| Start | 973 m | 758 m |
| Landung | 772 m (MLM 2.517 kg) | 661 m |
| Bedarf **privat/NCC** (maßgeblich: Start) | ≥ 973 m | ≥ 758 m |
| Bedarf **gewerblich** (CAT) | ≥ 1.289 m | ≥ 948 m |
| Graspiste | nicht zulässig (AFM-Limitation) | privat ≥ 910 m, gewerblich ≥ 1.137 m |

Quellen: SF50 AFM P/N 31452-002 Rev. A1 (Section 2 Limitations, Section 5
Performance inkl. Factored Data, Faktor 1,67 = 60-%-Regel für Jets); Pilatus
PC-12 NGX Werksdaten; EASA Air OPS CAT.POL.A.100/230 (Jets) und
CAT.POL.A.305/330/335 (Klasse B: Start × 1,25, Landung ≤ 70 % LDA).

Weitere Konstanten: Reichweiten 1.275 / 1.803 NM (4 Pax, LRC), Reise-TAS
305 / 285 kt, Blockverbrauch 227 l/h (AFM-Ableitung) / ~245 l/h (Schätzung),
CO₂ 3,16 kg je kg Jet A-1 bei Dichte 0,80 kg/l. Alle Konstanten mit
Quellenkommentar in [`src/logic/constants.ts`](src/logic/constants.ts).

Die einstellbare **Sicherheitsmarge** (0–30 %) multipliziert alle Bahnbedarfe.
Unbekannter Pistenbelag zählt nur bei medium/large airports als befestigt.

## Datenquellen

- **Flugplätze und Pisten:** [OurAirports](https://ourairports.com/data/)
  (Public Domain). Je Platz wird die längste befestigte, unbefestigte und
  unbekannte Bahn berechnet. TORA/LDA können kürzer sein als die physische
  Bahnlänge; örtliche Jet-/PPR-Beschränkungen sind nicht enthalten.
- **Basiskarte:** [OpenFreeMap](https://openfreemap.org/) (key-los), Daten
  © OpenStreetMap-Mitwirkende. Ist OpenFreeMap nicht erreichbar, fällt die
  App auf im Repo gehostete Ländergrenzen zurück.

## Daten aktualisieren

```bash
npm run data
```

Lädt die aktuellen OurAirports-CSVs, filtert Europa, prüft Stichproben
(EDRK 1.175 m, EDRY 1.677 m + 1.000 m Gras, EDDF 4.000 m — bei Abweichung
Abbruch) und schreibt `public/data/airports.json`. Die Datei ist eingecheckt;
nach dem Refresh einfach committen und pushen — der Rest passiert automatisch.

## Entwicklung

```bash
npm install     # einmalig (Node ≥ 22.18)
npm run dev     # Dev-Server auf http://localhost:5173/pistenatlas/
npm test        # Vitest: Klassifikation + Großkreis-Berechnung
npm run build   # Produktions-Build nach dist/
```

Stack: Vite + TypeScript (Vanilla-Module, kein Framework), MapLibre GL JS.
Kein Backend, keine Logins, kein Tracking, keine API-Keys.

## Deployment

Jeder Push auf `main` baut und veröffentlicht automatisch über GitHub Actions
auf GitHub Pages ([Workflow](.github/workflows/deploy.yml)). Voraussetzung
(einmalig): In den Repo-Einstellungen unter **Settings → Pages → Source**
muss „GitHub Actions“ gewählt sein.

Der ursprüngliche Ein-Datei-Prototyp liegt archiviert unter
[`legacy/prototype.html`](legacy/prototype.html).
