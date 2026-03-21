import { CarrierServiceTypeRepository } from '../../../infrastructure/repositories/CarrierServiceTypeRepository';
import { ServiceTypeRepository } from '../../../infrastructure/repositories/ServiceTypeRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { ServiceType } from '../../../domain/entities/ServiceType';

export class CarrierServiceTypeService {
  private linkRepository = new CarrierServiceTypeRepository();
  private serviceTypeRepository = new ServiceTypeRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async replaceSelectedTypes(carrierId: string, serviceTypeIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(serviceTypeIds ?? []));
    const serviceTypes = await this.serviceTypeRepository.findByIds(uniqueIds);
    await this.persistSelections(carrierId, serviceTypes);
  }

  async replaceSelectedTypeNames(carrierId: string, serviceTypeNames: string[]): Promise<void> {
    const names = (serviceTypeNames ?? []).map(name => String(name).trim()).filter(Boolean);
    const serviceTypes = await this.serviceTypeRepository.ensureByNames(names);
    await this.persistSelections(carrierId, serviceTypes);
  }

  async listSelectedTypes(carrierId: string) {
    return this.linkRepository.findByCarrierId(carrierId);
  }

  private async persistSelections(carrierId: string, serviceTypes: ServiceType[]): Promise<void> {
    await this.linkRepository.deleteByCarrierId(carrierId);

    if (!serviceTypes.length) {
      await this.profileStatusService.syncVehiclesCompletion(carrierId);
      return;
    }

    await this.linkRepository.saveAll(serviceTypes.map(type => ({
      carrierId,
      serviceTypeId: type.id
    })));

    await this.profileStatusService.syncVehiclesCompletion(carrierId);
  }
}
