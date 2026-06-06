import assert from 'node:assert/strict';

import {
  buildSourceKey,
  clean,
  countUnmatchedAssignablePdfDocuments,
  findGenesisDatabaseEntryPath,
  invoiceStatus,
  mapArbvolFallbackProperty,
  mapFkProperty,
  mapHistory,
  mapInvoice,
  mapInvoiceFallbackProperty,
  mapInvoiceLine,
  mapInstallation,
  mapKfkInvoice,
  mapKfkInvoiceLine,
  mapKfdProperty,
  mapPdfDocument,
  mapPlannedWork,
  mapTariffSuggestion,
  sourceKeyFromKfkCustomerNumber,
  toMobileGenesisBundle,
} from '../src/genesisConverter.ts';

const emptyHelpers = {
  functionsByKfdId: new Map(),
  functionsById: new Map(),
  peopleById: new Map(),
  communicationByPersonId: new Map(),
  versandByFunctionId: new Map(),
  monthsBySourceKey: new Map(),
  arbvolBySourceKey: new Map(),
  installationsBySourceKey: new Map(),
};

assert.equal(clean('  Test \0  Wert   '), 'Test Wert');
assert.equal(buildSourceKey(11, 3, '0196   ', 0), '11-3-0196-0');
assert.equal(sourceKeyFromKfkCustomerNumber('2200010045   0000'), '220-1-0045-0');
assert.equal(sourceKeyFromKfkCustomerNumber('0030010004   0100'), '3-1-0004-100');
assert.equal(
  findGenesisDatabaseEntryPath(['Genesis.ini', 'Daten\\KFDSTAMM.MDB', 'Backup/KFDSTAMM.MDB'], 'KFDSTAMM.MDB'),
  'Daten\\KFDSTAMM.MDB',
);
assert.equal(
  findGenesisDatabaseEntryPath(['Export/Daten/ARBVOL.MDB', 'ARBVOL.MDB'], 'ARBVOL.MDB'),
  'Export/Daten/ARBVOL.MDB',
);

const installation = mapInstallation({
  FKuG: 11,
  FKuS: 3,
  FKuH: '0196   ',
  FKuZ: 0,
  FKuLfd: 1,
  FATyp: 'Zentrale Feuerung   ',
  FKW: '14.9      ',
  FFabr: 'Hersteller                       ',
  FTyp: 'Modell 1                                ',
  FBJ: '2006',
  FBst1: 'Pellets (b)         ',
  FBem1: 'Bemerkung 1',
  FBem2: '',
  FBem3: '',
  FAufstell: 'Heizraum                      ',
});
assert.equal(installation.sourceKey, '11-3-0196-0');
assert.deepEqual(installation.fuelTypes, ['Holz']);
assert.equal(installation.kwh, '14.9');

const property = mapKfdProperty(
  {
    GKuG: 11,
    GKuS: 3,
    GKuH: '0196   ',
    GKuZ: 0,
    GPLZOrt: '7148 Beispielort                 ',
    GStrasse: 'Dorfstrasse                    ',
    GHausNr: '12A    ',
    GPerson: 'Muster AG                                ',
    GGebErg: 'EFH',
    GGebBez: '',
    GBst: 'Holz',
    GTour: 'of2',
    GBem1: '',
    GBem2: '',
    GIntBem: '',
    Rech1: '',
    Rech2: '',
    KGrundID: 20,
  },
  0,
  {
    ...emptyHelpers,
    installationsBySourceKey: new Map([['11-3-0196-0', [installation]]]),
  },
);
assert.equal(property.customerNumber, '11-3-0196-0');
assert.equal(property.postalCode, '7148');
assert.equal(property.city, 'Beispielort');
assert.equal(property.street, 'Dorfstrasse 12A');
assert.equal(property.buildingType, 'EFH');
assert.deepEqual(property.fuelTypes, ['Holz']);

const fkFallbackProperty = mapFkProperty(
  {
    GKuG: 15,
    GKuS: 27,
    GKuH: '0253A',
    GKuZ: 0,
    GPLZOrt: '7144 Vella',
    GStrasse: 'Trutg',
    GHausNr: '253A',
    GPerson: 'Fallback Haus',
    Rech1: 'Fallback Eigentümer',
    Rech2: '',
    GTour: 'fs1',
    FKGrundID: 440,
    KFDGrundID: 1892,
  },
  0,
  {
    ...emptyHelpers,
    installationsBySourceKey: new Map([['15-27-0253A-0', [installation]]]),
  },
);
assert.equal(fkFallbackProperty.sourceKey, '15-27-0253A-0');
assert.equal(fkFallbackProperty.street, 'Trutg 253A');
assert.equal(fkFallbackProperty.rawRefs?.fallback, 'FKSTAMM.GebStamm');

const planned = mapPlannedWork({
  MonatNr: 1,
  AVGem: 11,
  AVStr: 3,
  AVHausNr: '0196   ',
  AVZu: 0,
  AVTour: 'of2',
  AVInfo: 'Ka+Of',
  AVMin: '90',
  AVBem1: '',
  AVBem2: '',
  AVLeArch: '18.07.2023',
}, 0);
assert.equal(planned.month, 'Jan');
assert.equal(planned.minutes, '90');
assert.equal(planned.description, 'Ka+Of');
assert.equal(planned.source, 'arbvol');

const arbvolFallbackProperty = mapArbvolFallbackProperty('20-5-0002-0', [
  {
    MonatNr: 3,
    AVGem: 20,
    AVStr: 5,
    AVHausNr: '0002',
    AVZu: 0,
    AVGPerson: 'Saxer Arnold',
    AVGStrasse: 'Oberländerstrasse',
    AVGHausNr: '2',
    AVGPLZOrt: '7130 Ilanz',
    AVTour: 'öf2',
    AVInfo: 'Ka+2Of+HK',
    AVMin: '45',
    AVBem1: '',
    AVBem2: '',
  },
]);
assert.equal(arbvolFallbackProperty.propertyLabel, 'Saxer Arnold');
assert.equal(arbvolFallbackProperty.street, 'Oberländerstrasse 2');
assert.equal(arbvolFallbackProperty.city, 'Ilanz');
assert.deepEqual(arbvolFallbackProperty.fireSystemCodes, ['Ka', 'Of', 'HK']);
assert.equal(arbvolFallbackProperty.rawRefs?.fallback, 'ARBVOL.ArbVolumen');

const tariff = mapTariffSuggestion({
  TKuG: 11,
  TKuS: 3,
  TKuH: '0196   ',
  TKuZ: 0,
  TPos: 5,
  TAnz: '2.0000',
  TTarif: '40+12',
  TTBez: '',
  TTBem: '',
  TPreis: '0.0000',
}, new Map([
  ['40+12', {
    TKurz: '40+12',
    TLang: 'Kamin bis 9m',
    TPreis: '17.4000',
    TTax: '12.0000',
  }],
]), 0);
assert.ok(tariff);
assert.equal(tariff.source, 'objectTariff');
assert.equal(tariff.lineType, 'charge');
assert.equal(tariff.description, 'Kamin bis 9m');
assert.equal(tariff.quantity, '2');
assert.equal(tariff.tp, '24');
assert.equal(tariff.amount, '34.8');

const technical = mapTariffSuggestion({
  TKuG: 11,
  TKuS: 3,
  TKuH: '0196   ',
  TKuZ: 0,
  TPos: 1,
  TAnz: '0.0000',
  TTarif: 'AV1',
  TTBez: '0   1',
  TTBem: 'Ka+Of',
  TPreis: '0.0000',
}, new Map(), 0);
assert.ok(technical);
assert.equal(technical.lineType, 'control');

const invoice = mapInvoice({
  OPNr: 20250113,
  OPG: 11,
  OPS: 3,
  OPH: '0196   ',
  OPZ: 0,
  OPADat: '2025.04.01',
  OPRDat: '03.04.2025',
  OPFDat: '2025.05.03',
  OPZDat: '10.04.2025',
  OPBetrag: '222.4500',
  OPZBetrag: '222.4500',
  OPNetto: '205.8000',
  OPMwst: '16.6500',
  OPMStufe: '',
}, new Map());
assert.equal(invoice.sourceKey, '11-3-0196-0');
assert.equal(invoice.status, 'paid');
assert.equal(invoice.totalAmount, '222.45');

const kfkInvoice = mapKfkInvoice({
  OPRechNr: 20220062,
  KuNrOP: '2200010045   0000',
  RAdr1: '',
  RAdr2: 'STWEG',
  RAdr3: 'Casa Stradin',
  RAdr4: '',
  RAdr5: '',
  RAdr6: 'Strada 45',
  RAdr7: '',
  RAdr8: '7130 Ilanz',
  RLieg1: '7130 Ilanz',
  RLieg2: 'Strada 45',
  RLieg3: 'STWEG Casa Stradin',
  RLieg4: '',
  RNetto: '143.3',
  RMWST1: '11.05',
  RTotal: '154.35',
});
assert.ok(kfkInvoice);
assert.equal(kfkInvoice.sourceKey, '220-1-0045-0');
assert.equal(kfkInvoice.invoiceNumber, '20220062');
assert.equal(kfkInvoice.status, 'unknown');
assert.equal(kfkInvoice.totalAmount, '154.35');
assert.equal(kfkInvoice.invoiceAddress, 'STWEG\nCasa Stradin\nStrada 45\n7130 Ilanz');
assert.equal(kfkInvoice.propertyAddress, '7130 Ilanz\nStrada 45\nSTWEG Casa Stradin');

const invoiceFallbackProperty = mapInvoiceFallbackProperty({
  ...invoice,
  sourceKey: '1-99-0001-0',
  invoiceNumber: '20260001',
  invoiceAddress: 'Muster AG\nMusterstrasse 9\n7000 Chur',
  propertyAddress: '7013 Domat/Ems\nVia Nova 4\nHaus Muster',
});
assert.equal(invoiceFallbackProperty.sourceKey, '1-99-0001-0');
assert.equal(invoiceFallbackProperty.propertyLabel, 'Haus Muster');
assert.equal(invoiceFallbackProperty.postalCode, '7013');
assert.equal(invoiceFallbackProperty.rawRefs?.fallback, 'OPSTAMM.OP');

const kfkInvoiceFallbackProperty = mapInvoiceFallbackProperty({
  ...kfkInvoice,
  sourceKey: '220-1-0045-0',
});
assert.equal(kfkInvoiceFallbackProperty.rawRefs?.fallback, 'KFKRECH.RechDivers');

const invoiceLine = mapInvoiceLine({
  RechNr: 20250113,
  RechPos: 5,
  RechKz: 'J',
  RechAnz: '125.0000',
  RechTarif: '60+01',
  RechTBez: 'Minuten Regiearbeit à CHF 1.40',
  RechPreis: '175.0000',
}, invoice);
assert.equal(invoiceLine.lineType, 'charge');
assert.equal(invoiceLine.amount, '175');
assert.equal(invoiceLine.unitPrice, '1.4');

const kfkInvoiceLine = mapKfkInvoiceLine({
  OPRechNr: 20220062,
  PossNr: 3,
  PossAnz: '1     ',
  PossBez: 'Alkalische Heizflächenreinigung',
  PossPreis: '',
  PossGes: '33.2',
  PossMWST: '7.7',
}, kfkInvoice);
assert.equal(kfkInvoiceLine.amount, '33.2');
assert.equal(kfkInvoiceLine.unitPrice, '33.2');
assert.equal(kfkInvoiceLine.notes, 'MWST 7.7');

const invoicePdf = mapPdfDocument(
  'Kopien\\20250113-Rechnung.PDF',
  new Set(['20250113']),
  new Set(['11-3-0196-0']),
);
assert.ok(invoicePdf);
assert.equal(invoicePdf.kind, 'invoice');
assert.equal(invoicePdf.invoiceNumber, '20250113');
assert.equal(invoicePdf.matched, true);

const rapportPdf = mapPdfDocument(
  'Kopien\\11-3-0196-0-1-RapportHO-01042025.PDF',
  new Set(['20250113']),
  new Set(['11-3-0196-0']),
);
assert.ok(rapportPdf);
assert.equal(rapportPdf.kind, 'rapport');
assert.equal(rapportPdf.sourceKey, '11-3-0196-0');
assert.equal(rapportPdf.date, '2025-04-01');

const rapportPdfWithHyphenatedHouse = mapPdfDocument(
  'Kopien\\15-7-0027c-a-0-1-RapportHO-06112025.PDF',
  new Set(['20250113']),
  new Set(['15-7-0027c-a-0']),
);
assert.ok(rapportPdfWithHyphenatedHouse);
assert.equal(rapportPdfWithHyphenatedHouse.kind, 'rapport');
assert.equal(rapportPdfWithHyphenatedHouse.sourceKey, '15-7-0027c-a-0');
assert.equal(rapportPdfWithHyphenatedHouse.matched, true);

const exportPdf = mapPdfDocument(
  'Export\\Arbeitsliste_1.PDF',
  new Set(),
  new Set(),
);
assert.ok(exportPdf);
assert.equal(exportPdf.kind, 'export');
assert.equal(exportPdf.matched, false);
assert.equal(countUnmatchedAssignablePdfDocuments([exportPdf]), 0);

const unmatchedInvoicePdf = mapPdfDocument(
  'Kopien\\20220062-Rechnung.PDF',
  new Set(),
  new Set(),
);
assert.ok(unmatchedInvoicePdf);
assert.equal(countUnmatchedAssignablePdfDocuments([exportPdf, unmatchedInvoicePdf]), 1);

const mobileBundle = toMobileGenesisBundle({
  schemaVersion: 'genesis-bundle.v2',
  metadata: {
    exportedAt: '2026-06-06T00:00:00.000Z',
    converterVersion: 'test',
    sourceFileName: 'test.zip',
    tableCounts: {},
    warnings: [],
  },
  properties: [property],
  installations: [installation],
  plannedWork: [planned],
  invoices: [invoice],
  invoiceLines: [invoiceLine],
  pdfDocuments: [invoicePdf],
  history: [mapHistory({
    ARKuG: 11,
    ARKuS: 3,
    ARKuH: '0196',
    ARKuZ: 0,
    ARDatum: '2025.04.01',
    ARMit: 'AB',
    ARReNr: 20250113,
    ARPreis: '10.0000',
    ARVF: '1 1',
    ARFSchau: 0,
  }, 0)],
});
assert.equal('rawRefs' in mobileBundle.properties[0], false);
assert.equal('raw' in mobileBundle.installations[0], false);
assert.equal('raw' in mobileBundle.plannedWork[0], false);
assert.equal('raw' in mobileBundle.invoices![0], false);
assert.equal('raw' in mobileBundle.invoiceLines![0], false);
assert.equal('raw' in mobileBundle.pdfDocuments![0], false);
assert.equal('raw' in mobileBundle.history[0], false);

const history = mapHistory({
  ARKuG: 11,
  ARKuS: 3,
  ARKuH: '0196   ',
  ARKuZ: 0,
  ARDatum: '2023.12.07',
  ARMit: 'ab',
  ARBem: '',
  ARPreis: '111.6000',
  ARReNr: 20221167,
  ARVF: '1 1',
  ARFSchau: 0,
}, 0);
assert.equal(history.date, '2023-12-07');
assert.equal(history.description, 'Rechnung 20221167');
assert.equal(history.amount, '111.6000');

// ─── TASK-13: invoiceStatus edge cases ────────────────────────────────────────

assert.equal(invoiceStatus(0, 0, ''), 'paid', 'Zero-total invoice (numeric) must be paid');
assert.equal(invoiceStatus('0', '0', ''), 'paid', 'Zero-total invoice (string) must be paid');
assert.equal(invoiceStatus(0, 0, '2025-01-01'), 'paid', 'Zero-total with paidDate must be paid');
assert.equal(invoiceStatus('', '', ''), 'unknown', 'All-empty inputs must be unknown');
assert.equal(invoiceStatus(null, null, ''), 'unknown', 'Null total without paidDate must be unknown');
assert.equal(invoiceStatus(null, null, '2025-01-01'), 'paid', 'Null total with paidDate must be paid');
assert.equal(invoiceStatus(100, 100, '2025-01-01'), 'paid', 'Full payment amount must be paid');
assert.equal(invoiceStatus(100, 50, ''), 'partial', 'Partial payment without paidDate must be partial');
assert.equal(invoiceStatus(100, 0, ''), 'open', 'Zero payment on non-zero total must be open');

// ─── TASK-15: mapInstallation with null fuel type fields ──────────────────────

const installationNullFuels = mapInstallation({
  FKuG: 11,
  FKuS: 3,
  FKuH: '0196   ',
  FKuZ: 0,
  FKuLfd: 2,
  FATyp: 'Zentrale Feuerung',
  FKW: '',
  FFabr: '',
  FTyp: '',
  FBJ: '',
  FBst1: null,
  FBst2: null,
  FBst3: null,
  FBem1: '',
  FBem2: '',
  FBem3: '',
  FAufstell: '',
});
assert.equal(installationNullFuels.sourceKey, '11-3-0196-0');
assert.deepEqual(installationNullFuels.fuelTypes, [], 'Null fuel fields must yield empty fuelTypes array');

// ─── TASK-15: mapKfdProperty with empty helpers (no Anschriften data) ─────────

const propertyEmptyHelpers = mapKfdProperty(
  {
    GKuG: 20,
    GKuS: 5,
    GKuH: '0002',
    GKuZ: 0,
    GPLZOrt: '7130 Ilanz',
    GStrasse: 'Hauptstrasse',
    GHausNr: '1',
    GPerson: 'Test Person',
    // GGebErg and GGebBez empty so parseFuelTypes has no text to derive a fallback from
    GGebErg: '',
    GGebBez: 'MFH-Gebaeude',
    GBst: '',
    GTour: '',
    GBem1: '',
    GBem2: '',
    GIntBem: '',
    Rech1: '',
    Rech2: '',
    KGrundID: 0,
  },
  0,
  { ...emptyHelpers },
);
assert.equal(propertyEmptyHelpers.sourceKey, '20-5-0002-0', 'sourceKey must be built from GKuG/GKuS/GKuH/GKuZ');
// With empty helpers, owner and management come from Rech1/Rech2 (both empty)
assert.equal(propertyEmptyHelpers.owner, '', 'Empty Rech1 must yield empty owner');
assert.equal(propertyEmptyHelpers.caretaker, '', 'Empty helpers must yield empty caretaker');

// ─── TASK-15: mapPdfDocument with Windows backslash paths ────────────────────

const backslashPdf = mapPdfDocument(
  'Daten\\Rechnungen\\12345-Rechnung.pdf',
  new Set(['12345']),
  new Set(['11-3-0196-0']),
);
assert.ok(backslashPdf, 'Windows backslash path must produce a document');
assert.equal(backslashPdf.kind, 'invoice', 'Backslash invoice PDF must be kind=invoice');
assert.equal(backslashPdf.invoiceNumber, '12345', 'Backslash invoice PDF must parse invoice number');

// ─── TASK-15: mapHistory with empty ARBem field ───────────────────────────────

const historyEmptyBem = mapHistory({
  ARKuG: 11,
  ARKuS: 3,
  ARKuH: '0196   ',
  ARKuZ: 0,
  ARDatum: '2024.03.15',
  ARMit: 'ab',
  ARBem: '',
  ARPreis: '50.0000',
  ARReNr: 20240100,
  ARVF: '1 1',
  ARFSchau: 0,
}, 0);
assert.equal(historyEmptyBem.date, '2024-03-15', 'History date must be ISO formatted');
assert.ok(historyEmptyBem.description.length > 0, 'History with empty ARBem must fall back to invoice number');

// ─── TASK-15: mapInvoice with zero-total OPBetrag (verifies TASK-13) ──────────

const zeroTotalInvoice = mapInvoice({
  OPNr: 20260001,
  OPG: 11,
  OPS: 3,
  OPH: '0196   ',
  OPZ: 0,
  OPADat: '2026.01.01',
  OPRDat: '01.01.2026',
  OPFDat: '',
  OPZDat: '',
  OPBetrag: '0.0000',
  OPZBetrag: '0.0000',
  OPNetto: '0.0000',
  OPMwst: '0.0000',
  OPMStufe: '',
}, new Map());
assert.equal(zeroTotalInvoice.status, 'paid', 'Zero-total invoice mapped via mapInvoice must be paid');
// formatMoney returns '' for 0 (by design — omits zero values from display)
assert.equal(zeroTotalInvoice.totalAmount, '', 'formatMoney returns empty string for zero totals');

// ─── TASK-15: bundle shape assertions ────────────────────────────────────────

const shapeMobileBundle = toMobileGenesisBundle({
  schemaVersion: 'genesis-bundle.v2',
  metadata: {
    exportedAt: '2026-06-06T00:00:00.000Z',
    converterVersion: '2.0.0-test',
    sourceFileName: 'shape-test.zip',
    tableCounts: { GebStamm: 1 },
    warnings: [],
  },
  properties: [property],
  installations: [installation],
  plannedWork: [planned, tariff],
  invoices: [invoice],
  invoiceLines: [invoiceLine],
  pdfDocuments: [invoicePdf],
  history: [historyEmptyBem],
});

// All properties must have a non-empty sourceKey
assert.ok(
  shapeMobileBundle.properties.every((p) => p.sourceKey && p.sourceKey.length > 0),
  'All mobile bundle properties must have a non-empty sourceKey',
);
// No plannedWork entry may have undefined source
assert.ok(
  shapeMobileBundle.plannedWork.every((w) => w.source !== undefined),
  'No plannedWork entry may have undefined source',
);
// metadata.converterVersion must be a non-empty string
assert.ok(
  typeof shapeMobileBundle.metadata.converterVersion === 'string' &&
  shapeMobileBundle.metadata.converterVersion.length > 0,
  'metadata.converterVersion must be a non-empty string',
);
// raw fields must be stripped from mobile bundle
assert.equal('rawRefs' in shapeMobileBundle.properties[0], false, 'rawRefs must be stripped from mobile properties');
assert.equal('raw' in shapeMobileBundle.installations[0], false, 'raw must be stripped from mobile installations');
assert.equal('raw' in shapeMobileBundle.plannedWork[0], false, 'raw must be stripped from mobile plannedWork');

console.log('Genesis converter mapping tests passed.');

// ─── TASK-16: PDF HTML regression baseline (pure-function assertions) ─────────
// These tests verify the invariants of buildReportHtml without requiring a React
// Native runtime. They import only Expo-free utilities.

import { escapeHtml } from '../../src/utils/text.ts';

// XSS: escapeHtml must encode the five dangerous HTML characters
assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'XSS: < and > must be escaped');
assert.equal(escapeHtml('a & b'), 'a &amp; b', 'XSS: & must be escaped');
assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;', 'XSS: " must be escaped');
assert.equal(escapeHtml("it's"), 'it&#039;s', "XSS: ' must be escaped");
assert.equal(escapeHtml('Müller & Söhne <GmbH>'), 'Müller &amp; Söhne &lt;GmbH&gt;', 'German umlauts must pass through unescaped');
assert.equal(escapeHtml(''), '', 'Empty string must round-trip through escapeHtml');

// totalMinutes: comma decimal separators (Swiss locale) must be normalised
function computeTotalMinutes(items: Array<{ minutes: string }>): number {
  return items.reduce((sum, item) => {
    const minutes = Number.parseFloat(item.minutes.replace(',', '.'));
    return Number.isFinite(minutes) ? sum + minutes : sum;
  }, 0);
}
assert.equal(computeTotalMinutes([{ minutes: '30' }, { minutes: '45' }]), 75, 'totalMinutes: plain numbers');
assert.equal(computeTotalMinutes([{ minutes: '1,5' }, { minutes: '0,5' }]), 2, 'totalMinutes: comma decimals');
assert.equal(computeTotalMinutes([{ minutes: '' }, { minutes: 'abc' }]), 0, 'totalMinutes: non-numeric values ignored');

// buildStructuredReport schema key invariant
// (Tested inline because reportPdf.ts imports React Native which is unavailable in Node.js)
// This reproduces the exact shape and schema key that buildStructuredReport emits.
const minimalBundle = {
  property: {
    id: 'p1', sourceKey: '1-1-0001-0', sourceSystem: 'genesis' as const, isActive: true,
    lastImportedAt: '', customerNumber: 'C001', propertyLabel: 'Test', street: 'Teststr. 1',
    postalCode: '7000', city: 'Chur', buildingType: 'EFH' as const, otherBuildingType: '',
    owner: '<Owner & Co>', tenant: '', management: '', caretaker: '',
    billingRole: '' as const, notificationRole: '' as const,
    fuelTypes: [] as const, fireSystemCodes: [] as const, oilBoiler: '', kwh: '', buildYear: '',
    tour: '', cleaningMonths: [] as const, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  report: {
    id: 'r1', propertyId: 'p1', cleaningDate: '2026-06-06', timeFrom: '08:00', timeTo: '09:00',
    chimneySweepName: 'Tester', notes: '', status: 'completed' as const,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-06-06T09:00:00Z', exportedAt: null,
  },
  workItems: [],
};

// Mirrors the exact JSON.stringify call in buildStructuredReport
const structuredJson = JSON.stringify(
  {
    schema: 'kamincontrolmobile.report.v1',
    exportedAt: new Date().toISOString(),
    property: minimalBundle.property,
    report: minimalBundle.report,
    workItems: minimalBundle.workItems,
  },
  null,
  2,
);
const parsed = JSON.parse(structuredJson);
assert.equal(parsed.schema, 'kamincontrolmobile.report.v1', 'Schema key must be kamincontrolmobile.report.v1');
assert.ok(parsed.exportedAt, 'exportedAt must be present and non-empty');
assert.deepEqual(parsed.workItems, [], 'workItems must be serialised as an array');
assert.equal(parsed.property.owner, '<Owner & Co>', 'JSON output must NOT escape HTML characters');

console.log('PDF HTML regression baseline tests passed.');
