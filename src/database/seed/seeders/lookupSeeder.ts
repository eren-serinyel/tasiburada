import { AppDataSource } from '../../../infrastructure/database/data-source';
import { VehicleType } from '../../../domain/entities/VehicleType';
import { ServiceType } from '../../../domain/entities/ServiceType';
import { ScopeOfWork } from '../../../domain/entities/ScopeOfWork';
import { VEHICLE_TYPES, SERVICE_TYPES, SCOPE_OF_WORKS } from '../data/constants';

/**
 * Lookup tablolarını seed'ler: VehicleType, ServiceType, ScopeOfWork.
 * ID'ler UUID olarak otomatik üretilir.
 * Dönen map'ler, diğer seeder'ların bu kayıtlara referans vermesi için kullanılır.
 */
export async function seedLookupTables() {
  const vtRepo = AppDataSource.getRepository(VehicleType);
  const stRepo = AppDataSource.getRepository(ServiceType);
  const sowRepo = AppDataSource.getRepository(ScopeOfWork);

  // ── Vehicle Types ──
  const vehicleTypeMap: Record<string, VehicleType> = {};
  for (const vt of VEHICLE_TYPES) {
    let existing = await vtRepo.findOne({ where: { name: vt.name } });
    if (!existing) {
      existing = await vtRepo.save(vtRepo.create({
        name: vt.name,
        defaultCapacityKg: vt.defaultCapacityKg,
        defaultCapacityM3: vt.defaultCapacityM3,
      }));
    }
    vehicleTypeMap[vt.name] = existing;
  }
  console.log(`  ✓ ${VEHICLE_TYPES.length} araç tipi`);

  // ── Service Types ──
  const serviceTypeMap: Record<string, ServiceType> = {};
  for (const name of SERVICE_TYPES) {
    let existing = await stRepo.findOne({ where: { name } });
    if (!existing) {
      existing = await stRepo.save(stRepo.create({ name }));
    }
    serviceTypeMap[name] = existing;
  }
  console.log(`  ✓ ${SERVICE_TYPES.length} hizmet tipi`);

  // ── Scope of Work ──
  const scopeMap: Record<string, ScopeOfWork> = {};
  for (const name of SCOPE_OF_WORKS) {
    let existing = await sowRepo.findOne({ where: { name } });
    if (!existing) {
      existing = await sowRepo.save(sowRepo.create({ name }));
    }
    scopeMap[name] = existing;
  }
  console.log(`  ✓ ${SCOPE_OF_WORKS.length} faaliyet alanı`);

  return { vehicleTypeMap, serviceTypeMap, scopeMap };
}
