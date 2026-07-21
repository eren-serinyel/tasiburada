import { SeedDataSource as AppDataSource } from '../seedDataSource';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceApplicability } from '../../../domain/entities/ExtraServiceApplicability';
import {
  EXTRA_SERVICE_APPLICABILITY_SEED,
  EXTRA_SERVICE_CATALOG_MANIFEST,
} from '../../../application/services/extra-services/extraServiceApplicability';

export async function seedExtraServices(): Promise<Map<string, string>> {
  const extraRepo = AppDataSource.getRepository(ExtraService);
  const applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);
  const extraServiceMap = new Map<string, string>();
  const extraServiceIdByCode = new Map<string, string>();

  for (const entry of EXTRA_SERVICE_CATALOG_MANIFEST) {
    let existing = await extraRepo.findOne({ where: { code: entry.code } });
    if (!existing) {
      existing = await extraRepo.save(extraRepo.create({
        code: entry.code,
        name: entry.name,
        description: entry.description,
        status: entry.status,
        sortOrder: entry.sortOrder,
      }));
    } else if (
      existing.name !== entry.name ||
      existing.status !== entry.status ||
      existing.sortOrder !== entry.sortOrder
    ) {
      existing.name = entry.name;
      existing.status = entry.status;
      existing.sortOrder = entry.sortOrder;
      existing = await extraRepo.save(existing);
    }

    extraServiceMap.set(entry.name, existing.id);
    extraServiceIdByCode.set(entry.code, existing.id);
  }

  for (const rule of EXTRA_SERVICE_APPLICABILITY_SEED) {
    const extraServiceId = extraServiceIdByCode.get(rule.code);
    if (!extraServiceId) {
      throw new Error(`Extra service seed invariant failed: missing code ${rule.code}`);
    }

    let existingRule = await applicabilityRepo.findOne({
      where: { extraServiceId, loadType: rule.loadType },
    });

    if (!existingRule) {
      existingRule = applicabilityRepo.create({
        extraServiceId,
        loadType: rule.loadType,
      });
    }

    existingRule.isDefaultVisible = rule.isDefaultVisible;
    existingRule.isRecommendedByConverter = rule.isRecommendedByConverter;
    existingRule.sortOrder = rule.sortOrder;
    await applicabilityRepo.save(existingRule);
  }

  return extraServiceMap;
}
