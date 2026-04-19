import { BaseRepository } from './BaseRepository';
import { Carrier } from '../../domain/entities/Carrier';
import { Brackets } from 'typeorm';

export type CarrierSearchSort = 'rating' | 'price' | 'experience' | 'profile' | 'recent';

export interface CarrierSearchFilters {
  city?: string;
  serviceAreas?: string[];
  vehicleTypeIds?: string[];
  serviceCity?: string;
  serviceDistrict?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  minExperienceYears?: number;
  minProfileCompletion?: number;
  minCapacityKg?: number;
  searchText?: string;
  availableDate?: string;
  scopeIds?: string[];
  serviceTypeIds?: string[];
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
}

export class CarrierRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
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
    return await this.repository
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
      .where('carrier.id = :carrierId', { carrierId })
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
    return this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('activity.city = :city', { city })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findByVehicleType(vehicleTypeId: string): Promise<Carrier[]> {
    return await this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('vehicles.vehicleTypeId = :vehicleTypeId', { vehicleTypeId })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findAvailableCarriers(city: string, vehicleTypeIds: string[]): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles', 'vehicles.isActive = :vehicleActive', { vehicleActive: true })
      .where('activity.city = :city', { city })
      .andWhere('carrier.isActive = :isActive', { isActive: true });

    if (vehicleTypeIds.length > 0) {
      queryBuilder.andWhere('vehicles.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds });
    }

    return await queryBuilder
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async updateRating(carrierId: string, newRating: number): Promise<void> {
    await this.repository.update(carrierId, { rating: newRating });
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

  // Başarı oranını completedShipments / totalOffers * 100 formülüyle yeniden hesaplar.
  // totalOffers = 0 ise successRate değeri 0 olarak set edilir.
  async recalculateSuccessRate(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        successRate: () => 'CASE WHEN totalOffers > 0 THEN ROUND((completedShipments / totalOffers) * 100, 2) ELSE 0 END'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  async getTopCarriers(limit: number = 10): Promise<Carrier[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: {
        rating: 'DESC',
        completedShipments: 'DESC'
      },
      take: limit,
      relations: ['carrierVehicles']
    });
  }

  async searchCarriers(filters: CarrierSearchFilters): Promise<{ total: number; items: CarrierSearchRepositoryItem[] }> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.profileStatus', 'profileStatus')
      .leftJoinAndSelect('carrier.vehicleTypeLinks', 'vehicleLink')
      .leftJoinAndSelect('vehicleLink.vehicleType', 'vehicleType')
      .where('carrier.isActive = :isActive', { isActive: true })
      .distinct(true);

    if (filters.city) {
      qb.andWhere('activity.city = :city', { city: filters.city });
    }

    if (filters.searchText) {
      qb.andWhere('carrier.companyName LIKE :searchText', { searchText: `%${filters.searchText}%` });
    }

    if (filters.vehicleTypeIds?.length) {
      qb.andWhere('vehicleLink.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds: filters.vehicleTypeIds });
    }

    if (filters.serviceCity) {
      qb.andWhere(new Brackets(cityClause => {
        cityClause
          .where('activity.city = :serviceCity', { serviceCity: filters.serviceCity })
          .orWhere(
            "(activity.serviceAreasJson IS NOT NULL AND JSON_SEARCH(activity.serviceAreasJson, 'one', :serviceCityPattern) IS NOT NULL)",
            { serviceCityPattern: `%${filters.serviceCity}%` }
          );
      }));
    }

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

    if (filters.availableDate) {
      qb.andWhere(
        "(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :availDate) IS NOT NULL)",
        { availDate: filters.availableDate }
      );
    }

    if (filters.sortBy === 'experience') {
      qb.orderBy('carrier.foundedYear', 'ASC');
      qb.addOrderBy('carrier.rating', 'DESC');
    } else if (filters.sortBy === 'profile') {
      qb.orderBy('COALESCE(profileStatus.overallPercentage, 0)', 'DESC');
    } else if (filters.sortBy === 'recent') {
      qb.orderBy('carrier.createdAt', 'DESC');
    } else {
      qb.orderBy('carrier.rating', 'DESC');
    }
    qb.addOrderBy('carrier.completedShipments', 'DESC');

    const pagedQb = qb.clone()
      .skip(filters.offset)
      .take(filters.limit);

    const { entities, raw } = await pagedQb.getRawAndEntities();
    const total = await qb.clone().getCount();

    const items: CarrierSearchRepositoryItem[] = entities.map((carrier) => ({
      carrier,
      minPrice: null,
      offerCount: carrier.totalOffers ?? 0
    }));

    return { total, items };
  }

  async countByAvailableDate(date: string): Promise<{ total: number; available: number }> {
    const totalCount = await this.repository
      .createQueryBuilder('carrier')
      .where('carrier.isActive = :isActive', { isActive: true })
      .getCount();

    const availableCount = await this.repository
      .createQueryBuilder('carrier')
      .leftJoin('carrier.activity', 'activity')
      .where('carrier.isActive = :isActive', { isActive: true })
      .andWhere(
        "(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :date) IS NOT NULL)",
        { date }
      )
      .getCount();

    return { total: totalCount, available: availableCount };
  }
}
