import { BaseRepository } from './BaseRepository';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Brackets, SelectQueryBuilder } from 'typeorm';

export type CarrierSearchSort = 'rating' | 'experience' | 'recent';

export interface CarrierSearchFilters {
  city?: string;
  serviceAreas?: string[];
  vehicleTypeIds?: string[];
  serviceCity?: string;
  serviceDistrict?: string;
  minRating?: number;
  minExperienceYears?: number;
  minProfileCompletion?: number;
  minCapacityKg?: number;
  maxCapacityKg?: number;
  searchText?: string;
  availableDate?: string;
  availableDates?: string[];
  scopeIds?: string[];
  scopeNames?: string[];
  serviceTypeIds?: string[];
  loadTypes?: string[];
  isVerified?: boolean;
  hasDocuments?: boolean;
  sortBy?: CarrierSearchSort;
  limit: number;
  offset: number;
}

export interface CarrierSearchRepositoryItem {
  carrier: Carrier;
  minPrice: number | null;
  offerCount: number;
  reviewCount: number;
}

export class CarrierRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
  }

  private applyPublicTrustGate(qb: SelectQueryBuilder<Carrier>): SelectQueryBuilder<Carrier> {
    return qb
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED });
  }

  private applyServiceCityFilter(qb: SelectQueryBuilder<Carrier>, serviceCity?: string): SelectQueryBuilder<Carrier> {
    if (!serviceCity) return qb;

    return qb.andWhere(new Brackets(cityClause => {
      cityClause
        .where('activity.city = :serviceCity', { serviceCity })
        .orWhere(
          'activity.serviceAreasJson IS NOT NULL AND JSON_CONTAINS(activity.serviceAreasJson, JSON_QUOTE(:serviceCity)) = 1',
          { serviceCity }
        );
    }));
  }

  private applyScopeFilter(
    qb: SelectQueryBuilder<Carrier>,
    filters?: Pick<CarrierSearchFilters, 'scopeIds' | 'scopeNames'>
  ): SelectQueryBuilder<Carrier> {
    const hasScopeIds = (filters?.scopeIds?.length ?? 0) > 0;
    const hasScopeNames = (filters?.scopeNames?.length ?? 0) > 0;
    if (!hasScopeIds && !hasScopeNames) return qb;

    return qb.andWhere(new Brackets(scopeClause => {
      if (hasScopeIds) {
        scopeClause.where(
          `EXISTS (
            SELECT 1
            FROM carrier_scope_of_work scope_link_by_id
            INNER JOIN scope_of_work scope_by_id ON scope_by_id.id = scope_link_by_id.scopeId
            WHERE scope_link_by_id.carrierId = carrier.id
              AND scope_link_by_id.scopeId IN (:...scopeIds)
              AND scope_by_id.status = :activeScopeStatus
          )`,
          { scopeIds: filters!.scopeIds, activeScopeStatus: 'ACTIVE' }
        );
      }

      if (hasScopeNames) {
        const clause = `EXISTS (
          SELECT 1
          FROM carrier_scope_of_work scope_link_by_name
          INNER JOIN scope_of_work scope_by_name ON scope_by_name.id = scope_link_by_name.scopeId
          WHERE scope_link_by_name.carrierId = carrier.id
            AND scope_by_name.name IN (:...scopeNames)
            AND scope_by_name.status = :activeScopeStatus
        )`;
        const params = { scopeNames: filters!.scopeNames, activeScopeStatus: 'ACTIVE' };
        if (hasScopeIds) {
          scopeClause.orWhere(clause, params);
        } else {
          scopeClause.where(clause, params);
        }
      }
    }));
  }

  async findFullById(id: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { id },
      relations: [
        'activity',
        'earnings',
        'serviceTypeLinks',
        'serviceTypeLinks.serviceType',
        'vehicleTypeLinks',
        'vehicleTypeLinks.vehicleType',
        'scopeLinks',
        'scopeLinks.scope',
        'documents',
        'securitySettings',
        'profileStatus'
      ]
    });
  }

  async findPublicById(carrierId: string): Promise<Carrier | null> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .select([
        'carrier.id',
        'carrier.companyName',
        'carrier.contactName',
        'carrier.phone',
        'carrier.email',
        'carrier.pictureUrl',
        'carrier.rating',
        'carrier.completedShipments',
        'carrier.isActive'
      ])
      .where('carrier.id = :carrierId', { carrierId });

    return await this.applyPublicTrustGate(qb)
      .getOne();
  }

  async findByEmail(email: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { email },
      relations: ['carrierVehicles']
    });
  }

  async findByTaxNumber(taxNumber: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { taxNumber }
    });
  }

  async findByCity(city: string): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('activity.city = :city', { city });

    return this.applyPublicTrustGate(queryBuilder)
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findByVehicleType(vehicleTypeId: string): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('vehicles.vehicleTypeId = :vehicleTypeId', { vehicleTypeId });

    return await this.applyPublicTrustGate(queryBuilder)
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findAvailableCarriers(city: string, vehicleTypeIds: string[]): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles', 'vehicles.isActive = :vehicleActive', { vehicleActive: true })
      .where('activity.city = :city', { city });

    this.applyPublicTrustGate(queryBuilder);

    if (vehicleTypeIds.length > 0) {
      queryBuilder.andWhere('vehicles.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds });
    }

    return await queryBuilder
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async updateRating(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        rating: () =>
          '(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.carrierId = id)',
      })
      .where('id = :carrierId', { carrierId })
      .execute();
  }

  // Teklif verildiğinde ilgili nakliyecinin toplam teklif sayısını 1 artırır.
  async incrementTotalOffers(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        totalOffers: () => 'totalOffers + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // Teklif kabul edildiğinde kazanılan iş sayacını 1 artırır.
  async incrementAcceptedOffers(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        acceptedOffers: () => 'acceptedOffers + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  async decrementAcceptedOffers(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        acceptedOffers: () => 'GREATEST(acceptedOffers - 1, 0)'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }
  // Taşıma başarıyla tamamlandığında completedShipments alanını 1 artırır.
  async incrementCompletedShipments(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        completedShipments: () => 'completedShipments + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // Taşıma iptal edildiğinde cancelledShipments alanını 1 artırır.
  async incrementCancelledShipments(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        cancelledShipments: () => 'cancelledShipments + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // Başarı oranı, kabul edilmiş işlerin ne kadarının tamamlandığını gösterir.
  // Kazanma oranı ayrı bir metriktir: acceptedOffers / totalOffers.
  async recalculateSuccessRate(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        successRate: () => 'CASE WHEN acceptedOffers > 0 THEN ROUND((completedShipments / acceptedOffers) * 100, 2) ELSE 0 END'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  async getTopCarriers(limit: number = 10): Promise<Carrier[]> {
    return await this.applyPublicTrustGate(
      this.repository
        .createQueryBuilder('carrier')
        .leftJoinAndSelect('carrier.carrierVehicles', 'carrierVehicles')
    )
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .take(limit)
      .getMany();
  }

  async searchCarriers(filters: CarrierSearchFilters): Promise<{ total: number; items: CarrierSearchRepositoryItem[] }> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.profileStatus', 'profileStatus')
      .leftJoinAndSelect('carrier.vehicleTypeLinks', 'vehicleLink')
      .leftJoinAndSelect('vehicleLink.vehicleType', 'vehicleType')
      .leftJoinAndSelect('carrier.scopeLinks', 'scopeResultLink')
      .leftJoinAndSelect('scopeResultLink.scope', 'scopeResult')
      .leftJoin(
        qb => qb
          .select('review.carrierId', 'carrierId')
          .addSelect('COUNT(review.id)', 'reviewCount')
          .from('reviews', 'review')
          .groupBy('review.carrierId'),
        'reviewSummary',
        'reviewSummary.carrierId = carrier.id'
      )
      .addSelect('COALESCE(reviewSummary.reviewCount, 0)', 'reviewCount')
      .addSelect(
        '(CASE WHEN COALESCE(reviewSummary.reviewCount, 0) > 0 THEN 0 ELSE 1 END)',
        'hasReviewsForSort'
      )
      .where('1 = 1')
      .distinct(true);

    this.applyPublicTrustGate(qb);

    if (filters.city) {
      qb.andWhere('activity.city = :city', { city: filters.city });
    }

    if (filters.searchText) {
      qb.andWhere('carrier.companyName LIKE :searchText', { searchText: `%${filters.searchText}%` });
    }

    if (filters.vehicleTypeIds?.length) {
      qb.andWhere('vehicleLink.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds: filters.vehicleTypeIds });
    }

    this.applyServiceCityFilter(qb, filters.serviceCity);

    if (filters.serviceDistrict) {
      qb.andWhere(new Brackets(districtClause => {
        districtClause
          .where('activity.district = :serviceDistrict', { serviceDistrict: filters.serviceDistrict })
          .orWhere(
            "(activity.serviceAreasJson IS NOT NULL AND JSON_SEARCH(activity.serviceAreasJson, 'one', :serviceDistrictPattern) IS NOT NULL)",
            { serviceDistrictPattern: `%${filters.serviceDistrict}%` }
          );
      }));
    }

    if (filters.minRating) {
      qb.andWhere('carrier.rating >= :minRating', { minRating: filters.minRating });
    }

    if (filters.minProfileCompletion !== undefined) {
      qb.andWhere(
        '(COALESCE(profileStatus.overallPercentage, 0) >= :minProfileCompletion)',
        { minProfileCompletion: filters.minProfileCompletion }
      );
    }

    if (filters.minCapacityKg !== undefined) {
      qb.andWhere(
        `(
          (vehicleLink.capacityKg IS NOT NULL AND vehicleLink.capacityKg >= :minCapacityKg)
          OR (vehicleLink.capacityKg IS NULL AND vehicleType.defaultCapacityKg >= :minCapacityKg)
        )`,
        { minCapacityKg: filters.minCapacityKg }
      );
    }

    if (filters.minExperienceYears) {
      qb.andWhere(
        '(carrier.foundedYear IS NOT NULL AND (YEAR(CURDATE()) - carrier.foundedYear) >= :minExperienceYears)',
        { minExperienceYears: filters.minExperienceYears }
      );
    }

    /* Price filters removed as Offer table is deleted
    if (filters.minPrice !== undefined) { ... }
    if (filters.maxPrice !== undefined) { ... }
    */

    if (filters.serviceAreas && filters.serviceAreas.length > 0) {
      qb.andWhere(new Brackets(or => {
        filters.serviceAreas!.forEach((area, idx) => {
          or.orWhere(
            'activity.serviceAreasJson IS NOT NULL AND JSON_CONTAINS(activity.serviceAreasJson, JSON_QUOTE(:serviceArea' + idx + ')) = 1',
            { [`serviceArea${idx}`]: area }
          );
        });
      }));
    }

    if (filters.availableDates && filters.availableDates.length > 0) {
      qb.andWhere(new Brackets(bqb => {
        filters.availableDates!.forEach((date, i) => {
          const param = `flexDate${i}`;
          bqb.orWhere(
            `(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :${param}) IS NOT NULL)`,
            { [param]: date }
          );
        });
      }));
    } else if (filters.availableDate) {
      qb.andWhere(
        "(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :availDate) IS NOT NULL)",
        { availDate: filters.availableDate }
      );
    }

    if (filters.maxCapacityKg !== undefined) {
      qb.andWhere(
        `(
          (vehicleLink.capacityKg IS NOT NULL AND vehicleLink.capacityKg <= :maxCapacityKg)
          OR (vehicleLink.capacityKg IS NULL AND vehicleType.defaultCapacityKg <= :maxCapacityKg)
        )`,
        { maxCapacityKg: filters.maxCapacityKg }
      );
    }

    this.applyScopeFilter(qb, filters);

    if (filters.loadTypes && filters.loadTypes.length > 0) {
      qb.innerJoin('carrier.loadTypeCapabilities', 'loadCap', 'loadCap.isActive = :activeLoadCap', { activeLoadCap: true });
      qb.andWhere('loadCap.loadType IN (:...loadTypes)', { loadTypes: filters.loadTypes });
    }

    if (filters.sortBy === 'experience') {
      qb.orderBy('carrier.foundedYear', 'ASC');
      qb.addOrderBy('carrier.rating', 'DESC');
    } else if (filters.sortBy === 'recent') {
      qb.orderBy('carrier.createdAt', 'DESC');
    } else {
      qb.orderBy('hasReviewsForSort', 'ASC');
      qb.addOrderBy('carrier.rating', 'DESC');
    }
    qb.addOrderBy('carrier.completedShipments', 'DESC');

    const pagedQb = qb.clone()
      .skip(filters.offset)
      .take(filters.limit);

    const { entities, raw } = await pagedQb.getRawAndEntities();
    const total = await qb.clone().getCount();

    const items: CarrierSearchRepositoryItem[] = entities.map((carrier, index) => ({
      carrier,
      minPrice: null,
      offerCount: carrier.totalOffers ?? 0,
      reviewCount: Number(raw[index]?.reviewCount ?? 0)
    }));

    return { total, items };
  }

  async countByAvailableDate(
    date: string,
    serviceCity?: string,
    scopeFilters?: Pick<CarrierSearchFilters, 'scopeIds' | 'scopeNames'>,
    dateWindow?: string[]
  ): Promise<{ total: number; available: number }> {
    const totalQb = this.repository
      .createQueryBuilder('carrier')
      .leftJoin('carrier.activity', 'activity')
      .where('1 = 1');

    this.applyPublicTrustGate(totalQb);
    this.applyServiceCityFilter(totalQb, serviceCity);
    this.applyScopeFilter(totalQb, scopeFilters);
    const totalCount = await totalQb.getCount();

    const availableQb = this.repository
      .createQueryBuilder('carrier')
      .leftJoin('carrier.activity', 'activity')
      .where('1 = 1');

    this.applyPublicTrustGate(availableQb);
    this.applyServiceCityFilter(availableQb, serviceCity);
    this.applyScopeFilter(availableQb, scopeFilters);

    const dates = dateWindow && dateWindow.length > 0 ? dateWindow : [date];
    availableQb.andWhere(new Brackets(bqb => {
      dates.forEach((d, i) => {
        const param = `countDate${i}`;
        bqb.orWhere(
          `(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :${param}) IS NOT NULL)`,
          { [param]: d }
        );
      });
    }));
    const availableCount = await availableQb.getCount();

    return { total: totalCount, available: availableCount };
  }
}
