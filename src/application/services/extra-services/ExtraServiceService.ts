import { AppDataSource } from '../../../infrastructure/database/data-source';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceApplicability, ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';

export class ExtraServiceService {
  private extraServiceRepo = AppDataSource.getRepository(ExtraService);
  private applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);

  async listActiveExtraServices(loadType?: ExtraServiceLoadType | null) {
    const qb = this.extraServiceRepo
      .createQueryBuilder('extraService')
      .innerJoinAndSelect('extraService.applicabilityRules', 'applicability')
      .where('extraService.status = :status', { status: 'ACTIVE' });

    if (loadType) {
      qb.andWhere('applicability.loadType = :loadType', { loadType });
    }

    qb.orderBy('applicability.sortOrder', 'ASC')
      .addOrderBy('extraService.sortOrder', 'ASC')
      .addOrderBy('extraService.name', 'ASC');

    const services = await qb.getMany();

    return services.flatMap((service) =>
      service.applicabilityRules
        .filter((rule) => !loadType || rule.loadType === loadType)
        .map((rule) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          status: service.status,
          loadType: rule.loadType,
          isDefaultVisible: rule.isDefaultVisible,
          isRecommendedByConverter: rule.isRecommendedByConverter,
          sortOrder: rule.sortOrder,
        })),
    );
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
