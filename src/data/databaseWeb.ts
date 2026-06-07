// Web-store implementation (IndexedDB with a localStorage fallback) of the data API.
// Selected at runtime by database.ts when Platform.OS === 'web'. The native
// counterpart lives in databaseSqlite.ts; shared normalizers in databaseShared.ts.
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CustomerProperty,
  DashboardStats,
  GenesisBundleV1,
  GenesisHistoryEntry,
  GenesisImportResult,
  GenesisImportRun,
  GenesisInstallation,
  GenesisInvoice,
  GenesisInvoiceLine,
  GenesisPdfDocument,
  GenesisPlannedWork,
  GenesisPropertyContext,
  ImportResult,
  ReportBundle,
  ReportStatus,
  ServiceReport,
  WorkItem,
} from '../types';
import { nowIso, todayIsoDate } from '../utils/date';
import { createId } from '../utils/id';
import { compact, compactMultiline } from '../utils/text';
import {
  normalizeGenesisProperty,
  normalizeInvoiceItem,
  normalizeInvoiceLineItem,
  normalizeManualProperty,
  normalizePdfDocumentItem,
  normalizePlannedWorkItem,
} from './databaseShared';

type WebStore = {
  properties: CustomerProperty[];
  reports: ServiceReport[];
  workItems: WorkItem[];
  genesisImportRuns: GenesisImportRun[];
  genesisInstallations: GenesisInstallation[];
  genesisPlannedWork: GenesisPlannedWork[];
  genesisInvoices: GenesisInvoice[];
  genesisInvoiceLines: GenesisInvoiceLine[];
  genesisPdfDocuments: GenesisPdfDocument[];
  genesisHistory: GenesisHistoryEntry[];
};

const WEB_STORE_KEY = 'kamincontrolmobile.v1.store';
const WEB_DB_NAME = 'kamincontrolmobile';
const WEB_DB_VERSION = 1;
const WEB_DB_STORE = 'stores';

function emptyWebStore(): WebStore {
  return {
    properties: [],
    reports: [],
    workItems: [],
    genesisImportRuns: [],
    genesisInstallations: [],
    genesisPlannedWork: [],
    genesisInvoices: [],
    genesisInvoiceLines: [],
    genesisPdfDocuments: [],
    genesisHistory: [],
  };
}

function normalizeWebStore(parsed: Partial<WebStore> | null | undefined): WebStore {
  return {
    properties: Array.isArray(parsed?.properties) ? parsed.properties : [],
    reports: Array.isArray(parsed?.reports) ? parsed.reports : [],
    workItems: Array.isArray(parsed?.workItems) ? parsed.workItems : [],
    genesisImportRuns: Array.isArray(parsed?.genesisImportRuns) ? parsed.genesisImportRuns : [],
    genesisInstallations: Array.isArray(parsed?.genesisInstallations) ? parsed.genesisInstallations : [],
    genesisPlannedWork: Array.isArray(parsed?.genesisPlannedWork) ? parsed.genesisPlannedWork : [],
    genesisInvoices: Array.isArray(parsed?.genesisInvoices) ? parsed.genesisInvoices : [],
    genesisInvoiceLines: Array.isArray(parsed?.genesisInvoiceLines) ? parsed.genesisInvoiceLines : [],
    genesisPdfDocuments: Array.isArray(parsed?.genesisPdfDocuments) ? parsed.genesisPdfDocuments : [],
    genesisHistory: Array.isArray(parsed?.genesisHistory) ? parsed.genesisHistory : [],
  };
}

function readLegacyWebStore(): WebStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return emptyWebStore();
  }

  const stored = window.localStorage.getItem(WEB_STORE_KEY);
  if (!stored) {
    return emptyWebStore();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<WebStore>;
    return normalizeWebStore(parsed);
  } catch {
    return emptyWebStore();
  }
}

function openWebDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WEB_DB_NAME, WEB_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WEB_DB_STORE)) {
        db.createObjectStore(WEB_DB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geoeffnet werden.'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Anfrage fehlgeschlagen.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB-Transaktion fehlgeschlagen.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB-Transaktion abgebrochen.'));
  });
}

async function readWebStore(): Promise<WebStore> {
  const db = await openWebDatabase();
  if (!db) {
    return readLegacyWebStore();
  }

  try {
    const transaction = db.transaction(WEB_DB_STORE, 'readonly');
    const done = transactionDone(transaction);
    const record = await requestToPromise<{ key: string; value: Partial<WebStore> } | undefined>(
      transaction.objectStore(WEB_DB_STORE).get(WEB_STORE_KEY),
    );
    await done;
    if (record?.value) {
      return normalizeWebStore(record.value);
    }
    return readLegacyWebStore();
  } finally {
    db.close();
  }
}

async function writeWebStore(store: WebStore): Promise<void> {
  const normalized = normalizeWebStore(store);
  const db = await openWebDatabase();
  if (!db) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(WEB_STORE_KEY, JSON.stringify(normalized));
    }
    return;
  }

  try {
    const transaction = db.transaction(WEB_DB_STORE, 'readwrite');
    const done = transactionDone(transaction);
    await requestToPromise(transaction.objectStore(WEB_DB_STORE).put({ key: WEB_STORE_KEY, value: normalized }));
    await done;
    window.localStorage?.removeItem(WEB_STORE_KEY);
  } finally {
    db.close();
  }
}

function findExistingWebPropertyId(
  store: WebStore,
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>,
): string | null {
  const sourceKey = compact(property.sourceKey ?? '');
  if (sourceKey) {
    const bySource = store.properties.find((existing) => existing.sourceKey === sourceKey);
    if (bySource) {
      return bySource.id;
    }
  }

  const customerNumber = compact(property.customerNumber);
  const street = compact(property.street);
  const postalCode = compact(property.postalCode);
  const city = compact(property.city);

  const found = store.properties.find((existing) => {
    if (customerNumber && street) {
      return (
        existing.customerNumber === customerNumber &&
        existing.street === street &&
        existing.postalCode === postalCode &&
        existing.city === city
      );
    }

    if (!customerNumber && street) {
      return existing.street === street && existing.postalCode === postalCode && existing.city === city;
    }

    return false;
  });

  return found?.id ?? null;
}

function webReportBundle(store: WebStore, reportId: string): ReportBundle | null {
  const report = store.reports.find((candidate) => candidate.id === reportId);
  if (!report) {
    return null;
  }

  const property = store.properties.find((candidate) => candidate.id === report.propertyId);
  if (!property) {
    return null;
  }

  return {
    property,
    report,
    workItems: store.workItems
      .filter((item) => item.reportId === reportId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function initDatabase(): Promise<SQLiteDatabase | null> {
  await writeWebStore(await readWebStore());
  return null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const store = await readWebStore();
  return {
    properties: store.properties.filter((property) => property.isActive !== false).length,
    drafts: store.reports.filter((report) => report.status === 'draft').length,
    completed: store.reports.filter((report) => report.status === 'completed').length,
    exported: store.reports.filter((report) => report.status === 'exported').length,
    genesisImports: store.genesisImportRuns.length,
  };
}

export async function listProperties(query = '', limit = 30): Promise<CustomerProperty[]> {
  const lookup = compact(query).toLowerCase();
  const store = await readWebStore();
  return store.properties
    .filter((property) => {
      if (!lookup) {
        return true;
      }

      return [
        property.customerNumber,
        property.propertyLabel,
        property.street,
        property.postalCode,
        property.city,
        property.owner,
        property.tenant,
        property.sourceKey ?? '',
      ].some((value) => value.toLowerCase().includes(lookup));
    })
    .sort((a, b) =>
      `${a.isActive === false ? 1 : 0}${a.city}${a.street}${a.customerNumber}`.localeCompare(
        `${b.isActive === false ? 1 : 0}${b.city}${b.street}${b.customerNumber}`,
      ),
    )
    .slice(0, limit);
}

export async function getProperty(id: string): Promise<CustomerProperty | null> {
  return (await readWebStore()).properties.find((property) => property.id === id) ?? null;
}

export async function upsertImportedProperties(
  properties: Array<Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ImportResult> {
  const store = await readWebStore();
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0 };
  const timestamp = nowIso();

  for (const property of properties) {
    const normalized = normalizeManualProperty({ ...property, sourceSystem: property.sourceSystem ?? 'manual' });
    if (!compact(normalized.customerNumber) && !compact(normalized.street)) {
      result.skipped += 1;
      continue;
    }

    const existingId = findExistingWebPropertyId(store, normalized);
    const nextProperty: CustomerProperty = {
      ...normalized,
      id: existingId ?? createId('prop'),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (existingId) {
      store.properties = store.properties.map((existing) =>
        existing.id === existingId
          ? { ...nextProperty, createdAt: existing.createdAt, updatedAt: timestamp }
          : existing,
      );
      result.updated += 1;
    } else {
      store.properties.push(nextProperty);
      result.inserted += 1;
    }
  }

  await writeWebStore(store);
  return result;
}

export async function importGenesisBundle(
  bundle: GenesisBundleV1,
  fileName: string,
): Promise<GenesisImportResult> {
  const store = await readWebStore();
  const timestamp = nowIso();
  const result: GenesisImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    inactive: 0,
    installations: 0,
    plannedWork: 0,
    invoices: 0,
    invoiceLines: 0,
    pdfDocuments: 0,
    history: 0,
    warnings: [...bundle.metadata.warnings],
  };
  const sourceKeys = new Set(bundle.properties.map((property) => compact(property.sourceKey)).filter(Boolean));
  const propertyIdsBySource = new Map<string, string>();

  for (const property of bundle.properties) {
    const normalized = normalizeGenesisProperty(property, timestamp);
    if (!normalized.sourceKey || (!normalized.customerNumber && !normalized.street)) {
      result.skipped += 1;
      continue;
    }

    const existingId = findExistingWebPropertyId(store, normalized);
    const nextProperty: CustomerProperty = {
      ...normalized,
      id: existingId ?? createId('prop'),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (existingId) {
      store.properties = store.properties.map((existing) =>
        existing.id === existingId
          ? { ...nextProperty, createdAt: existing.createdAt, updatedAt: timestamp }
          : existing,
      );
      result.updated += 1;
    } else {
      store.properties.push(nextProperty);
      result.inserted += 1;
    }
    propertyIdsBySource.set(normalized.sourceKey, nextProperty.id);
  }

  store.properties = store.properties.map((property) => {
    if (property.sourceSystem === 'genesis' && property.sourceKey && !sourceKeys.has(property.sourceKey)) {
      if (property.isActive !== false) {
        result.inactive += 1;
      }
      return { ...property, isActive: false, updatedAt: timestamp };
    }
    return property;
  });

  const importedPropertyIds = new Set(propertyIdsBySource.values());
  store.genesisInstallations = store.genesisInstallations.filter((item) => !importedPropertyIds.has(item.propertyId));
  store.genesisPlannedWork = store.genesisPlannedWork.filter((item) => !importedPropertyIds.has(item.propertyId));
  store.genesisInvoices = store.genesisInvoices.filter((item) => !importedPropertyIds.has(item.propertyId));
  store.genesisInvoiceLines = store.genesisInvoiceLines.filter((item) => !importedPropertyIds.has(item.propertyId));
  store.genesisPdfDocuments = store.genesisPdfDocuments.filter((item) => item.propertyId && !importedPropertyIds.has(item.propertyId));
  store.genesisHistory = store.genesisHistory.filter((item) => !importedPropertyIds.has(item.propertyId));

  for (const item of bundle.installations) {
    const propertyId = propertyIdsBySource.get(item.sourceKey);
    if (!propertyId) {
      continue;
    }
    store.genesisInstallations.push({ ...item, id: createId('inst'), propertyId });
    result.installations += 1;
  }

  for (const item of bundle.plannedWork) {
    const propertyId = propertyIdsBySource.get(item.sourceKey);
    if (!propertyId) {
      continue;
    }
    store.genesisPlannedWork.push({ ...normalizePlannedWorkItem(item), id: createId('plan'), propertyId });
    result.plannedWork += 1;
  }

  for (const item of bundle.invoices ?? []) {
    const propertyId = propertyIdsBySource.get(item.sourceKey);
    if (!propertyId) {
      continue;
    }
    store.genesisInvoices.push({ ...normalizeInvoiceItem(item), id: createId('inv'), propertyId });
    result.invoices += 1;
  }

  const propertyIdByInvoiceNumber = new Map(store.genesisInvoices.map((invoice) => [invoice.invoiceNumber, invoice.propertyId]));

  for (const item of bundle.invoiceLines ?? []) {
    const propertyId = propertyIdsBySource.get(item.sourceKey) ?? propertyIdByInvoiceNumber.get(item.invoiceNumber);
    if (!propertyId) {
      continue;
    }
    store.genesisInvoiceLines.push({ ...normalizeInvoiceLineItem(item), id: createId('iline'), propertyId });
    result.invoiceLines += 1;
  }

  for (const item of bundle.pdfDocuments ?? []) {
    const propertyId = propertyIdsBySource.get(item.sourceKey) ?? propertyIdByInvoiceNumber.get(item.invoiceNumber) ?? '';
    store.genesisPdfDocuments.push({ ...normalizePdfDocumentItem(item), id: createId('pdf'), propertyId });
    result.pdfDocuments += 1;
  }

  for (const item of bundle.history) {
    const propertyId = propertyIdsBySource.get(item.sourceKey);
    if (!propertyId) {
      continue;
    }
    store.genesisHistory.push({ ...item, id: createId('hist'), propertyId });
    result.history += 1;
  }

  store.genesisImportRuns.unshift({
    id: createId('gimp'),
    fileName,
    importedAt: timestamp,
    exportedAt: bundle.metadata.exportedAt,
    schemaVersion: bundle.schemaVersion,
    converterVersion: bundle.metadata.converterVersion,
    propertiesCount: bundle.properties.length,
    installationsCount: result.installations,
    plannedWorkCount: result.plannedWork,
    historyCount: result.history,
    inactiveCount: result.inactive,
    warnings: result.warnings,
    tableCounts: bundle.metadata.tableCounts,
  });

  await writeWebStore(store);
  return result;
}

export async function listGenesisImportRuns(limit = 5): Promise<GenesisImportRun[]> {
  return (await readWebStore()).genesisImportRuns.slice(0, limit);
}

export async function getGenesisContext(propertyId: string): Promise<GenesisPropertyContext> {
  const store = await readWebStore();
  const plannedWork = store.genesisPlannedWork
    .filter((item) => item.propertyId === propertyId)
    .map((item) => ({ ...normalizePlannedWorkItem(item), id: item.id, propertyId: item.propertyId }));
  const invoices = store.genesisInvoices
    .filter((item) => item.propertyId === propertyId)
    .sort((a, b) => (b.workDate || b.invoiceDate || b.invoiceNumber).localeCompare(a.workDate || a.invoiceDate || a.invoiceNumber));
  return {
    importRun: store.genesisImportRuns[0] ?? null,
    installations: store.genesisInstallations.filter((item) => item.propertyId === propertyId),
    invoices,
    invoiceLines: store.genesisInvoiceLines
      .filter((item) => item.propertyId === propertyId)
      .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) || Number(a.position) - Number(b.position)),
    pdfDocuments: store.genesisPdfDocuments
      .filter((item) => item.propertyId === propertyId)
      .sort((a, b) => (b.date || b.invoiceNumber).localeCompare(a.date || a.invoiceNumber)),
    objectTariffSuggestions: plannedWork.filter((item) => item.source === 'objectTariff'),
    invoiceLineSuggestions: plannedWork.filter((item) => item.source === 'invoiceLine'),
    arbvolSummary: plannedWork.filter((item) => item.source === 'arbvol'),
    plannedWork,
    history: store.genesisHistory
      .filter((item) => item.propertyId === propertyId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30),
  };
}

export async function createReport(propertyId: string): Promise<ServiceReport> {
  const store = await readWebStore();
  const timestamp = nowIso();
  const report: ServiceReport = {
    id: createId('rep'),
    propertyId,
    cleaningDate: todayIsoDate(),
    timeFrom: '',
    timeTo: '',
    chimneySweepName: '',
    notes: '',
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    exportedAt: null,
  };
  store.reports.push(report);
  await writeWebStore(store);
  return report;
}

export async function getReport(id: string): Promise<ServiceReport | null> {
  return (await readWebStore()).reports.find((report) => report.id === id) ?? null;
}

export async function getReportBundle(reportId: string): Promise<ReportBundle | null> {
  return webReportBundle(await readWebStore(), reportId);
}

export async function listReports(status?: ReportStatus, propertyId?: string): Promise<ReportBundle[]> {
  const store = await readWebStore();
  return store.reports
    .filter((report) => (status ? report.status === status : true))
    .filter((report) => !propertyId || report.propertyId === propertyId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((report) => webReportBundle(store, report.id))
    .filter((bundle): bundle is ReportBundle => Boolean(bundle));
}

export async function saveReport(report: ServiceReport, workItems: WorkItem[]): Promise<void> {
  const store = await readWebStore();
  const timestamp = nowIso();
  store.reports = store.reports.map((existing) =>
    existing.id === report.id
      ? {
          ...existing,
          cleaningDate: compact(report.cleaningDate),
          timeFrom: compact(report.timeFrom),
          timeTo: compact(report.timeTo),
          chimneySweepName: compact(report.chimneySweepName),
          notes: compactMultiline(report.notes),
          status: report.status,
          updatedAt: timestamp,
        }
      : existing,
  );
  store.workItems = [
    ...store.workItems.filter((item) => item.reportId !== report.id),
    ...workItems
      .filter((item) =>
        [item.quantity, item.description, item.tp, item.amount, item.minutes].some((value) => compact(value)),
      )
      .map((item, index) => ({
        ...item,
        id: item.id || createId('item'),
        reportId: report.id,
        quantity: compact(item.quantity),
        description: compact(item.description),
        tp: compact(item.tp),
        amount: compact(item.amount),
        minutes: compact(item.minutes),
        sortOrder: index,
      })),
  ];
  await writeWebStore(store);
}

export async function completeReport(report: ServiceReport, workItems: WorkItem[]): Promise<void> {
  // Single read → mutate → write (no double round-trip)
  const store = await readWebStore();
  const timestamp = nowIso();
  store.reports = store.reports.map((existing) =>
    existing.id === report.id
      ? {
          ...existing,
          cleaningDate: compact(report.cleaningDate),
          timeFrom: compact(report.timeFrom),
          timeTo: compact(report.timeTo),
          chimneySweepName: compact(report.chimneySweepName),
          notes: compactMultiline(report.notes),
          status: 'completed',
          completedAt: existing.completedAt ?? timestamp,
          updatedAt: timestamp,
        }
      : existing,
  );
  store.workItems = [
    ...store.workItems.filter((item) => item.reportId !== report.id),
    ...workItems
      .filter((item) =>
        [item.quantity, item.description, item.tp, item.amount, item.minutes].some((value) => compact(value)),
      )
      .map((item, index) => ({
        ...item,
        id: item.id || createId('item'),
        reportId: report.id,
        quantity: compact(item.quantity),
        description: compact(item.description),
        tp: compact(item.tp),
        amount: compact(item.amount),
        minutes: compact(item.minutes),
        sortOrder: index,
      })),
  ];
  await writeWebStore(store);
}

export async function markReportExported(reportId: string): Promise<void> {
  const store = await readWebStore();
  const timestamp = nowIso();
  store.reports = store.reports.map((existing) =>
    existing.id === reportId
      ? {
          ...existing,
          status: 'exported',
          exportedAt: existing.exportedAt ?? timestamp,
          updatedAt: timestamp,
        }
      : existing,
  );
  await writeWebStore(store);
}
