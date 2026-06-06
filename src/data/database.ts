import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CustomerProperty,
  DashboardStats,
  GenesisBundleProperty,
  GenesisBundleV1,
  GenesisHistoryEntry,
  GenesisInvoice,
  GenesisInvoiceLine,
  GenesisImportResult,
  GenesisImportRun,
  GenesisInstallation,
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
import { compact } from '../utils/text';

type PropertyRow = {
  id: string;
  source_key: string;
  source_system: string;
  is_active: number;
  last_imported_at: string;
  customer_number: string;
  property_label: string;
  street: string;
  postal_code: string;
  city: string;
  building_type: string;
  other_building_type: string;
  owner: string;
  tenant: string;
  management: string;
  caretaker: string;
  billing_role: string;
  notification_role: string;
  fuel_types_json: string;
  fire_system_codes_json: string;
  oil_boiler: string;
  kwh: string;
  build_year: string;
  tour: string;
  cleaning_months_json: string;
  created_at: string;
  updated_at: string;
};

type ReportRow = {
  id: string;
  property_id: string;
  cleaning_date: string;
  time_from: string;
  time_to: string;
  chimney_sweep_name: string;
  notes: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  exported_at: string | null;
};

type WorkItemRow = {
  id: string;
  report_id: string;
  quantity: string;
  description: string;
  tp: string;
  amount: string;
  minutes: string;
  sort_order: number;
};

type GenesisImportRunRow = {
  id: string;
  file_name: string;
  imported_at: string;
  exported_at: string;
  schema_version: string;
  converter_version: string;
  properties_count: number;
  installations_count: number;
  planned_work_count: number;
  history_count: number;
  inactive_count: number;
  warnings_json: string;
  table_counts_json: string;
};

type GenesisInstallationRow = {
  id: string;
  property_id: string;
  source_key: string;
  installation_key: string;
  system_code: string;
  label: string;
  fuel_types_json: string;
  manufacturer: string;
  model: string;
  build_year: string;
  kwh: string;
  location: string;
  notes: string;
};

type GenesisPlannedWorkRow = {
  id: string;
  property_id: string;
  source_key: string;
  work_key: string;
  source: string;
  tariff_code: string;
  line_type: string;
  invoice_number: string;
  position: string;
  month: string;
  tour: string;
  quantity: string;
  description: string;
  tp: string;
  amount: string;
  minutes: string;
  unit_price: string;
  tax_points: string;
  confidence: number;
  reason: string;
  notes: string;
};

type GenesisInvoiceRow = {
  id: string;
  property_id: string;
  source_key: string;
  invoice_key: string;
  invoice_number: string;
  work_date: string;
  invoice_date: string;
  due_date: string;
  paid_date: string;
  status: string;
  dunning_level: string;
  net_amount: string;
  vat_amount: string;
  total_amount: string;
  paid_amount: string;
  invoice_address: string;
  property_address: string;
  notes: string;
};

type GenesisInvoiceLineRow = {
  id: string;
  property_id: string;
  source_key: string;
  invoice_number: string;
  line_key: string;
  position: string;
  line_type: string;
  tariff_code: string;
  marker: string;
  quantity: string;
  description: string;
  unit_price: string;
  amount: string;
  tax_points: string;
  notes: string;
};

type GenesisPdfDocumentRow = {
  id: string;
  property_id: string;
  source_key: string;
  document_key: string;
  kind: string;
  relative_path: string;
  archive_path: string;
  local_uri: string;
  file_name: string;
  invoice_number: string;
  date: string;
  matched: number;
};

type GenesisHistoryRow = {
  id: string;
  property_id: string;
  source_key: string;
  history_key: string;
  date: string;
  employee: string;
  description: string;
  amount: string;
  minutes: string;
  notes: string;
};

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
const isWeb = Platform.OS === 'web';

let dbPromise: Promise<SQLiteDatabase | null> | null = null;

export async function initDatabase(): Promise<SQLiteDatabase | null> {
  if (isWeb) {
    await writeWebStore(await readWebStore());
    return null;
  }

  if (!dbPromise) {
    dbPromise = import('expo-sqlite').then(async (SQLite) => {
      const db = await SQLite.openDatabaseAsync('kamincontrol_v1.db');
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS customer_properties (
          id TEXT PRIMARY KEY NOT NULL,
          source_key TEXT NOT NULL DEFAULT '',
          source_system TEXT NOT NULL DEFAULT 'manual',
          is_active INTEGER NOT NULL DEFAULT 1,
          last_imported_at TEXT NOT NULL DEFAULT '',
          customer_number TEXT NOT NULL DEFAULT '',
          property_label TEXT NOT NULL DEFAULT '',
          street TEXT NOT NULL DEFAULT '',
          postal_code TEXT NOT NULL DEFAULT '',
          city TEXT NOT NULL DEFAULT '',
          building_type TEXT NOT NULL DEFAULT '',
          other_building_type TEXT NOT NULL DEFAULT '',
          owner TEXT NOT NULL DEFAULT '',
          tenant TEXT NOT NULL DEFAULT '',
          management TEXT NOT NULL DEFAULT '',
          caretaker TEXT NOT NULL DEFAULT '',
          billing_role TEXT NOT NULL DEFAULT '',
          notification_role TEXT NOT NULL DEFAULT '',
          fuel_types_json TEXT NOT NULL DEFAULT '[]',
          fire_system_codes_json TEXT NOT NULL DEFAULT '[]',
          oil_boiler TEXT NOT NULL DEFAULT '',
          kwh TEXT NOT NULL DEFAULT '',
          build_year TEXT NOT NULL DEFAULT '',
          tour TEXT NOT NULL DEFAULT '',
          cleaning_months_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_customer_properties_search
          ON customer_properties(customer_number, street, postal_code, city);
        CREATE INDEX IF NOT EXISTS idx_customer_properties_source
          ON customer_properties(source_system, source_key, is_active);

        CREATE TABLE IF NOT EXISTS service_reports (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          cleaning_date TEXT NOT NULL DEFAULT '',
          time_from TEXT NOT NULL DEFAULT '',
          time_to TEXT NOT NULL DEFAULT '',
          chimney_sweep_name TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          exported_at TEXT,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_service_reports_property
          ON service_reports(property_id, status, cleaning_date);

        CREATE TABLE IF NOT EXISTS work_items (
          id TEXT PRIMARY KEY NOT NULL,
          report_id TEXT NOT NULL,
          quantity TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          tp TEXT NOT NULL DEFAULT '',
          amount TEXT NOT NULL DEFAULT '',
          minutes TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (report_id) REFERENCES service_reports(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_work_items_report
          ON work_items(report_id, sort_order);

        CREATE TABLE IF NOT EXISTS genesis_import_runs (
          id TEXT PRIMARY KEY NOT NULL,
          file_name TEXT NOT NULL DEFAULT '',
          imported_at TEXT NOT NULL,
          exported_at TEXT NOT NULL DEFAULT '',
          schema_version TEXT NOT NULL DEFAULT '',
          converter_version TEXT NOT NULL DEFAULT '',
          properties_count INTEGER NOT NULL DEFAULT 0,
          installations_count INTEGER NOT NULL DEFAULT 0,
          planned_work_count INTEGER NOT NULL DEFAULT 0,
          history_count INTEGER NOT NULL DEFAULT 0,
          inactive_count INTEGER NOT NULL DEFAULT 0,
          warnings_json TEXT NOT NULL DEFAULT '[]',
          table_counts_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS genesis_installations (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          source_key TEXT NOT NULL,
          installation_key TEXT NOT NULL DEFAULT '',
          system_code TEXT NOT NULL DEFAULT '',
          label TEXT NOT NULL DEFAULT '',
          fuel_types_json TEXT NOT NULL DEFAULT '[]',
          manufacturer TEXT NOT NULL DEFAULT '',
          model TEXT NOT NULL DEFAULT '',
          build_year TEXT NOT NULL DEFAULT '',
          kwh TEXT NOT NULL DEFAULT '',
          location TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_installations_property
          ON genesis_installations(property_id, source_key);

        CREATE TABLE IF NOT EXISTS genesis_planned_work (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          source_key TEXT NOT NULL,
          work_key TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT 'arbvol',
          tariff_code TEXT NOT NULL DEFAULT '',
          line_type TEXT NOT NULL DEFAULT 'charge',
          invoice_number TEXT NOT NULL DEFAULT '',
          position TEXT NOT NULL DEFAULT '',
          month TEXT NOT NULL DEFAULT '',
          tour TEXT NOT NULL DEFAULT '',
          quantity TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          tp TEXT NOT NULL DEFAULT '',
          amount TEXT NOT NULL DEFAULT '',
          minutes TEXT NOT NULL DEFAULT '',
          unit_price TEXT NOT NULL DEFAULT '',
          tax_points TEXT NOT NULL DEFAULT '',
          confidence INTEGER NOT NULL DEFAULT 0,
          reason TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_planned_work_property
          ON genesis_planned_work(property_id, source_key);

        CREATE TABLE IF NOT EXISTS genesis_invoices (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          source_key TEXT NOT NULL,
          invoice_key TEXT NOT NULL DEFAULT '',
          invoice_number TEXT NOT NULL DEFAULT '',
          work_date TEXT NOT NULL DEFAULT '',
          invoice_date TEXT NOT NULL DEFAULT '',
          due_date TEXT NOT NULL DEFAULT '',
          paid_date TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'unknown',
          dunning_level TEXT NOT NULL DEFAULT '',
          net_amount TEXT NOT NULL DEFAULT '',
          vat_amount TEXT NOT NULL DEFAULT '',
          total_amount TEXT NOT NULL DEFAULT '',
          paid_amount TEXT NOT NULL DEFAULT '',
          invoice_address TEXT NOT NULL DEFAULT '',
          property_address TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_invoices_property
          ON genesis_invoices(property_id, invoice_number, work_date);

        CREATE TABLE IF NOT EXISTS genesis_invoice_lines (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          source_key TEXT NOT NULL,
          invoice_number TEXT NOT NULL DEFAULT '',
          line_key TEXT NOT NULL DEFAULT '',
          position TEXT NOT NULL DEFAULT '',
          line_type TEXT NOT NULL DEFAULT 'charge',
          tariff_code TEXT NOT NULL DEFAULT '',
          marker TEXT NOT NULL DEFAULT '',
          quantity TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          unit_price TEXT NOT NULL DEFAULT '',
          amount TEXT NOT NULL DEFAULT '',
          tax_points TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_invoice_lines_property
          ON genesis_invoice_lines(property_id, invoice_number, position);

        CREATE TABLE IF NOT EXISTS genesis_pdf_documents (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL DEFAULT '',
          source_key TEXT NOT NULL DEFAULT '',
          document_key TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL DEFAULT 'other',
          relative_path TEXT NOT NULL DEFAULT '',
          archive_path TEXT NOT NULL DEFAULT '',
          local_uri TEXT NOT NULL DEFAULT '',
          file_name TEXT NOT NULL DEFAULT '',
          invoice_number TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL DEFAULT '',
          matched INTEGER NOT NULL DEFAULT 0,
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_pdf_documents_property
          ON genesis_pdf_documents(property_id, source_key, invoice_number);

        CREATE TABLE IF NOT EXISTS genesis_history (
          id TEXT PRIMARY KEY NOT NULL,
          property_id TEXT NOT NULL,
          source_key TEXT NOT NULL,
          history_key TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL DEFAULT '',
          employee TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          amount TEXT NOT NULL DEFAULT '',
          minutes TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          raw_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL,
          FOREIGN KEY (property_id) REFERENCES customer_properties(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_genesis_history_property
          ON genesis_history(property_id, source_key, date);
      `);

      await ensureColumn(db, 'customer_properties', 'source_key', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'customer_properties', 'source_system', "TEXT NOT NULL DEFAULT 'manual'");
      await ensureColumn(db, 'customer_properties', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
      await ensureColumn(db, 'customer_properties', 'last_imported_at', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'source', "TEXT NOT NULL DEFAULT 'arbvol'");
      await ensureColumn(db, 'genesis_planned_work', 'tariff_code', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'line_type', "TEXT NOT NULL DEFAULT 'charge'");
      await ensureColumn(db, 'genesis_planned_work', 'invoice_number', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'position', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'unit_price', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'tax_points', "TEXT NOT NULL DEFAULT ''");
      await ensureColumn(db, 'genesis_planned_work', 'confidence', 'INTEGER NOT NULL DEFAULT 0');
      await ensureColumn(db, 'genesis_planned_work', 'reason', "TEXT NOT NULL DEFAULT ''");

      return db;
    });
  }

  return dbPromise;
}

async function ensureColumn(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

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

function parseJsonArray<T extends string>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toJsonArray(values: string[]): string {
  return JSON.stringify(values.filter(Boolean));
}

function mapProperty(row: PropertyRow): CustomerProperty {
  return {
    id: row.id,
    sourceKey: row.source_key,
    sourceSystem: row.source_system === 'genesis' ? 'genesis' : 'manual',
    isActive: row.is_active !== 0,
    lastImportedAt: row.last_imported_at,
    customerNumber: row.customer_number,
    propertyLabel: row.property_label,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    buildingType: row.building_type as CustomerProperty['buildingType'],
    otherBuildingType: row.other_building_type,
    owner: row.owner,
    tenant: row.tenant,
    management: row.management,
    caretaker: row.caretaker,
    billingRole: row.billing_role as CustomerProperty['billingRole'],
    notificationRole: row.notification_role as CustomerProperty['notificationRole'],
    fuelTypes: parseJsonArray(row.fuel_types_json),
    fireSystemCodes: parseJsonArray(row.fire_system_codes_json),
    oilBoiler: row.oil_boiler,
    kwh: row.kwh,
    buildYear: row.build_year,
    tour: row.tour,
    cleaningMonths: parseJsonArray(row.cleaning_months_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReport(row: ReportRow): ServiceReport {
  return {
    id: row.id,
    propertyId: row.property_id,
    cleaningDate: row.cleaning_date,
    timeFrom: row.time_from,
    timeTo: row.time_to,
    chimneySweepName: row.chimney_sweep_name,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    exportedAt: row.exported_at,
  };
}

function mapWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    reportId: row.report_id,
    quantity: row.quantity,
    description: row.description,
    tp: row.tp,
    amount: row.amount,
    minutes: row.minutes,
    sortOrder: row.sort_order,
  };
}

function mapGenesisImportRun(row: GenesisImportRunRow): GenesisImportRun {
  return {
    id: row.id,
    fileName: row.file_name,
    importedAt: row.imported_at,
    exportedAt: row.exported_at,
    schemaVersion: row.schema_version,
    converterVersion: row.converter_version,
    propertiesCount: row.properties_count,
    installationsCount: row.installations_count,
    plannedWorkCount: row.planned_work_count,
    historyCount: row.history_count,
    inactiveCount: row.inactive_count,
    warnings: parseJsonArray(row.warnings_json),
    tableCounts: parseJsonObject(row.table_counts_json),
  };
}

function mapGenesisInstallation(row: GenesisInstallationRow): GenesisInstallation {
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    installationKey: row.installation_key,
    systemCode: row.system_code,
    label: row.label,
    fuelTypes: parseJsonArray(row.fuel_types_json),
    manufacturer: row.manufacturer,
    model: row.model,
    buildYear: row.build_year,
    kwh: row.kwh,
    location: row.location,
    notes: row.notes,
  };
}

function mapGenesisPlannedWork(row: GenesisPlannedWorkRow): GenesisPlannedWork {
  const source = normalizeSuggestionSource(row.source);
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    workKey: row.work_key,
    source,
    tariffCode: row.tariff_code,
    lineType: row.line_type ? normalizeLineType(row.line_type) : defaultLineTypeForSource(source),
    invoiceNumber: row.invoice_number,
    position: row.position,
    month: row.month as GenesisPlannedWork['month'],
    tour: row.tour,
    quantity: row.quantity,
    description: row.description,
    tp: row.tp,
    amount: row.amount,
    minutes: row.minutes,
    unitPrice: row.unit_price,
    taxPoints: row.tax_points,
    confidence: row.confidence,
    reason: row.reason,
    notes: row.notes,
  };
}

function normalizeSuggestionSource(source: unknown): GenesisPlannedWork['source'] {
  if (source === 'tariff' || source === 'objectTariff') {
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

function normalizeLineType(lineType: unknown): GenesisPlannedWork['lineType'] {
  return lineType === 'text' || lineType === 'control' ? lineType : 'charge';
}

function defaultLineTypeForSource(source: GenesisPlannedWork['source']): GenesisPlannedWork['lineType'] {
  return source === 'arbvol' || source === 'history' ? 'text' : 'charge';
}

function normalizePlannedWorkItem(
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

function mapGenesisHistory(row: GenesisHistoryRow): GenesisHistoryEntry {
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    historyKey: row.history_key,
    date: row.date,
    employee: row.employee,
    description: row.description,
    amount: row.amount,
    minutes: row.minutes,
    notes: row.notes,
  };
}

function mapGenesisInvoice(row: GenesisInvoiceRow): GenesisInvoice {
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    invoiceKey: row.invoice_key,
    invoiceNumber: row.invoice_number,
    workDate: row.work_date,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    status: row.status === 'open' || row.status === 'paid' || row.status === 'partial' ? row.status : 'unknown',
    dunningLevel: row.dunning_level,
    netAmount: row.net_amount,
    vatAmount: row.vat_amount,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    invoiceAddress: row.invoice_address,
    propertyAddress: row.property_address,
    notes: row.notes,
  };
}

function mapGenesisInvoiceLine(row: GenesisInvoiceLineRow): GenesisInvoiceLine {
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    invoiceNumber: row.invoice_number,
    lineKey: row.line_key,
    position: row.position,
    lineType: normalizeLineType(row.line_type),
    tariffCode: row.tariff_code,
    marker: row.marker,
    quantity: row.quantity,
    description: row.description,
    unitPrice: row.unit_price,
    amount: row.amount,
    taxPoints: row.tax_points,
    notes: row.notes,
  };
}

function mapGenesisPdfDocument(row: GenesisPdfDocumentRow): GenesisPdfDocument {
  return {
    id: row.id,
    propertyId: row.property_id,
    sourceKey: row.source_key,
    documentKey: row.document_key,
    kind: row.kind === 'invoice' || row.kind === 'reminder' || row.kind === 'paymentReminder' || row.kind === 'rapport' || row.kind === 'export'
      ? row.kind
      : 'other',
    relativePath: row.relative_path,
    archivePath: row.archive_path,
    localUri: row.local_uri,
    fileName: row.file_name,
    invoiceNumber: row.invoice_number,
    date: row.date,
    matched: row.matched !== 0,
  };
}

function normalizeInvoiceItem(
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

function normalizeInvoiceLineItem(
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

function normalizePdfDocumentItem(
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

function normalizeManualProperty(
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

function normalizeGenesisProperty(
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

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isWeb) {
    const store = await readWebStore();
    return {
      properties: store.properties.filter((property) => property.isActive !== false).length,
      drafts: store.reports.filter((report) => report.status === 'draft').length,
      completed: store.reports.filter((report) => report.status === 'completed').length,
      exported: store.reports.filter((report) => report.status === 'exported').length,
      genesisImports: store.genesisImportRuns.length,
    };
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const [propertiesRow, reportsRow, importsRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM customer_properties WHERE is_active = 1'),
    db.getFirstAsync<{ drafts: number; completed: number; exported: number }>(`
      SELECT
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'exported' THEN 1 ELSE 0 END) AS exported
      FROM service_reports
    `),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM genesis_import_runs'),
  ]);

  return {
    properties: propertiesRow?.count ?? 0,
    drafts: reportsRow?.drafts ?? 0,
    completed: reportsRow?.completed ?? 0,
    exported: reportsRow?.exported ?? 0,
    genesisImports: importsRow?.count ?? 0,
  };
}

export async function listProperties(query = '', limit = 30): Promise<CustomerProperty[]> {
  if (isWeb) {
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

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const search = `%${compact(query)}%`;

  const rows = query
    ? await db.getAllAsync<PropertyRow>(
        `
          SELECT * FROM customer_properties
          WHERE customer_number LIKE ?
            OR property_label LIKE ?
            OR street LIKE ?
            OR postal_code LIKE ?
            OR city LIKE ?
            OR owner LIKE ?
            OR tenant LIKE ?
            OR source_key LIKE ?
          ORDER BY is_active DESC, city, street, customer_number
          LIMIT ?
        `,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        search,
        limit,
      )
    : await db.getAllAsync<PropertyRow>(
        `
          SELECT * FROM customer_properties
          ORDER BY is_active DESC, city, street, customer_number
          LIMIT ?
        `,
        limit,
      );

  return rows.map(mapProperty);
}

export async function getProperty(id: string): Promise<CustomerProperty | null> {
  if (isWeb) {
    return (await readWebStore()).properties.find((property) => property.id === id) ?? null;
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const row = await db.getFirstAsync<PropertyRow>('SELECT * FROM customer_properties WHERE id = ?', id);
  return row ? mapProperty(row) : null;
}

async function findExistingPropertyId(
  db: SQLiteDatabase,
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string | null> {
  const sourceKey = compact(property.sourceKey ?? '');
  if (sourceKey) {
    const bySource = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM customer_properties WHERE source_key = ? LIMIT 1',
      sourceKey,
    );
    if (bySource?.id) {
      return bySource.id;
    }
  }

  const customerNumber = compact(property.customerNumber);
  const street = compact(property.street);
  const postalCode = compact(property.postalCode);
  const city = compact(property.city);

  if (customerNumber && street) {
    const exact = await db.getFirstAsync<{ id: string }>(
      `
        SELECT id FROM customer_properties
        WHERE customer_number = ? AND street = ? AND postal_code = ? AND city = ?
        LIMIT 1
      `,
      customerNumber,
      street,
      postalCode,
      city,
    );

    if (exact?.id) {
      return exact.id;
    }
  }

  if (!customerNumber && street) {
    const addressOnly = await db.getFirstAsync<{ id: string }>(
      `
        SELECT id FROM customer_properties
        WHERE street = ? AND postal_code = ? AND city = ?
        LIMIT 1
      `,
      street,
      postalCode,
      city,
    );

    return addressOnly?.id ?? null;
  }

  return null;
}

async function upsertPropertyNative(
  db: SQLiteDatabase,
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>,
  timestamp: string,
): Promise<{ id: string; inserted: boolean; skipped: boolean }> {
  const normalized = normalizeManualProperty(property);
  if (!compact(normalized.customerNumber) && !compact(normalized.street)) {
    return { id: '', inserted: false, skipped: true };
  }

  const existingId = await findExistingPropertyId(db, normalized);
  if (existingId) {
    await db.runAsync(
      `
        UPDATE customer_properties SET
          source_key = ?,
          source_system = ?,
          is_active = ?,
          last_imported_at = ?,
          customer_number = ?,
          property_label = ?,
          street = ?,
          postal_code = ?,
          city = ?,
          building_type = ?,
          other_building_type = ?,
          owner = ?,
          tenant = ?,
          management = ?,
          caretaker = ?,
          billing_role = ?,
          notification_role = ?,
          fuel_types_json = ?,
          fire_system_codes_json = ?,
          oil_boiler = ?,
          kwh = ?,
          build_year = ?,
          tour = ?,
          cleaning_months_json = ?,
          updated_at = ?
        WHERE id = ?
      `,
      compact(normalized.sourceKey ?? ''),
      normalized.sourceSystem ?? 'manual',
      normalized.isActive === false ? 0 : 1,
      compact(normalized.lastImportedAt ?? ''),
      compact(normalized.customerNumber),
      compact(normalized.propertyLabel),
      compact(normalized.street),
      compact(normalized.postalCode),
      compact(normalized.city),
      normalized.buildingType,
      compact(normalized.otherBuildingType),
      compact(normalized.owner),
      compact(normalized.tenant),
      compact(normalized.management),
      compact(normalized.caretaker),
      normalized.billingRole,
      normalized.notificationRole,
      toJsonArray(normalized.fuelTypes),
      toJsonArray(normalized.fireSystemCodes),
      compact(normalized.oilBoiler),
      compact(normalized.kwh),
      compact(normalized.buildYear),
      compact(normalized.tour),
      toJsonArray(normalized.cleaningMonths),
      timestamp,
      existingId,
    );
    return { id: existingId, inserted: false, skipped: false };
  }

  const id = createId('prop');
  await db.runAsync(
    `
      INSERT INTO customer_properties (
        id, source_key, source_system, is_active, last_imported_at,
        customer_number, property_label, street, postal_code, city,
        building_type, other_building_type, owner, tenant, management, caretaker,
        billing_role, notification_role, fuel_types_json, fire_system_codes_json,
        oil_boiler, kwh, build_year, tour, cleaning_months_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    compact(normalized.sourceKey ?? ''),
    normalized.sourceSystem ?? 'manual',
    normalized.isActive === false ? 0 : 1,
    compact(normalized.lastImportedAt ?? ''),
    compact(normalized.customerNumber),
    compact(normalized.propertyLabel),
    compact(normalized.street),
    compact(normalized.postalCode),
    compact(normalized.city),
    normalized.buildingType,
    compact(normalized.otherBuildingType),
    compact(normalized.owner),
    compact(normalized.tenant),
    compact(normalized.management),
    compact(normalized.caretaker),
    normalized.billingRole,
    normalized.notificationRole,
    toJsonArray(normalized.fuelTypes),
    toJsonArray(normalized.fireSystemCodes),
    compact(normalized.oilBoiler),
    compact(normalized.kwh),
    compact(normalized.buildYear),
    compact(normalized.tour),
    toJsonArray(normalized.cleaningMonths),
    timestamp,
    timestamp,
  );
  return { id, inserted: true, skipped: false };
}

export async function upsertImportedProperties(
  properties: Array<Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ImportResult> {
  if (isWeb) {
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

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0 };
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (const property of properties) {
      const upsert = await upsertPropertyNative(db, { ...property, sourceSystem: property.sourceSystem ?? 'manual' }, timestamp);
      if (upsert.skipped) {
        result.skipped += 1;
      } else if (upsert.inserted) {
        result.inserted += 1;
      } else {
        result.updated += 1;
      }
    }
  });

  return result;
}

export async function importGenesisBundle(
  bundle: GenesisBundleV1,
  fileName: string,
): Promise<GenesisImportResult> {
  if (isWeb) {
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

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }

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

  await db.withTransactionAsync(async () => {
    for (const property of bundle.properties) {
      const normalized = normalizeGenesisProperty(property, timestamp);
      if (!normalized.sourceKey || (!normalized.customerNumber && !normalized.street)) {
        result.skipped += 1;
        continue;
      }

      const upsert = await upsertPropertyNative(db, normalized, timestamp);
      if (upsert.skipped) {
        result.skipped += 1;
        continue;
      }
      if (upsert.inserted) {
        result.inserted += 1;
      } else {
        result.updated += 1;
      }
      propertyIdsBySource.set(normalized.sourceKey, upsert.id);
      await db.runAsync('DELETE FROM genesis_installations WHERE property_id = ?', upsert.id);
      await db.runAsync('DELETE FROM genesis_planned_work WHERE property_id = ?', upsert.id);
      await db.runAsync('DELETE FROM genesis_invoices WHERE property_id = ?', upsert.id);
      await db.runAsync('DELETE FROM genesis_invoice_lines WHERE property_id = ?', upsert.id);
      await db.runAsync('DELETE FROM genesis_pdf_documents WHERE property_id = ?', upsert.id);
      await db.runAsync('DELETE FROM genesis_history WHERE property_id = ?', upsert.id);
    }

    const activeGenesis = await db.getAllAsync<{ id: string; source_key: string }>(
      "SELECT id, source_key FROM customer_properties WHERE source_system = 'genesis' AND is_active = 1",
    );
    for (const property of activeGenesis) {
      if (property.source_key && !sourceKeys.has(property.source_key)) {
        await db.runAsync(
          'UPDATE customer_properties SET is_active = 0, updated_at = ? WHERE id = ?',
          timestamp,
          property.id,
        );
        result.inactive += 1;
      }
    }

    await db.runAsync("DELETE FROM genesis_pdf_documents WHERE property_id = ''");

    for (const item of bundle.installations) {
      const propertyId = propertyIdsBySource.get(item.sourceKey);
      if (!propertyId) {
        continue;
      }
      await db.runAsync(
        `
          INSERT INTO genesis_installations (
            id, property_id, source_key, installation_key, system_code, label, fuel_types_json,
            manufacturer, model, build_year, kwh, location, notes, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('inst'),
        propertyId,
        compact(item.sourceKey),
        compact(item.installationKey),
        compact(item.systemCode),
        compact(item.label),
        toJsonArray(item.fuelTypes),
        compact(item.manufacturer),
        compact(item.model),
        compact(item.buildYear),
        compact(item.kwh),
        compact(item.location),
        compact(item.notes),
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.installations += 1;
    }

    for (const item of bundle.plannedWork) {
      const propertyId = propertyIdsBySource.get(item.sourceKey);
      if (!propertyId) {
        continue;
      }
      const plannedItem = normalizePlannedWorkItem(item);
      await db.runAsync(
        `
          INSERT INTO genesis_planned_work (
            id, property_id, source_key, work_key, source, tariff_code, line_type, invoice_number,
            position, month, tour, quantity, description, tp, amount, minutes, unit_price,
            tax_points, confidence, reason, notes, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('plan'),
        propertyId,
        plannedItem.sourceKey,
        plannedItem.workKey,
        plannedItem.source,
        plannedItem.tariffCode,
        plannedItem.lineType,
        plannedItem.invoiceNumber,
        plannedItem.position,
        compact(plannedItem.month),
        plannedItem.tour,
        plannedItem.quantity,
        plannedItem.description,
        plannedItem.tp,
        plannedItem.amount,
        plannedItem.minutes,
        plannedItem.unitPrice,
        plannedItem.taxPoints,
        plannedItem.confidence,
        plannedItem.reason,
        plannedItem.notes,
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.plannedWork += 1;
    }

    for (const item of bundle.invoices ?? []) {
      const propertyId = propertyIdsBySource.get(item.sourceKey);
      if (!propertyId) {
        continue;
      }
      const invoice = normalizeInvoiceItem(item);
      await db.runAsync(
        `
          INSERT INTO genesis_invoices (
            id, property_id, source_key, invoice_key, invoice_number, work_date, invoice_date,
            due_date, paid_date, status, dunning_level, net_amount, vat_amount, total_amount,
            paid_amount, invoice_address, property_address, notes, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('inv'),
        propertyId,
        invoice.sourceKey,
        invoice.invoiceKey,
        invoice.invoiceNumber,
        invoice.workDate,
        invoice.invoiceDate,
        invoice.dueDate,
        invoice.paidDate,
        invoice.status,
        invoice.dunningLevel,
        invoice.netAmount,
        invoice.vatAmount,
        invoice.totalAmount,
        invoice.paidAmount,
        invoice.invoiceAddress,
        invoice.propertyAddress,
        invoice.notes,
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.invoices += 1;
    }

    const invoiceRowsForLookup = await db.getAllAsync<{ property_id: string; invoice_number: string }>(
      'SELECT property_id, invoice_number FROM genesis_invoices',
    );
    const propertyIdByInvoiceNumber = new Map(invoiceRowsForLookup.map((invoice) => [invoice.invoice_number, invoice.property_id]));

    for (const item of bundle.invoiceLines ?? []) {
      const propertyId = propertyIdsBySource.get(item.sourceKey) ?? propertyIdByInvoiceNumber.get(item.invoiceNumber);
      if (!propertyId) {
        continue;
      }
      const line = normalizeInvoiceLineItem(item);
      await db.runAsync(
        `
          INSERT INTO genesis_invoice_lines (
            id, property_id, source_key, invoice_number, line_key, position, line_type,
            tariff_code, marker, quantity, description, unit_price, amount, tax_points,
            notes, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('iline'),
        propertyId,
        line.sourceKey,
        line.invoiceNumber,
        line.lineKey,
        line.position,
        line.lineType,
        line.tariffCode,
        line.marker,
        line.quantity,
        line.description,
        line.unitPrice,
        line.amount,
        line.taxPoints,
        line.notes,
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.invoiceLines += 1;
    }

    for (const item of bundle.pdfDocuments ?? []) {
      const propertyId = propertyIdsBySource.get(item.sourceKey) ?? propertyIdByInvoiceNumber.get(item.invoiceNumber) ?? '';
      const document = normalizePdfDocumentItem(item);
      await db.runAsync(
        `
          INSERT INTO genesis_pdf_documents (
            id, property_id, source_key, document_key, kind, relative_path, archive_path,
            local_uri, file_name, invoice_number, date, matched, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('pdf'),
        propertyId,
        document.sourceKey,
        document.documentKey,
        document.kind,
        document.relativePath,
        document.archivePath,
        document.localUri,
        document.fileName,
        document.invoiceNumber,
        document.date,
        document.matched ? 1 : 0,
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.pdfDocuments += 1;
    }

    for (const item of bundle.history) {
      const propertyId = propertyIdsBySource.get(item.sourceKey);
      if (!propertyId) {
        continue;
      }
      await db.runAsync(
        `
          INSERT INTO genesis_history (
            id, property_id, source_key, history_key, date, employee, description,
            amount, minutes, notes, raw_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        createId('hist'),
        propertyId,
        compact(item.sourceKey),
        compact(item.historyKey),
        compact(item.date),
        compact(item.employee),
        compact(item.description),
        compact(item.amount),
        compact(item.minutes),
        compact(item.notes),
        JSON.stringify(item.raw ?? {}),
        timestamp,
      );
      result.history += 1;
    }

    await db.runAsync(
      `
        INSERT INTO genesis_import_runs (
          id, file_name, imported_at, exported_at, schema_version, converter_version,
          properties_count, installations_count, planned_work_count, history_count,
          inactive_count, warnings_json, table_counts_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      createId('gimp'),
      fileName,
      timestamp,
      bundle.metadata.exportedAt,
      bundle.schemaVersion,
      bundle.metadata.converterVersion,
      bundle.properties.length,
      result.installations,
      result.plannedWork,
      result.history,
      result.inactive,
      JSON.stringify(result.warnings),
      JSON.stringify(bundle.metadata.tableCounts),
    );
  });

  return result;
}

export async function listGenesisImportRuns(limit = 5): Promise<GenesisImportRun[]> {
  if (isWeb) {
    return (await readWebStore()).genesisImportRuns.slice(0, limit);
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const rows = await db.getAllAsync<GenesisImportRunRow>(
    'SELECT * FROM genesis_import_runs ORDER BY imported_at DESC LIMIT ?',
    limit,
  );
  return rows.map(mapGenesisImportRun);
}

export async function getGenesisContext(propertyId: string): Promise<GenesisPropertyContext> {
  if (isWeb) {
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
      tariffSuggestions: plannedWork.filter((item) => item.source === 'objectTariff'),
      arbvolSummary: plannedWork.filter((item) => item.source === 'arbvol'),
      plannedWork,
      history: store.genesisHistory
        .filter((item) => item.propertyId === propertyId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30),
    };
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const [runRow, installationRows, plannedRows, invoiceRows, invoiceLineRows, pdfDocumentRows, historyRows] = await Promise.all([
    db.getFirstAsync<GenesisImportRunRow>('SELECT * FROM genesis_import_runs ORDER BY imported_at DESC LIMIT 1'),
    db.getAllAsync<GenesisInstallationRow>(
      'SELECT * FROM genesis_installations WHERE property_id = ? ORDER BY installation_key, label',
      propertyId,
    ),
    db.getAllAsync<GenesisPlannedWorkRow>(
      'SELECT * FROM genesis_planned_work WHERE property_id = ? ORDER BY month, work_key',
      propertyId,
    ),
    db.getAllAsync<GenesisInvoiceRow>(
      'SELECT * FROM genesis_invoices WHERE property_id = ? ORDER BY COALESCE(work_date, invoice_date, invoice_number) DESC',
      propertyId,
    ),
    db.getAllAsync<GenesisInvoiceLineRow>(
      'SELECT * FROM genesis_invoice_lines WHERE property_id = ? ORDER BY invoice_number DESC, CAST(position AS INTEGER), line_key',
      propertyId,
    ),
    db.getAllAsync<GenesisPdfDocumentRow>(
      'SELECT * FROM genesis_pdf_documents WHERE property_id = ? ORDER BY date DESC, invoice_number DESC, file_name',
      propertyId,
    ),
    db.getAllAsync<GenesisHistoryRow>(
      'SELECT * FROM genesis_history WHERE property_id = ? ORDER BY date DESC LIMIT 30',
      propertyId,
    ),
  ]);

  const plannedWork = plannedRows.map(mapGenesisPlannedWork);

  return {
    importRun: runRow ? mapGenesisImportRun(runRow) : null,
    installations: installationRows.map(mapGenesisInstallation),
    invoices: invoiceRows.map(mapGenesisInvoice),
    invoiceLines: invoiceLineRows.map(mapGenesisInvoiceLine),
    pdfDocuments: pdfDocumentRows.map(mapGenesisPdfDocument),
    objectTariffSuggestions: plannedWork.filter((item) => item.source === 'objectTariff'),
    invoiceLineSuggestions: plannedWork.filter((item) => item.source === 'invoiceLine'),
    tariffSuggestions: plannedWork.filter((item) => item.source === 'objectTariff'),
    arbvolSummary: plannedWork.filter((item) => item.source === 'arbvol'),
    plannedWork,
    history: historyRows.map(mapGenesisHistory),
  };
}

export async function createReport(propertyId: string): Promise<ServiceReport> {
  if (isWeb) {
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

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const timestamp = nowIso();
  const id = createId('rep');

  await db.runAsync(
    `
      INSERT INTO service_reports (
        id, property_id, cleaning_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'draft', ?, ?)
    `,
    id,
    propertyId,
    todayIsoDate(),
    timestamp,
    timestamp,
  );

  const report = await getReport(id);
  if (!report) {
    throw new Error('Rapport konnte nicht angelegt werden.');
  }
  return report;
}

export async function getReport(id: string): Promise<ServiceReport | null> {
  if (isWeb) {
    return (await readWebStore()).reports.find((report) => report.id === id) ?? null;
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const row = await db.getFirstAsync<ReportRow>('SELECT * FROM service_reports WHERE id = ?', id);
  return row ? mapReport(row) : null;
}

export async function getReportBundle(reportId: string): Promise<ReportBundle | null> {
  if (isWeb) {
    return webReportBundle(await readWebStore(), reportId);
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const reportRow = await db.getFirstAsync<ReportRow>('SELECT * FROM service_reports WHERE id = ?', reportId);
  if (!reportRow) {
    return null;
  }

  const [propertyRow, itemRows] = await Promise.all([
    db.getFirstAsync<PropertyRow>('SELECT * FROM customer_properties WHERE id = ?', reportRow.property_id),
    db.getAllAsync<WorkItemRow>(
      'SELECT * FROM work_items WHERE report_id = ? ORDER BY sort_order ASC',
      reportId,
    ),
  ]);

  if (!propertyRow) {
    return null;
  }

  return {
    property: mapProperty(propertyRow),
    report: mapReport(reportRow),
    workItems: itemRows.map(mapWorkItem),
  };
}

export async function listReports(status?: ReportStatus): Promise<ReportBundle[]> {
  if (isWeb) {
    const store = await readWebStore();
    return store.reports
      .filter((report) => (status ? report.status === status : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((report) => webReportBundle(store, report.id))
      .filter((bundle): bundle is ReportBundle => Boolean(bundle));
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const reportRows = status
    ? await db.getAllAsync<ReportRow>(
        'SELECT * FROM service_reports WHERE status = ? ORDER BY updated_at DESC',
        status,
      )
    : await db.getAllAsync<ReportRow>('SELECT * FROM service_reports ORDER BY updated_at DESC');

  const bundles: ReportBundle[] = [];
  for (const row of reportRows) {
    const bundle = await getReportBundle(row.id);
    if (bundle) {
      bundles.push(bundle);
    }
  }
  return bundles;
}

export async function saveReport(report: ServiceReport, workItems: WorkItem[]): Promise<void> {
  if (isWeb) {
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
            notes: compact(report.notes),
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
    return;
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE service_reports SET
          cleaning_date = ?,
          time_from = ?,
          time_to = ?,
          chimney_sweep_name = ?,
          notes = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `,
      compact(report.cleaningDate),
      compact(report.timeFrom),
      compact(report.timeTo),
      compact(report.chimneySweepName),
      compact(report.notes),
      report.status,
      timestamp,
      report.id,
    );

    await db.runAsync('DELETE FROM work_items WHERE report_id = ?', report.id);

    for (const [index, item] of workItems.entries()) {
      const hasContent = [
        item.quantity,
        item.description,
        item.tp,
        item.amount,
        item.minutes,
      ].some((value) => compact(value));

      if (!hasContent) {
        continue;
      }

      await db.runAsync(
        `
          INSERT INTO work_items (
            id, report_id, quantity, description, tp, amount, minutes, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        item.id || createId('item'),
        report.id,
        compact(item.quantity),
        compact(item.description),
        compact(item.tp),
        compact(item.amount),
        compact(item.minutes),
        index,
      );
    }
  });
}

export async function completeReport(report: ServiceReport, workItems: WorkItem[]): Promise<void> {
  if (isWeb) {
    const timestamp = nowIso();
    await saveReport({ ...report, status: 'completed' }, workItems);
    const updatedStore = await readWebStore();
    updatedStore.reports = updatedStore.reports.map((existing) =>
      existing.id === report.id
        ? {
            ...existing,
            status: 'completed',
            completedAt: existing.completedAt ?? timestamp,
            updatedAt: timestamp,
          }
        : existing,
    );
    await writeWebStore(updatedStore);
    return;
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const timestamp = nowIso();
  await saveReport({ ...report, status: 'completed' }, workItems);
  await db.runAsync(
    `
      UPDATE service_reports
      SET status = 'completed', completed_at = COALESCE(completed_at, ?), updated_at = ?
      WHERE id = ?
    `,
    timestamp,
    timestamp,
    report.id,
  );
}

export async function markReportExported(reportId: string): Promise<void> {
  if (isWeb) {
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
    return;
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const timestamp = nowIso();
  await db.runAsync(
    `
      UPDATE service_reports
      SET status = 'exported', exported_at = COALESCE(exported_at, ?), updated_at = ?
      WHERE id = ?
    `,
    timestamp,
    timestamp,
    reportId,
  );
}
