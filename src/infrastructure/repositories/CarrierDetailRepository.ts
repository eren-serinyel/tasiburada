import { BaseRepository } from './BaseRepository';
import { AppDataSource } from '../database/data-source';
import { Carrier } from '../../domain/entities/Carrier';
import { Offer } from '../../domain/entities/Offer';
import { CarrierDocument, CarrierDocumentStatus } from '../../domain/entities/CarrierDocument';
import { CarrierVehicleType } from '../../domain/entities/CarrierVehicleType';
import { Review } from '../../domain/entities/Review';

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
}

export class CarrierDetailRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
  }

  async getCarrierDetail(carrierId: string): Promise<CarrierDetailDto | null> {
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

    const profilePercentage = carrierEntity.profileStatus?.overallPercentage ?? carrierEntity.profileCompletion ?? 0;

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
      recentReviews: await this.fetchRecentReviews(carrierId)
    };
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
}
