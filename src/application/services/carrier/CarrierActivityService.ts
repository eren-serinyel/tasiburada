import { CarrierActivityRepository } from '../../../infrastructure/repositories/CarrierActivityRepository';
import { CarrierActivityDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';

type ActivityResponse = {
  city: string;
  district?: string;
  address?: string;
  serviceAreas: string[];
  availableDates: string[];
  carrierId: string;
  id: string;
};

export class CarrierActivityService {
  private repository = new CarrierActivityRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async updateActivityInfo(carrierId: string, dto: CarrierActivityDto): Promise<ActivityResponse> {
    if (!dto.city) {
      throw new Error('Şehir alanı zorunludur.');
    }

    const serviceAreas = Array.isArray(dto.serviceAreas)
      ? dto.serviceAreas.map(area => String(area).trim()).filter(Boolean)
      : [];

    const availableDates = Array.isArray(dto.availableDates)
      ? dto.availableDates.map(d => String(d).trim()).filter(Boolean)
      : [];

    const activity = await this.repository.upsertForCarrier(carrierId, {
      city: dto.city,
      district: dto.district,
      address: dto.address,
      serviceAreas,
      availableDates,
    });

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return this.toResponse(activity);
  }

  async getActivityInfo(carrierId: string): Promise<ActivityResponse | null> {
    const activity = await this.repository.findByCarrierId(carrierId);
    if (!activity) return null;
    return this.toResponse(activity);
  }

  private toResponse(activity: CarrierActivity): ActivityResponse {
    const serviceAreas = this.parseServiceAreas(activity.serviceAreasJson);
    const availableDates = this.parseServiceAreas(activity.availableDates);
    return {
      id: activity.id,
      carrierId: activity.carrierId,
      city: activity.city,
      district: activity.district,
      address: activity.address,
      serviceAreas,
      availableDates,
    };
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
