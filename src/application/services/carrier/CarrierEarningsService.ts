import { CarrierEarningsRepository } from '../../../infrastructure/repositories/CarrierEarningsRepository';
import { CarrierEarningsDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { ValidationError } from '../../../domain/errors/AppError';

export class CarrierEarningsService {
  private repository = new CarrierEarningsRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async upsert(carrierId: string, dto: CarrierEarningsDto) {
    const bankName = String(dto.bankName || '').trim();
    const accountHolder = String(dto.accountHolder || '').trim();
    const iban = String(dto.iban || '').replace(/\s+/g, '').toUpperCase();

    if (!bankName) {
      throw new ValidationError('Banka adı zorunludur.');
    }
    if (!accountHolder) {
      throw new ValidationError('Hesap sahibi adı zorunludur.');
    }
    if (!/^TR\d{24}$/.test(iban)) {
      throw new ValidationError('IBAN TR ile başlamalı ve toplam 26 karakter olmalıdır.');
    }

    const existing = await this.repository.findByCarrierId(carrierId);
    if (existing) {
      await this.repository.update(existing.id, {
        bankName,
        iban,
        accountHolder
      } as any);
    } else {
      await this.repository.create({
        carrierId,
        bankName,
        iban,
        accountHolder
      });
    }

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return this.repository.findByCarrierId(carrierId);
  }
}
