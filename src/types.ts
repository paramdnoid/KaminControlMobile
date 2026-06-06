export const BUILDING_TYPES = [
  'EFH',
  'MFH',
  'Ferienhaus',
  'Wohn-/Geschaeftshaus',
  'Bauernhaus',
  'Sonstiges',
] as const;

export const ADDRESS_ROLES = ['Eigentuemer', 'Mieter', 'Verwaltung', 'Hauswart'] as const;

export const FUEL_TYPES = ['Holz', 'Oel', 'Gas', 'Andere'] as const;

export const CLEANING_MONTHS = [
  'Jan',
  'Feb',
  'Mrz',
  'Apr',
  'Mai',
  'Juni',
  'Juli',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const;

export const FIRE_SYSTEM_CODES = [
  'Ka',
  'Oez',
  'Gz',
  'al',
  'Hz',
  'Pz',
  'Kz',
  'Sb',
  'Of',
  'He',
  'Ch',
  'Oeo',
  'So',
  'HK',
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];
export type AddressRole = (typeof ADDRESS_ROLES)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type CleaningMonth = (typeof CLEANING_MONTHS)[number];
export type FireSystemCode = (typeof FIRE_SYSTEM_CODES)[number];

export type ReportStatus = 'draft' | 'completed' | 'exported';

export type CustomerProperty = {
  id: string;
  sourceKey?: string;
  sourceSystem?: 'manual' | 'genesis';
  isActive?: boolean;
  lastImportedAt?: string;
  customerNumber: string;
  propertyLabel: string;
  street: string;
  postalCode: string;
  city: string;
  buildingType: BuildingType | '';
  otherBuildingType: string;
  owner: string;
  tenant: string;
  management: string;
  caretaker: string;
  billingRole: AddressRole | '';
  notificationRole: AddressRole | '';
  fuelTypes: FuelType[];
  fireSystemCodes: FireSystemCode[];
  oilBoiler: string;
  kwh: string;
  buildYear: string;
  tour: string;
  cleaningMonths: CleaningMonth[];
  createdAt: string;
  updatedAt: string;
};

export type ServiceReport = {
  id: string;
  propertyId: string;
  cleaningDate: string;
  timeFrom: string;
  timeTo: string;
  chimneySweepName: string;
  notes: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  exportedAt: string | null;
};

export type WorkItem = {
  id: string;
  reportId: string;
  quantity: string;
  description: string;
  tp: string;
  amount: string;
  minutes: string;
  sortOrder: number;
};

export type GenesisImportRun = {
  id: string;
  fileName: string;
  importedAt: string;
  exportedAt: string;
  schemaVersion: string;
  converterVersion: string;
  propertiesCount: number;
  installationsCount: number;
  plannedWorkCount: number;
  historyCount: number;
  inactiveCount: number;
  warnings: string[];
  tableCounts: Record<string, number>;
};

export type GenesisInstallation = {
  id: string;
  propertyId: string;
  sourceKey: string;
  installationKey: string;
  systemCode: string;
  label: string;
  fuelTypes: FuelType[];
  manufacturer: string;
  model: string;
  buildYear: string;
  kwh: string;
  location: string;
  notes: string;
};

export type GenesisSuggestionSource = 'tariff' | 'arbvol' | 'history';

export type GenesisPlannedWork = {
  id: string;
  propertyId: string;
  sourceKey: string;
  workKey: string;
  source: GenesisSuggestionSource;
  tariffCode: string;
  month: CleaningMonth | '';
  tour: string;
  quantity: string;
  description: string;
  tp: string;
  amount: string;
  minutes: string;
  unitPrice: string;
  taxPoints: string;
  confidence: number;
  reason: string;
  notes: string;
};

export type GenesisHistoryEntry = {
  id: string;
  propertyId: string;
  sourceKey: string;
  historyKey: string;
  date: string;
  employee: string;
  description: string;
  amount: string;
  minutes: string;
  notes: string;
};

export type GenesisPropertyContext = {
  importRun: GenesisImportRun | null;
  installations: GenesisInstallation[];
  tariffSuggestions: GenesisPlannedWork[];
  arbvolSummary: GenesisPlannedWork[];
  plannedWork: GenesisPlannedWork[];
  history: GenesisHistoryEntry[];
};

export type ReportBundle = {
  property: CustomerProperty;
  report: ServiceReport;
  workItems: WorkItem[];
};

export type ImportCandidate = {
  rowNumber: number;
  property: Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'>;
  warnings: string[];
};

export type ImportPreview = {
  fileName: string;
  totalRows: number;
  candidates: ImportCandidate[];
  skippedRows: Array<{ rowNumber: number; reason: string }>;
};

export type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export type GenesisBundleProperty = Omit<CustomerProperty, 'id' | 'createdAt' | 'updatedAt'> & {
  sourceKey: string;
  sourceSystem: 'genesis';
  isActive: boolean;
  lastImportedAt: string;
  notes?: string;
  rawRefs?: Record<string, string | number | null>;
};

export type GenesisBundleInstallation = Omit<GenesisInstallation, 'id' | 'propertyId'> & {
  raw?: Record<string, unknown>;
};

export type GenesisBundlePlannedWork = Omit<GenesisPlannedWork, 'id' | 'propertyId'> & {
  raw?: Record<string, unknown>;
};

export type GenesisBundleHistoryEntry = Omit<GenesisHistoryEntry, 'id' | 'propertyId'> & {
  raw?: Record<string, unknown>;
};

export type GenesisBundleV1 = {
  schemaVersion: 'genesis-bundle.v1';
  metadata: {
    exportedAt: string;
    converterVersion: string;
    sourceFileName: string;
    tableCounts: Record<string, number>;
    warnings: string[];
  };
  properties: GenesisBundleProperty[];
  installations: GenesisBundleInstallation[];
  plannedWork: GenesisBundlePlannedWork[];
  history: GenesisBundleHistoryEntry[];
};

export type GenesisBundlePreview = {
  fileName: string;
  bundle: GenesisBundleV1;
  warnings: string[];
};

export type GenesisImportResult = ImportResult & {
  inactive: number;
  installations: number;
  plannedWork: number;
  history: number;
  warnings: string[];
};

export type DashboardStats = {
  properties: number;
  drafts: number;
  completed: number;
  exported: number;
  genesisImports: number;
};
