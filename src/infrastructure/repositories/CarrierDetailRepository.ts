import { BaseRepository } from './BaseRepository';
import { AppDataSource } from '../database/data-source';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Offer } from '../../domain/entities/Offer';
import { CarrierDocument, CarrierDocumentStatus } from '../../domain/entities/CarrierDocument';
import { CarrierVehicleType } from '../../domain/entities/CarrierVehicleType';
import { Review } from '../../domain/entities/Review';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { CarrierCustomExtraService } from '../../domain/entities/CarrierCustomExtraService';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceLoadType';

export interface CarrierDetailVehicleDto {
  id: string;
  typeName: string;
  capacityKg: number | null;
}

export interface CarrierDetailDocumentDto {
  id: string;
  type: string;
  status: string;
  isRequired: boolean;
  isApproved: boolean;
}

export interface CarrierDetailRatingDto {
  average: number;
  count: number;
}

export interface CarrierDetailProfileDto {
  overallPercentage: number;
  companyInfoCompleted: boolean;
  activityInfoCompleted: boolean;
  documentsCompleted: boolean;
  earningsCompleted: boolean;
}

export interface CarrierDetailStatsDto {
  completedShipments: number;
  cancelledShipments: number;
  successRate: number;
  totalOffers: number;
}

export interface CarrierReviewSummaryDto {
  id: string;
  customerId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CarrierDetailServiceItemDto {
  id: string;
  name: string;
  description: string | null;
  priceMode: string | null;
  basePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  source: 'catalog' | 'custom';
}

export interface CarrierDetailServiceGroupDto {
  loadType: ExtraServiceLoadType;
  items: CarrierDetailServiceItemDto[];
}

export interface CarrierDetailDto {
  id: string;
  companyName: string;
  pictureUrl: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string;
  city: string | null;
  district: string | null;
  address: string | null;
  foundedYear: number | null;
  experienceYears: number | null;
  serviceAreas: string[];
  vehicles: CarrierDetailVehicleDto[];
  profile: CarrierDetailProfileDto;
  rating: CarrierDetailRatingDto;
  stats: CarrierDetailStatsDto;
  startingPrice: number | null;
  documents: CarrierDetailDocumentDto[];
  documentsApproved: boolean;
  recentReviews: CarrierReviewSummaryDto[];
  services: CarrierDetailServiceGroupDto[];
}

export class CarrierDetailRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
  }

  async getCarrierDetail(carrierId: string, loadType?: ExtraServiceLoadType | null): Promise<CarrierDetailDto | null> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.profileStatus', 'profileStatus')
      .leftJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.vehicleTypeLinks', 'vehicleLink')
      .leftJoinAndSelect('vehicleLink.vehicleType', 'vehicleType')
      .leftJoinAndSelect('carrier.documents', 'documents')
      .leftJoinAndSelect('carrier.earnings', 'earnings')
      .leftJoin(
        qb => qb
          .select('offer.carrierId', 'carrierId')
          .addSelect('MIN(offer.price)', 'minPrice')
          .addSelect('COUNT(offer.id)', 'offerCount')
          .from(Offer, 'offer')
          .groupBy('offer.carrierId'),
        'pricing',
        'pricing.carrierId = carrier.id'
      )
      .where('carrier.id = :carrierId', { carrierId })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED })
      .addSelect('pricing.minPrice', 'pricing_minPrice')
      .addSelect('pricing.offerCount', 'pricing_offerCount');

    const { entities, raw } = await qb.getRawAndEntities();
    const carrierEntity = entities[0];
    if (!carrierEntity) {
      return null;
    }

    const pricingRow = raw[0] ?? {};
    const serviceAreas = this.parseServiceAreas(carrierEntity.activity?.serviceAreasJson);
    const vehicles = this.mapVehicles(carrierEntity.vehicleTypeLinks || []);
    const documents = this.mapDocuments(carrierEntity.documents || []);
    const allDocumentsApproved = documents.length > 0 && documents.every(doc => doc.isApproved);

    const foundedYear = carrierEntity.foundedYear ?? null;
    const experienceYears = foundedYear
      ? Math.max(0, new Date().getFullYear() - foundedYear)
      : null;

    const profilePercentage = carrierEntity.profileStatus?.overallPercentage ?? 0;  
    
    return {
      id: carrierEntity.id,
      companyName: carrierEntity.companyName,
      pictureUrl: carrierEntity.pictureUrl ?? null,
      phone: null,
      email: null,
      taxNumber: carrierEntity.taxNumber,
      city: carrierEntity.activity?.city ?? null,
      district: carrierEntity.activity?.district ?? null,
      address: carrierEntity.activity?.address ?? null,
      foundedYear,
      experienceYears,
      serviceAreas,
      vehicles,
      profile: {
        overallPercentage: profilePercentage,
        companyInfoCompleted: carrierEntity.profileStatus?.companyInfoCompleted ?? false,
        activityInfoCompleted: carrierEntity.profileStatus?.activityInfoCompleted ?? false,
        documentsCompleted: carrierEntity.profileStatus?.documentsCompleted ?? false,
        earningsCompleted: carrierEntity.profileStatus?.earningsCompleted ?? false
      },
      rating: {
        average: Number(carrierEntity.rating ?? 0),
        count: Number(pricingRow.pricing_offerCount ?? carrierEntity.totalOffers ?? 0)
      },
      stats: {
        completedShipments: carrierEntity.completedShipments ?? 0,
        cancelledShipments: carrierEntity.cancelledShipments ?? 0,
        successRate: Number(carrierEntity.successRate ?? 0),
        totalOffers: carrierEntity.totalOffers ?? 0
      },
      startingPrice: pricingRow.pricing_minPrice !== undefined && pricingRow.pricing_minPrice !== null
        ? Number(pricingRow.pricing_minPrice)
        : null,
      documents,
      documentsApproved: allDocumentsApproved,
      recentReviews: await this.fetchRecentReviews(carrierId),
      services: await this.fetchServiceShowcase(carrierId, loadType)
    };
  }

  private async fetchServiceShowcase(carrierId: string, loadType?: ExtraServiceLoadType | null): Promise<CarrierDetailServiceGroupDto[]> {
    const capabilityQb = AppDataSource.getRepository(CarrierExtraServiceCapability)
      .createQueryBuilder('cap')
      .leftJoinAndSelect('cap.extraService', 'extraService')
      .where('cap.carrierId = :carrierId', { carrierId })
      .andWhere('cap.isActive = :isActive', { isActive: true })
      .andWhere('(extraService.status = :status OR extraService.status IS NULL)', { status: 'ACTIVE' });

    if (loadType) {
      capabilityQb.andWhere('cap.loadType = :loadType', { loadType });
    }

    const capabilities = await capabilityQb.getMany();

    const customServiceQb = AppDataSource.getRepository(CarrierCustomExtraService)
      .createQueryBuilder('customService')
      .where('customService.carrierId = :carrierId', { carrierId })
      .andWhere('customService.isActive = :isActive', { isActive: true });

    if (loadType) {
      customServiceQb.andWhere('customService.loadType = :loadType', { loadType });
    }

    const customServices = await customServiceQb.getMany();

    const grouped = new Map<ExtraServiceLoadType, CarrierDetailServiceItemDto[]>();
    const pushItem = (loadType: ExtraServiceLoadType, item: CarrierDetailServiceItemDto) => {
      const items = grouped.get(loadType) ?? [];
      items.push(item);
      grouped.set(loadType, items);
    };

    capabilities.forEach((capability) => {
      const serviceName = capability.extraService?.name?.trim();
      if (!serviceName) return;

      pushItem(capability.loadType, {
        id: capability.extraServiceId,
        name: serviceName,
        description: capability.extraService?.description || capability.notes || null,
        priceMode: capability.priceMode,
        basePrice: this.toNullableNumber(capability.basePrice),
        minPrice: this.toNullableNumber(capability.quoteMinPrice),
        maxPrice: this.toNullableNumber(capability.quoteMaxPrice),
        source: 'catalog',
      });
    });

    customServices.forEach((service) => {
      const serviceName = service.title?.trim();
      if (!serviceName) return;

      pushItem(service.loadType, {
        id: service.id,
        name: serviceName,
        description: service.description || null,
        priceMode: service.priceMode,
        basePrice: this.toNullableNumber(service.basePrice),
        minPrice: this.toNullableNumber(service.quoteMinPrice),
        maxPrice: this.toNullableNumber(service.quoteMaxPrice),
        source: 'custom',
      });
    });

    const loadTypeOrder = [
      ExtraServiceLoadType.HOME,
      ExtraServiceLoadType.OFFICE,
      ExtraServiceLoadType.PARTIAL,
      ExtraServiceLoadType.STORAGE,
    ];

    return loadTypeOrder
      .filter((loadType) => grouped.has(loadType))
      .map((loadType) => ({
        loadType,
        items: (grouped.get(loadType) ?? []).sort((a, b) => {
          if (a.source !== b.source) return a.source === 'catalog' ? -1 : 1;
          return a.name.localeCompare(b.name, 'tr');
        }),
      }));
  }

  private async fetchRecentReviews(carrierId: string): Promise<CarrierReviewSummaryDto[]> {
    const reviews = await AppDataSource.getRepository(Review)
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.customer', 'customer')
      .where('review.carrierId = :carrierId', { carrierId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();

    return reviews.map(r => ({
      id: r.id,
      customerId: r.customerId,
      author: `${(r.customer as any)?.firstName || ''} ${(r.customer as any)?.lastName?.charAt(0) || ''}.`.trim(),
      rating: r.rating,
      comment: r.comment || '',
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt)
    }));
  }

  private parseServiceAreas(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(area => String(area).trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(area => String(area).trim()).filter(Boolean);
        }
      } catch {
        return raw.split(',').map(area => area.trim()).filter(Boolean);
      }
    }
    return [];
  }

  private mapVehicles(links: CarrierVehicleType[]): CarrierDetailVehicleDto[] {
    const unique = new Map<string, CarrierDetailVehicleDto>();
    links.forEach(link => {
      if (!link || !link.id) return;
      unique.set(link.id, {
        id: link.id,
        typeName: link.vehicleType?.name ?? 'Araç',
        capacityKg: link.capacityKg !== undefined && link.capacityKg !== null
          ? Number(link.capacityKg)
          : link.vehicleType?.defaultCapacityKg ?? null
      });
    });
    return Array.from(unique.values());
  }

  private mapDocuments(docs: CarrierDocument[]): CarrierDetailDocumentDto[] {
    const unique = new Map<string, CarrierDetailDocumentDto>();
    docs.forEach(doc => {
      if (!doc || !doc.id) return;
      unique.set(doc.id, {
        id: doc.id,
        type: doc.type,
        status: doc.status,
        isRequired: doc.isRequired,
        isApproved: doc.isApproved || doc.status === CarrierDocumentStatus.APPROVED
      });
    });
    return Array.from(unique.values());
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
