import { BaseRepository } from './BaseRepository';
import { CarrierEarnings } from '../../domain/entities/CarrierEarnings';

export class CarrierEarningsRepository extends BaseRepository<CarrierEarnings> {
  constructor() {
    super(CarrierEarnings);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierEarnings | null> {
    return this.repository.findOne({ where: { carrierId } });
  }
}
