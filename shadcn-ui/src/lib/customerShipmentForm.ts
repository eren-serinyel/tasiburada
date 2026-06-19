export const CONTACT_SAFETY_WARNING =
  'Telefon, WhatsApp, e-posta veya açık iletişim bilgisi paylaşmayın. Güvenliğiniz için tüm iletişim platform üzerinden ilerlemelidir.';

export const getCustomerShipmentDetailPath = (shipmentId: string) => `/ilan/${shipmentId}`;

export type DateFlexibility = 'EXACT' | 'FLEXIBLE' | 'WITHIN_WEEK' | string;

export interface OfferRequestFormContractInput {
  originCity?: string;
  originDistrict?: string;
  destinationCity?: string;
  destinationDistrict?: string;
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

  const originPlaceType = toOptionalString(form.originPlaceType) || toOptionalString(form.placeType);
  const destinationPlaceType = toOptionalString(form.destinationPlaceType) || toOptionalString(form.placeType);
  const originFloor = toOptionalNumber(form.originFloor ?? form.floor);
  const destinationFloor = toOptionalNumber(form.destinationFloor ?? form.floor);
  const originHasElevator = toOptionalBoolean(form.originHasElevator) ?? toOptionalBoolean(form.hasElevator);
  const destinationHasElevator = toOptionalBoolean(form.destinationHasElevator) ?? toOptionalBoolean(form.hasElevator);

  const explicitWeight = toOptionalNumber(form.weightKg);
  const estimatedWeight = explicitWeight
    ?? (form.placeType && options.templateWeights ? options.templateWeights[form.placeType] : undefined);

  return {
    origin: [form.originCity, form.originDistrict].filter(Boolean).join(', '),
    destination: [form.destinationCity, form.destinationDistrict].filter(Boolean).join(', '),
    loadDetails: [form.transportType, form.placeType].filter(Boolean).join(' / ') || 'Belirtilmedi',
    transportType: toOptionalString(form.transportType),
    placeType: toOptionalString(form.placeType),
    hasElevator: toOptionalBoolean(form.hasElevator),
    floor: toOptionalNumber(form.floor),
    originPlaceType,
    destinationPlaceType,
    originFloor,
    destinationFloor,
    originHasElevator,
    destinationHasElevator,
    dateFlexibility: form.dateFlexibility || 'EXACT',
    originAccessDistance: toOptionalNumber(form.originAccessDistance),
    destinationAccessDistance: toOptionalNumber(form.destinationAccessDistance),
    timePreference: toOptionalString(form.timeWindow),
    extraServices,
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
