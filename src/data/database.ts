// Data-access dispatcher. Selects the native (expo-sqlite) or web-store
// implementation at runtime by platform and re-exports the public data API. All
// consumers import from this module only.
//
//   database.ts        ← you are here (dispatcher)
//   databaseSqlite.ts  ← native (expo-sqlite) implementation
//   databaseWeb.ts     ← web (IndexedDB + localStorage fallback) implementation
//   databaseShared.ts  ← platform-independent normalizers used by both
import { Platform } from 'react-native';

import * as sqlite from './databaseSqlite';
import * as web from './databaseWeb';

const impl = Platform.OS === 'web' ? web : sqlite;

export const initDatabase = impl.initDatabase;
export const getDashboardStats = impl.getDashboardStats;
export const listProperties = impl.listProperties;
export const getProperty = impl.getProperty;
export const upsertImportedProperties = impl.upsertImportedProperties;
export const importGenesisBundle = impl.importGenesisBundle;
export const listGenesisImportRuns = impl.listGenesisImportRuns;
export const getGenesisContext = impl.getGenesisContext;
export const createReport = impl.createReport;
export const getReport = impl.getReport;
export const getReportBundle = impl.getReportBundle;
export const listReports = impl.listReports;
export const saveReport = impl.saveReport;
export const completeReport = impl.completeReport;
export const markReportExported = impl.markReportExported;
