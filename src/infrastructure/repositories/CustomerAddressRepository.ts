import { AppDataSource } from '../database/data-source';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';

export const CustomerAddressRepository = AppDataSource
  .getRepository(CustomerAddress)
  .extend({
    async findByCustomerId(customerId: string) {
      return this.find({
        where: { customerId },
        order: { isDefault: 'DESC', createdAt: 'ASC' },
      });
    },

    async setDefault(customerId: string, addressId: number) {
      await this.update({ customerId }, { isDefault: false });
      await this.update({ id: addressId, customerId }, { isDefault: true });
    },
  });
