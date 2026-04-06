import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierRegisterDto, CarrierLoginDto } from '../../dto/CarrierDto';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { CarrierVehicleTypeService } from './CarrierVehicleTypeService';

export class CarrierAuthService {
  private carrierRepository = new CarrierRepository();
  private profileStatusService = new CarrierProfileStatusService();
  private vehicleTypeService = new CarrierVehicleTypeService();

  async register(dto: CarrierRegisterDto): Promise<{ carrier: Carrier; token: string; profileStatus: CarrierProfileStatus }> {
    const emailExists = await this.carrierRepository.findByEmail(dto.email);
    if (emailExists) {
      throw new Error('Bu e-posta adresi zaten kullanımda.');
    }

    const taxExists = await this.carrierRepository.findByTaxNumber(dto.taxNumber);
    if (taxExists) {
      throw new Error('Bu vergi numarası ile kayıtlı hesap mevcut.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const carrier = await this.carrierRepository.create({
      companyName: dto.companyName,
      contactName: dto.contactName,
      phone: dto.phone,
      email: dto.email,
      taxNumber: dto.taxNumber,
      foundedYear: dto.foundedYear,
      passwordHash,
      isActive: true,
      profileCompletion: 0
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
