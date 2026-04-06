import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Customer } from '../../domain/entities/Customer';
import { CustomerRepository } from '../../infrastructure/repositories/CustomerRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  LoginDto,
  ChangePasswordDto
} from '../dto/CustomerDto';

export class CustomerService {
  private customerRepository: CustomerRepository;
  private shipmentRepository: ShipmentRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
    this.shipmentRepository = new ShipmentRepository();
  }

  async createCustomer(createDto: CreateCustomerDto): Promise<{ customer: CustomerResponseDto; token: string; userType: string }> {
    // Email zaten kayıtlı mı kontrol et
    const existingCustomer = await this.customerRepository.findByEmail(createDto.email);
    if (existingCustomer) {
      throw new Error('Bu email adresi zaten kayıtlı.');
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(createDto.password, 12);

    // Müşteri oluştur
    const customer = await this.customerRepository.create({
      firstName: createDto.firstName,
      lastName: createDto.lastName,
      email: createDto.email,
      passwordHash,
      isActive: true,
      isVerified: false
    });

    const token = jwt.sign(
      {
        customerId: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        type: 'customer'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return { customer: this.mapToResponseDto(customer), token, userType: 'customer' };
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const customer = await this.customerRepository.findByEmail(email);
    return !!customer;
  }

  async login(loginDto: LoginDto): Promise<{ customer: CustomerResponseDto; token: string }> {
    // Müşteriyi email ile bul
    const customer = await this.customerRepository.findByEmail(loginDto.email);
    if (!customer) {
      throw new Error('Email veya şifre hatalı.');
    }

    // Müşteri aktif mi kontrol et
    if (!customer.isActive) {
      throw new Error('Hesabınız deaktive edilmiş. Lütfen destek ekibi ile iletişime geçin.');
    }

    // Şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(loginDto.password, customer.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Email veya şifre hatalı.');
    }

    // JWT token oluştur
    const token = jwt.sign(
      {
        customerId: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        type: 'customer'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return {
      customer: this.mapToResponseDto(customer),
      token
    };
  }

  async updateCustomer(customerId: string, updateDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    // Telefon numarası değiştirildiyse, başka birinde kayıtlı mı kontrol et
    if (updateDto.phone && updateDto.phone !== customer.phone) {
      const existingPhone = await this.customerRepository.findByPhone(updateDto.phone);
      if (existingPhone && existingPhone.id !== customerId) {
        throw new Error('Bu telefon numarası başka bir hesapta kayıtlı.');
      }
    }

    const updatedCustomer = await this.customerRepository.update(customerId, updateDto);
    if (!updatedCustomer) {
      throw new Error('Müşteri güncellenirken hata oluştu.');
    }

    return this.mapToResponseDto(updatedCustomer);
  }

  async changePassword(customerId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    // Mevcut şifreyi kontrol et
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      customer.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Mevcut şifre hatalı.');
    }

    // Yeni şifreyi hash'le ve güncelle
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);
    await this.customerRepository.updatePassword(customerId, newPasswordHash);
  }

  async getCustomerById(customerId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    return this.mapToResponseDto(customer);
  }

  async getCustomerWithShipments(customerId: string): Promise<any[]> {
    const shipments = await this.shipmentRepository.findByCustomerId(customerId);
    return shipments.map(shipment => ({
      id: shipment.id,
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination,
      price: shipment.price,
      shipmentDate: shipment.shipmentDate,
      loadDetails: shipment.loadDetails,
      createdAt: (shipment as any).createdAt,
    }));
  }

  async verifyCustomer(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    await this.customerRepository.verifyCustomer(customerId);
  }

  async deactivateCustomer(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    await this.customerRepository.deactivateCustomer(customerId);
  }

  async searchCustomers(searchTerm: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.searchCustomers(searchTerm);
    return customers.map(customer => this.mapToResponseDto(customer));
  }

  async updatePicture(customerId: string, pictureUrl: string | null): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    const normalized = pictureUrl?.trim() ? pictureUrl : null;
    await this.customerRepository.update(customerId, { pictureUrl: normalized } as any);
    const updated = await this.customerRepository.findById(customerId);
    if (!updated) {
      throw new Error('Müşteri güncellenirken hata oluştu.');
    }
    return this.mapToResponseDto(updated);
  }

  private mapToResponseDto(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      district: customer.district,
      pictureUrl: customer.pictureUrl,
      isActive: customer.isActive,
      isVerified: customer.isVerified,
      fullName: customer.fullName,
      fullAddress: customer.fullAddress,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}