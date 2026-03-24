import { BaseRepository } from './BaseRepository';
import { CarrierNotificationPreference } from '../../domain/entities/CarrierNotificationPreference';

export class CarrierNotificationPreferenceRepository extends BaseRepository<CarrierNotificationPreference> {
  constructor() {
    super(CarrierNotificationPreference);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierNotificationPreference | null> {
    return this.repository.findOne({ where: { carrierId } });
  }
}
