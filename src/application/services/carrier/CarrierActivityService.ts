import { CarrierActivityRepository } from '../../../infrastructure/repositories/CarrierActivityRepository';
import { CarrierActivityDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import {
  CarrierAvailableDate,
  isValidCarrierAvailableDateTimeRange,
} from '../../../domain/entities/CarrierAvailableDate';
import {
  CarrierAvailableDateInput,
  CarrierAvailableDateRepository,
} from '../../../infrastructure/repositories/CarrierAvailableDateRepository';

type ActivityResponse = {
  city: string;
  district?: string;
  address?: string;
  serviceAreas: string[];
  availableDates: string[];
  availableDateOverrides: CarrierAvailableDateInput[];
  defaultAvailabilityStart?: string | null;
  defaultAvailabilityEnd?: string | null;
  carrierId: string;
  id: string;
};

export class CarrierActivityService {
  private repository = new CarrierActivityRepository();
  private availableDateRepository = new CarrierAvailableDateRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async updateActivityInfo(carrierId: string, dto: CarrierActivityDto): Promise<ActivityResponse> {
    if (!dto.city) {
      throw new Error('Şehir alanı zorunludur.');
    }

    const requestedServiceAreas = Array.isArray(dto.serviceAreas)
      ? dto.serviceAreas.map(area => String(area).trim()).filter(Boolean)
      : [];
    if (requestedServiceAreas.length === 0) {
      throw new Error('Hizmet verdiğiniz bölgelerden en az bir şehir seçmelisiniz.');
    }
    const scopeTokens = new Set([
      'sehirici',
      'sehirlerarasi',
      'şehir içi',
      'şehirler arası',
      'şehiriçi',
      'şehirlerarası',
    ]);
    if (requestedServiceAreas.some(area => scopeTokens.has(area.toLocaleLowerCase('tr-TR')))) {
      throw new Error('İş kapsamı değerleri hizmet verilen iller alanına kaydedilemez.');
    }

    if (!isValidCarrierAvailableDateTimeRange({
      startTime: dto.defaultAvailabilityStart,
      endTime: dto.defaultAvailabilityEnd,
    })) {
      throw new Error('Varsayilan calisma saati gecersiz.');
    }

    const availableDateOverrides = this.normalizeAvailableDateInput(dto.availableDates);
    for (const item of availableDateOverrides) {
      if (!isValidCarrierAvailableDateTimeRange(item)) {
        throw new Error('Tarihe ozel calisma saati gecersiz.');
      }
    }
    const availableDates = availableDateOverrides.map((item) => item.date);

    const activity = await this.repository.upsertForCarrier(carrierId, {
      city: dto.city,
      district: dto.district,
      address: dto.address,
      serviceAreas: requestedServiceAreas,
      availableDates,
      defaultAvailabilityStart: dto.defaultAvailabilityStart ?? null,
      defaultAvailabilityEnd: dto.defaultAvailabilityEnd ?? null,
    });
    const savedAvailableDates = await this.availableDateRepository.replaceForCarrier(
      carrierId,
      availableDateOverrides,
    );
    const persistedActivity = await this.repository.findByCarrierId(carrierId) ?? activity;

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return this.toResponse(persistedActivity, savedAvailableDates);
  }

  async getActivityInfo(carrierId: string): Promise<ActivityResponse | null> {
    const activity = await this.repository.findByCarrierId(carrierId);
    if (!activity) return null;
    const availableDates = await this.availableDateRepository.findByCarrierId(carrierId);
    return this.toResponse(activity, availableDates);
  }

  private toResponse(activity: CarrierActivity, availableDateRows: CarrierAvailableDate[] = []): ActivityResponse {
    const serviceAreas = this.parseServiceAreas(activity.serviceAreasJson);
    const availableDateOverrides = availableDateRows.map((row) => ({
      date: row.date,
      startTime: row.startTime ?? null,
      endTime: row.endTime ?? null,
    }));
    const availableDates = availableDateOverrides.length
      ? availableDateOverrides.map((row) => row.date)
      : this.parseServiceAreas(activity.availableDates);

    return {
      id: activity.id,
      carrierId: activity.carrierId,
      city: activity.city,
      district: activity.district,
      address: activity.address,
      serviceAreas,
      availableDates,
      availableDateOverrides,
      defaultAvailabilityStart: activity.defaultAvailabilityStart ?? null,
      defaultAvailabilityEnd: activity.defaultAvailabilityEnd ?? null,
    };
  }

  private normalizeAvailableDateInput(raw: unknown): CarrierAvailableDateInput[] {
    const values: unknown[] = (() => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return raw.split(',');
        }
      }
      return [];
    })();

    const byDate = new Map<string, CarrierAvailableDateInput>();

    for (const value of values) {
      const item = this.normalizeAvailableDateItem(value);
      if (item) {
        byDate.set(item.date, item);
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private normalizeAvailableDateItem(value: unknown): CarrierAvailableDateInput | null {
    if (typeof value === 'object' && value !== null) {
      const candidate = value as { date?: unknown; startTime?: unknown; endTime?: unknown };
      const date = String(candidate.date ?? '').trim();
      if (!this.isDateKey(date)) return null;

      const startTime = this.normalizeNullableTime(candidate.startTime);
      const endTime = this.normalizeNullableTime(candidate.endTime);

      return { date, startTime, endTime };
    }

    const date = String(value).trim();
    return this.isDateKey(date) ? { date, startTime: null, endTime: null } : null;
  }

  private normalizeNullableTime(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  private isDateKey(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private parseServiceAreas(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(area => String(area).trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.map((area: any) => String(area).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
