import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import {
  toOwnerCarrierOverviewDto,
  toPublicCarrierDto,
} from '../../dto/carrier/CarrierResponseProjection';

export class CarrierProfileQueryService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async getPublicCarrierOverview(carrierId: string) {
    const carrier = await this.carrierRepository.findPublicById(carrierId);
    if (!carrier) return null;

    return {
      carrier: toPublicCarrierDto({ carrier }),
    };
  }

  async getOwnerCarrierOverview(carrierId: string) {
    const carrier = await this.carrierRepository.findFullById(carrierId);
    if (!carrier) return null;

    const status = await this.profileStatusService.getStatusSummary(carrierId);
    return toOwnerCarrierOverviewDto(carrier, status);
  }

  async getProfileStatus(carrierId: string) {
    return this.profileStatusService.getStatusSummary(carrierId);
  }
}
