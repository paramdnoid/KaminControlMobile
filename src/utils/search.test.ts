import assert from 'node:assert/strict';

import type { CustomerProperty } from '../types';
import { expandText, foldText, searchProperties } from './search';

function property(partial: Partial<CustomerProperty>): CustomerProperty {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    customerNumber: '',
    propertyLabel: '',
    street: '',
    postalCode: '',
    city: '',
    buildingType: '',
    otherBuildingType: '',
    owner: '',
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
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

// --- normalization -----------------------------------------------------------
assert.equal(foldText('Zürich'), 'zurich');
assert.equal(foldText('Müller, Genève'), 'muller geneve');
assert.equal(foldText('Straße'), 'strasse');
assert.equal(expandText('Müller'), 'mueller');
assert.equal(expandText('Zürich'), 'zuerich');

const data: CustomerProperty[] = [
  property({ id: 'a', customerNumber: '1001', owner: 'Müller', street: 'Bahnhofstrasse 1', city: 'Zürich', postalCode: '8001' }),
  property({ id: 'b', customerNumber: '1002', owner: 'Meier', street: 'Seestrasse 7', city: 'Bern', postalCode: '3000' }),
  property({ id: 'c', customerNumber: '1003', owner: 'Müller', street: 'Dorfweg 3', city: 'Bern', postalCode: '3001' }),
  property({ id: 'd', customerNumber: '2050', owner: 'Schmidt', street: 'Hauptstrasse 12', city: 'Genève', postalCode: '1200', isActive: false }),
];

function ids(list: CustomerProperty[]): string[] {
  return list.map((p) => p.id);
}

// Empty query keeps the default order (active first, then city/street/number).
assert.deepEqual(ids(searchProperties(data, '', 10)), ['c', 'b', 'a', 'd']);

// Diacritic-insensitive: "zurich" finds "Zürich".
assert.deepEqual(ids(searchProperties(data, 'zurich', 10)), ['a']);

// Umlaut expansion both ways: "mueller" finds owner "Müller".
assert.deepEqual(ids(searchProperties(data, 'mueller', 10)).sort(), ['a', 'c']);
assert.deepEqual(ids(searchProperties(data, 'müller', 10)).sort(), ['a', 'c']);

// Multi-word AND across fields: name in one field, city in another.
assert.deepEqual(ids(searchProperties(data, 'müller bern', 10)), ['c']);

// No match for a word that exists nowhere together.
assert.deepEqual(ids(searchProperties(data, 'müller genève', 10)), []);

// Customer number ranks the exact id first.
assert.equal(searchProperties(data, '1002', 10)[0]?.id, 'b');

// Typo tolerance: "muler" still finds "Müller".
assert.ok(ids(searchProperties(data, 'muler', 10)).includes('a'));

// Limit is respected.
assert.equal(searchProperties(data, 'strasse', 1).length, 1);
