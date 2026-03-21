import { BaseRepository } from './BaseRepository';
import { Customer } from '../../domain/entities/Customer';

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super(Customer);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return await this.repository.findOne({
      where: { email }
    });
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return await this.repository.findOne({
      where: { phone }
    });
  }

  async findActiveCustomers(): Promise<Customer[]> {
    return await this.repository.find({
      where: { 
        isActive: true 
      },
      order: { createdAt: 'DESC' }
    });
  }

  async findVerifiedCustomers(): Promise<Customer[]> {
    return await this.repository.find({
      where: { 
        isActive: true,
        isVerified: true
      },
      order: { createdAt: 'DESC' }
    });
  }

  async verifyCustomer(customerId: string): Promise<void> {
    await this.repository.update(customerId, { isVerified: true });
  }

  async deactivateCustomer(customerId: string): Promise<void> {
    await this.repository.update(customerId, { isActive: false });
  }

  async updatePassword(customerId: string, passwordHash: string): Promise<void> {
    await this.repository.update(customerId, { passwordHash });
  }

  async findCustomerWithShipments(customerId: string): Promise<Customer | null> {
    return await this.repository.findOne({
      where: { id: customerId }
    });
  }

  async searchCustomers(searchTerm: string): Promise<Customer[]> {
    return await this.repository
      .createQueryBuilder('customer')
      .where('customer.firstName LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('customer.lastName LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('customer.email LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('customer.phone LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .andWhere('customer.isActive = :isActive', { isActive: true })
      .orderBy('customer.createdAt', 'DESC')
      .getMany();
  }
}