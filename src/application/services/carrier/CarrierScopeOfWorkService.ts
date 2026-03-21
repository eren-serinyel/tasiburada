import { CarrierScopeOfWorkRepository } from '../../../infrastructure/repositories/CarrierScopeOfWorkRepository';
import { ScopeOfWorkRepository } from '../../../infrastructure/repositories/ScopeOfWorkRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { ScopeOfWork } from '../../../domain/entities/ScopeOfWork';

export class CarrierScopeOfWorkService {
    private linkRepository = new CarrierScopeOfWorkRepository();
    private scopeRepository = new ScopeOfWorkRepository();
    private profileStatusService = new CarrierProfileStatusService();

    async replaceSelectedTypes(carrierId: string, scopeIds: string[]): Promise<void> {
        const uniqueIds = Array.from(new Set(scopeIds ?? []));
        const scopes = await this.scopeRepository.findByIds(uniqueIds);
        await this.persistSelections(carrierId, scopes);
    }

    async replaceSelectedTypeNames(carrierId: string, scopeNames: string[]): Promise<void> {
        const names = (scopeNames ?? []).map(name => String(name).trim()).filter(Boolean);
        const scopes = await this.scopeRepository.ensureByNames(names);
        await this.persistSelections(carrierId, scopes);
    }

    async listSelectedTypes(carrierId: string) {
        return this.linkRepository.findByCarrierId(carrierId);
    }

    private async persistSelections(carrierId: string, scopes: ScopeOfWork[]): Promise<void> {
        await this.linkRepository.deleteByCarrierId(carrierId);

        if (!scopes.length) {
            // await this.profileStatusService.syncVehiclesCompletion(carrierId); // May need a separate completion check
            return;
        }

        await this.linkRepository.saveAll(scopes.map(scope => ({
            carrierId,
            scopeId: scope.id
        })));

        // await this.profileStatusService.syncVehiclesCompletion(carrierId); // May need a separate completion check
    }
}
