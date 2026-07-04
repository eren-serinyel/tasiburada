import { getExtraServiceLoadType, type TransportType } from './extraServices';

export const CONTACT_SAFETY_WARNING =
  'Telefon, WhatsApp, e-posta veya açık iletişim bilgisi paylaşmayın. Güvenliğiniz için tüm iletişim platform üzerinden ilerlemelidir.';

export const getCustomerShipmentDetailPath = (shipmentId: string) => `/ilan/${shipmentId}`;

export type DateFlexibility = 'EXACT' | 'PLUS_MINUS_1_DAY' | 'PLUS_MINUS_3_DAYS' | string;

export interface OfferRequestFormContractInput {
  originCity?: string;
  originDistrict?: string;
  originAddressText?: string;
  destinationCity?: string;
  destinationDistrict?: string;
  destinationAddressText?: string;
  date?: string;
  transportType?: string;
  placeType?: string;
  originPlaceType?: string;
  destinationPlaceType?: string;
  floor?: string | number;
  originFloor?: string | number;
  destinationFloor?: string | number;
  hasElevator?: boolean;
  originHasElevator?: boolean;
  destinationHasElevator?: boolean;
  dateFlexibility?: DateFlexibility;
  originAccessDistance?: string | number;
  destinationAccessDistance?: string | number;
  timeWindow?: string;
  serviceOptions?: Record<string, string[]>;
  extraServices?: string[];
  customExtraServices?: string[];
  weightKg?: string | number;
  note?: string;
}

export interface BuildShipmentPayloadOptions {
  phone?: string;
  today?: string;
  templateWeights?: Record<string, number>;
}

export interface ConverterAppliedSummary {
  estimatedVolumeMin?: number | null;
  estimatedVolumeMax?: number | null;
  estimatedWeightKg?: number | null;
  recommendedVehicle?: string | null;
}

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

const toOptionalString = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const normalizeDateFlexibilityForBackend = (value?: string) => {
  const normalized = String(value || 'EXACT').trim().toUpperCase();
  if (normalized === 'FLEXIBLE' || normalized === 'WITHIN_WEEK') return 'PLUS_MINUS_3_DAYS';
  if (normalized === 'PLUS_MINUS_1_DAY' || normalized === 'PLUS_MINUS_3_DAYS') return normalized;
  return 'EXACT';
};

export const normalizePlaceTypeForBackend = (value?: string) => {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const enumValues = ['Daire', 'Apartman Dairesi', 'Site İçi Daire', 'Müstakil Ev', 'Villa', 'Ofis', 'Plaza/Ofis', 'Depo', 'Dükkan', 'Diğer'];
  if (enumValues.includes(raw)) return raw;

  const key = raw.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const map: Record<string, string> = {
    daire: 'Daire',
    apartman: 'Apartman Dairesi',
    'apartman dairesi': 'Apartman Dairesi',
    'site içi daire': 'Site İçi Daire',
    'site ici daire': 'Site İçi Daire',
    müstakil: 'Müstakil Ev',
    mustakil: 'Müstakil Ev',
    'müstakil ev': 'Müstakil Ev',
    'mustakil ev': 'Müstakil Ev',
    villa: 'Villa',
    ofis: 'Ofis',
    'küçük ofis': 'Ofis',
    'kucuk ofis': 'Ofis',
    'orta ofis': 'Ofis',
    'büyük ofis': 'Ofis',
    'buyuk ofis': 'Ofis',
    'plaza ofis': 'Plaza/Ofis',
    'plaza/ofis': 'Plaza/Ofis',
    depo: 'Depo',
    'küçük depo': 'Depo',
    'kucuk depo': 'Depo',
    'orta depo': 'Depo',
    'büyük depo': 'Depo',
    'buyuk depo': 'Depo',
    dükkan: 'Dükkan',
    dükkân: 'Dükkan',
    dukkan: 'Dükkan',
    diğer: 'Diğer',
    diger: 'Diğer',
    '1+1': 'Daire',
    '2+1': 'Daire',
    '3+1': 'Daire',
    '4+1': 'Daire',
    '5+1': 'Daire',
    '5+2': 'Daire',
    '1+1 ev': 'Daire',
    '2+1 ev': 'Daire',
    '3+1 ev': 'Daire',
    '4+1 ev': 'Daire',
    '5+1 ev': 'Daire',
    '5+2 ev': 'Daire',
    'dubleks / müstakil': 'Müstakil Ev',
    'dubleks / mustakil': 'Müstakil Ev',
    'diğer / emin değilim': 'Diğer',
    'diger / emin degilim': 'Diğer',
    'sadece beyaz eşya': 'Diğer',
    'sadece beyaz esya': 'Diğer',
    'sadece mobilya': 'Diğer',
    'tek parça eşya': 'Diğer',
    'tek parca esya': 'Diğer',
  };

  if (map[key]) return map[key];

  const fuzzyMatch = Object.entries(map)
    .sort(([left], [right]) => right.length - left.length)
    .find(([candidate]) => key.includes(candidate));

  return fuzzyMatch?.[1] ?? 'Diğer';
};

export const buildShipmentPayloadFromForm = (
  form: OfferRequestFormContractInput,
  options: BuildShipmentPayloadOptions = {},
) => {
  const extraServicesFromOptions = Object.values(form.serviceOptions || {}).flat();
  const extraServices = extraServicesFromOptions.length
    ? extraServicesFromOptions
    : form.extraServices && form.extraServices.length
      ? form.extraServices
      : undefined;

  const originPlaceType = normalizePlaceTypeForBackend(toOptionalString(form.originPlaceType) || toOptionalString(form.placeType));
  const destinationPlaceType = normalizePlaceTypeForBackend(toOptionalString(form.destinationPlaceType) || toOptionalString(form.placeType));
  const originFloor = toOptionalNumber(form.originFloor ?? form.floor);
  const destinationFloor = toOptionalNumber(form.destinationFloor ?? form.floor);
  const originHasElevator = toOptionalBoolean(form.originHasElevator) ?? toOptionalBoolean(form.hasElevator);
  const destinationHasElevator = toOptionalBoolean(form.destinationHasElevator) ?? toOptionalBoolean(form.hasElevator);

  const explicitWeight = toOptionalNumber(form.weightKg);
  const estimatedWeight = explicitWeight
    ?? (form.placeType && options.templateWeights ? options.templateWeights[form.placeType] : undefined);
  const loadType = getExtraServiceLoadType((toOptionalString(form.transportType) || '') as TransportType);

  return {
    origin: [form.originCity, form.originDistrict].filter(Boolean).join(', '),
    destination: [form.destinationCity, form.destinationDistrict].filter(Boolean).join(', '),
    originAddressText: toOptionalString(form.originAddressText),
    destinationAddressText: toOptionalString(form.destinationAddressText),
    loadDetails: [form.transportType, form.placeType].filter(Boolean).join(' / ') || 'Belirtilmedi',
    transportType: toOptionalString(form.transportType),
    loadType,
    placeType: toOptionalString(form.placeType),
    hasElevator: toOptionalBoolean(form.hasElevator),
    floor: toOptionalNumber(form.floor),
    originPlaceType,
    destinationPlaceType,
    originFloor,
    destinationFloor,
    originHasElevator,
    destinationHasElevator,
    dateFlexibility: normalizeDateFlexibilityForBackend(form.dateFlexibility),
    originAccessDistance: toOptionalNumber(form.originAccessDistance),
    destinationAccessDistance: toOptionalNumber(form.destinationAccessDistance),
    timePreference: toOptionalString(form.timeWindow),
    extraServices,
    customExtraServices: Array.isArray(form.customExtraServices) && form.customExtraServices.length
      ? Array.from(new Set(form.customExtraServices.map((id) => String(id || '').trim()).filter(Boolean)))
      : undefined,
    weight: estimatedWeight,
    estimatedWeight,
    note: toOptionalString(form.note),
    shipmentDate: form.date || options.today || new Date().toISOString().split('T')[0],
    contactPhone: toOptionalString(options.phone),
  };
};

export const getConverterAppliedSummary = (summary?: ConverterAppliedSummary | null) => {
  if (!summary) return [] as string[];

  const rows: string[] = [];
  if (typeof summary.estimatedVolumeMin === 'number' && typeof summary.estimatedVolumeMax === 'number') {
    rows.push(`Tahmini hacim: ${summary.estimatedVolumeMin}-${summary.estimatedVolumeMax} m³`);
  }
  if (typeof summary.estimatedWeightKg === 'number') {
    rows.push(`Tahmini ağırlık: ${summary.estimatedWeightKg} kg`);
  }
  if (summary.recommendedVehicle) {
    rows.push(`Önerilen araç: ${summary.recommendedVehicle}`);
  }

  return rows;
};
