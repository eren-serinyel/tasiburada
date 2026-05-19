import { randomUUID } from 'crypto';
import { BaseRepository } from './BaseRepository';
import { Shipment } from '../../domain/entities/Shipment';
import { ShipmentStatus } from '../../domain/entities/Shipment';

const TURKEY_TIME_ZONE = 'Europe/Istanbul';

function formatTodayForShipmentDate(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TURKEY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export class ShipmentRepository extends BaseRepository<Shipment> {
  constructor() {
    super(Shipment);
  }

  async createShipmentRecord(payload: Partial<Shipment>): Promise<Shipment> {
    const entity = this.repository.create({
      id: payload.id ?? randomUUID(),
      ...payload,
    });
    await this.repository.save(entity, { reload: false });
    return entity;
  }

  async findByCustomerId(customerId: string): Promise<Shipment[]> {
    return await this.repository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });
  }

  async findPendingShipments(): Promise<Shipment[]> {
    // 1-H: Geçmiş tarihli ilanları gizle
    const today = formatTodayForShipmentDate();

    return await this.repository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('shipment.extraServices', 'extraServices')
      .where(
        `(
          (shipment.status = :pending AND shipment.shipmentDate >= :today)
          OR shipment.status = :offerReceived
        )`,
        {
          pending: ShipmentStatus.PENDING,
          offerReceived: ShipmentStatus.OFFER_RECEIVED,
          today,
        }
      )
      .orderBy('shipment.createdAt', 'DESC')
      .getMany();
  }

  async findPendingShipmentsForCarrier(carrierId: string): Promise<Shipment[]> {
    const today = formatTodayForShipmentDate();

    return await this.repository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('shipment.extraServices', 'extraServices')
      .leftJoin('carriers', 'matchingCarrier', 'matchingCarrier.id = :carrierId', { carrierId })
      .leftJoin('carrier_stats', 'carrierStats', 'carrierStats.carrierId = matchingCarrier.id')
      .where('shipment.status IN (:...openStatuses)', {
        openStatuses: [ShipmentStatus.PENDING, ShipmentStatus.OFFER_RECEIVED],
      })
      .andWhere('shipment.shipmentDate >= :today', { today })
      .orderBy('carrierStats.averageRating', 'DESC')
      .addOrderBy('carrierStats.totalJobs', 'DESC')
      .addOrderBy('matchingCarrier.createdAt', 'ASC')
      .addOrderBy('shipment.createdAt', 'DESC')
      .getMany();
  }

  async assignCarrierIfOpen(shipmentId: string, carrierId: string): Promise<Shipment | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Shipment)
      .set({
        carrierId,
        status: ShipmentStatus.MATCHED,
        matchedAt: new Date(),
      })
      .where('id = :shipmentId', { shipmentId })
      .andWhere('status IN (:...openStatuses)', {
        openStatuses: [ShipmentStatus.PENDING, ShipmentStatus.OFFER_RECEIVED],
      })
      .execute();

    if (!result.affected) return null;
    return this.findById(shipmentId);
  }

  async findByCustomerIdWithOfferCount(customerId: string): Promise<Array<Shipment & { offerCount: number }>> {
    const rows = await this.repository
      .createQueryBuilder('shipment')
      .leftJoin('offers', 'offer', 'offer.shipmentId = shipment.id')
      .where('shipment.customerId = :customerId', { customerId })
      .select('shipment')
      .addSelect('COUNT(offer.id)', 'offerCount')
      .groupBy('shipment.id')
      .orderBy('shipment.createdAt', 'DESC')
      .getRawAndEntities();

    return rows.entities.map((shipment, index) => {
      const result = shipment as (Shipment & { offerCount: number });
      result.offerCount = Number(rows.raw[index]?.offerCount ?? 0);
      return result;
    });
  }

  async findByIdWithOffers(shipmentId: string): Promise<Shipment | null> {
    return await this.repository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.carrier', 'carrier')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('shipment.extraServices', 'extraServices')
      .leftJoinAndMapMany('shipment.offers', 'offers', 'offer', 'offer.shipmentId = shipment.id')
      .leftJoinAndSelect('offer.carrier', 'offerCarrier')
      .where('shipment.id = :shipmentId', { shipmentId })
      .getOne();
  }

  async findByIdAndCustomerId(shipmentId: string, customerId: string): Promise<Shipment | null> {
    return await this.repository.findOne({
      where: { id: shipmentId, customerId }
    });
  }

  async findByIdAndCarrierId(shipmentId: string, carrierId: string): Promise<Shipment | null> {
    return await this.repository.findOne({
      where: { id: shipmentId, carrierId }
    });
  }

  async findCompletedByCustomerAndCarrier(customerId: string, carrierId: string): Promise<Shipment | null> {
    return await this.repository.findOne({
      where: { customerId, carrierId, status: ShipmentStatus.COMPLETED },
      order: { createdAt: 'DESC' }
    });
  }

  async hasMatchedShipment(customerId: string, carrierId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: [
        { customerId, carrierId, status: ShipmentStatus.MATCHED },
        { customerId, carrierId, status: ShipmentStatus.IN_TRANSIT },
        { customerId, carrierId, status: ShipmentStatus.COMPLETED },
      ]
    });
    return count > 0;
  }

  async transitionStatus(shipmentId: string, current: ShipmentStatus, next: ShipmentStatus): Promise<boolean> {
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.PENDING]: [ShipmentStatus.OFFER_RECEIVED, ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.OFFER_RECEIVED]: [ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.MATCHED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
      [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.COMPLETED],
      [ShipmentStatus.COMPLETED]: [],
      [ShipmentStatus.CANCELLED]: []
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      return false;
    }

    return this.transitionStatusIfCurrent(shipmentId, current, next);
  }

  async transitionStatusIfCurrent(shipmentId: string, current: ShipmentStatus, next: ShipmentStatus): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Shipment)
      .set({ status: next })
      .where('id = :shipmentId', { shipmentId })
      .andWhere('status = :current', { current })
      .execute();

    return (result.affected || 0) > 0;
  }

  async findDuplicateShipment(
    customerId: string,
    originCity: string,
    destinationCity: string,
    originDistrict: string | null,
    destinationDistrict: string | null,
    shipmentDate: Date,
  ): Promise<Shipment | null> {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const normalizedShipmentDate = shipmentDate.toISOString().split('T')[0];

    const qb = this.repository
      .createQueryBuilder('shipment')
      .where('shipment.customerId = :customerId', { customerId })
      .andWhere('shipment.originCity = :originCity', { originCity })
      .andWhere('shipment.destinationCity = :destinationCity', { destinationCity })
      .andWhere('DATE(shipment.shipmentDate) = :shipmentDate', { shipmentDate: normalizedShipmentDate })
      .andWhere('shipment.status IN (:...statuses)', { statuses: [ShipmentStatus.PENDING, ShipmentStatus.MATCHED] })
      .andWhere('shipment.createdAt > :date', { date: fortyEightHoursAgo });

    if (originDistrict) {
      qb.andWhere('shipment.originDistrict = :originDistrict', { originDistrict });
    } else {
      qb.andWhere('(shipment.originDistrict IS NULL OR shipment.originDistrict = \'\')');
    }

    if (destinationDistrict) {
      qb.andWhere('shipment.destinationDistrict = :destinationDistrict', { destinationDistrict });
    } else {
      qb.andWhere('(shipment.destinationDistrict IS NULL OR shipment.destinationDistrict = \'\')');
    }

    return await qb.getOne();
  }
}
