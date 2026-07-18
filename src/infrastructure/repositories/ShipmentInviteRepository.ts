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
      select: {
        id: true,
        status: true,
        requestedServices: true,
        createdAt: true,
        shipment: {
          id: true,
          status: true,
          shipmentCategory: true,
          originCity: true,
          originDistrict: true,
          destinationCity: true,
          destinationDistrict: true,
          originPlaceType: true,
          destinationPlaceType: true,
          originFloor: true,
          destinationFloor: true,
          originHasElevator: true,
          destinationHasElevator: true,
          loadProfile: true,
          originAccessDistance: true,
          destinationAccessDistance: true,
          insuranceType: true,
          timePreference: true,
          dateFlexibility: true,
          weight: true,
          estimatedWeight: true,
          shipmentDate: true,
          vehicleTypePreferenceId: true,
          converterEstimatedVolumeMin: true,
          converterEstimatedVolumeMax: true,
          converterRecommendedVehicleCode: true,
        },
      },
      relations: { shipment: true },
      order: { createdAt: 'DESC' }
    });
  }

  async findByShipmentAndCarrier(shipmentId: string, carrierId: string): Promise<ShipmentInvite | null> {
    return this.repository.findOne({
      where: { shipmentId, carrierId }
    });
  }
}
