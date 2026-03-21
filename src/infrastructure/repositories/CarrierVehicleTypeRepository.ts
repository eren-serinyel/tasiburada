import { BaseRepository } from './BaseRepository';
import { CarrierVehicleType } from '../../domain/entities/CarrierVehicleType';

export class CarrierVehicleTypeRepository extends BaseRepository<CarrierVehicleType> {
  constructor() {
    super(CarrierVehicleType);
  }

  async deleteByCarrierId(carrierId: string): Promise<void> {
    await this.repository.delete({ carrierId } as any);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierVehicleType[]> {
    return this.repository.find({ where: { carrierId }, relations: ['vehicleType'] });
  }

  async saveAll(records: Array<Partial<CarrierVehicleType>>): Promise<CarrierVehicleType[]> {
    const entities = this.repository.create(records);
    return this.repository.save(entities);
  }

  async countByCarrierId(carrierId: string): Promise<number> {
    return this.repository.count({ where: { carrierId } as any });
  }
}
