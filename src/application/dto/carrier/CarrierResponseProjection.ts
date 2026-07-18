import { Carrier, CarrierApprovalState } from '../../../domain/entities/Carrier';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceLoadType';

export interface PublicCarrierVehicleDto {
  id: string;
  typeName: string;
  capacityKg: number | null;
}

export interface PublicCarrierServiceItemDto {
  id: string;
  name: string;
  description: string | null;
  priceMode: string | null;
  basePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  source: 'catalog' | 'custom';
}

export interface PublicCarrierServiceGroupDto {
  loadType: ExtraServiceLoadType;
  items: PublicCarrierServiceItemDto[];
}

export interface PublicCarrierReviewDto {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  isOwnReview?: boolean;
}

export interface PublicCarrierDto {
  id: string;
  companyName: string;
  pictureUrl: string | null;
  city: string | null;
  district: string | null;
  serviceAreas: string[];
  vehicles: PublicCarrierVehicleDto[];
  vehicleSummary: string | null;
  serviceTypes: string[];
  services: PublicCarrierServiceGroupDto[];
  scopes: Array<'sehirici' | 'sehirlerarasi'>;
  experienceYears: number | null;
  rating: number;
  reviewCount: number;
  startingPrice: number | null;
  isVerified: boolean;
  recentReviews: PublicCarrierReviewDto[];
  catalogExtraServiceIds: string[];
  capacityAdequate?: boolean;
}

export interface PublicCarrierProjectionInput {
  carrier: Carrier;
  reviewCount?: number;
  vehicles?: PublicCarrierVehicleDto[];
  vehicleSummary?: string | null;
  services?: PublicCarrierServiceGroupDto[];
  recentReviews?: PublicCarrierReviewDto[];
  startingPrice?: number | null;
  catalogExtraServiceIds?: string[];
  scopes?: Array<'sehirici' | 'sehirlerarasi'>;
  capacityAdequate?: boolean;
}

export interface OwnerCarrierStatusDto {
  overallPercentage: number;
  completedSectionsCount: number;
  totalSections: number;
  completedSections: string[];
  sections: {
    companyInfoCompleted: boolean;
    activityInfoCompleted: boolean;
    servicesCompleted: boolean;
    documentsCompleted: boolean;
    vehiclesCompleted: boolean;
    earningsCompleted: boolean;
  };
}

export interface OwnerCarrierOverviewDto {
  carrier: {
    id: string;
    companyName: string;
    contactName: string | null;
    email: string;
    phone: string;
    taxNumber: string;
    pictureUrl: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    district: string | null;
    activityCity: string | null;
    foundedYear: number;
    isActive: boolean;
    hasUploadedDocuments: boolean;
    verifiedByAdmin: boolean;
    pendingApproval: boolean;
    approvalState: CarrierApprovalState;
    documentCount: number;
    rating: number;
    createdAt: Date;
    updatedAt: Date;
  };
  activity: {
    city: string;
    district: string | null;
    address: string | null;
    serviceAreas: string[];
    availableDates: string | null;
    defaultAvailabilityStart: string | null;
    defaultAvailabilityEnd: string | null;
  } | null;
  status: OwnerCarrierStatusDto;
  earnings: {
    bankName: string;
    iban: string;
    accountHolder: string;
  } | null;
  documents: Array<{
    id: string;
    type: string;
    status: string;
    isRequired: boolean;
    isApproved: boolean;
    uploadedAt: Date;
    verifiedAt: Date | null;
  }>;
  securitySettings: {
    twoFactorEnabled: boolean;
    suspiciousLoginAlertsEnabled: boolean;
  } | null;
  serviceTypes: Array<{
    id: string;
    serviceTypeId: string;
    name: string;
  }>;
  vehicleTypes: Array<{
    id: string;
    vehicleTypeId: string;
    name: string;
    capacityKg: number | null;
  }>;
  scopeOfWorks: Array<{
    id: string;
    scopeId: string;
    name: string;
  }>;
}

const parseStringArray = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(item => String(item).trim()).filter(Boolean)
        : [];
    } catch {
      return raw.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapVehicles = (carrier: Carrier): PublicCarrierVehicleDto[] =>
  (carrier.vehicleTypeLinks ?? []).map(link => ({
    id: link.id,
    typeName: link.vehicleType?.name ?? 'Araç',
    capacityKg: toNullableNumber(link.capacityKg)
      ?? toNullableNumber(link.vehicleType?.defaultCapacityKg),
  }));

const mapScopes = (carrier: Carrier): Array<'sehirici' | 'sehirlerarasi'> => {
  const result = (carrier.scopeLinks ?? [])
    .map(link => link.scope?.name)
    .map(name => {
      if (name === 'Şehir İçi') return 'sehirici';
      if (name === 'Şehirler Arası') return 'sehirlerarasi';
      return null;
    })
    .filter((scope): scope is 'sehirici' | 'sehirlerarasi' => scope !== null);

  return Array.from(new Set(result));
};

export const toPublicCarrierDto = (
  input: PublicCarrierProjectionInput,
): PublicCarrierDto => {
  const { carrier } = input;
  const vehicles = input.vehicles ?? mapVehicles(carrier);
  const vehicleSummary = input.vehicleSummary !== undefined
    ? input.vehicleSummary
    : vehicles[0]
      ? `${vehicles[0].typeName.toUpperCase()}${
        vehicles[0].capacityKg ? ` (${vehicles[0].capacityKg}kg)` : ''
      }`
      : null;
  const experienceYears = carrier.foundedYear
    ? Math.max(0, new Date().getFullYear() - carrier.foundedYear)
    : null;

  return {
    id: carrier.id,
    companyName: carrier.companyName,
    pictureUrl: carrier.pictureUrl ?? null,
    city: carrier.activity?.city ?? null,
    district: carrier.activity?.district ?? null,
    serviceAreas: parseStringArray(carrier.activity?.serviceAreasJson),
    vehicles,
    vehicleSummary,
    serviceTypes: (carrier.serviceTypeLinks ?? [])
      .map(link => link.serviceType?.name?.trim())
      .filter((name): name is string => Boolean(name)),
    services: input.services ?? [],
    scopes: input.scopes ?? mapScopes(carrier),
    experienceYears,
    rating: Number(carrier.rating ?? 0),
    reviewCount: input.reviewCount ?? input.recentReviews?.length ?? 0,
    startingPrice: input.startingPrice ?? null,
    isVerified:
      carrier.isActive === true
      && carrier.verifiedByAdmin === true
      && carrier.approvalState === CarrierApprovalState.APPROVED,
    recentReviews: input.recentReviews ?? [],
    catalogExtraServiceIds: input.catalogExtraServiceIds ?? [],
    ...(input.capacityAdequate !== undefined
      ? { capacityAdequate: input.capacityAdequate }
      : {}),
  };
};

export const toOwnerCarrierOverviewDto = (
  carrier: Carrier,
  status: OwnerCarrierStatusDto,
): OwnerCarrierOverviewDto => ({
  carrier: {
    id: carrier.id,
    companyName: carrier.companyName,
    contactName: carrier.contactName ?? null,
    email: carrier.email,
    phone: carrier.phone,
    taxNumber: carrier.taxNumber,
    pictureUrl: carrier.pictureUrl ?? null,
    addressLine1: carrier.addressLine1 ?? null,
    addressLine2: carrier.addressLine2 ?? null,
    district: carrier.district ?? null,
    activityCity: carrier.activityCity ?? null,
    foundedYear: carrier.foundedYear,
    isActive: carrier.isActive,
    hasUploadedDocuments: carrier.hasUploadedDocuments,
    verifiedByAdmin: carrier.verifiedByAdmin,
    pendingApproval: carrier.pendingApproval,
    approvalState: carrier.approvalState,
    documentCount: carrier.documentCount,
    rating: Number(carrier.rating ?? 0),
    createdAt: carrier.createdAt,
    updatedAt: carrier.updatedAt,
  },
  activity: carrier.activity
    ? {
      city: carrier.activity.city,
      district: carrier.activity.district ?? null,
      address: carrier.activity.address ?? null,
      serviceAreas: parseStringArray(carrier.activity.serviceAreasJson),
      availableDates: carrier.activity.availableDates ?? null,
      defaultAvailabilityStart: carrier.activity.defaultAvailabilityStart ?? null,
      defaultAvailabilityEnd: carrier.activity.defaultAvailabilityEnd ?? null,
    }
    : null,
  status,
  earnings: carrier.earnings
    ? {
      bankName: carrier.earnings.bankName,
      iban: carrier.earnings.iban,
      accountHolder: carrier.earnings.accountHolder,
    }
    : null,
  documents: (carrier.documents ?? []).map(document => ({
    id: document.id,
    type: document.type,
    status: document.status,
    isRequired: document.isRequired,
    isApproved: document.isApproved,
    uploadedAt: document.uploadedAt,
    verifiedAt: document.verifiedAt ?? null,
  })),
  securitySettings: carrier.securitySettings
    ? {
      twoFactorEnabled: carrier.securitySettings.twoFactorEnabled,
      suspiciousLoginAlertsEnabled:
        carrier.securitySettings.suspiciousLoginAlertsEnabled,
    }
    : null,
  serviceTypes: (carrier.serviceTypeLinks ?? []).map(link => ({
    id: link.id,
    serviceTypeId: link.serviceTypeId,
    name: link.serviceType?.name ?? '',
  })),
  vehicleTypes: (carrier.vehicleTypeLinks ?? []).map(link => ({
    id: link.id,
    vehicleTypeId: link.vehicleTypeId,
    name: link.vehicleType?.name ?? '',
    capacityKg: toNullableNumber(link.capacityKg)
      ?? toNullableNumber(link.vehicleType?.defaultCapacityKg),
  })),
  scopeOfWorks: (carrier.scopeLinks ?? []).map(link => ({
    id: link.id,
    scopeId: link.scopeId,
    name: link.scope?.name ?? '',
  })),
});
