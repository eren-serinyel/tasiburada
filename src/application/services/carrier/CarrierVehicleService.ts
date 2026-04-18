import fs from 'node:fs';
import path from 'node:path';
import { CarrierVehicleRepository } from '../../../infrastructure/repositories/CarrierVehicleRepository';
import { CarrierVehicleInputDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

type CarrierVehicleMutableInput = Partial<CarrierVehicleInputDto> & {
  id?: string;
  vehicleTypeId?: string;
  licensePlate?: string | null;
  plate?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  capacityKg?: number | null;
  capacityM3?: number | null;
  photos?: string[] | null;
};

export class CarrierVehicleService {
  private vehicleRepository = new CarrierVehicleRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async listVehicles(carrierId: string) {
    return this.vehicleRepository.findByCarrierId(carrierId);
  }

  async createVehicle(carrierId: string, vehicle: CarrierVehicleMutableInput) {
    const payload = this.buildPayload(carrierId, vehicle);
    const created = await this.vehicleRepository.create(payload as any);
    await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', true);
    return this.vehicleRepository.findOwnedById(created.id, carrierId);
  }

  async updateVehicle(carrierId: string, vehicleId: string, vehicle: Partial<CarrierVehicleMutableInput>) {
    const existing = await this.vehicleRepository.findOwnedById(vehicleId, carrierId);
    if (!existing) {
      throw new Error('Araç bulunamadı.');
    }

    const payload = this.buildPayload(carrierId, { ...existing, ...vehicle, photos: vehicle.photos ?? existing.photos });
    await this.vehicleRepository.update(vehicleId, payload as any);
    return this.vehicleRepository.findOwnedById(vehicleId, carrierId);
  }

  async deleteVehicle(carrierId: string, vehicleId: string) {
    const existing = await this.vehicleRepository.findOwnedById(vehicleId, carrierId);
    if (!existing) {
      throw new Error('Araç bulunamadı.');
    }

    for (const photoUrl of existing.photos || []) {
      this.removePhotoFile(photoUrl);
    }

    await this.vehicleRepository.delete(vehicleId);
    const saved = await this.vehicleRepository.findByCarrierId(carrierId);
    await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', saved.length > 0);
    return { success: true };
  }

  async addVehiclePhotos(carrierId: string, vehicleId: string, fileNames: string[]) {
    const existing = await this.vehicleRepository.findOwnedById(vehicleId, carrierId);
    if (!existing) {
      throw new Error('Araç bulunamadı.');
    }

    const current = Array.isArray(existing.photos) ? existing.photos : [];
    const uploaded = (fileNames || []).filter(Boolean).map(name => `/uploads/pictures/${name}`);
    const photos = Array.from(new Set([...current, ...uploaded]));

    await this.vehicleRepository.update(vehicleId, { photos } as any);
    return this.vehicleRepository.findOwnedById(vehicleId, carrierId);
  }

  async deleteVehiclePhoto(carrierId: string, vehicleId: string, photoId: string) {
    const existing = await this.vehicleRepository.findOwnedById(vehicleId, carrierId);
    if (!existing) {
      throw new Error('Araç bulunamadı.');
    }

    const decodedPhotoId = decodeURIComponent(photoId);
    const current = Array.isArray(existing.photos) ? existing.photos : [];
    const toRemove = current.find(url => url === decodedPhotoId || path.basename(url) === decodedPhotoId);

    if (!toRemove) {
      throw new Error('Araç fotoğrafı bulunamadı.');
    }

    const photos = current.filter(url => url !== toRemove);
    this.removePhotoFile(toRemove);
    await this.vehicleRepository.update(vehicleId, { photos } as any);
    return this.vehicleRepository.findOwnedById(vehicleId, carrierId);
  }

  async upsertVehicles(carrierId: string, vehicles: CarrierVehicleMutableInput[]) {
    if (!vehicles?.length) {
      await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', false);
      return [];
    }

    for (const vehicle of vehicles) {
      if (vehicle.id) {
        await this.updateVehicle(carrierId, vehicle.id, vehicle);
      } else {
        await this.createVehicle(carrierId, vehicle);
      }
    }

    const saved = await this.vehicleRepository.findByCarrierId(carrierId);
    await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'vehicles', saved.length > 0);
    return saved;
  }

  private buildPayload(carrierId: string, vehicle: any) {
    return {
      carrierId,
      vehicleTypeId: vehicle.vehicleTypeId,
      plate: vehicle.licensePlate ?? vehicle.plate ?? null,
      brand: vehicle.brand ?? null,
      model: vehicle.model ?? null,
      year: vehicle.year ?? null,
      capacityKg: Number(vehicle.capacityKg ?? 0),
      capacityM3: vehicle.capacityM3 ?? null,
      photos: Array.isArray(vehicle.photos) ? vehicle.photos : [],
      isActive: true,
    };
  }

  private removePhotoFile(photoUrl: string) {
    try {
      const filename = path.basename(photoUrl);
      const filePath = path.resolve(process.cwd(), 'uploads', 'pictures', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // no-op cleanup
    }
  }
}
