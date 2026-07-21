export const SERVICE_CATEGORY_CODES = [
  'HOME_MOVE',
  'OFFICE_MOVE',
  'PARTIAL_ITEM',
] as const;

export const ROUTE_SCOPE_CODES = [
  'INTRACITY',
  'INTERCITY',
] as const;

export type ServiceCategoryCode =
  typeof SERVICE_CATEGORY_CODES[number];
export type RouteScopeCode =
  typeof ROUTE_SCOPE_CODES[number];

const serviceCategoryCodeSet = new Set<string>(
  SERVICE_CATEGORY_CODES,
);
const routeScopeCodeSet = new Set<string>(ROUTE_SCOPE_CODES);

export const isServiceCategoryCode = (
  value: unknown,
): value is ServiceCategoryCode =>
  typeof value === 'string' && serviceCategoryCodeSet.has(value);

export const isRouteScopeCode = (
  value: unknown,
): value is RouteScopeCode =>
  typeof value === 'string' && routeScopeCodeSet.has(value);

export const serviceCategoryCodeFromV1ShipmentCategory = (
  value: string | null | undefined,
): ServiceCategoryCode | null => {
  switch (value) {
    case 'HOME_MOVE':
      return SERVICE_CATEGORY_CODES[0];
    case 'OFFICE_MOVE':
      return SERVICE_CATEGORY_CODES[1];
    case 'PARTIAL_ITEM':
      return SERVICE_CATEGORY_CODES[2];
    case 'STORAGE':
    case null:
    case undefined:
      return null;
    default:
      return null;
  }
};

const normalizeV1City = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

export const routeScopeCodeFromV1Cities = (
  originCity: string | null | undefined,
  destinationCity: string | null | undefined,
): RouteScopeCode | null => {
  const origin = normalizeV1City(originCity ?? '');
  const destination = normalizeV1City(destinationCity ?? '');
  if (!origin || !destination) return null;
  return origin === destination
    ? ROUTE_SCOPE_CODES[0]
    : ROUTE_SCOPE_CODES[1];
};

export interface ShipmentV1IdentitySource {
  readonly shipmentCategory: string | null | undefined;
  readonly originCity: string | null | undefined;
  readonly destinationCity: string | null | undefined;
}

export const deriveShipmentV2IdentityFromV1 = (
  source: ShipmentV1IdentitySource,
): {
  readonly serviceCategoryCode: ServiceCategoryCode | null;
  readonly routeScopeCode: RouteScopeCode | null;
} => ({
  serviceCategoryCode:
    serviceCategoryCodeFromV1ShipmentCategory(
      source.shipmentCategory,
    ),
  routeScopeCode: routeScopeCodeFromV1Cities(
    source.originCity,
    source.destinationCity,
  ),
});
