import type { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';

import {
  ADDRESS_ROLES,
  BUILDING_TYPES,
  CLEANING_MONTHS,
  FIRE_SYSTEM_CODES,
  FUEL_TYPES,
  type AddressRole,
  type BuildingType,
  type CleaningMonth,
  type FireSystemCode,
  type FuelType,
  type ImportCandidate,
  type ImportPreview,
} from '../types';
import { compact, normalizeLookup } from '../utils/text';

type RawRow = Record<string, unknown>;

const headerAliases = {
  customerNumber: ['kundennummer', 'kunden nummer', 'kunde nr', 'kunden nr', 'kundennr', 'kundenid'],
  propertyLabel: ['liegenschaft', 'objekt', 'objektname', 'standort'],
  street: ['strasse', 'straße', 'adresse', 'liegenschaft adresse', 'hausadresse', 'strasse und hausnummer'],
  postalCode: ['plz', 'postleitzahl'],
  city: ['ort', 'stadt', 'gemeinde'],
  buildingType: ['gebaeudeart', 'gebäudeart', 'haustyp'],
  otherBuildingType: ['sonstiges', 'gebaeudeart sonstiges', 'gebäudeart sonstiges'],
  owner: ['eigentuemer', 'eigentümer', 'besitzer', 'owner'],
  tenant: ['mieter', 'tenant'],
  management: ['verwaltung', 'verwaltungsadresse'],
  caretaker: ['hauswart', 'abwart'],
  billingRole: ['rechnungsadresse ist', 'rechnung adresse', 'rechnungsadresse', 'rechnung an'],
  notificationRole: ['avisierungsadresse ist', 'avisierung adresse', 'avisierungsadresse', 'avis an'],
  fuelTypes: ['brennstoff', 'brennstoffe'],
  fireSystemCodes: ['feuerungsanlagen', 'anlagen', 'feuerungsanlage codes'],
  oilBoiler: ['oelheizung kessel', 'ölheizung kessel', 'kessel', 'oelkessel', 'ölkessel'],
  kwh: ['kwh', 'kw h', 'leistung'],
  buildYear: ['baujahr', 'jahrgang'],
  tour: ['tour', 'tour nummer', 'tournr'],
  cleaningMonths: ['reinigung monate', 'reinigung in den monaten', 'monate'],
} as const;

export const IMPORT_TEMPLATE_HEADERS = [
  'Kundennummer',
  'Liegenschaft',
  'Strasse',
  'PLZ',
  'Ort',
  'Gebaeudeart',
  'Eigentuemer',
  'Mieter',
  'Verwaltung',
  'Hauswart',
  'Rechnungsadresse ist',
  'Avisierungsadresse ist',
  'Brennstoff',
  'Feuerungsanlagen',
  'Oelheizung Kessel',
  'kWh',
  'Baujahr',
  'Tour',
  'Reinigung Monate',
];

function normalizeHeaders(row: RawRow): Record<string, string> {
  return Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[normalizeLookup(key)] = compact(value == null ? '' : String(value));
    return acc;
  }, {});
}

function readField(row: Record<string, string>, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const value = row[normalizeLookup(alias)];
    if (value) {
      return value;
    }
  }
  return '';
}

function readCheckboxColumns<T extends string>(
  row: Record<string, string>,
  values: readonly T[],
  labels: Record<T, string[]>,
): T[] {
  return values.filter((value) => {
    const aliases = labels[value] ?? [value];
    return aliases.some((alias) => isTruthy(row[normalizeLookup(alias)]));
  });
}

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'x', 'ja', 'yes', 'true', 'wahr'].includes(normalizeLookup(value));
}

function parseList<T extends string>(
  value: string,
  allowed: readonly T[],
  labels: Record<T, string[]>,
): T[] {
  if (!value) {
    return [];
  }

  const tokens = value
    .split(/[;,/|]+/)
    .map((token) => normalizeLookup(token))
    .filter(Boolean);

  return allowed.filter((option) => {
    const aliases = [option, ...(labels[option] ?? [])].map(normalizeLookup);
    return tokens.some((token) => aliases.includes(token));
  });
}

function parseBuildingType(value: string): { buildingType: BuildingType | ''; other: string } {
  const normalized = normalizeLookup(value);

  for (const type of BUILDING_TYPES) {
    if (normalizeLookup(type) === normalized) {
      return { buildingType: type, other: '' };
    }
  }

  if (!value) {
    return { buildingType: '', other: '' };
  }

  return { buildingType: 'Sonstiges', other: value };
}

function parseRole(value: string): AddressRole | '' {
  const normalized = normalizeLookup(value);

  if (!normalized) {
    return '';
  }

  if (['eigentuemer', 'besitzer', 'owner'].includes(normalized)) {
    return 'Eigentuemer';
  }

  return ADDRESS_ROLES.find((role) => normalizeLookup(role) === normalized) ?? '';
}

function mapRawRow(rawRow: RawRow, rowNumber: number): ImportCandidate | null {
  const row = normalizeHeaders(rawRow);
  const building = parseBuildingType(readField(row, headerAliases.buildingType));
  const fuelFromValue = parseList<FuelType>(readField(row, headerAliases.fuelTypes), FUEL_TYPES, {
    Holz: ['holz'],
    Oel: ['oel', 'öl'],
    Gas: ['gas'],
    Andere: ['andere', 'sonstige'],
  });
  const fuelFromColumns = readCheckboxColumns<FuelType>(row, FUEL_TYPES, {
    Holz: ['holz'],
    Oel: ['oel', 'öl'],
    Gas: ['gas'],
    Andere: ['andere'],
  });
  const fireSystemCodes = [
    ...new Set([
      ...parseList<FireSystemCode>(readField(row, headerAliases.fireSystemCodes), FIRE_SYSTEM_CODES, {
        Ka: ['ka'],
        Oez: ['oez', 'öz'],
        Gz: ['gz'],
        al: ['al'],
        Hz: ['hz'],
        Pz: ['pz'],
        Kz: ['kz'],
        Sb: ['sb'],
        Of: ['of'],
        He: ['he'],
        Ch: ['ch'],
        Oeo: ['oeo', 'öo'],
        So: ['so'],
        HK: ['hk'],
      }),
      ...readCheckboxColumns<FireSystemCode>(row, FIRE_SYSTEM_CODES, {
        Ka: ['ka'],
        Oez: ['oez', 'öz'],
        Gz: ['gz'],
        al: ['al'],
        Hz: ['hz'],
        Pz: ['pz'],
        Kz: ['kz'],
        Sb: ['sb'],
        Of: ['of'],
        He: ['he'],
        Ch: ['ch'],
        Oeo: ['oeo', 'öo'],
        So: ['so'],
        HK: ['hk'],
      }),
    ]),
  ];
  const cleaningMonths = [
    ...new Set([
      ...parseList<CleaningMonth>(readField(row, headerAliases.cleaningMonths), CLEANING_MONTHS, {
        Jan: ['januar', 'jan'],
        Feb: ['februar', 'feb'],
        Mrz: ['maerz', 'märz', 'mrz'],
        Apr: ['april', 'apr'],
        Mai: ['mai'],
        Juni: ['juni', 'jun'],
        Juli: ['juli', 'jul'],
        Aug: ['august', 'aug'],
        Sep: ['september', 'sep'],
        Okt: ['oktober', 'okt'],
        Nov: ['november', 'nov'],
        Dez: ['dezember', 'dez'],
      }),
      ...readCheckboxColumns<CleaningMonth>(row, CLEANING_MONTHS, {
        Jan: ['jan', 'januar'],
        Feb: ['feb', 'februar'],
        Mrz: ['mrz', 'maerz', 'märz'],
        Apr: ['apr', 'april'],
        Mai: ['mai'],
        Juni: ['juni'],
        Juli: ['juli'],
        Aug: ['aug'],
        Sep: ['sep'],
        Okt: ['okt'],
        Nov: ['nov'],
        Dez: ['dez'],
      }),
    ]),
  ];

  const property = {
    customerNumber: readField(row, headerAliases.customerNumber),
    propertyLabel: readField(row, headerAliases.propertyLabel),
    street: readField(row, headerAliases.street),
    postalCode: readField(row, headerAliases.postalCode),
    city: readField(row, headerAliases.city),
    buildingType: building.buildingType,
    otherBuildingType: readField(row, headerAliases.otherBuildingType) || building.other,
    owner: readField(row, headerAliases.owner),
    tenant: readField(row, headerAliases.tenant),
    management: readField(row, headerAliases.management),
    caretaker: readField(row, headerAliases.caretaker),
    billingRole: parseRole(readField(row, headerAliases.billingRole)),
    notificationRole: parseRole(readField(row, headerAliases.notificationRole)),
    fuelTypes: [...new Set([...fuelFromValue, ...fuelFromColumns])],
    fireSystemCodes,
    oilBoiler: readField(row, headerAliases.oilBoiler),
    kwh: readField(row, headerAliases.kwh),
    buildYear: readField(row, headerAliases.buildYear),
    tour: readField(row, headerAliases.tour),
    cleaningMonths,
  };

  const warnings: string[] = [];
  if (!property.customerNumber) {
    warnings.push('Keine Kundennummer.');
  }
  if (!property.street) {
    warnings.push('Keine Liegenschaftsadresse.');
  }
  if (!property.city) {
    warnings.push('Kein Ort.');
  }

  if (!property.customerNumber && !property.street) {
    return null;
  }

  return { rowNumber, property, warnings };
}

function parseCsv(text: string): RawRow[] {
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => compact(header),
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors[0]?.message ?? 'CSV konnte nicht gelesen werden.');
  }

  return parsed.data;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of normalized) {
    if (char === '=') {
      break;
    }

    const value = alphabet.indexOf(char);
    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes).buffer;
}

function cellToString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return compact(value == null ? '' : String(value));
}

async function parseXlsx(base64: string): Promise<RawRow[]> {
  const rows = await readSheet(base64ToArrayBuffer(base64));
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map(cellToString);
  return rows.slice(1).map((row) =>
    headers.reduce<RawRow>((acc, header, index) => {
      if (header) {
        acc[header] = cellToString(row[index]);
      }
      return acc;
    }, {}),
  );
}

async function readAssetText(asset: DocumentPickerAsset): Promise<string> {
  if (asset.file && 'text' in asset.file) {
    return asset.file.text();
  }

  return FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function readAssetBase64(asset: DocumentPickerAsset): Promise<string> {
  if (asset.base64) {
    return asset.base64;
  }

  return FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function parseImportAsset(asset: DocumentPickerAsset): Promise<ImportPreview> {
  const lowerName = asset.name.toLowerCase();
  const rows = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')
    ? await parseXlsx(await readAssetBase64(asset))
    : parseCsv(await readAssetText(asset));

  const candidates: ImportCandidate[] = [];
  const skippedRows: ImportPreview['skippedRows'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const candidate = mapRawRow(row, rowNumber);
    if (candidate) {
      candidates.push(candidate);
    } else {
      skippedRows.push({ rowNumber, reason: 'Keine Kundennummer oder Adresse gefunden.' });
    }
  });

  return {
    fileName: asset.name,
    totalRows: rows.length,
    candidates,
    skippedRows,
  };
}
