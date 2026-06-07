// Platform-independent normalizers shared by the SQLite (native) and web-store
// implementations. Pure functions only — no platform APIs. See database.ts for the
// dispatcher and databaseSqlite.ts / databaseWeb.ts for the two implementations.
import type {
  CustomerProperty,
  GenesisBundleProperty,
  GenesisInvoice,
  GenesisInvoiceLine,
  GenesisPdfDocument,
  GenesisPlannedWork,
} from '../types';
import { compact } from '../utils/text';

export function normalizeSuggestionSource(source: unknown): GenesisPlannedWork['source'] {
  if (source === 'objectTariff') {
    return 'objectTariff';
  }
  if (source === 'invoiceLine') {
    return 'invoiceLine';
  }
  if (source === 'history') {
    return 'history';
  }
  return 'arbvol';
}

export function normalizeLineType(lineType: unknown): GenesisPlannedWork['lineType'] {
  return lineType === 'text' || lineType === 'control' ? lineType : 'charge';
}

export function defaultLineTypeForSource(source: GenesisPlannedWork['source']): GenesisPlannedWork['lineType'] {
  return source === 'arbvol' || source === 'history' ? 'text' : 'charge';
}

export function normalizePlannedWorkItem(
  item: Partial<GenesisPlannedWork> & { sourceKey: string; workKey: string },
): Omit<GenesisPlannedWork, 'id' | 'propertyId'> {
  const source = normalizeSuggestionSource(item.source);
  return {
    sourceKey: compact(item.sourceKey),
    workKey: compact(item.workKey),
    source,
    tariffCode: compact(item.tariffCode ?? ''),
    lineType: item.lineType ? normalizeLineType(item.lineType) : defaultLineTypeForSource(source),
    invoiceNumber: compact(item.invoiceNumber ?? ''),
    position: compact(item.position ?? ''),
    month: item.month ?? '',
    tour: compact(item.tour ?? ''),
    quantity: compact(item.quantity ?? ''),
    description: compact(item.description ?? ''),
    tp: compact(item.tp ?? ''),
    amount: compact(item.amount ?? ''),
    minutes: compact(item.minutes ?? ''),
    unitPrice: compact(item.unitPrice ?? ''),
    taxPoints: compact(item.taxPoints ?? ''),
    confidence: Number.isFinite(item.confidence) ? Number(item.confidence) : 0,
    reason: compact(item.reason ?? ''),
    notes: compact(item.notes ?? ''),
  };
}

export function normalizeInvoiceItem(
  item: Partial<GenesisInvoice> & { sourceKey: string; invoiceKey: string; invoiceNumber: string },
): Omit<GenesisInvoice, 'id' | 'propertyId'> {
  return {
    sourceKey: compact(item.sourceKey),
    invoiceKey: compact(item.invoiceKey),
    invoiceNumber: compact(item.invoiceNumber),
    workDate: compact(item.workDate ?? ''),
    invoiceDate: compact(item.invoiceDate ?? ''),
    dueDate: compact(item.dueDate ?? ''),
    paidDate: compact(item.paidDate ?? ''),
    status: item.status === 'open' || item.status === 'paid' || item.status === 'partial' ? item.status : 'unknown',
    dunningLevel: compact(item.dunningLevel ?? ''),
    netAmount: compact(item.netAmount ?? ''),
    vatAmount: compact(item.vatAmount ?? ''),
    totalAmount: compact(item.totalAmount ?? ''),
    paidAmount: compact(item.paidAmount ?? ''),
    invoiceAddress: compact(item.invoiceAddress ?? ''),
    propertyAddress: compact(item.propertyAddress ?? ''),
    notes: compact(item.notes ?? ''),
  };
}

export function normalizeInvoiceLineItem(
  item: Partial<GenesisInvoiceLine> & { sourceKey: string; invoiceNumber: string; lineKey: string },
): Omit<GenesisInvoiceLine, 'id' | 'propertyId'> {
  return {
    sourceKey: compact(item.sourceKey),
    invoiceNumber: compact(item.invoiceNumber),
    lineKey: compact(item.lineKey),
    position: compact(item.position ?? ''),
    lineType: normalizeLineType(item.lineType),
    tariffCode: compact(item.tariffCode ?? ''),
    marker: compact(item.marker ?? ''),
    quantity: compact(item.quantity ?? ''),
    description: compact(item.description ?? ''),
    unitPrice: compact(item.unitPrice ?? ''),
    amount: compact(item.amount ?? ''),
    taxPoints: compact(item.taxPoints ?? ''),
    notes: compact(item.notes ?? ''),
  };
}

export function normalizePdfDocumentItem(
  item: Partial<GenesisPdfDocument> & { documentKey: string; relativePath: string },
): Omit<GenesisPdfDocument, 'id' | 'propertyId'> {
  return {
    sourceKey: compact(item.sourceKey ?? ''),
    documentKey: compact(item.documentKey),
    kind: item.kind === 'invoice' || item.kind === 'reminder' || item.kind === 'paymentReminder' || item.kind === 'rapport' || item.kind === 'export'
      ? item.kind
      : 'other',
    relativePath: compact(item.relativePath),
    archivePath: compact(item.archivePath ?? ''),
    localUri: compact(item.localUri ?? ''),
    fileName: compact(item.fileName ?? ''),
    invoiceNumber: compact(item.invoiceNumber ?? ''),
    date: compact(item.date ?? ''),
    matched: Boolean(item.matched),
  };
}

export function normalizeManualProperty(
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...property,
    sourceKey: compact(property.sourceKey ?? ''),
    sourceSystem: property.sourceSystem ?? 'manual',
    isActive: property.isActive ?? true,
    lastImportedAt: compact(property.lastImportedAt ?? ''),
    customerNumber: compact(property.customerNumber),
    propertyLabel: compact(property.propertyLabel),
    street: compact(property.street),
    postalCode: compact(property.postalCode),
    city: compact(property.city),
    otherBuildingType: compact(property.otherBuildingType),
    owner: compact(property.owner),
    tenant: compact(property.tenant),
    management: compact(property.management),
    caretaker: compact(property.caretaker),
    oilBoiler: compact(property.oilBoiler),
    kwh: compact(property.kwh),
    buildYear: compact(property.buildYear),
    tour: compact(property.tour),
  };
}

export function normalizeGenesisProperty(
  property: GenesisBundleProperty,
  importedAt: string,
): Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'> {
  return normalizeManualProperty({
    ...property,
    sourceKey: compact(property.sourceKey),
    sourceSystem: 'genesis',
    isActive: true,
    lastImportedAt: importedAt,
  });
}
