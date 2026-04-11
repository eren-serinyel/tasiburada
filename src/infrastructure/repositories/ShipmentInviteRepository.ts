import { BaseRepository } from './BaseRepository';
import { ShipmentInvite } from '../../domain/entities/ShipmentInvite';

export class ShipmentInviteRepository extends BaseRepository<ShipmentInvite> {
  constructor() {
    super(ShipmentInvite);
  }

  async findByShipmentId(shipmentId: string): Promise<ShipmentInvite[]> {
    return this.repository.find({
      where: { shipmentId },
      relations: ['carrier'],
      order: { createdAt: 'DESC' }
    });
  }

  async findByCarrierId(carrierId: string, status?: string): Promise<ShipmentInvite[]> {
    const where: any = { carrierId };
    if (status) where.status = status;
    return this.repository.find({
      where,
      relations: ['shipment', 'shipment.customer'],
      order: { createdAt: 'DESC' }
    });
  }

  async findByShipmentAndCarrier(shipmentId: string, carrierId: string): Promise<ShipmentInvite | null> {
    return this.repository.findOne({
      where: { shipmentId, carrierId }
    });
  }
}
