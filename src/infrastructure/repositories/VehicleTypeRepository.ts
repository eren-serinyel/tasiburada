import { BaseRepository } from './BaseRepository';
import { VehicleType } from '../../domain/entities/VehicleType';

export class VehicleTypeRepository extends BaseRepository<VehicleType> {
  constructor() {
    super(VehicleType);
  }

  async findByIds(ids: string[]): Promise<VehicleType[]> {
    if (!ids.length) return [];
    return this.repository.createQueryBuilder('vt')
      .where('vt.id IN (:...ids)', { ids })
      .getMany();
  }

  async findByNames(names: string[]): Promise<VehicleType[]> {
    if (!names?.length) return [];
    return this.repository.createQueryBuilder('vt')
      .where('vt.name IN (:...names)', { names })
      .getMany();
  }

  async findAllActive(): Promise<VehicleType[]> {
    return this.repository.find({
      where: { status: 'ACTIVE' },
      order: { sortOrder: 'ASC' }
    });
  }
}
