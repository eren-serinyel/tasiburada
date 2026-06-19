import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierApprovalState } from '../../../domain/entities/Carrier';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { resolveSuggestedServiceAreas } from '../../../shared/serviceAreaSuggestions';

export interface CarrierOverviewOptions {
  enforcePublicTrustGate?: boolean;
}

export class CarrierProfileQueryService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async getCarrierOverview(carrierId: string, options: CarrierOverviewOptions = {}) {
    const carrier = await this.carrierRepository.findFullById(carrierId);
    if (!carrier) return null;
    if (
      options.enforcePublicTrustGate &&
      (!carrier.isActive || !carrier.verifiedByAdmin || carrier.approvalState !== CarrierApprovalState.APPROVED)
    ) {
      return null;
    }

    const status = await this.profileStatusService.updateProfileCompletion(carrierId);

    return {
      carrier,
      activity: this.toActivityResponse(carrier.activity),
      status,
      earnings: carrier.earnings ?? null,
      documents: carrier.documents ?? [],
      securitySettings: carrier.securitySettings ?? null,
      serviceTypes: carrier.serviceTypeLinks ?? [],
      vehicleTypes: carrier.vehicleTypeLinks ?? [],
      scopeOfWorks: carrier.scopeLinks ?? [],
    };
  }

  async getProfileStatus(carrierId: string) {
    return this.profileStatusService.getStatusSummary(carrierId);
  }

  private toActivityResponse(activity: any) {
    if (!activity) return null;
    const serviceAreas = this.parseStringArray(activity.serviceAreasJson);
    return {
      ...activity,
      serviceAreas: serviceAreas.length ? serviceAreas : resolveSuggestedServiceAreas(activity.city),
    };
  }

  private parseStringArray(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.map(item => String(item).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
