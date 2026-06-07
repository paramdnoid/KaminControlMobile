# KaminControlMobile

Expo/React-Native V1 fuer digitale Kaminfeger-Rapporte vor Ort.

## Umfang V1

- Lokale Offline-App ohne Login, Backend oder Genesis-Synchronisation.
- CSV/XLSX-Import fuer Kunden- und Liegenschaftsstammdaten.
- Genesis-Import ueber einen lokalen Desktop-Converter: `Daten.zip` wird auf dem Desktop in `genesis-export-v2.json` umgewandelt.
- Suche nach Kundennummer, Adresse, Ort und Kontaktrollen.
- Read-only Genesis-Kontext pro Liegenschaft: Anlagen, geplante Arbeiten und Historie.
- Rapport-Erfassung mit Datum, Uhrzeit, Bemerkungen, Kaminfegername und beliebig vielen Leistungspositionen.
- Geplante Genesis-Arbeiten koennen im Rapport-Wizard als Positionen uebernommen werden.
- Autosave in `expo-sqlite`.
- PDF-Erzeugung und Teilen abgeschlossener Rapporte.
- Strukturierte JSON-Ansicht pro abgeschlossenem Rapport als Basis fuer einen spaeteren Genesis-Export.

## Voraussetzungen

- Node.js 20 LTS oder neuer und npm.
- Expo Go auf dem Testgeraet oder ein Simulator/Emulator.
- iOS-Builds benoetigen Xcode (macOS), Android-Builds Android Studio.

## Start

```bash
npm install
npm start
```

Plattform-Targets:

```bash
npm run android
npm run ios
npm run web
```

Typpruefung und Lint:

```bash
npm run typecheck
npm run lint
npm run lint:fix
```

## Claude / Quality Gates

Claude-Konfiguration und Hooks pruefen:

```bash
npm run claude:validate-settings
```

Dependency-freier Expo-Web-Smoke:

```bash
npm run smoke:web
```

Der Web-Smoke exportiert nur nach `.claude/tmp/expo-web-smoke` und erzeugt keine zu commitenden Artefakte.

## Genesis-Converter

Der Genesis-Export besteht aus Access/MDB-Dateien und wird bewusst nicht direkt auf iOS/Android gelesen. Stattdessen erzeugt die Desktop-App ein mobiles JSON-Bundle.

Desktop-Converter starten:

```bash
npm run converter:start
```

CLI-Konvertierung fuer Tests:

```bash
npm run converter:convert -- <pfad/zu/Daten.zip> <pfad/zu/genesis-export-v2.json>
```

Mapping-Tests:

```bash
npm run converter:test
```

Das erzeugte `genesis-export-v2.json` (oder ein `genesis-mobile-export.zip`-Bundle inkl. PDFs) wird in der Mobile-App auf dem Import-Screen ueber `Genesis-Bundle wählen` importiert. `Daten.zip`, `.MDB`-Dateien und erzeugte Bundles sind gitignored.

## Import

Eine Beispielvorlage liegt unter `sample/import-template.csv`.

Wichtige Spalten:

- `Kundennummer`
- `Liegenschaft`
- `Strasse`
- `PLZ`
- `Ort`
- `Gebaeudeart`
- `Eigentuemer`, `Mieter`, `Verwaltung`, `Hauswart`
- `Rechnungsadresse ist`, `Avisierungsadresse ist`
- `Brennstoff`
- `Feuerungsanlagen`
- `Oelheizung Kessel`, `kWh`, `Baujahr`, `Tour`
- `Reinigung Monate`

## Genesis

Die App speichert Rapporte bewusst lokal und erzeugt PDF plus strukturierte Daten. Eine direkte Genesis-/GenesisMobile-Synchronisation ist nicht enthalten. V1 nutzt den Datenfluss `Genesis -> Desktop-Converter -> Mobile-App -> PDF/JSON-Rapport`.
