/**
 * seedContract.ts
 * Silen Nakliyat (info@silenakliyat.com) fixture'ı için seed contract helper.
 * Shared DB testlerinde fixture drift'ini önlemek ve tespit etmek için kullanılır.
 */
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { CarrierLoadTypeCapability } from '../../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { CarrierDocument } from '../../domain/entities/CarrierDocument';
import { CarrierEarnings } from '../../domain/entities/CarrierEarnings';
import { ExtraService } from '../../domain/entities/ExtraService';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceLoadType';
import { CarrierVehicleType } from '../../domain/entities/CarrierVehicleType';
import { CarrierServiceType } from '../../domain/entities/CarrierServiceType';
import { VehicleType } from '../../domain/entities/VehicleType';
import { ServiceType } from '../../domain/entities/ServiceType';
import { In } from 'typeorm';

export const SILEN_BASELINE = {
  email: 'info@silenakliyat.com',
  companyName: 'Şile Nakliyat',
  verifiedByAdmin: true,
  approvalState: CarrierApprovalState.APPROVED,
  isActive: true,
  hasUploadedDocuments: true,
  requiredLoadTypes: [ExtraServiceLoadType.HOME],
  requiredExtraServiceNames: ['Asansörlü Taşıma', 'Beyaz Eşya Kurulumu'],
};

export interface SilenHealthCheck {
  healthy: boolean;
  issues: string[];
  carrier?: Carrier;
}

/**
 * DB'den Silen Nakliyat carrier'ını getir.
 */
export async function getSilenCarrier(): Promise<Carrier | null> {
  const repo = AppDataSource.getRepository(Carrier);
  return repo.findOne({
    where: { email: SILEN_BASELINE.email },
    relations: [
      'loadTypeCapabilities',
      'extraServiceCapabilities',
      'documents',
      'earnings',
    ],
  });
}

/**
 * Silen carrier'ının sağlık durumunu kontrol et.
 * Drift varsa issues array'inde detayları döndür.
 */
export async function assertSilenCarrierHealthy(): Promise<SilenHealthCheck> {
  const carrier = await getSilenCarrier();
  const issues: string[] = [];

  if (!carrier) {
    issues.push(`Carrier not found: ${SILEN_BASELINE.email}`);
    return { healthy: false, issues };
  }

  if (carrier.companyName !== SILEN_BASELINE.companyName) {
    issues.push(
      `companyName drift: expected "${SILEN_BASELINE.companyName}", got "${carrier.companyName}"`
    );
  }

  if (carrier.verifiedByAdmin !== SILEN_BASELINE.verifiedByAdmin) {
    issues.push(
      `verifiedByAdmin drift: expected ${SILEN_BASELINE.verifiedByAdmin}, got ${carrier.verifiedByAdmin}`
    );
  }

  if (carrier.approvalState !== SILEN_BASELINE.approvalState) {
    issues.push(
      `approvalState drift: expected ${SILEN_BASELINE.approvalState}, got ${carrier.approvalState}`
    );
  }

  if (carrier.isActive !== SILEN_BASELINE.isActive) {
    issues.push(
      `isActive drift: expected ${SILEN_BASELINE.isActive}, got ${carrier.isActive}`
    );
  }

  // LoadType capability kontrolü
  const hasHomeCapability = carrier.loadTypeCapabilities?.some(
    (cap) => cap.loadType === ExtraServiceLoadType.HOME && cap.isActive
  );
  if (!hasHomeCapability) {
    issues.push('Missing HOME loadType capability');
  }

  // Document kontrolü (en azından 1 approved doc olmalı elite tier için)
  const approvedDocs = carrier.documents?.filter((d) => d.isApproved).length ?? 0;
  if (approvedDocs === 0 && SILEN_BASELINE.hasUploadedDocuments) {
    issues.push('No approved documents found');
  }

  return {
    healthy: issues.length === 0,
    issues,
    carrier,
  };
}

/**
 * Jest assertion ile Silen'in sağlıklı olduğunu doğrula.
 * Test failure oluşturur drift varsa.
 */
export function expectSilenHealthy(check: SilenHealthCheck): void {
  if (!check.healthy) {
    throw new Error(
      `Silen carrier fixture drift detected:\n${check.issues.join('\n')}`
    );
  }
}

/**
 * Silen carrier'ını baseline state'e geri döndür.
 * Mutating test'lerin sonunda çağrılmalı.
 */
export async function restoreSilenCarrierBaseline(): Promise<void> {
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const loadTypeRepo = AppDataSource.getRepository(CarrierLoadTypeCapability);
  const extraServiceRepo = AppDataSource.getRepository(ExtraService);
  const extraServiceCapRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);
  const vehicleLinkRepo = AppDataSource.getRepository(CarrierVehicleType);
  const serviceLinkRepo = AppDataSource.getRepository(CarrierServiceType);
  const vehicleTypeRepo = AppDataSource.getRepository(VehicleType);
  const serviceTypeRepo = AppDataSource.getRepository(ServiceType);

  const carrier = await getSilenCarrier();
  if (!carrier) {
    console.warn('[seedContract] Silen carrier not found, cannot restore baseline');
    return;
  }

  // 1. Core carrier fields restore
  carrier.companyName = SILEN_BASELINE.companyName;
  carrier.verifiedByAdmin = SILEN_BASELINE.verifiedByAdmin;
  carrier.approvalState = SILEN_BASELINE.approvalState;
  carrier.isActive = SILEN_BASELINE.isActive;
  carrier.hasUploadedDocuments = SILEN_BASELINE.hasUploadedDocuments;
  carrier.pendingApproval = false;
  carrier.resubmissionCount = 0;
  carrier.lastRejectedAt = null;
  await carrierRepo.save(carrier);

  // Approval/profile kriterinin zorunlu araç ve hizmet seçimlerini restore et.
  if (await vehicleLinkRepo.count({ where: { carrierId: carrier.id } }) === 0) {
    const vehicleType = await vehicleTypeRepo.findOne({ where: { status: 'ACTIVE' } });
    if (vehicleType) {
      await vehicleLinkRepo.save(vehicleLinkRepo.create({
        carrierId: carrier.id,
        vehicleTypeId: vehicleType.id,
        capacityKg: vehicleType.defaultCapacityKg,
      }));
    }
  }
  if (await serviceLinkRepo.count({ where: { carrierId: carrier.id } }) === 0) {
    const serviceType = await serviceTypeRepo.findOne({ where: {} });
    if (serviceType) {
      await serviceLinkRepo.save(serviceLinkRepo.create({
        carrierId: carrier.id,
        serviceTypeId: serviceType.id,
      }));
    }
  }

  // 2. HOME loadType capability restore
  const existingHomeCap = await loadTypeRepo.findOne({
    where: { carrierId: carrier.id, loadType: ExtraServiceLoadType.HOME },
  });

  if (!existingHomeCap) {
    const homeCap = loadTypeRepo.create({
      carrierId: carrier.id,
      loadType: ExtraServiceLoadType.HOME,
      isActive: true,
    });
    await loadTypeRepo.save(homeCap);
  } else if (!existingHomeCap.isActive) {
    existingHomeCap.isActive = true;
    await loadTypeRepo.save(existingHomeCap);
  }

  // 3. Extra service capabilities restore (test tarafından silinmiş olabilir)
  const extraServices = await extraServiceRepo.find({
    where: { name: In(SILEN_BASELINE.requiredExtraServiceNames) },
  });

  for (const service of extraServices) {
    const existingCap = await extraServiceCapRepo.findOne({
      where: {
        carrierId: carrier.id,
        extraServiceId: service.id,
        loadType: ExtraServiceLoadType.HOME,
      },
    });

    if (!existingCap) {
      const newCap = extraServiceCapRepo.create({
        carrierId: carrier.id,
        extraServiceId: service.id,
        loadType: ExtraServiceLoadType.HOME,
        isActive: true,
      });
      await extraServiceCapRepo.save(newCap);
    } else if (!existingCap.isActive) {
      existingCap.isActive = true;
      await extraServiceCapRepo.save(existingCap);
    }
  }

  console.log('[seedContract] Silen carrier baseline restored');
}

/**
 * Test describe bloğu için beforeAll/afterAll helper.
 * Usage:
 *   describe('My Test', () => {
 *     withSilenGuard();
 *     ...
 *   });
 */
export function withSilenGuard(): void {
  let originalState: Partial<Carrier> | null = null;

  beforeAll(async () => {
    const carrier = await getSilenCarrier();
    if (carrier) {
      originalState = {
        companyName: carrier.companyName,
        verifiedByAdmin: carrier.verifiedByAdmin,
        approvalState: carrier.approvalState,
        isActive: carrier.isActive,
      };
    }
  });

  afterAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    await restoreSilenCarrierBaseline();
  });
}
