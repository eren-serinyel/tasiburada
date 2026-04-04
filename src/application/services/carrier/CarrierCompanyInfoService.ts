import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierCompanyInfoDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierCompanyInfoService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async updateCompanyInfo(carrierId: string, dto: CarrierCompanyInfoDto) {
    const carrier = await this.carrierRepository.findById(carrierId);
    if (!carrier) {
      throw new Error('Nakliyeci bulunamadı.');
    }

    if (dto.email && dto.email !== carrier.email) {
      const emailExists = await this.carrierRepository.findByEmail(dto.email);
      if (emailExists && emailExists.id !== carrierId) {
        throw new Error('Bu e-posta adresi başka bir hesap tarafından kullanılıyor.');
      }
    }

    await this.carrierRepository.update(carrierId, {
      companyName: dto.companyName ?? carrier.companyName,
      contactName: dto.contactName ?? carrier.contactName,
      phone: dto.phone ?? carrier.phone,
      email: dto.email ?? carrier.email,
      taxNumber: dto.taxNumber ?? carrier.taxNumber,
      foundedYear: dto.foundedYear ?? carrier.foundedYear,
      addressLine1: dto.addressLine1 ?? carrier.addressLine1,
      addressLine2: dto.addressLine2 ?? carrier.addressLine2,
      district: dto.district ?? carrier.district,
      activityCity: dto.activityCity ?? carrier.activityCity,
      vehicleBrand: dto.vehicleBrand ?? carrier.vehicleBrand,
      vehicleModel: dto.vehicleModel ?? carrier.vehicleModel,
      vehicleYear: dto.vehicleYear ?? carrier.vehicleYear,
      vehicleCapacityM3: dto.vehicleCapacityM3 ?? carrier.vehicleCapacityM3,
    });

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return this.carrierRepository.findById(carrierId);
  }

  async updateProfilePicture(carrierId: string, pictureUrl?: string | null) {
    const carrier = await this.carrierRepository.findById(carrierId);
    if (!carrier) {
      throw new Error('Nakliyeci bulunamadı.');
    }

    const normalized = pictureUrl?.trim() ? pictureUrl : null;
    await this.carrierRepository.update(carrierId, { pictureUrl: normalized } as any);
    return this.carrierRepository.findById(carrierId);
  }
}
