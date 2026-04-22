import { AppDataSource } from '../../../infrastructure/database/data-source';
import { ConverterItemCatalog } from '../../../domain/entities/ConverterItemCatalog';
import { ConverterVehicleRule } from '../../../domain/entities/ConverterVehicleRule';
import { CONVERTER_ITEM_CATALOG_V1, CONVERTER_VEHICLE_RULES_V1 } from '../data/converterData';

export async function seedConverterCatalog() {
  const repo = AppDataSource.getRepository(ConverterItemCatalog);

  for (const item of CONVERTER_ITEM_CATALOG_V1) {
    const existing = await repo.findOne({ where: { itemCode: item.itemCode } });
    if (!existing) {
      await repo.save(repo.create(item));
      continue;
    }

    existing.label = item.label;
    existing.category = item.category;
    existing.unitVolumeMin = item.unitVolumeMin;
    existing.unitVolumeMax = item.unitVolumeMax;
    existing.isSpecial = item.isSpecial;
    existing.isActive = item.isActive;
    existing.sortOrder = item.sortOrder;
    await repo.save(existing);
  }

  console.log(`  ✓ ${CONVERTER_ITEM_CATALOG_V1.length} converter item catalog kaydi`);
}

export async function seedConverterVehicleRules() {
  const repo = AppDataSource.getRepository(ConverterVehicleRule);

  for (const rule of CONVERTER_VEHICLE_RULES_V1) {
    const existing = await repo.findOne({ where: { vehicleCode: rule.vehicleCode } });
    if (!existing) {
      await repo.save(repo.create(rule));
      continue;
    }

    existing.label = rule.label;
    existing.volumeMin = rule.volumeMin;
    existing.volumeMax = rule.volumeMax;
    existing.priority = rule.priority;
    existing.specialItemOverride = rule.specialItemOverride;
    existing.nearThresholdOverride = rule.nearThresholdOverride;
    existing.isActive = rule.isActive;
    await repo.save(existing);
  }

  console.log(`  ✓ ${CONVERTER_VEHICLE_RULES_V1.length} converter arac esigi kaydi`);
}
