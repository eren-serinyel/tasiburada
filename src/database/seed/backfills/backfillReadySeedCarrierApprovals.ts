import 'reflect-metadata';
import { In } from 'typeorm';
import { Carrier, CarrierApprovalState } from '../../../domain/entities/Carrier';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import {
  AppDataSource,
  closeDatabase,
  initializeDatabase,
} from '../../../infrastructure/database/data-source';
import { assertSafeSeedDatabase } from '../../../infrastructure/database/seedSafety';
import {
  calculateApprovalProfilePercentage,
  computeCarrierApprovalReadiness,
} from '../../../application/services/carrier/CarrierApprovalCriteria';
import { CARRIER_COMPANIES } from '../data/constants';

export interface ReadySeedCarrierBackfillResult {
  matchedSeedCarriers: number;
  readyCarriers: number;
  approvedCarriersChanged: number;
  inconsistentUnreadyCarriersCleared: number;
}

export async function backfillReadySeedCarrierApprovals(): Promise<ReadySeedCarrierBackfillResult> {
  const carrierRepository = AppDataSource.getRepository(Carrier);
  const profileStatusRepository = AppDataSource.getRepository(CarrierProfileStatus);
  const companyNames = CARRIER_COMPANIES.map((company) => company.companyName);
  const carriers = await carrierRepository.find({
    where: { companyName: In(companyNames) },
    relations: ['activity', 'documents', 'vehicleTypeLinks', 'serviceTypeLinks', 'earnings'],
  });

  let readyCarriers = 0;
  let approvedCarriersChanged = 0;
  let inconsistentUnreadyCarriersCleared = 0;

  for (const carrier of carriers) {
    const readiness = computeCarrierApprovalReadiness(carrier);
    const existingStatus = await profileStatusRepository.findOne({ where: { carrierId: carrier.id } });
    await profileStatusRepository.save(profileStatusRepository.create({
      ...(existingStatus ?? {}),
      carrierId: carrier.id,
      ...readiness.sections,
      overallPercentage: calculateApprovalProfilePercentage(readiness.sections),
    }));

    if (readiness.isReadyForSubmission) {
      readyCarriers += 1;
      if (!carrier.verifiedByAdmin || carrier.approvalState !== CarrierApprovalState.APPROVED) {
        approvedCarriersChanged += 1;
        await carrierRepository.update(carrier.id, {
          verifiedByAdmin: true,
          approvalState: CarrierApprovalState.APPROVED,
          pendingApproval: false,
          isActive: true,
          approvalReadinessCached: true,
          approvalReadinessComputedAt: new Date(),
        });
      }
      continue;
    }

    if (
      carrier.verifiedByAdmin &&
      [CarrierApprovalState.DRAFT, CarrierApprovalState.APPROVED].includes(carrier.approvalState)
    ) {
      inconsistentUnreadyCarriersCleared += 1;
      await carrierRepository.update(carrier.id, {
        verifiedByAdmin: false,
        approvalState: CarrierApprovalState.DRAFT,
        pendingApproval: false,
        approvalReadinessCached: false,
        approvalReadinessComputedAt: new Date(),
      });
    }
  }

  return {
    matchedSeedCarriers: carriers.length,
    readyCarriers,
    approvedCarriersChanged,
    inconsistentUnreadyCarriersCleared,
  };
}

async function main(): Promise<void> {
  assertSafeSeedDatabase(process.env, 'seed');
  await initializeDatabase();
  try {
    const result = await backfillReadySeedCarrierApprovals();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
