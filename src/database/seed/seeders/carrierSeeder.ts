import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Carrier } from '../../../domain/entities/Carrier';
import { Vehicle } from '../../../domain/entities/Vehicle';
import { CarrierVehicle } from '../../../domain/entities/CarrierVehicle';
import { CarrierVehicleType } from '../../../domain/entities/CarrierVehicleType';
import { CarrierServiceType } from '../../../domain/entities/CarrierServiceType';
import { CarrierScopeOfWork } from '../../../domain/entities/CarrierScopeOfWork';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import { CarrierStats } from '../../../domain/entities/CarrierStats';
import { VehicleType } from '../../../domain/entities/VehicleType';
import { ServiceType } from '../../../domain/entities/ServiceType';
import { ScopeOfWork } from '../../../domain/entities/ScopeOfWork';
import { CARRIER_COMPANIES } from '../data/constants';
import {
  hashPassword, randomInt, randomFrom,
  randomFloat, generateTaxNumber,
  generatePhone, pickRandom,
  turkishToAscii,
} from '../helpers/seedHelpers';

export async function seedCarriers(
  vehicleTypeMap: Record<string, VehicleType>,
  serviceTypeMap: Record<string, ServiceType>,
  scopeMap: Record<string, ScopeOfWork>,
): Promise<Carrier[]> {
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const carrierVehicleRepo = AppDataSource.getRepository(CarrierVehicle);
  const cvtRepo = AppDataSource.getRepository(CarrierVehicleType);
  const cstRepo = AppDataSource.getRepository(CarrierServiceType);
  const csowRepo = AppDataSource.getRepository(CarrierScopeOfWork);
  const profileStatusRepo = AppDataSource.getRepository(CarrierProfileStatus);
  const activityRepo = AppDataSource.getRepository(CarrierActivity);
  const statsRepo = AppDataSource.getRepository(CarrierStats);

  const vehicleTypeNames = Object.keys(vehicleTypeMap);
  const serviceTypeNames = Object.keys(serviceTypeMap);
  const scopeNames = Object.keys(scopeMap);

  const created: Carrier[] = [];

  for (let i = 0; i < CARRIER_COMPANIES.length; i++) {
    const company = CARRIER_COMPANIES[i];
    const vtName = vehicleTypeNames[i % vehicleTypeNames.length];
    const vt = vehicleTypeMap[vtName];
    const isVerified = i < 9; // İlk 9 onaylı, 3 beklemede

    const emailSlug = turkishToAscii(
      company.companyName.toLowerCase().replace(/\s+/g, '')
    );

    const carrier = carrierRepo.create({
      companyName: company.companyName,
      taxNumber: generateTaxNumber(),
      contactName: `Yetkili ${company.companyName.split(' ')[0]}`,
      phone: generatePhone(),
      email: `info@${emailSlug}.com`,
      passwordHash: await hashPassword('Nakliye123!'),
      addressLine1: `${randomFrom(['Atatürk Cad.', 'İnönü Sok.', 'Cumhuriyet Bul.'])} No:${randomInt(1, 100)}`,
      district: randomFrom(['Merkez', 'Yeni Mahalle']),
      activityCity: company.city,
      foundedYear: randomInt(2005, 2020),
      rating: isVerified ? randomFloat(3.5, 5.0) : 0,
      completedShipments: isVerified ? randomInt(10, 150) : 0,
      cancelledShipments: isVerified ? randomInt(0, 5) : 0,
      totalOffers: isVerified ? randomInt(20, 200) : 0,
      successRate: isVerified ? randomFloat(70, 98) : 0,
      verifiedByAdmin: isVerified,
      isActive: true,
      balance: isVerified ? randomFloat(0, 5000) : 0,
    });

    const saved = await carrierRepo.save(carrier);

    // ── Vehicle kaydı ──
    try {
      const plate = `${randomInt(1, 81)} ${randomFrom(['AB', 'CD', 'EF', 'GH'])} ${randomInt(100, 999)}`;
      const brand = randomFrom(['Ford', 'Mercedes', 'Renault', 'Fiat', 'Isuzu', 'MAN', 'Volvo']);
      const year = randomInt(2015, 2023);

      const vehicle = vehicleRepo.create({
        carrierId: saved.id,
        vehicleTypeId: vt.id,
        capacityKg: vt.defaultCapacityKg,
        capacityM3: vt.defaultCapacityM3,
        licensePlate: plate,
        brand,
        model: vtName,
        year,
        isActive: true,
        hasInsurance: isVerified,
        hasTrackingDevice: Math.random() > 0.5,
      });
      await vehicleRepo.save(vehicle);

      await carrierVehicleRepo.save(carrierVehicleRepo.create({
        carrierId: saved.id,
        vehicleTypeId: vt.id,
        capacityKg: vt.defaultCapacityKg,
        capacityM3: vt.defaultCapacityM3,
        plate,
        brand,
        model: vtName,
        year,
        isActive: true,
      }));
    } catch (err: any) {
      console.warn(`  ⚠ Vehicle kaydı atlandı (${saved.companyName}): ${err.message}`);
    }

    // ── CarrierVehicleType bağlantısı ──
    try {
      await cvtRepo.save(cvtRepo.create({
        carrierId: saved.id,
        vehicleTypeId: vt.id,
        capacityKg: vt.defaultCapacityKg,
      }));
    } catch (err: any) {
      console.warn(`  ⚠ CarrierVehicleType atlandı: ${err.message}`);
    }

    // ── CarrierServiceType bağlantıları (2-4 hizmet) ──
    try {
      const selectedServices = pickRandom(serviceTypeNames, randomInt(2, 4));
      for (const stName of selectedServices) {
        await cstRepo.save(cstRepo.create({
          carrierId: saved.id,
          serviceTypeId: serviceTypeMap[stName].id,
        }));
      }
    } catch (err: any) {
      console.warn(`  ⚠ CarrierServiceType atlandı: ${err.message}`);
    }

    // ── CarrierScopeOfWork bağlantıları (1-3 alan) ──
    try {
      const selectedScopes = pickRandom(scopeNames, randomInt(1, 3));
      for (const sName of selectedScopes) {
        await csowRepo.save(csowRepo.create({
          carrierId: saved.id,
          scopeId: scopeMap[sName].id,
        }));
      }
    } catch (err: any) {
      console.warn(`  ⚠ CarrierScopeOfWork atlandı: ${err.message}`);
    }

    // ── CarrierProfileStatus ──
    try {
      await profileStatusRepo.save(profileStatusRepo.create({
        carrierId: saved.id,
        companyInfoCompleted: true,
        activityInfoCompleted: isVerified,
        vehiclesCompleted: isVerified,
        documentsCompleted: isVerified,
        earningsCompleted: false,
        securityCompleted: false,
        notificationsCompleted: false,
        overallPercentage: isVerified ? randomInt(60, 100) : randomInt(20, 50),
      }));
    } catch (err: any) {
      console.warn(`  ⚠ CarrierProfileStatus atlandı: ${err.message}`);
    }

    // ── CarrierActivity ──
    try {
      await activityRepo.save(activityRepo.create({
        carrierId: saved.id,
        city: company.city,
        district: randomFrom(['Merkez', 'Yeni Mahalle']),
      }));
    } catch (err: any) {
      console.warn(`  ⚠ CarrierActivity atlandı: ${err.message}`);
    }

    // ── CarrierStats ──
    try {
      await statsRepo.save(statsRepo.create({
        carrierId: saved.id,
        totalEarnings: isVerified ? randomFloat(5000, 80000) : 0,
        totalJobs: saved.completedShipments,
        activeJobs: isVerified ? randomInt(0, 3) : 0,
        averageRating: saved.rating,
        totalReviews: isVerified ? randomInt(5, 40) : 0,
      }));
    } catch (err: any) {
      console.warn(`  ⚠ CarrierStats atlandı: ${err.message}`);
    }

    created.push(saved);
  }

  console.log(`  ✓ ${created.length} nakliyeci (${created.filter(c => c.verifiedByAdmin).length} onaylı)`);
  console.log('  🔑 Şifre: Nakliye123! (hepsi)');
  return created;
}
