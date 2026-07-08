import { AppDataSource } from '../../../infrastructure/database/data-source';
import fs from 'node:fs';
import { Repository } from 'typeorm';
import { Carrier } from '../../../domain/entities/Carrier';
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
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';
import { CarrierLoadTypeCapability } from '../../../domain/entities/CarrierLoadTypeCapability';
import {
  CarrierExtraServiceCapability,
  CarrierExtraServicePriceMode,
} from '../../../domain/entities/CarrierExtraServiceCapability';
import { resolveSuggestedServiceAreas } from '../../../shared/serviceAreaSuggestions';
import { CARRIER_COMPANIES } from '../data/constants';
import {
  ensureSeedDocumentsDirectory,
  generateMinimalPdf,
  resolveSeedDocumentPath,
} from '../helpers/pdfHelper';
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

function resolveDefaultAvailabilityWindow(index: number): { start: string; end: string } {
  const variant = index % 5;
  if (variant === 0) return { start: '17:00', end: '00:00' };
  if (variant === 1) return { start: '08:00', end: '00:00' };
  return { start: '08:00', end: '17:00' };
}

export async function seedCarriers(
  vehicleTypeMap: Record<string, VehicleType>,
  serviceTypeMap: Record<string, ServiceType>,
  scopeMap: Record<string, ScopeOfWork>,
): Promise<Carrier[]> {
  const carrierRepo = AppDataSource.getRepository(Carrier);
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
  const loadTypeCapabilityRepo = AppDataSource.getRepository(CarrierLoadTypeCapability);
  const extraCapabilityRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);
  const extraServiceRepo = AppDataSource.getRepository(ExtraService);
  const extraServices = await extraServiceRepo.find({
    where: { status: 'ACTIVE' },
    relations: ['applicabilityRules'],
  });
  ensureSeedDocumentsDirectory();

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
    const selectedVehicleTypeNames = index === 0
      ? allVehicleTypeNames
      : [
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
    const scopeSelection = index === 0 ? scopeNames : pickRandom(scopeNames, scopeCount);
    const hasActivitySection = true;
    const hasEarningsSection = tierProfile.verifiedByAdmin;
    const availableDates = index === 0
      ? generateWideAvailabilityDates()
      : generateAvailabilityDatesForTier(tierProfile);
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

    await seedCarrierCapabilitiesForTier(
      savedCarrier.id,
      tierProfile,
      extraServices,
      loadTypeCapabilityRepo,
      extraCapabilityRepo,
    );

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
    const serviceAreas = resolveSuggestedServiceAreas(company.city);
    const defaultAvailability = resolveDefaultAvailabilityWindow(index);

    await activityRepo.save(activityRepo.create({
      carrierId: savedCarrier.id,
      city: company.city,
      district,
      address: `${district} ${randomFrom(['Lojistik Merkezi', 'Depo Bölgesi', 'Sanayi Sitesi'])}`,
      serviceAreasJson: serviceAreas,
      defaultAvailabilityStart: defaultAvailability.start,
      defaultAvailabilityEnd: defaultAvailability.end,
      availableDates: JSON.stringify(availableDates),
    }));

    let approvedDocumentCount = 0;
    let totalDocumentCount = 0;
    const documentPlan = getDocumentPlan(tierProfile.documentMode);

    for (const type of documentPlan) {
      const isApproved = type.status === CarrierDocumentStatus.APPROVED;
      const fileUrl = `/uploads/documents/${savedCarrier.id}-${type.type.toLowerCase()}.pdf`;
      await documentRepo.save(documentRepo.create({
        carrierId: savedCarrier.id,
        type: type.type,
        fileUrl,
        isRequired: DOCUMENT_REQUIREMENTS.includes(type.type),
        status: type.status,
        isApproved,
        uploadedAt: new Date(),
        verifiedAt: isApproved ? new Date() : undefined,
      }));
      fs.writeFileSync(
        resolveSeedDocumentPath(fileUrl),
        generateMinimalPdf(`TASIBURADA DEMO BELGE - ${type.type} - ${company.companyName}`),
      );
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

function generateAvailabilityDatesForTier(tierProfile: CarrierTierProfile): string[] {
  const rangeByTier: Record<CarrierTierProfile['tier'], [number, number]> = {
    elite: [30, 45],
    established: [25, 40],
    growing: [15, 30],
    new: [10, 20],
    onboarding: [0, 0],
  };

  const [minDays, maxDays] = rangeByTier[tierProfile.tier];
  if (maxDays === 0) {
    return [];
  }

  const desiredCount = randomInt(minDays, maxDays);
  const selectedDates = new Set<string>();

  while (selectedDates.size < desiredCount) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + randomInt(0, 89));
    selectedDates.add(formatDateOnly(date));
  }

  return [...selectedDates].sort();
}

function generateWideAvailabilityDates(): string[] {
  const dates: string[] = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  for (let offset = 0; offset <= 120; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    dates.push(formatDateOnly(date));
  }

  return dates;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveLoadTypesForTier(tier: CarrierTierProfile['tier']): ExtraServiceLoadType[] {
  const universe = [
    ExtraServiceLoadType.HOME,
    ExtraServiceLoadType.OFFICE,
    ExtraServiceLoadType.PARTIAL,
    ExtraServiceLoadType.STORAGE,
  ];

  if (tier === 'elite') {
    return universe;
  }

  if (tier === 'established') {
    const selected = [ExtraServiceLoadType.HOME, ExtraServiceLoadType.PARTIAL];
    if (chance(0.8)) selected.push(ExtraServiceLoadType.OFFICE);
    if (chance(0.65)) selected.push(ExtraServiceLoadType.STORAGE);
    return selected;
  }

  if (tier === 'growing') {
    const selected = [ExtraServiceLoadType.HOME];
    if (chance(0.8)) selected.push(ExtraServiceLoadType.PARTIAL);
    if (chance(0.55)) selected.push(ExtraServiceLoadType.OFFICE);
    if (chance(0.35)) selected.push(ExtraServiceLoadType.STORAGE);
    return selected;
  }

  if (tier === 'new') {
    const selected: ExtraServiceLoadType[] = [];
    if (chance(0.8)) selected.push(ExtraServiceLoadType.HOME);
    if (chance(0.6)) selected.push(ExtraServiceLoadType.PARTIAL);
    if (chance(0.35)) selected.push(ExtraServiceLoadType.OFFICE);
    if (chance(0.2)) selected.push(ExtraServiceLoadType.STORAGE);
    return selected.length > 0 ? selected : [ExtraServiceLoadType.HOME];
  }

  const onboarding: ExtraServiceLoadType[] = [];
  if (chance(0.45)) onboarding.push(randomFrom(universe));
  return onboarding;
}

function resolveExtraCapabilityCoverage(tier: CarrierTierProfile['tier']): number {
  if (tier === 'elite') return 0.92;
  if (tier === 'established') return 0.8;
  if (tier === 'growing') return 0.62;
  if (tier === 'new') return 0.45;
  return 0.2;
}

function resolvePriceModeForCapability(tier: CarrierTierProfile['tier']): CarrierExtraServicePriceMode {
  if (tier === 'elite' || tier === 'established') {
    return chance(0.35) ? CarrierExtraServicePriceMode.FIXED : CarrierExtraServicePriceMode.QUOTE;
  }

  if (tier === 'growing') {
    return chance(0.2) ? CarrierExtraServicePriceMode.FIXED : CarrierExtraServicePriceMode.QUOTE;
  }

  if (tier === 'new') {
    return chance(0.1) ? CarrierExtraServicePriceMode.FIXED : CarrierExtraServicePriceMode.QUOTE;
  }

  return CarrierExtraServicePriceMode.NONE;
}

async function seedCarrierCapabilitiesForTier(
  carrierId: string,
  tierProfile: CarrierTierProfile,
  extraServices: ExtraService[],
  loadTypeCapabilityRepo: Repository<CarrierLoadTypeCapability>,
  extraCapabilityRepo: Repository<CarrierExtraServiceCapability>,
): Promise<void> {
  const loadTypes = resolveLoadTypesForTier(tierProfile.tier);
  if (loadTypes.length === 0) {
    return;
  }

  const loadTypeCapabilities = loadTypes.map((loadType) =>
    loadTypeCapabilityRepo.create({
      carrierId,
      loadType,
      isActive: true,
    }),
  );
  await loadTypeCapabilityRepo.save(loadTypeCapabilities);

  const coverage = resolveExtraCapabilityCoverage(tierProfile.tier);
  const createdCapabilities: CarrierExtraServiceCapability[] = [];

  for (const loadType of loadTypes) {
    const applicableServices = extraServices.filter((service) =>
      (service.applicabilityRules ?? []).some((rule) => rule.loadType === loadType),
    );
    if (applicableServices.length === 0) continue;

    const selected = applicableServices.filter((service) => {
      const rule = (service.applicabilityRules ?? []).find((entry) => entry.loadType === loadType);
      if (!rule) return false;
      if (rule.isRecommendedByConverter) return chance(Math.min(0.98, coverage + 0.22));
      if (rule.isDefaultVisible) return chance(coverage);
      return chance(Math.max(0.18, coverage - 0.22));
    });

    if (selected.length === 0) {
      selected.push(randomFrom(applicableServices));
    }

    for (const service of selected) {
      const priceMode = resolvePriceModeForCapability(tierProfile.tier);
      const basePrice = priceMode === CarrierExtraServicePriceMode.FIXED
        ? randomFloat(250, 3500)
        : null;

      createdCapabilities.push(extraCapabilityRepo.create({
        carrierId,
        extraServiceId: service.id,
        loadType,
        isActive: true,
        priceMode,
        basePrice,
        notes: null,
      }));
    }
  }

  if (createdCapabilities.length > 0) {
    await extraCapabilityRepo.save(createdCapabilities);
  }
}
