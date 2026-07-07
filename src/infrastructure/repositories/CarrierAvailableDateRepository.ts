import { DeepPartial } from 'typeorm';
import {
  CarrierAvailableDate,
  isValidCarrierAvailableDateTimeRange,
} from '../../domain/entities/CarrierAvailableDate';
import { BaseRepository } from './BaseRepository';

export type CarrierAvailableDateInput = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
};

export class CarrierAvailableDateRepository extends BaseRepository<CarrierAvailableDate> {
  constructor() {
    super(CarrierAvailableDate);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierAvailableDate[]> {
    return this.repository.find({
      where: { carrierId },
      order: { date: 'ASC' },
    });
  }

  async findByCarrierIdAndDate(carrierId: string, date: string): Promise<CarrierAvailableDate | null> {
    return this.repository.findOne({ where: { carrierId, date } });
  }

  async create(data: DeepPartial<CarrierAvailableDate>): Promise<CarrierAvailableDate> {
    return super.create(data);
  }

  async update(id: string, data: DeepPartial<CarrierAvailableDate>): Promise<CarrierAvailableDate | null> {
    return super.update(id, data);
  }

  async replaceForCarrier(carrierId: string, dates: CarrierAvailableDateInput[]): Promise<CarrierAvailableDate[]> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(CarrierAvailableDate, { carrierId });

      if (!dates.length) return;

      const rows = dates.map((item) => {
        if (!isValidCarrierAvailableDateTimeRange(item)) {
          throw new Error('Tarihe ozel saat araligi gecersiz.');
        }

        return manager.create(CarrierAvailableDate, {
          carrierId,
          date: item.date,
          startTime: item.startTime ?? null,
          endTime: item.endTime ?? null,
        });
      });

      await manager.save(CarrierAvailableDate, rows);
    });

    return this.findByCarrierId(carrierId);
  }
}
