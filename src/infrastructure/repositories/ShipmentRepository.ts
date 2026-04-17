import { randomUUID } from 'crypto';
import { BaseRepository } from './BaseRepository';
import { Shipment } from '../../domain/entities/Shipment';
import { ShipmentStatus } from '../../domain/entities/Shipment';

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.repository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.extraServices', 'extraServices')
      .where(
        `(
          (shipment.status = :pending AND shipment.shipmentDate >= :today)
          OR shipment.status = :offerReceived
        )`,
        {
          pending: ShipmentStatus.PENDING,
          offerReceived: ShipmentStatus.OFFER_RECEIVED,
          today: today.toISOString().split('T')[0],
        }
      )
      .orderBy('shipment.createdAt', 'DESC')
      .getMany();
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

  async updateShipmentStatus(shipmentId: string, status: ShipmentStatus): Promise<void> {
    await this.repository.update(shipmentId, { status });
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

  async findDuplicateShipment(customerId: string, originCity: string, destinationCity: string): Promise<Shipment | null> {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    return await this.repository
      .createQueryBuilder('shipment')
      .where('shipment.customerId = :customerId', { customerId })
      .andWhere('shipment.originCity = :originCity', { originCity })
      .andWhere('shipment.destinationCity = :destinationCity', { destinationCity })
      .andWhere('shipment.status IN (:...statuses)', { statuses: [ShipmentStatus.PENDING, ShipmentStatus.MATCHED] })
      .andWhere('shipment.createdAt > :date', { date: fortyEightHoursAgo })
      .getOne();
  }
}
