import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Carrier } from '../../../domain/entities/Carrier';
import { Vehicle } from '../../../domain/entities/Vehicle';
import { CarrierVehicle } from '../../../domain/entities/CarrierVehicle';
import { CarrierVehicleType } from '../../../domain/entities/CarrierVehicleType';
import { CarrierServiceType } from '../../../domain/entities/CarrierServiceType';
import { CarrierScopeOfWork } from '../../../domain/entities/CarrierScopeOfWork';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import {
  CarrierDocument,
  CarrierDocumentStatus,
  CarrierDocumentType,
} from '../../../domain/entities/CarrierDocument';
import { CarrierStats } from '../../../domain/entities/CarrierStats';
import { CarrierEarnings } from '../../../domain/entities/CarrierEarnings';
import { CarrierSecuritySettings } from '../../../domain/entities/CarrierSecuritySettings';
import { VehicleType } from '../../../domain/entities/VehicleType';
import { ServiceType } from '../../../domain/entities/ServiceType';
import { ScopeOfWork } from '../../../domain/entities/ScopeOfWork';
import { CARRIER_COMPANIES } from '../data/constants';
import {
  CarrierTierProfile,
  chance,
  generatePhone,
  generateTaxNumber,
  hashPassword,
  pickRandom,
  randomDistrict,
  randomFloat,
  randomFrom,
  randomInt,
  resolveCarrierTier,
  turkishToAscii,
} from '../helpers/seedHelpers';

const VEHICLE_TYPE_SEQUENCE = [
  ...Array.from({ length: 40 }, () => 'Kamyonet'),
  ...Array.from({ length: 25 }, () => 'Panel Van'),
  ...Array.from({ length: 25 }, () => 'Kamyon'),
  ...Array.from({ length: 10 }, () => 'Tır'),
];

const DOCUMENT_REQUIREMENTS: CarrierDocumentType[] = [
  CarrierDocumentType.AUTHORIZATION_CERT,
  CarrierDocumentType.SRC_CERT,
  CarrierDocumentType.VEHICLE_LICENSE,
  CarrierDocumentType.TAX_PLATE,
];

const EMAIL_SLUG_OVERRIDES: Record<string, string> = {
  'Şile Nakliyat': 'silenakliyat',
  'Ankara Ekspres Taşımacılık': 'ankaraekspres',
};

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
  const documentRepo = AppDataSource.getRepository(CarrierDocument);
  const statsRepo = AppDataSource.getRepository(CarrierStats);
  const earningsRepo = AppDataSource.getRepository(CarrierEarnings);
  const securityRepo = AppDataSource.getRepository(CarrierSecuritySettings);

  const serviceTypeNames = Object.keys(serviceTypeMap);
  const scopeNames = Object.keys(scopeMap);
  const allVehicleTypeNames = Object.keys(vehicleTypeMap);
  const created: Carrier[] = [];

  for (let index = 0; index < CARRIER_COMPANIES.length; index += 1) {
    const company = CARRIER_COMPANIES[index];
    const tierProfile = resolveCarrierTier(index, CARRIER_COMPANIES.length);
    const district = randomDistrict(company.city);
    const primaryVehicleTypeName = VEHICLE_TYPE_SEQUENCE[index % VEHICLE_TYPE_SEQUENCE.length];
    const vehicleCount = Math.max(
      1,
      randomInt(
        tierProfile.vehicleCountRange[0],
        tierProfile.vehicleCountRange[1],
      ),
    );
    const selectedVehicleTypeNames = [
      primaryVehicleTypeName,
      ...pickRandom(
        allVehicleTypeNames.filter((name) => name !== primaryVehicleTypeName),
        Math.max(0, vehicleCount - 1),
      ),
    ].filter((name, position, list) => list.indexOf(name) === position);
    const serviceCount = Math.max(
      1,
      randomInt(
        tierProfile.serviceCountRange[0],
        tierProfile.serviceCountRange[1],
      ),
    );
    const scopeCount = Math.max(
      1,
      randomInt(
        tierProfile.scopeCountRange[0],
        tierProfile.scopeCountRange[1],
      ),
    );
    const serviceNames = pickRandom(serviceTypeNames, serviceCount);
    const scopeSelection = pickRandom(scopeNames, scopeCount);
    const hasActivitySection = true;
    const hasEarningsSection = tierProfile.verifiedByAdmin;
    const completedShipments = randomInt(
      tierProfile.completedShipmentRange[0],
      tierProfile.completedShipmentRange[1],
    );
    const rating = tierProfile.ratingRange[0] === 0 && tierProfile.ratingRange[1] === 0
      ? 0
      : randomFloat(tierProfile.ratingRange[0], tierProfile.ratingRange[1]);
    const emailSlug = EMAIL_SLUG_OVERRIDES[company.companyName]
      ?? turkishToAscii(company.companyName.toLowerCase().replace(/\s+/g, ''));

    const carrier = carrierRepo.create({
      companyName: company.companyName,
      taxNumber: generateTaxNumber(),
      contactName: `Yetkili ${company.companyName.split(' ')[0]}`,
      phone: generatePhone(),
      email: `info@${emailSlug}.com`,
      passwordHash: await hashPassword('Maviface2141'),
      addressLine1: `${randomFrom(['Atatürk Cad.', 'İnönü Sok.', 'Cumhuriyet Blv.', 'İstasyon Cad.'])} No:${randomInt(1, 180)}`,
      district,
      activityCity: company.city,
      foundedYear: randomInt(2004, 2024),
      rating,
      completedShipments,
      cancelledShipments: completedShipments > 0 ? randomInt(0, 12) : 0,
      totalOffers: 0,
      successRate: completedShipments > 0 ? randomFloat(72, 99) : 0,
      hasUploadedDocuments: tierProfile.documentMode !== 'pending' || chance(0.5),
      documentCount: 0,
      verifiedByAdmin: tierProfile.verifiedByAdmin,
      isActive: true,
      balance: tierProfile.verifiedByAdmin ? randomFloat(0, 18000) : 0,
    });

    const savedCarrier = await carrierRepo.save(carrier);

    // Security Settings Guarantee (Adım 6)
    await securityRepo.save(securityRepo.create({
      carrierId: savedCarrier.id,
      twoFactorEnabled: false,
      suspiciousLoginAlertsEnabled: true
    }));

    for (const [vehicleIndex, vehicleTypeName] of selectedVehicleTypeNames.entries()) {
      const vehicleType = vehicleTypeMap[vehicleTypeName];
      const plate = `${randomInt(1, 81)} ${randomFrom(['AB', 'CD', 'EF', 'GH', 'JK'])} ${randomInt(100, 999)}`;
      const brand = randomFrom(['Ford', 'Mercedes', 'Renault', 'Fiat', 'Isuzu', 'MAN', 'Volvo']);
      const year = randomInt(2015, 2024);

      await vehicleRepo.save(vehicleRepo.create({
        carrierId: savedCarrier.id,
        vehicleTypeId: vehicleType.id,
        capacityKg: vehicleType.defaultCapacityKg,
        capacityM3: vehicleType.defaultCapacityM3,
        licensePlate: plate,
        brand,
        model: vehicleIndex === 0 ? vehicleTypeName : `${vehicleTypeName} Plus`,
        year,
        isActive: true,
        hasInsurance: tierProfile.verifiedByAdmin || chance(0.4),
        hasTrackingDevice: tierProfile.tier === 'elite' || chance(0.55),
      }));

      await carrierVehicleRepo.save(carrierVehicleRepo.create({
        carrierId: savedCarrier.id,
        vehicleTypeId: vehicleType.id,
        capacityKg: vehicleType.defaultCapacityKg,
        capacityM3: vehicleType.defaultCapacityM3,
        plate,
        brand,
        model: vehicleIndex === 0 ? vehicleTypeName : `${vehicleTypeName} Plus`,
        year,
        isActive: true,
      }));

      await cvtRepo.save(cvtRepo.create({
        carrierId: savedCarrier.id,
        vehicleTypeId: vehicleType.id,
        capacityKg: vehicleType.defaultCapacityKg,
      }));
    }

    for (const serviceName of serviceNames) {
      await cstRepo.save(cstRepo.create({
        carrierId: savedCarrier.id,
        serviceTypeId: serviceTypeMap[serviceName].id,
      }));
    }

    for (const scopeName of scopeSelection) {
      await csowRepo.save(csowRepo.create({
        carrierId: savedCarrier.id,
        scopeId: scopeMap[scopeName].id,
      }));
    }

    // Carrier Activity Guarantee (Adım 6 - 150/150)
    const serviceAreas = [
      company.city,
      district,
      randomDistrict(company.city),
    ].filter((value, position, list) => list.indexOf(value) === position);

    await activityRepo.save(activityRepo.create({
      carrierId: savedCarrier.id,
      city: company.city,
      district,
      address: `${district} ${randomFrom(['Lojistik Merkezi', 'Depo Bölgesi', 'Sanayi Sitesi'])}`,
      serviceAreasJson: serviceAreas,
      availableDates: JSON.stringify({
        weekdays: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
        weekend: chance(0.35),
      }),
    }));

    let approvedDocumentCount = 0;
    let totalDocumentCount = 0;
    const documentPlan = getDocumentPlan(tierProfile.documentMode);

    for (const type of documentPlan) {
      const isApproved = type.status === CarrierDocumentStatus.APPROVED;
      await documentRepo.save(documentRepo.create({
        carrierId: savedCarrier.id,
        type: type.type,
        fileUrl: `/uploads/documents/${savedCarrier.id}-${type.type.toLowerCase()}.pdf`,
        isRequired: DOCUMENT_REQUIREMENTS.includes(type.type),
        status: type.status,
        isApproved,
        uploadedAt: new Date(),
        verifiedAt: isApproved ? new Date() : undefined,
      }));
      totalDocumentCount += 1;
      if (isApproved) {
        approvedDocumentCount += 1;
      }
    }

        // Carrier Earnings Guarantee (Adım 6 - All Verified)
    if (tierProfile.verifiedByAdmin) {
      await earningsRepo.save(earningsRepo.create({
        carrierId: savedCarrier.id,
        bankName: randomFrom(['Ziraat Bankası', 'İş Bankası', 'Garanti BBVA', 'Yapı Kredi']),
        iban: `TR76${Array.from({ length: 22 }, () => randomInt(0, 9)).join('')}`,
        accountHolder: company.companyName,
      }));
    }

    const coreCompletionCount = Number(true)
      + Number(hasActivitySection)
      + Number(approvedDocumentCount >= DOCUMENT_REQUIREMENTS.length)
      + Number(hasEarningsSection);

    await profileStatusRepo.save(profileStatusRepo.create({
      carrierId: savedCarrier.id,
      companyInfoCompleted: true,
      activityInfoCompleted: hasActivitySection,
      vehiclesCompleted: selectedVehicleTypeNames.length > 0 && serviceNames.length > 0,
      documentsCompleted: approvedDocumentCount >= DOCUMENT_REQUIREMENTS.length,
      earningsCompleted: hasEarningsSection,
      securityCompleted: true,
      notificationsCompleted: tierProfile.verifiedByAdmin,
      overallPercentage: Math.max(
        coreCompletionCount * 25,
        randomInt(
          tierProfile.profileCompletionRange[0],
          tierProfile.profileCompletionRange[1],
        ),
      ),
    }));

    await carrierRepo.update(savedCarrier.id, {
      hasUploadedDocuments: totalDocumentCount > 0,
      documentCount: totalDocumentCount,
    });

    await statsRepo.save(statsRepo.create({
      carrierId: savedCarrier.id,
      totalEarnings: completedShipments > 0 ? randomFloat(8000, 280000) : 0,
      totalJobs: completedShipments,
      activeJobs: tierProfile.verifiedByAdmin ? randomInt(0, 6) : 0,
      averageRating: rating,
      totalReviews: completedShipments > 0 ? randomInt(0, Math.max(1, completedShipments)) : 0,
    }));

    created.push({
      ...savedCarrier,
      hasUploadedDocuments: totalDocumentCount > 0,
      documentCount: totalDocumentCount,
    });
  }

  console.log(
    `  ✓ ${created.length} nakliyeci (${created.filter((carrier) => carrier.verifiedByAdmin).length} onaylı)`,
  );
  console.log('  🔑 Şifre: Maviface2141 (hepsi)');
  return created;
}

function getDocumentPlan(mode: CarrierTierProfile['documentMode']): Array<{
  status: CarrierDocumentStatus;
  type: CarrierDocumentType;
}> {
  if (mode === 'full') {
    return [
      ...DOCUMENT_REQUIREMENTS.map((type) => ({
        type,
        status: CarrierDocumentStatus.APPROVED,
      })),
      {
        type: CarrierDocumentType.INSURANCE_POLICY,
        status: CarrierDocumentStatus.APPROVED,
      },
    ];
  }

  if (mode === 'mostly_full') {
    return DOCUMENT_REQUIREMENTS.map((type, index) => ({
      type,
      status: index === DOCUMENT_REQUIREMENTS.length - 1 && chance(0.35)
        ? CarrierDocumentStatus.PENDING
        : CarrierDocumentStatus.APPROVED,
    }));
  }

  if (mode === 'mixed') {
    return DOCUMENT_REQUIREMENTS.map((type, index) => ({
      type,
      status: index < 2 || chance(0.35)
        ? CarrierDocumentStatus.APPROVED
        : CarrierDocumentStatus.PENDING,
    }));
  }

  return pickRandom(
    [...DOCUMENT_REQUIREMENTS, CarrierDocumentType.INSURANCE_POLICY],
    randomInt(0, 2),
  ).map((type) => ({
    type,
    status: CarrierDocumentStatus.PENDING,
  }));
}
