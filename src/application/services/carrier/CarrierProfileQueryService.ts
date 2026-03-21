import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { CarrierActivityService } from './CarrierActivityService';

export class CarrierProfileQueryService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();
  private activityService = new CarrierActivityService();

  async getCarrierOverview(carrierId: string) {
    const carrier = await this.carrierRepository.findById(carrierId, {
      relations: ['vehicles', 'documents', 'earnings', 'profileStatus', 'securitySettings', 'notificationPreferences']
    } as any);
    const activity = await this.activityService.getActivityInfo(carrierId);
    const status = await this.profileStatusService.updateProfileCompletion(carrierId);
    if (carrier) {
      carrier.profileCompletion = status.overallPercentage;
    }
    return { carrier, activity, status };
  }

  async getProfileStatus(carrierId: string) {
    return this.profileStatusService.getStatusSummary(carrierId);
  }
}
