import { BaseRepository } from './BaseRepository';
import { CarrierSecuritySettings } from '../../domain/entities/CarrierSecuritySettings';

export class CarrierSecuritySettingsRepository extends BaseRepository<CarrierSecuritySettings> {
  constructor() {
    super(CarrierSecuritySettings);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierSecuritySettings | null> {
    return this.repository.findOne({ where: { carrierId } });
  }
}
