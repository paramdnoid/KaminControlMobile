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

export type DashboardStats = {
  properties: number;
  drafts: number;
  completed: number;
  exported: number;
};
