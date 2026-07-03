import { AppDataSource } from '../../infrastructure/database/data-source';
import { CustomerAddressRepository } from '../../infrastructure/repositories/CustomerAddressRepository';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';
import { NotFoundError } from '../../domain/errors/AppError';

export class CustomerAddressService {
  async getAddresses(customerId: string) {
    const addresses = await CustomerAddressRepository.findByCustomerId(customerId);

    if (addresses.length > 0) return addresses;

    // Auto-migrate: if no saved addresses, pull profile address and seed it
    try {
      const customerRepo = AppDataSource.getRepository('Customer');
      const customer = await customerRepo.findOne({ where: { id: customerId } }) as any;
      if (!customer?.addressLine1 || !customer?.city || !customer?.district) return [];

      try {
        const addr = CustomerAddressRepository.create({
          customerId,
          label: 'Ev',
          addressLine1: customer.addressLine1,
          addressLine2: customer.addressLine2 ?? null,
          city: customer.city,
          district: customer.district,
          isDefault: true,
          type: 'ev',
        });
        return [await CustomerAddressRepository.save(addr)];
      } catch {
        // type column may not exist yet — raw SQL fallback
        const result = await AppDataSource.query(
          `INSERT INTO customer_addresses (customerId, label, addressLine1, city, district, isDefault) VALUES (?, 'Ev', ?, ?, ?, 1)`,
          [customerId, customer.addressLine1, customer.city, customer.district]
        );
        return CustomerAddressRepository.findByCustomerId(customerId);
      }
    } catch {
      return [];
    }
  }

  async addAddress(
    customerId: string,
    data: {
      label?: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      district: string;
      isDefault?: boolean;
      type?: string;
    }
  ) {
    if (data.isDefault) {
      await CustomerAddressRepository.update({ customerId }, { isDefault: false });
    }

    const address = CustomerAddressRepository.create({
      customerId,
      label: data.label ?? null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      city: data.city,
      district: data.district,
      isDefault: data.isDefault ?? false,
      type: (data.type as 'ev' | 'ofis' | 'diger') ?? 'ev',
    });

    return CustomerAddressRepository.save(address);
  }

  async updateAddress(
    customerId: string,
    addressId: number,
    data: Partial<Pick<CustomerAddress, 'label' | 'addressLine1' | 'addressLine2' | 'city' | 'district' | 'isDefault' | 'type'>>
  ) {
    const address = await CustomerAddressRepository.findOne({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundError('Adres bulunamadı.');

    if (data.isDefault) {
      await CustomerAddressRepository.update({ customerId }, { isDefault: false });
    }

    Object.assign(address, data);
    return CustomerAddressRepository.save(address);
  }

  async deleteAddress(customerId: string, addressId: number) {
    const address = await CustomerAddressRepository.findOne({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundError('Adres bulunamadı.');
    await CustomerAddressRepository.remove(address);
  }

  async setDefault(customerId: string, addressId: number) {
    const address = await CustomerAddressRepository.findOne({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundError('Adres bulunamadı.');
    await CustomerAddressRepository.setDefault(customerId, addressId);
  }
}
