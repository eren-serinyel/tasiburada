import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Customer } from '../../../domain/entities/Customer';
import { CustomerAddress } from '../../../domain/entities/CustomerAddress';
import { CUSTOMER_NAMES, CITIES } from '../data/constants';
import {
  hashPassword, randomFrom, randomInt,
  generatePhone, randomDistrict, turkishToAscii,
} from '../helpers/seedHelpers';

export async function seedCustomers(): Promise<Customer[]> {
  const customerRepo = AppDataSource.getRepository(Customer);
  const addressRepo = AppDataSource.getRepository(CustomerAddress);
  const created: Customer[] = [];

  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const name = CUSTOMER_NAMES[i];
    const city = randomFrom(CITIES);
    const district = randomDistrict(city);
    const addressLine1 = `${randomFrom([
      'Atatürk Cad.', 'Cumhuriyet Sok.',
      'Bağlar Mah.', 'Yıldız Sok.',
    ])} No:${randomInt(1, 200)}`;

    const firstName = turkishToAscii(name.firstName.toLowerCase());
    const lastName = turkishToAscii(name.lastName.toLowerCase());

    const customer = customerRepo.create({
      firstName: name.firstName,
      lastName: name.lastName,
      email: `${firstName}.${lastName}${i}@gmail.com`,
      phone: generatePhone(),
      passwordHash: await hashPassword('Musteri123!'),
      city,
      district,
      addressLine1,
      isVerified: true,
      isActive: true,
    });

    const savedCustomer = await customerRepo.save(customer);

    // Kayıtlı adres ekle
    const address = addressRepo.create({
      customerId: savedCustomer.id,
      label: 'Ev',
      addressLine1,
      city,
      district,
      isDefault: true,
    });
    await addressRepo.save(address);

    // %40 ihtimalle ikinci bir iş adresi ekle
    if (Math.random() > 0.6) {
      const workCity = randomFrom(CITIES);
      const workAddress = addressRepo.create({
        customerId: savedCustomer.id,
        label: 'İş',
        addressLine1: `${randomFrom(['İnönü Cad.', 'Mehmet Akif Sok.'])} No:${randomInt(1, 50)}`,
        city: workCity,
        district: randomDistrict(workCity),
        isDefault: false,
      });
      await addressRepo.save(workAddress);
    }

    created.push(savedCustomer);
  }

  console.log(`  ✓ ${created.length} müşteri`);
  console.log('  🔑 Şifre: Musteri123! (hepsi)');
  return created;
}
