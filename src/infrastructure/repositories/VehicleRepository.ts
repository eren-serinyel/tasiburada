import { BaseRepository } from './BaseRepository';
import { Vehicle } from '../../domain/entities/Vehicle';

export class VehicleRepository extends BaseRepository<Vehicle> {
  constructor() {
    super(Vehicle);
  }

  async findByCarrierId(carrierId: string): Promise<Vehicle[]> {
    return await this.repository.find({
      where: { carrierId },
      order: { createdAt: 'DESC' }
    });
  }

  async findActiveVehicles(carrierId: string): Promise<Vehicle[]> {
    return await this.repository.find({
      where: {
        carrierId,
        isActive: true
      },
      order: { createdAt: 'DESC' }
    });
  }

  async findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    return await this.repository.findOne({
      where: { licensePlate },
      relations: ['carrier']
    });
  }

  async findByType(vehicleTypeId: string): Promise<Vehicle[]> {
    return await this.repository.find({
      where: {
        vehicleTypeId,
        isActive: true
      },
      relations: ['carrier'],
      order: { capacityKg: 'DESC' }
    });
  }

  async findByCapacity(minCapacityKg: number): Promise<Vehicle[]> {
    return await this.repository
      .createQueryBuilder('vehicle')
      .where('vehicle.capacityKg >= :minCapacity', { minCapacity: minCapacityKg })
      .andWhere('vehicle.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('vehicle.carrier', 'carrier')
      .orderBy('vehicle.capacityKg', 'ASC')
      .getMany();
  }

  async activateVehicle(vehicleId: string): Promise<void> {
    await this.repository.update(vehicleId, { isActive: true });
  }

  async deactivateVehicle(vehicleId: string): Promise<void> {
    await this.repository.update(vehicleId, { isActive: false });
  }

  async updateInsurance(vehicleId: string, hasInsurance: boolean, insuranceExpiry?: Date): Promise<void> {
    const updateData: any = { hasInsurance };
    if (insuranceExpiry) {
      updateData.insuranceExpiry = insuranceExpiry;
    }

    await this.repository.update(vehicleId, updateData);
  }

  async findExpiringInsurances(daysAhead: number = 30): Promise<Vehicle[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.repository
      .createQueryBuilder('vehicle')
      .where('vehicle.hasInsurance = :hasInsurance', { hasInsurance: true })
      .andWhere('vehicle.insuranceExpiry <= :futureDate', { futureDate })
      .andWhere('vehicle.insuranceExpiry > CURDATE()')
      .leftJoinAndSelect('vehicle.carrier', 'carrier')
      .orderBy('vehicle.insuranceExpiry', 'ASC')
      .getMany();
  }

  async getVehicleStats(carrierId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    insured: number;
    withTracking: number;
  }> {
    const baseWhere: any = {};
    if (carrierId) {
      baseWhere.carrierId = carrierId;
    }

    const [total, active, inactive, insured, withTracking] = await Promise.all([
      this.repository.count({ where: baseWhere }),
      this.repository.count({ where: { ...baseWhere, isActive: true } }),
      this.repository.count({ where: { ...baseWhere, isActive: false } }),
      this.repository.count({ where: { ...baseWhere, hasInsurance: true } }),
      this.repository.count({ where: { ...baseWhere, hasTrackingDevice: true } })
    ]);

    return { total, active, inactive, insured, withTracking };
  }

  async findVehiclesByCarrier(carrierId: string, vehicleTypeId?: string): Promise<Vehicle[]> {
    const where: any = { carrierId, isActive: true };
    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
    }

    return await this.repository.find({
      where,
      order: {
        capacityKg: 'DESC',
        createdAt: 'DESC'
      }
    });
  }
}