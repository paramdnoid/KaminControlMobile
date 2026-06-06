import assert from 'node:assert/strict';

import {
  buildSourceKey,
  clean,
  mapHistory,
  mapInstallation,
  mapKfdProperty,
  mapPlannedWork,
} from '../src/genesisConverter';

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
