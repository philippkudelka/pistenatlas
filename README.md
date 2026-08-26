# Pistenatlas SF50 × PC-12

**Live:** https://philippkudelka.github.io/pistenatlas/

Vergleicht für ~3.000 europäische Flugplätze, ob ihre Pisten für zwei
Flugzeugmuster reichen: **Cirrus SF50 Vision Jet** und **Pilatus PC-12 NGX** —
jeweils privat (NCC) und gewerblich (CAT), **je Beladungsfall**. Dazu
beladungsabhängige Reichweiten-Ringe ab jedem Platz und ein Routen-Duell
(Blockzeit, Verbrauch, CO₂ beider Muster aus einem Missionsmodell).

Eine Planungshilfe zur Vorauswahl für Standort- und Musterentscheidungen —
**keine Flugvorbereitung**.

## Leitprinzip: keine offene Variable

Jede Zahl, die in ein Ergebnis eingeht, ist (a) im UI sichtbar, (b) editierbar
oder bewusst fixiert, (c) mit Quelle etikettiert (`AFM` / `Werksangabe` /
`EASA` / `Schätzung`), und jedes Ergebnis benennt seinen Beladungsfall:

- **Alle Modellkonstanten** stehen in
  [`src/model/constants.ts`](src/model/constants.ts) als typisierte Objekte
  `{value, unit, source, editable}` — ein Unit-Test schlägt fehl, wenn ein
  Eintrag ohne Quelle existiert. Magic Numbers außerhalb dieses Moduls gibt
  es nicht.
- Das UI-Panel **„Annahmen“** rendert diese Liste live mit den aktuell
  wirksamen Werten (inkl. Nutzeränderungen) und Einzel-Reset.
- Jede Ergebnisanzeige (Hero-Zahl, Ring, Detailkarte, Routen-Duell) trägt
  eine Fußzeile mit dem aktiven Fall: Personen, Tankanteil, Flugregime,
  trocken/nass, Marge, Höhenzuschlag-Variante.

## Fachmodell

### Flugzeugdaten (Auszug; vollständig mit Quelle in `constants.ts` und im UI)

| | SF50 Vision Jet | PC-12 NGX |
|---|---|---|
| MTOM | 2.722 kg (AFM) | 4.740 kg (Werk) |
| Max. Landemasse | 2.517 kg (AFM) | 4.500 kg (Werk) |
| MZFW | 2.223 kg (Werk) | 4.100 kg (Werk) |
| Leermasse (editierbar) | 1.610 kg (Standardausstattung) | ~3.066 kg (abgeleitet) |
| Max. Kraftstoff | 907 kg / 296 US gal (AFM) | 1.226 kg / 402 US gal (Werk) |
| Start über 15 m (SL/ISA/MTOM) | **973 m (AFM)** — nicht die 858 m der Website | 758 m (Werk) |
| Landung über 15 m (max. LM) | 772 m (AFM) | 661 m (Werk) |
| Reise-TAS schnell / Sparflug | 311 / 240 KTAS | 285 / 220 KTAS |
| Verbrauch schnell / Sparflug | 65 / 40 gal/h (AFM-nah) | ~66 / ~41 gal/h (Schätzung, kalibriert) |
| Herstellerreichweite (Kalibrierziel) | 1.275 NM (2 P., voll, Sparflug) | 1.803 NM (4 P., voll, Sparflug) |
| Oberflächen | nur befestigt (AFM-Limitation) | auch Gras (×1,2 Start / ×1,15 Landung) |

### Beladungsmodell

Personen (SF50 1–7, PC-12 1–10) × 85 kg + 15 kg Gepäck (editierbar),
Tankanteil (Default „maximal möglich“ = MTOM-begrenzt). Daraus ZFW,
Kraftstoff, Startmasse; **harte MTOM-/MZFW-Prüfungen mit Fehlermeldung statt
stillem Clamping**. Presets: „2 P. voll“, „4 P. max. Tank“, „6 P. max. Tank“,
„frei“ (kompatibel zu den Referenz-Varianten V1–V4).

### Bahnbedarf (massen-, höhen- und betriebsartabhängig)

- Basisstrecken skalieren mit (Startmasse/MTOM)², Landung mit
  (Landemasse/max. Landemasse)². Landemasse-Abschätzung (dokumentiert in
  [`src/model/runway.ts`](src/model/runway.ts)): Startmasse minus
  Roll-/Steigflugkraftstoff, gedeckelt auf die max. Landemasse — Landung
  kurz nach dem Start als konservativer Fall.
- Höhenzuschlag je 1.000 ft Platzhöhe: Default +4 % (AFM-nah), Alternative
  +9 % (konservativ) — wählbar, Quelle je Option ausgewiesen.
- Gewerblich (CAT): SF50 Landung × 1,67 (nass 1,92; EASA CAT.POL.A.230);
  PC-12 Start × 1,25, Landung ≤ 70 % LDA, nass zusätzlich × 1,15
  (CAT.POL.A.305/330/335). Privat nass: Landung × 1,15 (Empfehlung).
- Marge-Slider 0–30 % multipliziert das Endergebnis.
- Urteil gegen die längste befestigte (bzw. Gras-)Bahn; **wo deklarierte
  Distanzen bekannt sind, gelten diese** —
  [`public/data/declared_distances.json`](public/data/declared_distances.json),
  belegtes Beispiel Speyer EDRY: 1.677 m gebaut, 1.400 m deklariert.

### Reichweite (Missionsmodell, kalibriert)

Rollen/Start + Steigflug (Kraftstoff und Strecke) + Reiseflug
(Sparflug/Schnellflug) + Reserve (45 min + Anflug bzw. NBAA-nah).
**Kalibrierpflicht als Unit-Test:** SF50 „2 Personen, voll, Sparflug“
= 1.275 NM ± 3 % (Ist: 1.266 NM); PC-12 „4 Personen, voll, Sparflug“
= 1.803 NM ± 3 % (Ist: 1.804 NM).

## Datenquellen

- **Flugplätze und Pisten:** [OurAirports](https://ourairports.com/data/)
  (Public Domain) — je Platz längste befestigte/unbefestigte/unbekannte Bahn,
  Platzhöhe (ft), Militär-Kennzeichnung per Namens-Heuristik (Filter im UI,
  Default: eingeschlossen mit Kennzeichnung).
- **Basiskarte:** [OpenFreeMap](https://openfreemap.org/) (key-los), Daten
  © OpenStreetMap-Mitwirkende; Fallback auf im Repo gehostete Grenzen.
- **Referenz-Beladungsmodell:** [`reference/`](reference/) (Excel + HTML der
  Vorab-Analyse; das Missionsmodell reproduziert deren Varianten V1–V4).

## Daten aktualisieren

```bash
npm run data
```

Lädt die aktuellen OurAirports-CSVs, prüft Stichproben (EDRK 1.175 m/640 ft,
EDRY 1.677 m + 1.000 m Gras/312 ft, EDDF 4.000 m — bei Abweichung Abbruch)
und schreibt `public/data/airports.json` (< 600 KB, eingecheckt). Danach
committen und pushen — das Deployment läuft automatisch.

## Entwicklung

```bash
npm install     # einmalig (Node ≥ 22.18)
npm run dev     # Dev-Server auf http://localhost:5173/pistenatlas/
npm test        # Vitest: Fachmodell, Kalibrierung, Klassifikation, Geodäsie
npm run build   # Produktions-Build nach dist/
```

Stack: Vite + TypeScript (Vanilla-Module, kein Framework), MapLibre GL JS.
Kein Backend, keine Logins, kein Tracking, keine API-Keys.

## Deployment

Jeder Push auf `main` baut, testet und veröffentlicht über GitHub Actions auf
GitHub Pages ([Workflow](.github/workflows/deploy.yml)); Pages-Quelle:
„GitHub Actions“. Der ursprüngliche Ein-Datei-Prototyp liegt archiviert unter
[`legacy/prototype.html`](legacy/prototype.html).
