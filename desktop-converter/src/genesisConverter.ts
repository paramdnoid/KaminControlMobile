import { readFile } from 'node:fs/promises';
import path from 'node:path';

import JSZip from 'jszip';
import MDBReader from 'mdb-reader';

import type {
  AddressRole,
  BuildingType,
  CleaningMonth,
  FireSystemCode,
  FuelType,
  GenesisBundleHistoryEntry,
  GenesisBundleInstallation,
  GenesisBundlePlannedWork,
  GenesisBundleProperty,
  GenesisBundleV1,
} from '../../src/types.ts';

type Row = Record<string, unknown>;
type TableMap = Record<string, Row[]>;
type DatabaseMap = Record<string, TableMap>;

const BUILDING_TYPES: readonly BuildingType[] = [
  'EFH',
  'MFH',
  'Ferienhaus',
  'Wohn-/Geschaeftshaus',
  'Bauernhaus',
  'Sonstiges',
];

const FUEL_TYPES: readonly FuelType[] = ['Holz', 'Oel', 'Gas', 'Andere'];

const CLEANING_MONTHS: readonly CleaningMonth[] = [
  'Jan',
  'Feb',
  'Mrz',
  'Apr',
  'Mai',
  'Juni',
  'Juli',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

const FIRE_SYSTEM_CODES: readonly FireSystemCode[] = [
  'Ka',
  'Oez',
  'Gz',
  'al',
  'Hz',
  'Pz',
  'Kz',
  'Sb',
  'Of',
  'He',
  'Ch',
  'Oeo',
  'So',
  'HK',
];

export type ConverterAudit = {
  sourcePath: string;
  outputPath?: string;
  tableCounts: Record<string, number>;
  warnings: string[];
};

export type ConverterResult = {
  bundle: GenesisBundleV1;
  audit: ConverterAudit;
};

const CONVERTER_VERSION = '1.0.0';
const CORE_DATABASES = ['KFDSTAMM.MDB', 'ARBVOL.MDB', 'Anschriften.MDB', 'FKSTAMM.MDB'];
const AUDIT_DATABASES = ['KFKRECH.MDB', 'OPSTAMM.MDB'];

const monthByNumber: Record<number, CleaningMonth> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mrz',
  4: 'Apr',
  5: 'Mai',
  6: 'Juni',
  7: 'Juli',
  8: 'Aug',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Dez',
};

const roleByTyp: Record<number, AddressRole> = {
  1: 'Eigentuemer',
  2: 'Mieter',
  3: 'Verwaltung',
  4: 'Hauswart',
};

export function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/\0/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHouse(value: unknown): string {
  return clean(value).replace(/\s/g, '');
}

export function buildSourceKey(group: unknown, street: unknown, house: unknown, suffix: unknown): string {
  return [clean(group), clean(street), cleanHouse(house), clean(suffix || 0)].join('-');
}

function parsePostalCity(value: unknown): { postalCode: string; city: string } {
  const text = clean(value);
  const match = text.match(/^(\d{4})\s+(.+)$/);
  if (!match) {
    return { postalCode: '', city: text };
  }
  return { postalCode: match[1], city: match[2] };
}

function normalizeDate(value: unknown): string {
  const text = clean(value);
  const match = text.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) {
    return text;
  }
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function parseAmount(value: unknown): number {
  const parsed = Number(clean(value).replace("'", '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value) || value === 0) {
    return '';
  }
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function formatQuantity(value: unknown): string {
  return formatDecimal(parseAmount(value), 4);
}

function buildingTypeFrom(value: unknown): { buildingType: BuildingType | ''; otherBuildingType: string } {
  const text = clean(value);
  const lookup = text.toLowerCase();
  if (!text) {
    return { buildingType: '', otherBuildingType: '' };
  }
  if (lookup.includes('efh') || lookup.includes('einfamilien')) {
    return { buildingType: 'EFH', otherBuildingType: '' };
  }
  if (lookup.includes('mfh') || lookup.includes('mehrfamilien')) {
    return { buildingType: 'MFH', otherBuildingType: '' };
  }
  if (lookup.includes('ferien')) {
    return { buildingType: 'Ferienhaus', otherBuildingType: '' };
  }
  if (lookup.includes('wohn') && lookup.includes('geschäft')) {
    return { buildingType: 'Wohn-/Geschaeftshaus', otherBuildingType: '' };
  }
  if (lookup.includes('bauern')) {
    return { buildingType: 'Bauernhaus', otherBuildingType: '' };
  }
  const exact = BUILDING_TYPES.find((type) => type.toLowerCase() === lookup);
  return exact ? { buildingType: exact, otherBuildingType: '' } : { buildingType: 'Sonstiges', otherBuildingType: text };
}

function parseFuelTypes(...values: unknown[]): FuelType[] {
  const text = values.map(clean).filter(Boolean).join(' ').toLowerCase();
  const fuels = new Set<FuelType>();
  if (/(holz|stückholz|pellet|schnitzel|of|ka|chemin|kamin)/i.test(text)) {
    fuels.add('Holz');
  }
  if (/(öl|oel|oil)/i.test(text)) {
    fuels.add('Oel');
  }
  if (/(gas)/i.test(text)) {
    fuels.add('Gas');
  }
  if (!fuels.size && text) {
    fuels.add('Andere');
  }
  return FUEL_TYPES.filter((fuel) => fuels.has(fuel));
}

function parseFireSystemCodes(...values: unknown[]): FireSystemCode[] {
  const raw = values.map(clean).join(' ');
  const normalized = raw.replace(/Ö/g, 'Oe').replace(/ö/g, 'oe');
  const found = new Set<FireSystemCode>();

  for (const code of FIRE_SYSTEM_CODES) {
    const aliases = code === 'Oez' ? ['Oez', 'Öz'] : code === 'Oeo' ? ['Oeo', 'Öo'] : [code];
    if (aliases.some((alias) => new RegExp(`(^|[^A-Za-z])\\d*${alias}([^A-Za-z]|$)`, 'i').test(normalized))) {
      found.add(code);
    }
  }

  return FIRE_SYSTEM_CODES.filter((code) => found.has(code));
}

function parseMonths(...values: unknown[]): CleaningMonth[] {
  const months = new Set<CleaningMonth>();
  for (const value of values) {
    const text = clean(value);
    const numeric = Number(text);
    if (monthByNumber[numeric]) {
      months.add(monthByNumber[numeric]);
    }
    for (const month of CLEANING_MONTHS) {
      if (new RegExp(`(^|[^A-Za-z])${month}([^A-Za-z]|$)`, 'i').test(text)) {
        months.add(month);
      }
    }
  }
  return CLEANING_MONTHS.filter((month) => months.has(month));
}

function joinLines(lines: string[]): string {
  return lines.map(clean).filter(Boolean).join('\n');
}

function personDisplay(person: Row | undefined, communicationRows: Row[]): string {
  if (!person) {
    return '';
  }
  const name = [clean(person.Anrede), clean(person.Vorname), clean(person.Name)].filter(Boolean).join(' ');
  const address = [[clean(person.Strasse), clean(person.Hausnummer)].filter(Boolean).join(' '), [clean(person.PLZ), clean(person.Ort)].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const communication = communicationRows.map((row) => clean(row.KommText)).filter(Boolean).join(', ');
  return joinLines([name, clean(person.Zusatz1), clean(person.Zusatz2), address, communication]);
}

function firstRoleFromVersand(
  versandRows: Row[],
  functionsById: Map<number, Row>,
  genesisKind: number,
): AddressRole | '' {
  for (const row of versandRows) {
    if (Number(row.VersandartGenesis) !== genesisKind || Number(row.VersandWert) !== 1) {
      continue;
    }
    const fn = functionsById.get(Number(row.FunktionID));
    const role = roleByTyp[Number(fn?.Typ)];
    if (role) {
      return role;
    }
  }
  return '';
}

function createKfdIdCandidates(row: Row, rowIndex: number): number[] {
  return [Number(row.KGrundID), rowIndex + 1].filter((value, index, values) =>
    Number.isFinite(value) && value > 0 && values.indexOf(value) === index,
  );
}

export function mapKfdProperty(
  row: Row,
  rowIndex: number,
  helpers: {
    functionsByKfdId: Map<number, Row[]>;
    functionsById: Map<number, Row>;
    peopleById: Map<number, Row>;
    communicationByPersonId: Map<number, Row[]>;
    versandByFunctionId: Map<number, Row[]>;
    monthsBySourceKey: Map<string, CleaningMonth[]>;
    arbvolBySourceKey: Map<string, Row[]>;
    installationsBySourceKey: Map<string, GenesisBundleInstallation[]>;
  },
): GenesisBundleProperty {
  const sourceKey = buildSourceKey(row.GKuG, row.GKuS, row.GKuH, row.GKuZ);
  const customerNumber = sourceKey;
  const postalCity = parsePostalCity(row.GPLZOrt);
  const street = [clean(row.GStrasse), clean(row.GHausNr)].filter(Boolean).join(' ');
  const building = buildingTypeFrom(clean(row.GGebErg) || clean(row.GGebBez));
  const roleFunctions = createKfdIdCandidates(row, rowIndex).flatMap((candidate) => helpers.functionsByKfdId.get(candidate) ?? []);
  const roles: Partial<Record<AddressRole, string>> = {};

  for (const fn of roleFunctions) {
    const role = roleByTyp[Number(fn.Typ)];
    if (!role || roles[role]) {
      continue;
    }
    const personId = Number(fn.PersonID);
    roles[role] = personDisplay(
      helpers.peopleById.get(personId),
      helpers.communicationByPersonId.get(personId) ?? [],
    );
  }

  const versandRows = roleFunctions.flatMap((fn) => helpers.versandByFunctionId.get(Number(fn.FunktionID)) ?? []);
  const arbvolRows = helpers.arbvolBySourceKey.get(sourceKey) ?? [];
  const installations = helpers.installationsBySourceKey.get(sourceKey) ?? [];
  const fireSystemCodes = [
    ...new Set([
      ...parseFireSystemCodes(row.GBst, row.GMo, ...arbvolRows.map((item) => item.AVInfo)),
      ...installations.flatMap((installation) => installation.systemCode ? parseFireSystemCodes(installation.systemCode, installation.label) : []),
    ]),
  ];
  const fuelTypes = [
    ...new Set([
      ...parseFuelTypes(row.GBst, row.GGebBez, row.GGebErg, ...arbvolRows.map((item) => item.AVInfo)),
      ...installations.flatMap((installation) => installation.fuelTypes),
    ]),
  ];

  return {
    sourceKey,
    sourceSystem: 'genesis',
    isActive: true,
    lastImportedAt: '',
    customerNumber,
    propertyLabel: clean(row.GPerson),
    street,
    postalCode: postalCity.postalCode,
    city: postalCity.city,
    buildingType: building.buildingType,
    otherBuildingType: building.otherBuildingType,
    owner: roles.Eigentuemer || clean(row.Rech1),
    tenant: roles.Mieter || '',
    management: roles.Verwaltung || clean(row.Rech2),
    caretaker: roles.Hauswart || '',
    billingRole: firstRoleFromVersand(versandRows, helpers.functionsById, 1) || 'Eigentuemer',
    notificationRole: firstRoleFromVersand(versandRows, helpers.functionsById, 3) || '',
    fuelTypes: FUEL_TYPES.filter((fuel) => fuelTypes.includes(fuel)),
    fireSystemCodes: FIRE_SYSTEM_CODES.filter((code) => fireSystemCodes.includes(code)),
    oilBoiler: '',
    kwh: installations.find((installation) => installation.kwh)?.kwh ?? '',
    buildYear: installations.find((installation) => installation.buildYear)?.buildYear ?? '',
    tour: clean(row.GTour) || clean(arbvolRows[0]?.AVTour),
    cleaningMonths: [
      ...new Set([
        ...parseMonths(row.GMo),
        ...(helpers.monthsBySourceKey.get(sourceKey) ?? []),
      ]),
    ],
    notes: joinLines([clean(row.GBem1), clean(row.GBem2), clean(row.GIntBem)]),
    rawRefs: {
      KGrundID: Number(row.KGrundID) || null,
      rowIndex: rowIndex + 1,
    },
  };
}

export function mapInstallation(row: Row): GenesisBundleInstallation {
  const sourceKey = buildSourceKey(row.FKuG, row.FKuS, row.FKuH, row.FKuZ);
  const fuels = parseFuelTypes(row.FBst1, row.FBst2, row.FBst3);
  return {
    sourceKey,
    installationKey: `${sourceKey}-FK-${clean(row.FKuLfd) || '1'}`,
    systemCode: clean(row.FATyp) || 'FK',
    label: [clean(row.FATyp), clean(row.FAufstell)].filter(Boolean).join(' - '),
    fuelTypes: fuels,
    manufacturer: clean(row.FFabr),
    model: clean(row.FTyp),
    buildYear: clean(row.FBJ),
    kwh: clean(row.FKW),
    location: clean(row.FAufstell),
    notes: joinLines([clean(row.FBem1), clean(row.FBem2), clean(row.FBem3)]),
    raw: row,
  };
}

export function mapPlannedWork(row: Row, rowIndex: number): GenesisBundlePlannedWork {
  const sourceKey = buildSourceKey(row.AVGem, row.AVStr, row.AVHausNr, row.AVZu);
  const month = monthByNumber[Number(row.MonatNr)] ?? '';
  const info = clean(row.AVInfo);
  return {
    sourceKey,
    workKey: `${sourceKey}-ARBVOL-${clean(row.MonatNr) || '0'}-${rowIndex + 1}`,
    source: 'arbvol',
    tariffCode: '',
    month,
    tour: clean(row.AVTour),
    quantity: '',
    description: info || 'Reinigung gemäss Arbeitsvolumen',
    tp: '',
    amount: '',
    minutes: clean(row.AVMin),
    unitPrice: '',
    taxPoints: '',
    confidence: info ? 60 : 35,
    reason: 'Arbeitsvolumen aus ARBVOL',
    notes: joinLines([
      clean(row.AVBem1),
      clean(row.AVBem2),
      clean(row.AVLeArch) ? `Letzte Archivierung: ${clean(row.AVLeArch)}` : '',
    ]),
    raw: row,
  };
}

function isTechnicalTariffLine(code: string): boolean {
  const normalized = code.toLowerCase();
  return (
    !normalized ||
    normalized === '00+00' ||
    normalized === 'tvz' ||
    /^av\d*$/.test(normalized)
  );
}

function shouldKeepTariffLine(row: Row, code: string, description: string): boolean {
  if (isTechnicalTariffLine(code)) {
    return false;
  }
  if (code.toLowerCase() === 'ft') {
    return Boolean(description);
  }
  return Boolean(description || parseAmount(row.TAnz) || parseAmount(row.TPreis));
}

export function mapTariffSuggestion(
  row: Row,
  tariffCatalog: Map<string, Row>,
  rowIndex: number,
): GenesisBundlePlannedWork | null {
  if (!Number(row.TKuG) || !clean(row.TKuH)) {
    return null;
  }

  const sourceKey = buildSourceKey(row.TKuG, row.TKuS, row.TKuH, row.TKuZ);
  const tariffCode = clean(row.TTarif);
  const catalogEntry = tariffCatalog.get(tariffCode.toLowerCase());
  const catalogText = clean(catalogEntry?.TLang);
  const ownText = clean(row.TTBez);
  const notes = clean(row.TTBem);
  const description = ownText || catalogText || notes;

  if (!shouldKeepTariffLine(row, tariffCode, description)) {
    return null;
  }

  const quantityValue = parseAmount(row.TAnz);
  const quantity = quantityValue > 0 ? formatQuantity(row.TAnz) : '';
  const unitPriceValue = parseAmount(catalogEntry?.TPreis);
  const ownPriceValue = parseAmount(row.TPreis);
  const taxPointValue = parseAmount(catalogEntry?.TTax);
  const computedTaxPoints = taxPointValue && quantityValue ? taxPointValue * quantityValue : taxPointValue;
  const computedAmount = ownPriceValue || (unitPriceValue && quantityValue ? unitPriceValue * quantityValue : unitPriceValue);
  const isMinuteTariff = /minute/i.test(catalogText) || tariffCode === '60+01';

  return {
    sourceKey,
    workKey: `${sourceKey}-GTARIF-${clean(row.TPos) || rowIndex + 1}-${tariffCode || 'frei'}`,
    source: 'tariff',
    tariffCode,
    month: '',
    tour: '',
    quantity,
    description,
    tp: formatDecimal(computedTaxPoints, 2),
    amount: formatDecimal(computedAmount, 2),
    minutes: isMinuteTariff && quantity ? quantity : '',
    unitPrice: formatDecimal(unitPriceValue, 2),
    taxPoints: formatDecimal(taxPointValue, 2),
    confidence: ownText ? 92 : catalogText ? 84 : 68,
    reason: ownText ? 'Objekttarif mit objektspezifischer Bezeichnung' : 'Tarifkatalog-Bezeichnung aus Genesis',
    notes,
    raw: row,
  };
}

export function mapHistory(row: Row, rowIndex: number): GenesisBundleHistoryEntry {
  const sourceKey = buildSourceKey(row.ARKuG, row.ARKuS, row.ARKuH, row.ARKuZ);
  return {
    sourceKey,
    historyKey: `${sourceKey}-ARCHIV-${clean(row.ARDatum) || rowIndex + 1}-${clean(row.ARReNr) || rowIndex + 1}`,
    date: normalizeDate(row.ARDatum),
    employee: clean(row.ARMit),
    description: clean(row.ARBem) || (clean(row.ARReNr) ? `Rechnung ${clean(row.ARReNr)}` : 'Archiv-Eintrag'),
    amount: clean(row.ARPreis),
    minutes: '',
    notes: [clean(row.ARVF), clean(row.ARFSchau) ? `Feuerschau ${clean(row.ARFSchau)}` : ''].filter(Boolean).join(' · '),
    raw: row,
  };
}

async function readZipDatabase(zip: JSZip, fileName: string, warnings: string[]): Promise<TableMap> {
  const entryPath = Object.keys(zip.files).find((candidate) => candidate.toLowerCase().endsWith(`/daten/${fileName.toLowerCase()}`) || candidate.toLowerCase() === `daten/${fileName.toLowerCase()}`);
  if (!entryPath) {
    warnings.push(`${fileName} fehlt im Genesis-ZIP.`);
    return {};
  }

  const buffer = await zip.files[entryPath].async('nodebuffer');
  const reader = new MDBReader(buffer);
  const tables: TableMap = {};
  for (const tableName of reader.getTableNames()) {
    try {
      tables[tableName] = reader.getTable(tableName).getData() as Row[];
    } catch (error) {
      warnings.push(`${fileName}/${tableName} konnte nicht gelesen werden: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return tables;
}

function tableCountsFor(fileName: string, tables: TableMap): Record<string, number> {
  return Object.fromEntries(Object.entries(tables).map(([tableName, rows]) => [`${fileName}/${tableName}`, rows.length]));
}

function groupByNumber(rows: Row[], key: string): Map<number, Row[]> {
  const map = new Map<number, Row[]>();
  for (const row of rows) {
    const value = Number(row[key]);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    const current = map.get(value) ?? [];
    current.push(row);
    map.set(value, current);
  }
  return map;
}

function groupCommunication(rows: Row[]): Map<number, Row[]> {
  return groupByNumber(rows, 'PersonID');
}

function groupInstallations(rows: GenesisBundleInstallation[]): Map<string, GenesisBundleInstallation[]> {
  const map = new Map<string, GenesisBundleInstallation[]>();
  for (const row of rows) {
    const current = map.get(row.sourceKey) ?? [];
    current.push(row);
    map.set(row.sourceKey, current);
  }
  return map;
}

function groupArbvol(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const sourceKey = buildSourceKey(row.AVGem, row.AVStr, row.AVHausNr, row.AVZu);
    const current = map.get(sourceKey) ?? [];
    current.push(row);
    map.set(sourceKey, current);
  }
  return map;
}

function monthsByArbvol(rows: Row[]): Map<string, CleaningMonth[]> {
  const grouped = new Map<string, Set<CleaningMonth>>();
  for (const row of rows) {
    const sourceKey = buildSourceKey(row.AVGem, row.AVStr, row.AVHausNr, row.AVZu);
    const month = monthByNumber[Number(row.MonatNr)];
    if (!month) {
      continue;
    }
    const current = grouped.get(sourceKey) ?? new Set<CleaningMonth>();
    current.add(month);
    grouped.set(sourceKey, current);
  }
  return new Map([...grouped.entries()].map(([key, months]) => [key, CLEANING_MONTHS.filter((month) => months.has(month))]));
}

export async function convertGenesisZip(zipPath: string): Promise<ConverterResult> {
  const sourcePath = path.resolve(zipPath);
  const zip = await JSZip.loadAsync(await readFile(sourcePath));
  const warnings: string[] = [];
  const databases: DatabaseMap = {};
  const tableCounts: Record<string, number> = {};

  for (const fileName of [...CORE_DATABASES, ...AUDIT_DATABASES]) {
    const tables = await readZipDatabase(zip, fileName, warnings);
    databases[fileName] = tables;
    Object.assign(tableCounts, tableCountsFor(fileName, tables));
  }

  const missingCore = CORE_DATABASES.filter((fileName) => !Object.keys(databases[fileName] ?? {}).length);
  for (const fileName of missingCore) {
    warnings.push(`Kerndatenbank ${fileName} wurde nicht gefunden oder ist leer.`);
  }

  const kfdTables = databases['KFDSTAMM.MDB'] ?? {};
  const arbvolRows = databases['ARBVOL.MDB']?.ArbVolumen ?? [];
  const addressTables = databases['Anschriften.MDB'] ?? {};
  const fkRows = databases['FKSTAMM.MDB']?.FestStoff ?? [];

  const installations = fkRows.map(mapInstallation);
  const installationSourceKeys = new Set(installations.map((item) => item.sourceKey));
  const helpers = {
    functionsByKfdId: groupByNumber(addressTables.Funktionen ?? [], 'KFDID'),
    functionsById: new Map((addressTables.Funktionen ?? []).map((row) => [Number(row.FunktionID), row])),
    peopleById: new Map((addressTables.Personen ?? []).map((row) => [Number(row.PersonID), row])),
    communicationByPersonId: groupCommunication(addressTables.Kommunikation ?? []),
    versandByFunctionId: groupByNumber(addressTables.Versand ?? [], 'FunktionID'),
    monthsBySourceKey: monthsByArbvol(arbvolRows),
    arbvolBySourceKey: groupArbvol(arbvolRows),
    installationsBySourceKey: groupInstallations(installations),
  };

  const properties = (kfdTables.GebStamm ?? []).map((row, index) => mapKfdProperty(row, index, helpers));
  const propertySourceKeys = new Set(properties.map((property) => property.sourceKey));
  const plannedWork = arbvolRows.map(mapPlannedWork);
  const tariffCatalog = new Map((kfdTables.Tarife ?? []).map((row) => [clean(row.TKurz).toLowerCase(), row]));
  const tariffSuggestions = (kfdTables.GTarife ?? [])
    .map((row, index) => mapTariffSuggestion(row, tariffCatalog, index))
    .filter((item): item is GenesisBundlePlannedWork => Boolean(item));
  const history = (kfdTables.Archiv ?? []).map(mapHistory);

  for (const sourceKey of installationSourceKeys) {
    if (!propertySourceKeys.has(sourceKey)) {
      warnings.push(`Anlage verweist auf nicht importierte Liegenschaft ${sourceKey}.`);
    }
  }
  for (const item of plannedWork) {
    if (!propertySourceKeys.has(item.sourceKey)) {
      warnings.push(`Arbeitsvolumen verweist auf nicht importierte Liegenschaft ${item.sourceKey}.`);
    }
  }

  return {
    bundle: {
      schemaVersion: 'genesis-bundle.v1',
      metadata: {
        exportedAt: new Date().toISOString(),
        converterVersion: CONVERTER_VERSION,
        sourceFileName: path.basename(sourcePath),
        tableCounts,
        warnings,
      },
      properties,
      installations,
      plannedWork: [...tariffSuggestions, ...plannedWork],
      history,
    },
    audit: {
      sourcePath,
      tableCounts,
      warnings,
    },
  };
}
