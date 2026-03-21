import { BaseRepository } from './BaseRepository';
import { CarrierServiceType } from '../../domain/entities/CarrierServiceType';

export class CarrierServiceTypeRepository extends BaseRepository<CarrierServiceType> {
  constructor() {
    super(CarrierServiceType);
  }

  async deleteByCarrierId(carrierId: string): Promise<void> {
    await this.repository.delete({ carrierId } as any);
  }

  async saveAll(records: Array<Partial<CarrierServiceType>>): Promise<CarrierServiceType[]> {
    const entities = this.repository.create(records);
    return this.repository.save(entities);
  }

  async countByCarrierId(carrierId: string): Promise<number> {
    return this.repository.count({ where: { carrierId } as any });
  }

  async findByCarrierId(carrierId: string): Promise<CarrierServiceType[]> {
    return this.repository.find({ where: { carrierId }, relations: ['serviceType'] });
  }
}
