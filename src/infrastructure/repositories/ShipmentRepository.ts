import { BaseRepository } from './BaseRepository';
import { Shipment } from '../../domain/entities/Shipment';
import { ShipmentStatus } from '../../domain/entities/Shipment';

export class ShipmentRepository extends BaseRepository<Shipment> {
  constructor() {
    super(Shipment);
  }

  async findByCustomerId(customerId: string): Promise<Shipment[]> {
    return await this.repository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });
  }

  async findPendingShipments(): Promise<Shipment[]> {
    return await this.repository.find({
      where: { status: 'pending' as any },
      order: { createdAt: 'DESC' }
    });
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

    return rows.entities.map((shipment, index) => ({
      ...shipment,
      offerCount: Number(rows.raw[index]?.offerCount ?? 0)
    }));
  }

  async findByIdWithOffers(shipmentId: string): Promise<Shipment | null> {
    return await this.repository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.carrier', 'carrier')
      .leftJoinAndSelect('shipment.customer', 'customer')
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

  async updateShipmentStatus(shipmentId: string, status: ShipmentStatus): Promise<void> {
    await this.repository.update(shipmentId, { status });
  }
}
