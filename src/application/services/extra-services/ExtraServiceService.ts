import { AppDataSource } from '../../../infrastructure/database/data-source';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceApplicability, ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';

export class ExtraServiceService {
  private extraServiceRepo = AppDataSource.getRepository(ExtraService);
  private applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);

  async listActiveExtraServices(loadType?: ExtraServiceLoadType | null) {
    const qb = this.extraServiceRepo
      .createQueryBuilder('extraService')
      .innerJoin('extraService.applicabilityRules', 'applicability')
      .select('extraService.id', 'id')
      .addSelect('extraService.name', 'name')
      .addSelect('extraService.description', 'description')
      .addSelect('extraService.status', 'status')
      .addSelect('applicability.loadType', 'loadType')
      .addSelect('applicability.isDefaultVisible', 'isDefaultVisible')
      .addSelect('applicability.isRecommendedByConverter', 'isRecommendedByConverter')
      .addSelect('applicability.sortOrder', 'sortOrder')
      .where('extraService.status = :status', { status: 'ACTIVE' });

    if (loadType) {
      qb.andWhere('applicability.loadType = :loadType', { loadType });
    }

    qb.orderBy('applicability.sortOrder', 'ASC')
      .addOrderBy('extraService.sortOrder', 'ASC')
      .addOrderBy('extraService.name', 'ASC');

    const rows = await qb.getRawMany<{
      id: string;
      name: string;
      description: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      loadType: ExtraServiceLoadType;
      isDefaultVisible: boolean | number | string;
      isRecommendedByConverter: boolean | number | string;
      sortOrder: number | string;
    }>();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      loadType: row.loadType,
      isDefaultVisible: Boolean(Number(row.isDefaultVisible)),
      isRecommendedByConverter: Boolean(Number(row.isRecommendedByConverter)),
      sortOrder: Number(row.sortOrder),
    }));
  }

  async upsertApplicability(extraServiceId: string, payload: Omit<ExtraServiceApplicability, 'id' | 'createdAt' | 'updatedAt' | 'extraService' | 'extraServiceId'> & { loadType: ExtraServiceLoadType }) {
    let record = await this.applicabilityRepo.findOne({ where: { extraServiceId, loadType: payload.loadType } });
    if (!record) {
      record = this.applicabilityRepo.create({
        extraServiceId,
        loadType: payload.loadType,
      });
    }

    record.isDefaultVisible = payload.isDefaultVisible;
    record.isRecommendedByConverter = payload.isRecommendedByConverter;
    record.sortOrder = payload.sortOrder;
    return this.applicabilityRepo.save(record);
  }
}
