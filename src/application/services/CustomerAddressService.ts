import { CustomerAddressRepository } from '../../infrastructure/repositories/CustomerAddressRepository';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';
import { NotFoundError } from '../../domain/errors/AppError';

export class CustomerAddressService {
  async getAddresses(customerId: string) {
    return CustomerAddressRepository.findByCustomerId(customerId);
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
    });

    return CustomerAddressRepository.save(address);
  }

  async updateAddress(
    customerId: string,
    addressId: number,
    data: Partial<Pick<CustomerAddress, 'label' | 'addressLine1' | 'addressLine2' | 'city' | 'district' | 'isDefault'>>
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
