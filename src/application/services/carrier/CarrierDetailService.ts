import { CarrierDetailRepository, CarrierDetailDto } from '../../../infrastructure/repositories/CarrierDetailRepository';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceLoadType';

export class CarrierDetailService {
  private carrierDetailRepository = new CarrierDetailRepository();

  async getCarrierDetail(carrierId: string, loadType?: ExtraServiceLoadType | null): Promise<CarrierDetailDto | null> {
    if (!carrierId) {
      throw new Error('Nakliyeci kimliği zorunludur.');
    }
    return this.carrierDetailRepository.getCarrierDetail(carrierId, loadType);
  }
}
