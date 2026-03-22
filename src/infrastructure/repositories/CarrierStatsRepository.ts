import { BaseRepository } from './BaseRepository';
import { CarrierStats } from '../../domain/entities/CarrierStats';

export class CarrierStatsRepository extends BaseRepository<CarrierStats> {
  constructor() {
    super(CarrierStats);
  }

  async ensureStatsRow(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(CarrierStats)
      .values({ carrierId })
      .orIgnore()
      .execute();
  }

  async incrementActiveJobs(carrierId: string, delta: number): Promise<void> {
    await this.ensureStatsRow(carrierId);

    await this.repository
      .createQueryBuilder()
      .update(CarrierStats)
      .set({
        activeJobs: () => `GREATEST(activeJobs + (${delta}), 0)`
      })
      .where('carrierId = :carrierId', { carrierId })
      .execute();
  }

  async incrementTotalJobs(carrierId: string, delta: number = 1): Promise<void> {
    await this.ensureStatsRow(carrierId);

    await this.repository
      .createQueryBuilder()
      .update(CarrierStats)
      .set({
        totalJobs: () => `GREATEST(totalJobs + (${delta}), 0)`
      })
      .where('carrierId = :carrierId', { carrierId })
      .execute();
  }
}
