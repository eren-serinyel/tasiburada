import { BaseRepository } from './BaseRepository';
import { CarrierScopeOfWork } from '../../domain/entities/CarrierScopeOfWork';

export class CarrierScopeOfWorkRepository extends BaseRepository<CarrierScopeOfWork> {
    constructor() {
        super(CarrierScopeOfWork);
    }

    async findByCarrierId(carrierId: string): Promise<CarrierScopeOfWork[]> {
        return this.repository.find({
            where: { carrierId },
            relations: ['scope']
        });
    }

    async deleteByCarrierId(carrierId: string): Promise<void> {
        await this.repository.delete({ carrierId });
    }

    async saveAll(links: Partial<CarrierScopeOfWork>[]): Promise<CarrierScopeOfWork[]> {
        return this.repository.save(links);
    }
}
