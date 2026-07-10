import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { AdminRepository } from '../../../infrastructure/repositories/AdminRepository';
import { CarrierRegisterDto, CarrierLoginDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { CarrierVehicleTypeService } from './CarrierVehicleTypeService';
import { ConflictError, ValidationError } from '../../../domain/errors/AppError';
import { NotificationSeverity } from '../../../domain/entities/Notification';
import { NotificationService } from '../NotificationService';

export class CarrierAuthService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();
  private vehicleTypeService = new CarrierVehicleTypeService();
  private adminRepository = new AdminRepository();
  private notificationService = new NotificationService();

  async register(dto: CarrierRegisterDto): Promise<{ carrier: Carrier; token: string; profileStatus: CarrierProfileStatus }> {
    const taxNumber = String(dto.taxNumber || '').trim();
    const email = String(dto.email || '').trim().toLowerCase();

    if (!/^\d{10,11}$/.test(taxNumber)) {
      throw new ValidationError('Vergi numarası 10, TCKN 11 haneli olmalıdır.');
    }

    const emailExists = await this.carrierRepository.findByEmail(email);
    if (emailExists) {
      throw new ConflictError('Bu e-posta adresi zaten kullanılıyor.');
    }

    const taxExists = await this.carrierRepository.findByTaxNumber(taxNumber);
    if (taxExists) {
      throw new ConflictError('Bu vergi numarası zaten kayıtlı.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let carrier: Carrier;
    try {
      carrier = await this.carrierRepository.create({
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone,
        email,
        taxNumber,
        foundedYear: dto.foundedYear,
        passwordHash,
        isActive: true,
      });
    } catch (error: any) {
      if (this.isDuplicateKeyError(error, 'taxNumber')) {
        throw new ConflictError('Bu vergi numarası zaten kayıtlı.');
      }
      if (this.isDuplicateKeyError(error, 'email')) {
        throw new ConflictError('Bu e-posta adresi zaten kullanılıyor.');
      }
      throw error;
    }

    await this.notifyAdminsForDuplicatePhone(carrier).catch((error) => {
      console.error('[CarrierAuthService] duplicate phone admin warning failed:', error?.message || error);
    });

    await this.profileStatusService.createInitialStatus(carrier.id);

    if (dto.vehicleTypeIds?.length) {
      await this.vehicleTypeService.replaceSelectedTypes(carrier.id, dto.vehicleTypeIds);
    }

    const profileStatus = await this.profileStatusService.updateProfileCompletion(carrier.id);

    const token = this.createToken(carrier);
    return { carrier, token, profileStatus };
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const carrier = await this.carrierRepository.findByEmail(email);
    return !!carrier;
  }

  private isDuplicateKeyError(error: any, column: string): boolean {
    const message = String(error?.message || error?.sqlMessage || '');
    const knownIndexNames: Record<string, string[]> = {
      taxNumber: ['IDX_e9d1deff05c7fee1775ce4307c', 'IDX_carriers_taxNumber_unique'],
      email: ['IDX_0e85f78d9b46eeeb74a20db72b'],
    };
    return error?.code === 'ER_DUP_ENTRY'
      && (
        message.includes(column)
        || message.toLowerCase().includes(column.toLowerCase())
        || (knownIndexNames[column] || []).some((indexName) => message.includes(indexName))
      );
  }

  private normalizePhone(phone?: string | null): string {
    return String(phone || '').replace(/\D/g, '');
  }

  private async notifyAdminsForDuplicatePhone(carrier: Carrier): Promise<void> {
    const normalizedPhone = this.normalizePhone(carrier.phone);
    if (!normalizedPhone) return;

    const matches = (await this.carrierRepository.findAll({
      select: ['id', 'phone'],
    } as any))
      .filter((match) => match.id !== carrier.id && this.normalizePhone(match.phone) === normalizedPhone);
    if (!matches.length) return;

    const adminIds = await this.adminRepository.listActiveAdminIds();
    if (!adminIds.length) return;

    await Promise.all(adminIds.map((adminId) =>
      this.notificationService.createNotification({
        recipientUserId: adminId,
        recipientRole: 'admin',
        type: 'admin.carrier_duplicate_phone_warning',
        title: 'Olasi coklu nakliyeci hesabi',
        body: 'Ayni telefon numarasiyla yeni bir nakliyeci kaydi olusturuldu. Lutfen kimlik riskleri raporundan kontrol edin.',
        entityType: 'carrier',
        entityId: carrier.id,
        severity: NotificationSeverity.HIGH,
        metadataJson: {
          carrierId: carrier.id,
          duplicateField: 'phone',
          duplicateCount: matches.length,
          matchedCarrierIds: matches.map((match) => match.id),
        },
        dedupeKey: `admin:carrier_duplicate_phone_warning:${adminId}:${carrier.id}`,
      }).catch(() => null),
    ));
  }

  async login(dto: CarrierLoginDto): Promise<{ carrier: Carrier; token: string }> {
    const carrier = await this.carrierRepository.findByEmail(dto.email);
    if (!carrier) {
      throw new Error('E-posta veya şifre hatalı.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, carrier.passwordHash);
    if (!passwordMatches) {
      throw new Error('E-posta veya şifre hatalı.');
    }

  await this.carrierRepository.update(carrier.id, { lastLogin: new Date() } as any);

    const token = this.createToken(carrier);
    return { carrier, token };
  }

  private createToken(carrier: Carrier): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET tanımlanmadı.');
    }
    return jwt.sign(
      {
        carrierId: carrier.id,
        email: carrier.email,
        companyName: carrier.companyName,
        type: 'carrier'
      },
      secret,
      { expiresIn: '24h' }
    );
  }
}
