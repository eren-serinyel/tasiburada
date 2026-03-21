import { BaseRepository } from './BaseRepository';
import { CarrierActivity } from '../../domain/entities/CarrierActivity';

type ActivityPayload = {
  city: string;
  district?: string;
  address?: string;
  serviceAreas?: string[];
};

export class CarrierActivityRepository extends BaseRepository<CarrierActivity> {
  constructor() {
    super(CarrierActivity);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierActivity | null> {
    return this.repository.findOne({ where: { carrierId } });
  }

  async upsertForCarrier(carrierId: string, payload: ActivityPayload): Promise<CarrierActivity> {
    const existing = await this.findByCarrierId(carrierId);
    const data: Partial<CarrierActivity> = {
      carrierId,
      city: payload.city,
      district: payload.district,
      address: payload.address,
      serviceAreasJson: payload.serviceAreas ?? null
    };

    if (existing) {
      const merged = this.repository.merge(existing, data);
      return this.repository.save(merged);
    }

    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
