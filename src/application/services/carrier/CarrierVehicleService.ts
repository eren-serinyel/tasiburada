import { VehicleRepository } from '../../../infrastructure/repositories/VehicleRepository';
import { CarrierVehicleInputDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierVehicleService {
  private vehicleRepository = new VehicleRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async listVehicles(carrierId: string) {
    return this.vehicleRepository.findByCarrierId(carrierId);
  }

  async upsertVehicles(carrierId: string, vehicles: CarrierVehicleInputDto[]) {
    if (!vehicles?.length) {
      await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', false);
      return [];
    }

    for (const vehicle of vehicles) {
      const payload: any = {
        carrierId,
        vehicleTypeId: vehicle.vehicleTypeId,
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        capacityKg: vehicle.capacityKg ?? 0,
        capacityM3: vehicle.capacityM3 ?? null,
        hasInsurance: vehicle.hasInsurance ?? false,
        hasTrackingDevice: vehicle.hasTrackingDevice ?? false,
        isActive: true
      };

      if (vehicle.id) {
        await this.vehicleRepository.update(vehicle.id, payload);
      } else {
        await this.vehicleRepository.create(payload);
      }
    }

    const saved = await this.vehicleRepository.findByCarrierId(carrierId);
    await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', saved.length > 0);
    return saved;
  }
}
