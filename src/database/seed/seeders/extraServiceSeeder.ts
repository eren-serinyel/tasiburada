import { SeedDataSource as AppDataSource } from '../seedDataSource';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceApplicability } from '../../../domain/entities/ExtraServiceApplicability';
import {
  EXTRA_SERVICE_APPLICABILITY_SEED,
  EXTRA_SERVICE_CATALOG,
} from '../../../application/services/extra-services/extraServiceApplicability';

export async function seedExtraServices(): Promise<Map<string, string>> {
  const extraRepo = AppDataSource.getRepository(ExtraService);
  const applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);
  const extraServiceMap = new Map<string, string>();

  for (const [index, name] of EXTRA_SERVICE_CATALOG.entries()) {
    let existing = await extraRepo.findOne({ where: { name } });
    if (!existing) {
      existing = await extraRepo.save(extraRepo.create({
        name,
        description: null,
        status: 'ACTIVE',
        sortOrder: index + 1,
      }));
    } else if (existing.status !== 'ACTIVE' || existing.sortOrder !== index + 1) {
      existing.status = 'ACTIVE';
      existing.sortOrder = index + 1;
      existing = await extraRepo.save(existing);
    }

    extraServiceMap.set(name, existing.id);
  }

  for (const rule of EXTRA_SERVICE_APPLICABILITY_SEED) {
    const extraServiceId = extraServiceMap.get(rule.name);
    if (!extraServiceId) continue;

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
