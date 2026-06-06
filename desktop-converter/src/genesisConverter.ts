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
  GenesisBundleInvoice,
  GenesisBundleInvoiceLine,
  GenesisBundleInstallation,
  GenesisBundlePdfDocument,
  GenesisBundlePlannedWork,
  GenesisBundleProperty,
  GenesisBundleV1,
  GenesisInvoiceStatus,
  GenesisPdfDocumentKind,
  GenesisWorkLineType,
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

const CONVERTER_VERSION = '2.0.0';
const CORE_DATABASES = ['KFDSTAMM.MDB', 'ARBVOL.MDB', 'Anschriften.MDB', 'FKSTAMM.MDB'];
const AUDIT_DATABASES = ['KFKRECH.MDB', 'OPSTAMM.MDB'];
const MOBILE_OMITTED_AUDIT_KEYS = new Set(['raw', 'rawRefs']);

function stripMobileAuditFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripMobileAuditFields) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (!MOBILE_OMITTED_AUDIT_KEYS.has(key)) {
      acc[key] = stripMobileAuditFields(entry);
    }
    return acc;
  }, {}) as T;
}

export function toMobileGenesisBundle(bundle: GenesisBundleV1): GenesisBundleV1 {
  return stripMobileAuditFields(bundle);
}

export function stringifyMobileGenesisBundle(bundle: GenesisBundleV1): string {
  return JSON.stringify(toMobileGenesisBundle(bundle));
}

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

function sourceKeyNumberPart(value: string): string {
  return /^\d+$/.test(value) ? String(Number(value)) : value;
}

export function sourceKeyFromKfkCustomerNumber(value: unknown): string {
  const normalized = clean(value);
  const match = normalized.match(/^(\d{3})(\d{3})(\S+)\s+(\S+)$/);
  if (!match) {
    return '';
  }
  return buildSourceKey(
    sourceKeyNumberPart(match[1]),
    sourceKeyNumberPart(match[2]),
    match[3],
    sourceKeyNumberPart(match[4]),
  );
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
  const isoMatch = text.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const swissMatch = text.match(/^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/);
  if (swissMatch) {
    return `${swissMatch[3]}-${swissMatch[2].padStart(2, '0')}-${swissMatch[1].padStart(2, '0')}`;
  }
  return text;
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

function formatMoney(value: unknown): string {
  return formatDecimal(parseAmount(value), 2);
}

function formatUnitPriceFromAmount(amount: unknown, quantity: unknown): string {
  const amountValue = parseAmount(amount);
  const quantityValue = parseAmount(quantity);
  if (!amountValue || !quantityValue) {
    return '';
  }
  return formatDecimal(amountValue / quantityValue, 4);
}

function normalizeCompactDate(value: string): string {
  const match = clean(value).match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!match) {
    return '';
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function invoiceStatus(total: unknown, paid: unknown, paidDate: unknown): GenesisInvoiceStatus {
  const totalStr = clean(total);
  // Missing/empty total — can only determine status from paidDate
  if (!totalStr) {
    return clean(paidDate) ? 'paid' : 'unknown';
  }
  const totalAmount = parseAmount(total);
  const paidAmount = parseAmount(paid);
  // Zero-balance invoices (credit notes, reversals) are always settled
  if (totalAmount === 0) {
    return 'paid';
  }
  if (paidAmount >= totalAmount || clean(paidDate)) {
    return 'paid';
  }
  if (paidAmount > 0) {
    return 'partial';
  }
  return 'open';
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

export function mapFkProperty(
  row: Row,
  rowIndex: number,
  helpers: {
    monthsBySourceKey: Map<string, CleaningMonth[]>;
    arbvolBySourceKey: Map<string, Row[]>;
    installationsBySourceKey: Map<string, GenesisBundleInstallation[]>;
  },
): GenesisBundleProperty {
  const sourceKey = buildSourceKey(row.GKuG, row.GKuS, row.GKuH, row.GKuZ);
  const postalCity = parsePostalCity(row.GPLZOrt);
  const street = [clean(row.GStrasse), clean(row.GHausNr)].filter(Boolean).join(' ');
  const building = buildingTypeFrom(clean(row.GGebErg) || clean(row.GGebBez));
  const arbvolRows = helpers.arbvolBySourceKey.get(sourceKey) ?? [];
  const installations = helpers.installationsBySourceKey.get(sourceKey) ?? [];
  const fireSystemCodes = [
    ...new Set([
      ...parseFireSystemCodes(row.GMo, ...arbvolRows.map((item) => item.AVInfo)),
      ...installations.flatMap((installation) => parseFireSystemCodes(installation.systemCode, installation.label)),
    ]),
  ];
  const fuelTypes = [
    ...new Set([
      ...parseFuelTypes(row.GGebBez, row.GGebErg, ...arbvolRows.map((item) => item.AVInfo)),
      ...installations.flatMap((installation) => installation.fuelTypes),
    ]),
  ];

  return {
    sourceKey,
    sourceSystem: 'genesis',
    isActive: true,
    lastImportedAt: '',
    customerNumber: sourceKey,
    propertyLabel: clean(row.GPerson),
    street,
    postalCode: postalCity.postalCode,
    city: postalCity.city,
    buildingType: building.buildingType,
    otherBuildingType: building.otherBuildingType,
    owner: clean(row.Rech1),
    tenant: '',
    management: clean(row.Rech2),
    caretaker: '',
    billingRole: '',
    notificationRole: '',
    fuelTypes: FUEL_TYPES.filter((fuel) => fuelTypes.includes(fuel)),
    fireSystemCodes: FIRE_SYSTEM_CODES.filter((code) => fireSystemCodes.includes(code)),
    oilBoiler: '',
    kwh: installations.find((installation) => installation.kwh)?.kwh ?? '',
    buildYear: installations.find((installation) => installation.buildYear)?.buildYear ?? '',
    tour: clean(row.GTour) || clean(row.GTour2) || clean(arbvolRows[0]?.AVTour),
    cleaningMonths: [
      ...new Set([
        ...parseMonths(row.GMo),
        ...(helpers.monthsBySourceKey.get(sourceKey) ?? []),
      ]),
    ],
    notes: joinLines([clean(row.GBem1), clean(row.GBem2), clean(row.GIntBem), 'Fallback-Liegenschaft aus FKSTAMM/GebStamm.']),
    rawRefs: {
      FKGrundID: Number(row.FKGrundID) || null,
      KFDGrundID: Number(row.KFDGrundID) || null,
      rowIndex: rowIndex + 1,
      fallback: 'FKSTAMM.GebStamm',
    },
  };
}

export function mapArbvolFallbackProperty(sourceKey: string, rows: Row[]): GenesisBundleProperty {
  const first = rows[0] ?? {};
  const postalCity = parsePostalCity(first.AVGPLZOrt);
  const street = [clean(first.AVGStrasse), clean(first.AVGHausNr)].filter(Boolean).join(' ');
  const fireSystemCodes = parseFireSystemCodes(...rows.map((row) => row.AVInfo));
  const fuelTypes = parseFuelTypes(...rows.map((row) => row.AVInfo));
  const cleaningMonths = parseMonths(...rows.map((row) => row.MonatNr));
  const tours = [...new Set(rows.map((row) => clean(row.AVTour)).filter(Boolean))].join(' / ');

  return {
    sourceKey,
    sourceSystem: 'genesis',
    isActive: true,
    lastImportedAt: '',
    customerNumber: sourceKey,
    propertyLabel: clean(first.AVGPerson),
    street,
    postalCode: postalCity.postalCode,
    city: postalCity.city,
    buildingType: '',
    otherBuildingType: '',
    owner: '',
    tenant: '',
    management: '',
    caretaker: '',
    billingRole: '',
    notificationRole: '',
    fuelTypes,
    fireSystemCodes,
    oilBoiler: '',
    kwh: '',
    buildYear: '',
    tour: tours,
    cleaningMonths,
    notes: joinLines([
      ...rows.flatMap((row) => [clean(row.AVBem1), clean(row.AVBem2)]),
      'Fallback-Liegenschaft aus ARBVOL; in KFDSTAMM/GebStamm nicht vorhanden.',
    ]),
    rawRefs: {
      fallback: 'ARBVOL.ArbVolumen',
      rows: rows.length,
    },
  };
}

export function mapInvoiceFallbackProperty(invoice: GenesisBundleInvoice): GenesisBundleProperty {
  const propertyAddressLines = invoice.propertyAddress.split('\n').map(clean).filter(Boolean);
  const invoiceAddressLines = invoice.invoiceAddress.split('\n').map(clean).filter(Boolean);
  const postalCity = parsePostalCity(propertyAddressLines[0] || invoiceAddressLines.find((line) => /^\d{4}\s+/.test(line)) || '');
  const street = propertyAddressLines[1] || invoiceAddressLines.find((line) => !/^\d{4}\s+/.test(line)) || '';
  const propertyLabel = propertyAddressLines[2] || invoiceAddressLines[1] || invoiceAddressLines[0] || '';
  const fallbackSource = invoice.raw?.op
    ? 'OPSTAMM.OP'
    : invoice.raw?.rechDivers
      ? 'KFKRECH.RechDivers'
      : 'Rechnungsdaten';

  return {
    sourceKey: invoice.sourceKey,
    sourceSystem: 'genesis',
    isActive: true,
    lastImportedAt: '',
    customerNumber: invoice.sourceKey,
    propertyLabel,
    street,
    postalCode: postalCity.postalCode,
    city: postalCity.city,
    buildingType: '',
    otherBuildingType: '',
    owner: invoiceAddressLines.join('\n'),
    tenant: '',
    management: '',
    caretaker: '',
    billingRole: '',
    notificationRole: '',
    fuelTypes: [],
    fireSystemCodes: [],
    oilBoiler: '',
    kwh: '',
    buildYear: '',
    tour: '',
    cleaningMonths: [],
    notes: `Fallback-Liegenschaft aus Rechnung ${invoice.invoiceNumber}; in KFDSTAMM/GebStamm nicht vorhanden.`,
    rawRefs: {
      fallback: fallbackSource,
      invoiceNumber: invoice.invoiceNumber,
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
    lineType: 'text',
    invoiceNumber: '',
    position: '',
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

function lineTypeForTariff(code: string, amount: unknown, quantity: unknown): GenesisWorkLineType {
  if (isTechnicalTariffLine(code)) {
    return 'control';
  }
  if (code.toLowerCase() === 'ft' || (!parseAmount(amount) && !parseAmount(quantity))) {
    return 'text';
  }
  return 'charge';
}

function shouldKeepTariffLine(row: Row, code: string, description: string): boolean {
  const lineType = lineTypeForTariff(code, row.TPreis, row.TAnz);
  if (lineType === 'control') {
    return Boolean(description || code);
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
  const lineType = lineTypeForTariff(tariffCode, row.TPreis, row.TAnz);

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
    source: 'objectTariff',
    tariffCode,
    lineType,
    invoiceNumber: '',
    position: clean(row.TPos),
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
    reason: lineType === 'control'
      ? 'Kontrollzeile aus Genesis-Objekttarif'
      : ownText
        ? 'Aktueller Objekttarif mit objektspezifischer Bezeichnung'
        : 'Aktueller Objekttarif aus Genesis-Tarifkatalog',
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

function addressFromParts(parts: unknown[]): string {
  return joinLines(parts.map(clean).filter(Boolean));
}

export function mapInvoice(row: Row, rechDiversByNumber: Map<number, Row>): GenesisBundleInvoice {
  const invoiceNumber = clean(row.OPNr);
  const sourceKey = buildSourceKey(row.OPG, row.OPS, row.OPH, row.OPZ);
  const divers = rechDiversByNumber.get(Number(row.OPNr));
  const netAmount = formatMoney(row.OPNetto || divers?.RNetto);
  const vatAmount = formatMoney(row.OPMwst || divers?.RMWST1);
  const totalAmount = formatMoney(row.OPBetrag || divers?.RTotal);
  const paidAmount = formatMoney(row.OPZBetrag);

  return {
    sourceKey,
    invoiceKey: `${sourceKey}-INVOICE-${invoiceNumber}`,
    invoiceNumber,
    workDate: normalizeDate(row.OPADat),
    invoiceDate: normalizeDate(row.OPRDat),
    dueDate: normalizeDate(row.OPFDat),
    paidDate: normalizeDate(row.OPZDat),
    status: invoiceStatus(row.OPBetrag || divers?.RTotal, row.OPZBetrag, row.OPZDat),
    dunningLevel: clean(row.OPMStufe),
    netAmount,
    vatAmount,
    totalAmount,
    paidAmount,
    invoiceAddress: addressFromParts([
      row.OPR1,
      row.OPR2,
      row.OPR3,
      row.OPR4,
      row.OPR5,
      row.OPR6,
      row.OPR7,
      row.OPR8,
      row.OPR9,
      row.OPR10,
      divers?.RAdr1,
      divers?.RAdr2,
      divers?.RAdr3,
      divers?.RAdr4,
      divers?.RAdr5,
      divers?.RAdr6,
      divers?.RAdr7,
      divers?.RAdr8,
    ]),
    propertyAddress: addressFromParts([
      divers?.RLieg1,
      divers?.RLieg2,
      divers?.RLieg3,
      divers?.RLieg4,
    ]),
    notes: clean(row.OPReBem),
    raw: { op: row, rechDivers: divers ?? null },
  };
}

export function mapKfkInvoice(row: Row): GenesisBundleInvoice | null {
  const invoiceNumber = clean(row.OPRechNr);
  const sourceKey = sourceKeyFromKfkCustomerNumber(row.KuNrOP);
  if (!invoiceNumber || !sourceKey) {
    return null;
  }

  return {
    sourceKey,
    invoiceKey: `${sourceKey}-KFK-INVOICE-${invoiceNumber}`,
    invoiceNumber,
    workDate: '',
    invoiceDate: '',
    dueDate: '',
    paidDate: '',
    status: 'unknown',
    dunningLevel: '',
    netAmount: formatMoney(row.RNetto),
    vatAmount: formatMoney(row.RMWST1),
    totalAmount: formatMoney(row.RTotal),
    paidAmount: '',
    invoiceAddress: addressFromParts([
      row.RAdr1,
      row.RAdr2,
      row.RAdr3,
      row.RAdr4,
      row.RAdr5,
      row.RAdr6,
      row.RAdr7,
      row.RAdr8,
      row.RAdr9,
      row.RAdr10,
      row.RAdr11,
      row.RAdr12,
      row.RAdr13,
      row.RAdr14,
      row.RAdr15,
      row.RAdr16,
    ]),
    propertyAddress: addressFromParts([
      row.RLieg1,
      row.RLieg2,
      row.RLieg3,
      row.RLieg4,
    ]),
    notes: 'KFK-Rechnung ohne OPSTAMM.OP-Eintrag.',
    raw: { rechDivers: row },
  };
}

export function mapInvoiceLine(row: Row, invoice: GenesisBundleInvoice): GenesisBundleInvoiceLine {
  const tariffCode = clean(row.RechTarif);
  const quantity = parseAmount(row.RechAnz) > 0 ? formatQuantity(row.RechAnz) : '';
  const amount = formatMoney(row.RechPreis);
  const lineType = lineTypeForTariff(tariffCode, row.RechPreis, row.RechAnz);
  const position = clean(row.RechPos);

  return {
    sourceKey: invoice.sourceKey,
    invoiceNumber: invoice.invoiceNumber,
    lineKey: `${invoice.sourceKey}-INVOICE-${invoice.invoiceNumber}-LINE-${position || '0'}`,
    position,
    lineType,
    tariffCode,
    marker: clean(row.RechKz),
    quantity,
    description: clean(row.RechTBez) || tariffCode || 'Rechnungsposition',
    unitPrice: formatUnitPriceFromAmount(row.RechPreis, row.RechAnz),
    amount,
    taxPoints: '',
    notes: '',
    raw: row,
  };
}

export function mapKfkInvoiceLine(row: Row, invoice: GenesisBundleInvoice): GenesisBundleInvoiceLine {
  const quantity = parseAmount(row.PossAnz) > 0 ? formatQuantity(row.PossAnz) : '';
  const amountSource = parseAmount(row.PossPreis) ? row.PossPreis : row.PossGes;
  const amount = formatMoney(amountSource);
  const position = clean(row.PossNr);
  const description = clean(row.PossBez);
  const lineType: GenesisWorkLineType = amount || quantity ? 'charge' : 'text';

  return {
    sourceKey: invoice.sourceKey,
    invoiceNumber: invoice.invoiceNumber,
    lineKey: `${invoice.sourceKey}-KFK-INVOICE-${invoice.invoiceNumber}-LINE-${position || '0'}`,
    position,
    lineType,
    tariffCode: '',
    marker: '',
    quantity,
    description: description || 'Rechnungsposition',
    unitPrice: formatUnitPriceFromAmount(amountSource, row.PossAnz),
    amount,
    taxPoints: '',
    notes: clean(row.PossMWST) ? `MWST ${clean(row.PossMWST)}` : '',
    raw: row,
  };
}

function plannedWorkFromInvoiceLine(line: GenesisBundleInvoiceLine): GenesisBundlePlannedWork {
  return {
    sourceKey: line.sourceKey,
    workKey: `${line.lineKey}-SUGGESTION`,
    source: 'invoiceLine',
    tariffCode: line.tariffCode,
    lineType: line.lineType,
    invoiceNumber: line.invoiceNumber,
    position: line.position,
    month: '',
    tour: '',
    quantity: line.quantity,
    description: line.description,
    tp: line.taxPoints,
    amount: line.amount,
    minutes: line.tariffCode === '60+01' ? line.quantity : '',
    unitPrice: line.unitPrice,
    taxPoints: line.taxPoints,
    confidence: line.lineType === 'charge' ? 88 : line.lineType === 'text' ? 72 : 35,
    reason: `Aus Rechnung ${line.invoiceNumber}`,
    notes: line.lineType === 'control' ? 'Kontrollzeile aus Rechnung, nicht als abrechenbare Position verwenden.' : '',
    raw: line.raw,
  };
}

function latestInvoiceNumbersBySourceKey(invoices: GenesisBundleInvoice[]): Set<string> {
  const latestBySourceKey = new Map<string, GenesisBundleInvoice>();
  for (const invoice of invoices) {
    const current = latestBySourceKey.get(invoice.sourceKey);
    const invoiceDate = invoice.workDate || invoice.invoiceDate || invoice.invoiceNumber;
    const currentDate = current ? current.workDate || current.invoiceDate || current.invoiceNumber : '';
    if (!current || invoiceDate.localeCompare(currentDate) > 0) {
      latestBySourceKey.set(invoice.sourceKey, invoice);
    }
  }
  return new Set([...latestBySourceKey.values()].map((invoice) => invoice.invoiceNumber));
}

function safePathSegment(value: string): string {
  return clean(value).replace(/[^A-Za-z0-9._-]+/g, '_') || 'unnamed';
}

function normalizedZipPath(entryName: string): string {
  return entryName.replace(/\\/g, '/');
}

function pdfKindForPath(normalizedPath: string): GenesisPdfDocumentKind {
  const basename = normalizedPath.split('/').pop() ?? normalizedPath;
  if (/^\d+-rechnung\.pdf$/i.test(basename)) {
    return 'invoice';
  }
  if (/^\d+-mahnung/i.test(basename)) {
    return 'reminder';
  }
  if (/^\d+-zahlungserinnerung/i.test(basename)) {
    return 'paymentReminder';
  }
  if (/rapport/i.test(basename)) {
    return 'rapport';
  }
  if (normalizedPath.toLowerCase().startsWith('export/')) {
    return 'export';
  }
  return 'other';
}

function invoiceNumberFromPdfName(fileName: string): string {
  return clean(fileName.match(/^(\d+)-(?:rechnung|mahnung|zahlungserinnerung)/i)?.[1] ?? '');
}

function invoiceNumberFromPdfEntryName(entryName: string): string {
  const normalizedPath = normalizedZipPath(entryName);
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  return invoiceNumberFromPdfName(fileName);
}

function rapportInfoFromPdfName(fileName: string): { sourceKey: string; date: string } {
  const match = fileName.match(/^(\d+)-(\d+)-(.+)-([^-]+)-\d+-Rapport[^-]*-(\d{8})?\.pdf$/i);
  if (!match) {
    return { sourceKey: '', date: '' };
  }
  return {
    sourceKey: buildSourceKey(match[1], match[2], match[3], match[4]),
    date: normalizeCompactDate(match[5] ?? ''),
  };
}

export function mapPdfDocument(
  entryName: string,
  knownInvoiceNumbers: Set<string>,
  knownSourceKeys: Set<string>,
): GenesisBundlePdfDocument | null {
  if (!/\.pdf$/i.test(entryName)) {
    return null;
  }

  const normalizedPath = normalizedZipPath(entryName);
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  const kind = pdfKindForPath(normalizedPath);
  const invoiceNumber = invoiceNumberFromPdfName(fileName);
  const rapportInfo = kind === 'rapport' ? rapportInfoFromPdfName(fileName) : { sourceKey: '', date: '' };
  const sourceKey = invoiceNumber ? '' : rapportInfo.sourceKey;
  const safeRelativePath = ['pdfs', ...normalizedPath.split('/').map(safePathSegment)].join('/');
  const matched = invoiceNumber ? knownInvoiceNumbers.has(invoiceNumber) : Boolean(sourceKey && knownSourceKeys.has(sourceKey));

  return {
    sourceKey,
    documentKey: `${kind}-${invoiceNumber || sourceKey || 'global'}-${safePathSegment(fileName)}`,
    kind,
    relativePath: safeRelativePath,
    archivePath: entryName,
    fileName,
    invoiceNumber,
    date: rapportInfo.date,
    matched,
    raw: { archivePath: entryName },
  };
}

export function countUnmatchedAssignablePdfDocuments(documents: GenesisBundlePdfDocument[]): number {
  return documents.filter((document) => document.kind !== 'export' && !document.matched).length;
}

function documentCountsFor(documents: GenesisBundlePdfDocument[]): Record<string, number> {
  return documents.reduce<Record<string, number>>((counts, document) => {
    counts[document.kind] = (counts[document.kind] ?? 0) + 1;
    if (!document.matched) {
      counts.unmatched = (counts.unmatched ?? 0) + 1;
    }
    if (document.kind !== 'export' && !document.matched) {
      counts.unmatchedAssignable = (counts.unmatchedAssignable ?? 0) + 1;
    }
    return counts;
  }, {});
}

async function readZipDatabase(zip: JSZip, fileName: string, warnings: string[]): Promise<TableMap> {
  const entryPath = findGenesisDatabaseEntryPath(
    Object.entries(zip.files)
      .filter(([, entry]) => !entry.dir)
      .map(([entryName]) => entryName),
    fileName,
  );
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

export function findGenesisDatabaseEntryPath(entryNames: string[], fileName: string): string | null {
  const targetFileName = fileName.toLowerCase();
  const candidates = entryNames
    .map((entryName) => {
      const normalizedPath = entryName.replace(/\\/g, '/');
      const normalizedLower = normalizedPath.toLowerCase();
      const basename = normalizedLower.split('/').pop() ?? '';
      return {
        entryName,
        normalizedLower,
        basename,
      };
    })
    .filter((entry) => entry.basename === targetFileName);

  if (!candidates.length) {
    return null;
  }

  const dataEntry = candidates.find((entry) => entry.normalizedLower.startsWith('daten/'))
    ?? candidates.find((entry) => entry.normalizedLower.includes('/daten/'));

  return (dataEntry ?? candidates[0]).entryName;
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
  const fkPropertyRows = databases['FKSTAMM.MDB']?.GebStamm ?? [];
  const fkRows = databases['FKSTAMM.MDB']?.FestStoff ?? [];
  const opRows = databases['OPSTAMM.MDB']?.OP ?? [];
  const opInvoiceLineRows = databases['OPSTAMM.MDB']?.RechPos ?? [];
  const rechDiversRows = databases['KFKRECH.MDB']?.RechDivers ?? [];
  const kfkInvoiceLineRows = databases['KFKRECH.MDB']?.RechZeilen ?? [];
  const zipFileEntries = Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .map(([entryName]) => entryName);
  const pdfInvoiceNumbers = new Set(zipFileEntries.map(invoiceNumberFromPdfEntryName).filter(Boolean));

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

  const plannedWork = arbvolRows.map(mapPlannedWork);
  const tariffCatalog = new Map((kfdTables.Tarife ?? []).map((row) => [clean(row.TKurz).toLowerCase(), row]));
  const tariffSuggestions = (kfdTables.GTarife ?? [])
    .map((row, index) => mapTariffSuggestion(row, tariffCatalog, index))
    .filter((item): item is GenesisBundlePlannedWork => Boolean(item));
  const rechDiversByNumber = new Map(rechDiversRows.map((row) => [Number(row.OPRechNr), row]));
  const invoices = opRows
    .map((row) => mapInvoice(row, rechDiversByNumber))
    .filter((invoice) => invoice.invoiceNumber && invoice.sourceKey);
  const invoicesByNumber = new Map(invoices.map((invoice) => [invoice.invoiceNumber, invoice]));
  for (const row of rechDiversRows) {
    const invoice = mapKfkInvoice(row);
    if (!invoice || invoicesByNumber.has(invoice.invoiceNumber) || !pdfInvoiceNumbers.has(invoice.invoiceNumber)) {
      continue;
    }
    invoices.push(invoice);
    invoicesByNumber.set(invoice.invoiceNumber, invoice);
  }

  const fallbackCounts = {
    fk: 0,
    arbvol: 0,
    invoice: 0,
  };
  const propertyMap = new Map<string, GenesisBundleProperty>();
  for (const [index, row] of (kfdTables.GebStamm ?? []).entries()) {
    const property = mapKfdProperty(row, index, helpers);
    propertyMap.set(property.sourceKey, property);
  }
  for (const [index, row] of fkPropertyRows.entries()) {
    const property = mapFkProperty(row, index, helpers);
    if (!propertyMap.has(property.sourceKey)) {
      propertyMap.set(property.sourceKey, property);
      fallbackCounts.fk += 1;
    }
  }
  for (const [sourceKey, rows] of helpers.arbvolBySourceKey.entries()) {
    if (!propertyMap.has(sourceKey)) {
      propertyMap.set(sourceKey, mapArbvolFallbackProperty(sourceKey, rows));
      fallbackCounts.arbvol += 1;
    }
  }
  for (const invoice of invoices) {
    if (!propertyMap.has(invoice.sourceKey)) {
      propertyMap.set(invoice.sourceKey, mapInvoiceFallbackProperty(invoice));
      fallbackCounts.invoice += 1;
    }
  }
  const properties = [...propertyMap.values()];
  const propertySourceKeys = new Set(properties.map((property) => property.sourceKey));

  const invoiceLines = opInvoiceLineRows
    .map((row) => {
      const invoice = invoicesByNumber.get(clean(row.RechNr));
      return invoice ? mapInvoiceLine(row, invoice) : null;
    })
    .filter((line): line is GenesisBundleInvoiceLine => Boolean(line));
  const invoiceLineKeys = new Set(invoiceLines.map((line) => `${line.invoiceNumber}-${line.position}`));
  for (const row of kfkInvoiceLineRows) {
    const invoice = invoicesByNumber.get(clean(row.OPRechNr));
    const key = `${clean(row.OPRechNr)}-${clean(row.PossNr)}`;
    if (invoice && !invoiceLineKeys.has(key)) {
      invoiceLines.push(mapKfkInvoiceLine(row, invoice));
      invoiceLineKeys.add(key);
    }
  }
  const latestInvoiceNumbers = latestInvoiceNumbersBySourceKey(invoices);
  const invoiceLineSuggestions = invoiceLines
    .filter((line) => latestInvoiceNumbers.has(line.invoiceNumber))
    .map(plannedWorkFromInvoiceLine);
  const history = (kfdTables.Archiv ?? []).map(mapHistory);
  const pdfDocuments = zipFileEntries
    .map((entryName) => mapPdfDocument(entryName, new Set(invoicesByNumber.keys()), propertySourceKeys))
    .filter((document): document is GenesisBundlePdfDocument => Boolean(document));
  const documentCounts = documentCountsFor(pdfDocuments);

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
  for (const invoice of invoices) {
    if (!propertySourceKeys.has(invoice.sourceKey)) {
      warnings.push(`Rechnung ${invoice.invoiceNumber} verweist auf nicht importierte Liegenschaft ${invoice.sourceKey}.`);
    }
  }
  if (fallbackCounts.fk) {
    warnings.push(`${fallbackCounts.fk} ${fallbackCounts.fk === 1 ? 'Liegenschaft wurde' : 'Liegenschaften wurden'} aus FKSTAMM/GebStamm ergänzt.`);
  }
  if (fallbackCounts.arbvol) {
    warnings.push(`${fallbackCounts.arbvol} Liegenschaften wurden nur aus ARBVOL ergänzt.`);
  }
  if (fallbackCounts.invoice) {
    warnings.push(`${fallbackCounts.invoice} Liegenschaften wurden nur aus Rechnungsdaten ergänzt.`);
  }
  const unmatchedPdfCount = countUnmatchedAssignablePdfDocuments(pdfDocuments);
  if (unmatchedPdfCount) {
    warnings.push(`${unmatchedPdfCount} zuordnungsrelevante PDF-Dokumente konnten keiner Liegenschaft/Rechnung eindeutig zugeordnet werden.`);
  }

  return {
    bundle: {
      schemaVersion: 'genesis-bundle.v2',
      metadata: {
        exportedAt: new Date().toISOString(),
        converterVersion: CONVERTER_VERSION,
        sourceFileName: path.basename(sourcePath),
        tableCounts,
        documentCounts,
        warnings,
      },
      properties,
      installations,
      plannedWork: [...tariffSuggestions, ...invoiceLineSuggestions, ...plannedWork],
      invoices,
      invoiceLines,
      pdfDocuments,
      history,
    },
    audit: {
      sourcePath,
      tableCounts,
      warnings,
    },
  };
}
