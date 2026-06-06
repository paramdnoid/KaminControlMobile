import {
  ADDRESS_ROLES,
  BUILDING_TYPES,
  CLEANING_MONTHS,
  FIRE_SYSTEM_CODES,
  FUEL_TYPES,
  type AddressRole,
  type BuildingType,
  type CleaningMonth,
  type FireSystemCode,
  type FuelType,
} from '../types';

export const buildingTypeOptions = BUILDING_TYPES.map((value) => ({
  value,
  label: value === 'Wohn-/Geschaeftshaus' ? 'Wohn-/Geschäftshaus' : value,
}));

export const addressRoleOptions: Array<{ value: AddressRole; label: string }> = ADDRESS_ROLES.map(
  (value) => ({
    value,
    label: value === 'Eigentuemer' ? 'Eigentümer' : value,
  }),
);

export const fuelTypeOptions: Array<{ value: FuelType; label: string }> = FUEL_TYPES.map(
  (value) => ({
    value,
    label: value === 'Oel' ? 'Öl' : value,
  }),
);

export const cleaningMonthOptions: Array<{ value: CleaningMonth; label: string }> =
  CLEANING_MONTHS.map((value) => ({ value, label: value }));

export const fireSystemOptions: Array<{ value: FireSystemCode; label: string }> =
  FIRE_SYSTEM_CODES.map((value) => ({ value, label: value }));

export function displayAddressRole(value: AddressRole | ''): string {
  if (!value) {
    return '-';
  }
  return addressRoleOptions.find((option) => option.value === value)?.label ?? value;
}

export function displayBuildingType(value: BuildingType | '', other: string): string {
  if (!value) {
    return '-';
  }

  if (value === 'Sonstiges' && other) {
    return `${value}: ${other}`;
  }

  return buildingTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function displayFuelTypes(values: FuelType[]): string {
  return values.length
    ? values.map((value) => fuelTypeOptions.find((option) => option.value === value)?.label ?? value).join(', ')
    : '-';
}
