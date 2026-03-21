import { CarrierVehicleTypeRepository } from '../../../infrastructure/repositories/CarrierVehicleTypeRepository';
import { VehicleTypeRepository } from '../../../infrastructure/repositories/VehicleTypeRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierVehicleTypeService {
  private linkRepository = new CarrierVehicleTypeRepository();
  private vehicleTypeRepository = new VehicleTypeRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async replaceSelectedTypes(carrierId: string, selectionsInput: Array<string | { vehicleTypeId: string; capacityKg?: number | null }>): Promise<void> {
    const selections = this.normalizeSelections(selectionsInput);

    await this.linkRepository.deleteByCarrierId(carrierId);

    if (!selections.length) {
      await this.profileStatusService.syncVehiclesCompletion(carrierId);
      return;
    }

    const uniqueIds = Array.from(new Set(selections.map(item => item.vehicleTypeId)));
    const vehicleTypes = await this.vehicleTypeRepository.findByIds(uniqueIds);
    if (!vehicleTypes.length) {
      await this.profileStatusService.syncVehiclesCompletion(carrierId);
      return;
    }

    const typeMap = new Map(vehicleTypes.map(type => [type.id, type]));
    const payload = selections
      .filter(item => typeMap.has(item.vehicleTypeId))
      .map(item => ({
        carrierId,
        vehicleTypeId: item.vehicleTypeId,
        capacityKg: item.capacityKg ?? typeMap.get(item.vehicleTypeId)?.defaultCapacityKg
      }));

    if (payload.length) {
      await this.linkRepository.saveAll(payload);
    }

    await this.profileStatusService.syncVehiclesCompletion(carrierId);
  }

  async listSelectedTypes(carrierId: string) {
    return this.linkRepository.findByCarrierId(carrierId);
  }

  async replaceSelectedTypeNames(carrierId: string, names: string[], capacityOverrides?: Record<string, number | null | undefined>) {
    if (!names?.length) {
      await this.replaceSelectedTypes(carrierId, []);
      return;
    }
    const vehicleTypes = await this.vehicleTypeRepository.findByNames(names);
    const payload = vehicleTypes.map(type => ({
      vehicleTypeId: type.id,
      capacityKg: capacityOverrides?.[type.name] ?? undefined
    }));
    await this.replaceSelectedTypes(carrierId, payload);
  }

  private normalizeSelections(input: Array<string | { vehicleTypeId: string; capacityKg?: number | null }> | undefined) {
    if (!Array.isArray(input)) return [];
    return input
      .map(item => {
        if (typeof item === 'string') {
          return { vehicleTypeId: item };
        }
        return item;
      })
      .filter(item => typeof item?.vehicleTypeId === 'string') as Array<{ vehicleTypeId: string; capacityKg?: number | null }>;
  }
}
