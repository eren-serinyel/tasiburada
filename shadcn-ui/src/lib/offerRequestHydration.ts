import { CITIES_TR, getDistrictsForCitySync } from './locations';

export type OfferRequestDraftFormData = Record<string, unknown>;

export interface NormalizedOfferRequestDraft {
  formData: OfferRequestDraftFormData;
  warnings: string[];
}

const foldLocationName = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');

export const findLocationOption = (value: unknown, options: string[]) => {
  const normalized = foldLocationName(value);
  if (!normalized) return '';
  return options.find((option) => foldLocationName(option) === normalized) ?? '';
};

const toTrimmedString = (value: unknown) => String(value ?? '').trim();

const normalizeStringArray = (value: unknown) => (
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)))
    : []
);

const normalizeServiceOptions = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string[]>>((acc, [group, ids]) => {
    const normalizedIds = normalizeStringArray(ids);
    if (normalizedIds.length > 0) acc[group] = normalizedIds;
    return acc;
  }, {});
};

export const normalizeOfferRequestDraftFormData = (
  draftFormData: OfferRequestDraftFormData,
): NormalizedOfferRequestDraft => {
  const warnings: string[] = [];
  const formData: OfferRequestDraftFormData = { ...draftFormData };

  const matchedOriginCity = findLocationOption(formData.originCity, CITIES_TR);
  const matchedDestinationCity = findLocationOption(formData.destinationCity, CITIES_TR);
  const originCity = matchedOriginCity || toTrimmedString(formData.originCity);
  const destinationCity = matchedDestinationCity || toTrimmedString(formData.destinationCity);

  if (formData.originCity && !originCity) warnings.push('Çıkış şehri mevcut şehir listesinde bulunamadı.');
  if (formData.destinationCity && !destinationCity) warnings.push('Varış şehri mevcut şehir listesinde bulunamadı.');

  formData.originCity = originCity;
  formData.destinationCity = destinationCity;

  const matchedOriginDistrict = originCity
    ? findLocationOption(formData.originDistrict, getDistrictsForCitySync(originCity))
    : '';
  const matchedDestinationDistrict = destinationCity
    ? findLocationOption(formData.destinationDistrict, getDistrictsForCitySync(destinationCity))
    : '';
  const originDistrict = matchedOriginDistrict || (originCity ? toTrimmedString(formData.originDistrict) : '');
  const destinationDistrict = matchedDestinationDistrict || (destinationCity ? toTrimmedString(formData.destinationDistrict) : '');

  if (formData.originDistrict && !originDistrict) warnings.push('Çıkış ilçesi mevcut ilçe listesinde bulunamadı.');
  if (formData.destinationDistrict && !destinationDistrict) warnings.push('Varış ilçesi mevcut ilçe listesinde bulunamadı.');

  formData.originDistrict = originDistrict;
  formData.destinationDistrict = destinationDistrict;

  if (formData.serviceOptions) formData.serviceOptions = normalizeServiceOptions(formData.serviceOptions);
  if (formData.extraServices) formData.extraServices = normalizeStringArray(formData.extraServices);

  return { formData, warnings };
};
