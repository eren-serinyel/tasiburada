import { BaseRepository } from './BaseRepository';
import { AppDataSource } from '../database/data-source';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Offer } from '../../domain/entities/Offer';
import { CarrierVehicle } from '../../domain/entities/CarrierVehicle';
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

export interface CarrierDetailProjection {
  carrier: Carrier;
  vehicles: CarrierDetailVehicleDto[];
  reviewCount: number;
  startingPrice: number | null;
  recentReviews: CarrierReviewSummaryDto[];
  services: CarrierDetailServiceGroupDto[];
}

export class CarrierDetailRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
  }

  async getCarrierDetailProjection(
    carrierId: string,
    loadType?: ExtraServiceLoadType | null,
  ): Promise<CarrierDetailProjection | null> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .leftJoin('carrier.activity', 'activity')
      .leftJoin('carrier.vehicleTypeLinks', 'vehicleLink')
      .leftJoin('vehicleLink.vehicleType', 'vehicleType')
      .leftJoin(
        'carrier.carrierVehicles',
        'carrierVehicle',
        'carrierVehicle.is_active = :cvActive',
        { cvActive: true },
      )
      .leftJoin('carrierVehicle.vehicleType', 'cvVehicleType')
      .leftJoin('carrier.serviceTypeLinks', 'serviceTypeLink')
      .leftJoin('serviceTypeLink.serviceType', 'serviceType')
      .leftJoin('carrier.scopeLinks', 'scopeLink')
      .leftJoin('scopeLink.scope', 'scope')
      .select([
        'carrier.id',
        'carrier.companyName',
        'carrier.pictureUrl',
        'carrier.foundedYear',
        'carrier.rating',
        'carrier.isActive',
        'carrier.verifiedByAdmin',
        'carrier.approvalState',
        'activity.id',
        'activity.city',
        'activity.district',
        'activity.serviceAreasJson',
        'vehicleLink.id',
        'vehicleLink.vehicleTypeId',
        'vehicleLink.capacityKg',
        'vehicleType.id',
        'vehicleType.name',
        'vehicleType.defaultCapacityKg',
        'carrierVehicle.id',
        'carrierVehicle.vehicleTypeId',
        'carrierVehicle.capacityKg',
        'cvVehicleType.id',
        'cvVehicleType.name',
        'cvVehicleType.defaultCapacityKg',
        'serviceTypeLink.id',
        'serviceTypeLink.serviceTypeId',
        'serviceType.id',
        'serviceType.name',
        'scopeLink.id',
        'scopeLink.scopeId',
        'scope.id',
        'scope.name',
      ])
      .leftJoin(
        qb => qb
          .select('offer.carrierId', 'carrierId')
          .addSelect('MIN(offer.price)', 'minPrice')
          .from(Offer, 'offer')
          .groupBy('offer.carrierId'),
        'pricing',
        'pricing.carrierId = carrier.id'
      )
      .where('carrier.id = :carrierId', { carrierId })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED })
      .addSelect('pricing.minPrice', 'pricing_minPrice');

    const { entities, raw } = await qb.getRawAndEntities();
    const carrierEntity = entities[0];
    if (!carrierEntity) {
      return null;
    }

    const pricingRow = raw[0] ?? {};
    const vehicles = this.mapVehiclesFromBothSources(
      carrierEntity.carrierVehicles || [],
      carrierEntity.vehicleTypeLinks || [],
    );
    const recentReviewResult = await this.fetchRecentReviews(carrierId);

    return {
      carrier: carrierEntity,
      vehicles,
      reviewCount: recentReviewResult.total,
      startingPrice: pricingRow.pricing_minPrice !== undefined && pricingRow.pricing_minPrice !== null
        ? Number(pricingRow.pricing_minPrice)
        : null,
      recentReviews: recentReviewResult.items,
      services: await this.fetchServiceShowcase(carrierId, loadType),
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
        description: capability.extraService?.description || null,
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
        description: null,
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

  private async fetchRecentReviews(
    carrierId: string,
  ): Promise<{ items: CarrierReviewSummaryDto[]; total: number }> {
    const [reviews, total] = await AppDataSource.getRepository(Review)
      .createQueryBuilder('review')
      .innerJoin('review.customer', 'customer')
      .select([
        'review.id',
        'review.rating',
        'review.comment',
        'review.createdAt',
        'customer.id',
        'customer.firstName',
        'customer.lastName',
      ])
      .where('review.carrierId = :carrierId', { carrierId })
      .orderBy('review.createdAt', 'DESC')
      .take(5)
      .getManyAndCount();

    return {
      items: reviews.map(r => ({
        id: r.id,
        customerId: r.customer.id,
        author: `${r.customer.firstName || ''} ${r.customer.lastName?.charAt(0) || ''}.`.trim(),
        rating: r.rating,
        comment: r.comment || '',
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
      total,
    };
  }

  private mapVehiclesFromBothSources(
    actualVehicles: CarrierVehicle[],
    typeLinks: CarrierVehicleType[],
  ): CarrierDetailVehicleDto[] {
    const result = new Map<string, CarrierDetailVehicleDto>();

    for (const vehicle of actualVehicles) {
      if (!vehicle?.id) continue;
      const capacity = Number(vehicle.capacityKg || 0);
      result.set(vehicle.id, {
        id: vehicle.id,
        typeName: vehicle.vehicleType?.name ?? 'Araç',
        capacityKg: capacity > 0 ? capacity : vehicle.vehicleType?.defaultCapacityKg ?? null,
      });
    }

    for (const link of typeLinks) {
      if (!link?.id) continue;
      const alreadyHasType = Array.from(result.values()).some(
        v => v.typeName === (link.vehicleType?.name ?? ''),
      );
      if (alreadyHasType) continue;

      const linkCapacity = this.toNullableNumber(link.capacityKg);
      result.set(link.id, {
        id: link.id,
        typeName: link.vehicleType?.name ?? 'Araç',
        capacityKg: linkCapacity && linkCapacity > 0
          ? linkCapacity
          : link.vehicleType?.defaultCapacityKg ?? null,
      });
    }

    return Array.from(result.values());
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
