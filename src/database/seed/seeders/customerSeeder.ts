import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Customer } from '../../../domain/entities/Customer';
import { CustomerAddress } from '../../../domain/entities/CustomerAddress';
import { CUSTOMER_NAMES } from '../data/constants';
import {
  chance,
  generatePhone,
  hashPassword,
  randomDistrict,
  randomFrom,
  randomInt,
  randomPastDateBetween,
  randomWeightedCity,
  turkishToAscii,
} from '../helpers/seedHelpers';

export async function seedCustomers(): Promise<Customer[]> {
  const customerRepo = AppDataSource.getRepository(Customer);
  const addressRepo = AppDataSource.getRepository(CustomerAddress);
  const created: Customer[] = [];

  const activeTarget = Math.round(CUSTOMER_NAMES.length * 0.7);
  const verifiedTarget = Math.round(CUSTOMER_NAMES.length * 0.85);

  for (let index = 0; index < CUSTOMER_NAMES.length; index += 1) {
    const name = CUSTOMER_NAMES[index];
    const city = randomWeightedCity();
    const district = randomDistrict(city);
    const addressLine1 = `${randomFrom([
      'Atatürk Cad.',
      'Cumhuriyet Sok.',
      'Bağlar Mah.',
      'Yıldız Sok.',
      'İnönü Cad.',
      'Mimar Sinan Bulvarı',
    ])} No:${randomInt(1, 220)}`;
    const firstName = turkishToAscii(name.firstName.toLowerCase());
    const lastName = turkishToAscii(name.lastName.toLowerCase());
    const isFixtureCustomer = index < 20;
    const isActive = isFixtureCustomer || index < activeTarget;
    const isVerified = isFixtureCustomer || index < verifiedTarget;

    const customer = customerRepo.create({
      firstName: name.firstName,
      lastName: name.lastName,
      email: `${firstName}.${lastName}${index}@gmail.com`,
      phone: generatePhone(),
      passwordHash: await hashPassword('Maviface2141'),
      city,
      district,
      addressLine1,
      isVerified,
      isActive,
    });

    const savedCustomer = await customerRepo.save(customer);
    const createdAt = randomPastDateBetween(1, 365);
    await customerRepo.createQueryBuilder()
      .update(Customer)
      .set({ createdAt, updatedAt: createdAt })
      .where('id = :id', { id: savedCustomer.id })
      .execute();

    if (isFixtureCustomer || chance(0.4)) {
      await addressRepo.save(addressRepo.create({
        customerId: savedCustomer.id,
        label: 'Ev',
        addressLine1,
        city,
        district,
        isDefault: true,
      }));

      if (chance(isFixtureCustomer ? 0.65 : 0.3)) {
        const secondaryCity = chance(0.7) ? city : randomWeightedCity();
        await addressRepo.save(addressRepo.create({
          customerId: savedCustomer.id,
          label: chance(0.5) ? 'İş' : 'Yazlık',
          addressLine1: `${randomFrom(['Mehmet Akif Sok.', 'Barış Cad.', 'Lale Sok.', 'Orkide Apt.'])} No:${randomInt(1, 90)}`,
          city: secondaryCity,
          district: randomDistrict(secondaryCity),
          isDefault: false,
        }));
      }
    }

    savedCustomer.createdAt = createdAt;
    savedCustomer.updatedAt = createdAt;
    savedCustomer.isActive = isActive;
    savedCustomer.isVerified = isVerified;
    created.push(savedCustomer);
  }

  console.log(`  ✓ ${created.length} müşteri`);
  console.log('  🔑 Şifre: Maviface2141 (hepsi)');
  return created;
}
