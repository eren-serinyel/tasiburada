import bcrypt from 'bcryptjs';
import { CarrierSecuritySettingsRepository } from '../../../infrastructure/repositories/CarrierSecuritySettingsRepository';
import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierSecuritySettingsDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierSecurityService {
  private repository = new CarrierSecuritySettingsRepository();
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async updateSettings(carrierId: string, dto: CarrierSecuritySettingsDto) {
    const carrier = await this.carrierRepository.findById(carrierId);
    if (!carrier) {
      throw new Error('Nakliyeci bulunamadı.');
    }

    const existing = await this.repository.findByCarrierId(carrierId);
    if (existing) {
      await this.repository.update(existing.id, {
        twoFactorEnabled: dto.twoFactorEnabled,
        suspiciousLoginAlertsEnabled: dto.suspiciousLoginAlertsEnabled
      } as any);
    } else {
      await this.repository.create({
        carrierId,
        twoFactorEnabled: dto.twoFactorEnabled,
        suspiciousLoginAlertsEnabled: dto.suspiciousLoginAlertsEnabled
      });
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new Error('Mevcut şifrenizi girmeniz gerekiyor.');
      }
      const matches = await bcrypt.compare(dto.currentPassword, carrier.passwordHash);
      if (!matches) {
        throw new Error('Mevcut şifre hatalı.');
      }
      const passwordHash = await bcrypt.hash(dto.newPassword, 12);
      await this.carrierRepository.update(carrierId, { passwordHash } as any);
    }

    await this.profileStatusService.updateAuxSectionCompleted(carrierId, 'security');
    return this.repository.findByCarrierId(carrierId);
  }
}
