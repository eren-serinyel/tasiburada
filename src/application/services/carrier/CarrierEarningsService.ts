import { CarrierEarningsRepository } from '../../../infrastructure/repositories/CarrierEarningsRepository';
import { CarrierEarningsDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

export class CarrierEarningsService {
  private repository = new CarrierEarningsRepository();
  private profileStatusService = new CarrierProfileStatusService();

  async upsert(carrierId: string, dto: CarrierEarningsDto) {
    const existing = await this.repository.findByCarrierId(carrierId);
    if (existing) {
      await this.repository.update(existing.id, {
        bankName: dto.bankName,
        iban: dto.iban,
        accountHolder: dto.accountHolder
      } as any);
    } else {
      await this.repository.create({
        carrierId,
        bankName: dto.bankName,
        iban: dto.iban,
        accountHolder: dto.accountHolder
      });
    }

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return this.repository.findByCarrierId(carrierId);
  }
}
