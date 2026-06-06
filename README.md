# KaminControlMobile

Expo/React-Native V1 fuer digitale Kaminfeger-Rapporte vor Ort.

## Umfang V1

- Lokale Offline-App ohne Login, Backend oder Genesis-Synchronisation.
- CSV/XLSX-Import fuer Kunden- und Liegenschaftsstammdaten.
- Genesis-Import ueber einen lokalen Desktop-Converter: `Daten.zip` wird auf dem Desktop in `genesis-export-v1.json` umgewandelt.
- Suche nach Kundennummer, Adresse, Ort und Kontaktrollen.
- Read-only Genesis-Kontext pro Liegenschaft: Anlagen, geplante Arbeiten und Historie.
- Rapport-Erfassung mit Datum, Uhrzeit, Bemerkungen, Kaminfegername und beliebig vielen Leistungspositionen.
- Geplante Genesis-Arbeiten koennen im Rapport-Wizard als Positionen uebernommen werden.
- Autosave in `expo-sqlite`.
- PDF-Erzeugung und Teilen abgeschlossener Rapporte.
- Strukturierte JSON-Ansicht pro abgeschlossenem Rapport als Basis fuer einen spaeteren Genesis-Export.

## Start

```bash
npm install
npm start
```

Web-Vorschau:

```bash
npm run web
```

Typpruefung:

```bash
npm run typecheck
```

## Genesis-Converter

Der Genesis-Export besteht aus Access/MDB-Dateien und wird bewusst nicht direkt auf iOS/Android gelesen. Stattdessen erzeugt die Desktop-App ein mobiles JSON-Bundle.

Desktop-Converter starten:

```bash
npm run converter:start
```

CLI-Konvertierung fuer Tests:

```bash
npm run converter:convert -- /Users/andre/Desktop/Daten.zip /tmp/genesis-export-v1.json
```

Mapping-Tests:

```bash
npm run converter:test
```

Das erzeugte `genesis-export-v1.json` wird in der Mobile-App auf dem Import-Screen ueber `Genesis-Bundle wählen` importiert. `Daten.zip`, `.MDB`-Dateien und erzeugte Bundles sind gitignored.

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
