import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Customer } from '../../domain/entities/Customer';
import { CustomerRepository } from '../../infrastructure/repositories/CustomerRepository';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  LoginDto,
  ChangePasswordDto
} from '../dto/CustomerDto';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async createCustomer(createDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    console.log('🔄 CustomerService.createCustomer called with:', JSON.stringify(createDto, null, 2));

    // Email zaten kayıtlı mı kontrol et
    const existingCustomer = await this.customerRepository.findByEmail(createDto.email);
    if (existingCustomer) {
      console.log('❌ Email already exists:', createDto.email);
      throw new Error('Bu email adresi zaten kayıtlı.');
    }

    // Telefon numarası zaten kayıtlı mı kontrol et
    const existingPhone = await this.customerRepository.findByPhone(createDto.phone);
    if (existingPhone) {
      throw new Error('Bu telefon numarası zaten kayıtlı.');
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(createDto.password, 12);

    // Müşteri oluştur
    console.log('💾 Creating customer in database...');
    const customer = await this.customerRepository.create({
      firstName: createDto.firstName,
      lastName: createDto.lastName,
      email: createDto.email,
      phone: createDto.phone,
      addressLine1: createDto.addressLine1,
      addressLine2: createDto.addressLine2,
      city: createDto.city,
      district: createDto.district,
      passwordHash,
      isActive: true,
      isVerified: false
    });

    console.log('✅ Customer created successfully:', customer.id);
    console.log('📊 Customer data:', JSON.stringify(customer, null, 2));

    return this.mapToResponseDto(customer);
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

  async getCustomerWithShipments(customerId: string): Promise<any> {
    const customer = await this.customerRepository.findCustomerWithShipments(customerId);
    if (!customer) {
      throw new Error('Müşteri bulunamadı.');
    }

    return {
      ...this.mapToResponseDto(customer),

    };
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
      isActive: customer.isActive,
      isVerified: customer.isVerified,
      fullName: customer.fullName,
      fullAddress: customer.fullAddress,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}