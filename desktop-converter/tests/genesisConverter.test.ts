import assert from 'node:assert/strict';

import {
  buildSourceKey,
  clean,
  findGenesisDatabaseEntryPath,
  mapArbvolFallbackProperty,
  mapFkProperty,
  mapHistory,
  mapInvoice,
  mapInvoiceFallbackProperty,
  mapInvoiceLine,
  mapInstallation,
  mapKfdProperty,
  mapPdfDocument,
  mapPlannedWork,
  mapTariffSuggestion,
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

console.log('Genesis converter mapping tests passed.');
