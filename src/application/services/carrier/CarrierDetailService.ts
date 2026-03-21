import { CarrierDetailRepository, CarrierDetailDto } from '../../../infrastructure/repositories/CarrierDetailRepository';

export class CarrierDetailService {
  private carrierDetailRepository = new CarrierDetailRepository();

  async getCarrierDetail(carrierId: string): Promise<CarrierDetailDto | null> {
    if (!carrierId) {
      throw new Error('Nakliyeci kimliği zorunludur.');
    }
    return this.carrierDetailRepository.getCarrierDetail(carrierId);
  }
}
