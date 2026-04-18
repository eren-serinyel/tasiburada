import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierProfileQueryService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async getCarrierOverview(carrierId: string) {
    const carrier = await this.carrierRepository.findFullById(carrierId);
    if (!carrier) return null;

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
