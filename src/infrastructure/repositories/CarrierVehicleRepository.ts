import { BaseRepository } from './BaseRepository';
import { CarrierVehicle } from '../../domain/entities/CarrierVehicle';

export class CarrierVehicleRepository extends BaseRepository<CarrierVehicle> {
  constructor() {
    super(CarrierVehicle);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierVehicle[]> {
    return this.repository.find({
      where: { carrierId } as any,
      relations: ['vehicleType'],
      order: { createdAt: 'DESC' } as any
    });
  }

  async findOwnedById(id: string, carrierId: string): Promise<CarrierVehicle | null> {
    return this.repository.findOne({
      where: { id, carrierId } as any,
      relations: ['vehicleType']
    });
  }
}
