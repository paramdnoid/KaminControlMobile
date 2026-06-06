# KaminControlMobile

Expo/React-Native V1 fuer digitale Kaminfeger-Rapporte vor Ort.

## Umfang V1

- Lokale Offline-App ohne Login, Backend oder Genesis-Synchronisation.
- CSV/XLSX-Import fuer Kunden- und Liegenschaftsstammdaten.
- Suche nach Kundennummer, Adresse, Ort und Kontaktrollen.
- Rapport-Erfassung mit Datum, Uhrzeit, Bemerkungen, Kaminfegername und beliebig vielen Leistungspositionen.
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

Die App speichert Rapporte bewusst lokal und erzeugt PDF plus strukturierte Daten. Eine direkte Genesis-/GenesisMobile-Anbindung ist nicht enthalten und sollte erst umgesetzt werden, wenn ein belastbares Importformat oder eine dokumentierte Schnittstelle vorliegt.
