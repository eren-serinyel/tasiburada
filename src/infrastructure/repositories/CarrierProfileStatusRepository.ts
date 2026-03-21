import { BaseRepository } from './BaseRepository';
import { CarrierProfileStatus } from '../../domain/entities/CarrierProfileStatus';

export class CarrierProfileStatusRepository extends BaseRepository<CarrierProfileStatus> {
  constructor() {
    super(CarrierProfileStatus);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierProfileStatus | null> {
    return this.repository.findOne({ where: { carrierId } });
  }

  async save(status: CarrierProfileStatus): Promise<CarrierProfileStatus> {
    return this.repository.save(status);
  }
}
