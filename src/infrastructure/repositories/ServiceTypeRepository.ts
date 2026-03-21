import { BaseRepository } from './BaseRepository';
import { ServiceType } from '../../domain/entities/ServiceType';

export class ServiceTypeRepository extends BaseRepository<ServiceType> {
  constructor() {
    super(ServiceType);
  }

  async findByIds(ids: string[]): Promise<ServiceType[]> {
    if (!ids.length) return [];
    return this.repository.createQueryBuilder('st')
      .where('st.id IN (:...ids)', { ids })
      .getMany();
  }

  async findByNames(names: string[]): Promise<ServiceType[]> {
    if (!names?.length) return [];
    return this.repository.createQueryBuilder('st')
      .where('st.name IN (:...names)', { names })
      .getMany();
  }

  async ensureByNames(names: string[]): Promise<ServiceType[]> {
    const normalized = (names ?? []).map(name => String(name).trim()).filter(Boolean);
    if (!normalized.length) {
      return [];
    }

    const existing = await this.findByNames(normalized);
    const existingNames = new Set(existing.map(type => type.name));
    const missing = normalized.filter(name => !existingNames.has(name));

    if (missing.length) {
      const newEntities = missing.map(name => this.repository.create({ name }));
      const saved = await this.repository.save(newEntities);
      existing.push(...saved);
    }

    return existing;
  }
}
