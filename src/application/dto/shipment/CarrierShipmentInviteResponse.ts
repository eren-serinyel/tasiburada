export interface CarrierShipmentInviteRequestedServicesDto {
  catalogServiceIds: string[];
  customServiceIds: string[];
}

export interface CarrierShipmentSummaryDto {
  id: string;
  status: string;
  shipmentCategory: string | null;
  originCity: string | null;
  originDistrict: string | null;
  destinationCity: string | null;
  destinationDistrict: string | null;
  originPlaceType: string | null;
  destinationPlaceType: string | null;
  originFloor: number | null;
  destinationFloor: number | null;
  originHasElevator: boolean | null;
  destinationHasElevator: boolean | null;
  loadProfile: string | null;
  originAccessDistance: string | null;
  destinationAccessDistance: string | null;
  insuranceType: string | null;
  timePreference: string | null;
  dateFlexibility: string | null;
  weight: number | null;
  estimatedWeight: number | null;
  shipmentDate: string | null;
  vehicleTypePreferenceId: string | null;
  converterEstimatedVolumeMin: number | null;
  converterEstimatedVolumeMax: number | null;
  converterRecommendedVehicleCode: string | null;
}

export interface CarrierShipmentInviteDto {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  requestedServices: CarrierShipmentInviteRequestedServicesDto | null;
  shipment: CarrierShipmentSummaryDto;
}

export interface CarrierShipmentInviteSource {
  id: string;
  status: CarrierShipmentInviteDto['status'];
  createdAt: Date | string;
  requestedServices?: {
    catalogServiceIds?: string[];
    customServiceIds?: string[];
  } | null;
  shipment: {
    id: string;
    status?: string | null;
    shipmentCategory?: string | null;
    originCity?: string | null;
    originDistrict?: string | null;
    destinationCity?: string | null;
    destinationDistrict?: string | null;
    originPlaceType?: string | null;
    destinationPlaceType?: string | null;
    originFloor?: number | null;
    destinationFloor?: number | null;
    originHasElevator?: boolean | null;
    destinationHasElevator?: boolean | null;
    loadProfile?: string | null;
    originAccessDistance?: string | null;
    destinationAccessDistance?: string | null;
    insuranceType?: string | null;
    timePreference?: string | null;
    dateFlexibility?: string | null;
    weight?: number | string | null;
    estimatedWeight?: number | string | null;
    shipmentDate?: Date | string | null;
    vehicleTypePreferenceId?: string | null;
    converterEstimatedVolumeMin?: number | string | null;
    converterEstimatedVolumeMax?: number | string | null;
    converterRecommendedVehicleCode?: string | null;
  };
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const copyIds = (values: unknown): string[] =>
  Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string')
    : [];

export const toCarrierShipmentInviteDto = (
  invite: CarrierShipmentInviteSource,
): CarrierShipmentInviteDto => ({
  id: invite.id,
  status: invite.status,
  createdAt: toDateString(invite.createdAt) ?? '',
  requestedServices: invite.requestedServices
    ? {
      catalogServiceIds: copyIds(invite.requestedServices.catalogServiceIds),
      customServiceIds: copyIds(invite.requestedServices.customServiceIds),
    }
    : null,
  shipment: {
    id: invite.shipment.id,
    status: invite.shipment.status ?? '',
    shipmentCategory: invite.shipment.shipmentCategory ?? null,
    originCity: invite.shipment.originCity ?? null,
    originDistrict: invite.shipment.originDistrict ?? null,
    destinationCity: invite.shipment.destinationCity ?? null,
    destinationDistrict: invite.shipment.destinationDistrict ?? null,
    originPlaceType: invite.shipment.originPlaceType ?? null,
    destinationPlaceType: invite.shipment.destinationPlaceType ?? null,
    originFloor: invite.shipment.originFloor ?? null,
    destinationFloor: invite.shipment.destinationFloor ?? null,
    originHasElevator: invite.shipment.originHasElevator ?? null,
    destinationHasElevator: invite.shipment.destinationHasElevator ?? null,
    loadProfile: invite.shipment.loadProfile ?? null,
    originAccessDistance: invite.shipment.originAccessDistance ?? null,
    destinationAccessDistance: invite.shipment.destinationAccessDistance ?? null,
    insuranceType: invite.shipment.insuranceType ?? null,
    timePreference: invite.shipment.timePreference ?? null,
    dateFlexibility: invite.shipment.dateFlexibility ?? null,
    weight: toNullableNumber(invite.shipment.weight),
    estimatedWeight: toNullableNumber(invite.shipment.estimatedWeight),
    shipmentDate: toDateString(invite.shipment.shipmentDate),
    vehicleTypePreferenceId: invite.shipment.vehicleTypePreferenceId ?? null,
    converterEstimatedVolumeMin: toNullableNumber(
      invite.shipment.converterEstimatedVolumeMin,
    ),
    converterEstimatedVolumeMax: toNullableNumber(
      invite.shipment.converterEstimatedVolumeMax,
    ),
    converterRecommendedVehicleCode:
      invite.shipment.converterRecommendedVehicleCode ?? null,
  },
});
