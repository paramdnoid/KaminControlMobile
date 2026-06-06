import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CustomerProperty,
  DashboardStats,
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

type WebStore = {
  properties: CustomerProperty[];
  reports: ServiceReport[];
  workItems: WorkItem[];
};

const WEB_STORE_KEY = 'kamincontrolmobile.v1.store';
const isWeb = Platform.OS === 'web';

let dbPromise: Promise<SQLiteDatabase | null> | null = null;

export async function initDatabase(): Promise<SQLiteDatabase | null> {
  if (isWeb) {
    writeWebStore(readWebStore());
    return null;
  }

  if (!dbPromise) {
    dbPromise = import('expo-sqlite').then(async (SQLite) => {
      const db = await SQLite.openDatabaseAsync('kamincontrol_v1.db');
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS customer_properties (
          id TEXT PRIMARY KEY NOT NULL,
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
      `);

      return db;
    });
  }

  return dbPromise;
}

function emptyWebStore(): WebStore {
  return { properties: [], reports: [], workItems: [] };
}

function readWebStore(): WebStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return emptyWebStore();
  }

  const stored = window.localStorage.getItem(WEB_STORE_KEY);
  if (!stored) {
    return emptyWebStore();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<WebStore>;
    return {
      properties: Array.isArray(parsed.properties) ? parsed.properties : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      workItems: Array.isArray(parsed.workItems) ? parsed.workItems : [],
    };
  } catch {
    return emptyWebStore();
  }
}

function writeWebStore(store: WebStore): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(WEB_STORE_KEY, JSON.stringify(store));
}

function parseJsonArray<T extends string>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toJsonArray(values: string[]): string {
  return JSON.stringify(values.filter(Boolean));
}

function mapProperty(row: PropertyRow): CustomerProperty {
  return {
    id: row.id,
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

function findExistingWebPropertyId(
  store: WebStore,
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>,
): string | null {
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
    const store = readWebStore();
    return {
      properties: store.properties.length,
      drafts: store.reports.filter((report) => report.status === 'draft').length,
      completed: store.reports.filter((report) => report.status === 'completed').length,
      exported: store.reports.filter((report) => report.status === 'exported').length,
    };
  }

  const db = await initDatabase();
  if (!db) {
    throw new Error('Datenbank nicht verfuegbar.');
  }
  const [propertiesRow, reportsRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM customer_properties'),
    db.getFirstAsync<{ drafts: number; completed: number; exported: number }>(`
      SELECT
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'exported' THEN 1 ELSE 0 END) AS exported
      FROM service_reports
    `),
  ]);

  return {
    properties: propertiesRow?.count ?? 0,
    drafts: reportsRow?.drafts ?? 0,
    completed: reportsRow?.completed ?? 0,
    exported: reportsRow?.exported ?? 0,
  };
}

export async function listProperties(query = '', limit = 30): Promise<CustomerProperty[]> {
  if (isWeb) {
    const lookup = compact(query).toLowerCase();
    const store = readWebStore();
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
        ].some((value) => value.toLowerCase().includes(lookup));
      })
      .sort((a, b) =>
        `${a.city}${a.street}${a.customerNumber}`.localeCompare(`${b.city}${b.street}${b.customerNumber}`),
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
          ORDER BY city, street, customer_number
          LIMIT ?
        `,
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
          ORDER BY city, street, customer_number
          LIMIT ?
        `,
        limit,
      );

  return rows.map(mapProperty);
}

export async function getProperty(id: string): Promise<CustomerProperty | null> {
  if (isWeb) {
    return readWebStore().properties.find((property) => property.id === id) ?? null;
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

export async function upsertImportedProperties(
  properties: Array<Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ImportResult> {
  if (isWeb) {
    const store = readWebStore();
    const result: ImportResult = { inserted: 0, updated: 0, skipped: 0 };
    const timestamp = nowIso();

    for (const property of properties) {
      if (!compact(property.customerNumber) && !compact(property.street)) {
        result.skipped += 1;
        continue;
      }

      const existingId = findExistingWebPropertyId(store, property);
      const nextProperty: CustomerProperty = {
        ...property,
        id: existingId ?? createId('prop'),
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

    writeWebStore(store);
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
      if (!compact(property.customerNumber) && !compact(property.street)) {
        result.skipped += 1;
        continue;
      }

      const existingId = await findExistingPropertyId(db, property);
      if (existingId) {
        await db.runAsync(
          `
            UPDATE customer_properties SET
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
          compact(property.customerNumber),
          compact(property.propertyLabel),
          compact(property.street),
          compact(property.postalCode),
          compact(property.city),
          property.buildingType,
          compact(property.otherBuildingType),
          compact(property.owner),
          compact(property.tenant),
          compact(property.management),
          compact(property.caretaker),
          property.billingRole,
          property.notificationRole,
          toJsonArray(property.fuelTypes),
          toJsonArray(property.fireSystemCodes),
          compact(property.oilBoiler),
          compact(property.kwh),
          compact(property.buildYear),
          compact(property.tour),
          toJsonArray(property.cleaningMonths),
          timestamp,
          existingId,
        );
        result.updated += 1;
      } else {
        await db.runAsync(
          `
            INSERT INTO customer_properties (
              id, customer_number, property_label, street, postal_code, city,
              building_type, other_building_type, owner, tenant, management, caretaker,
              billing_role, notification_role, fuel_types_json, fire_system_codes_json,
              oil_boiler, kwh, build_year, tour, cleaning_months_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          createId('prop'),
          compact(property.customerNumber),
          compact(property.propertyLabel),
          compact(property.street),
          compact(property.postalCode),
          compact(property.city),
          property.buildingType,
          compact(property.otherBuildingType),
          compact(property.owner),
          compact(property.tenant),
          compact(property.management),
          compact(property.caretaker),
          property.billingRole,
          property.notificationRole,
          toJsonArray(property.fuelTypes),
          toJsonArray(property.fireSystemCodes),
          compact(property.oilBoiler),
          compact(property.kwh),
          compact(property.buildYear),
          compact(property.tour),
          toJsonArray(property.cleaningMonths),
          timestamp,
          timestamp,
        );
        result.inserted += 1;
      }
    }
  });

  return result;
}

export async function createReport(propertyId: string): Promise<ServiceReport> {
  if (isWeb) {
    const store = readWebStore();
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
    writeWebStore(store);
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
    return readWebStore().reports.find((report) => report.id === id) ?? null;
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
    return webReportBundle(readWebStore(), reportId);
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
    const store = readWebStore();
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
    const store = readWebStore();
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
    writeWebStore(store);
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
    const updatedStore = readWebStore();
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
    writeWebStore(updatedStore);
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
    const store = readWebStore();
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
    writeWebStore(store);
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
