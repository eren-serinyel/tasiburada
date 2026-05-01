import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierApprovalState } from '../../../domain/entities/Carrier';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

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
      activity: carrier.activity ?? null,
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
}
