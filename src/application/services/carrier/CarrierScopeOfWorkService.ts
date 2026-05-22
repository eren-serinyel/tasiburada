import { CarrierScopeOfWorkRepository } from '../../../infrastructure/repositories/CarrierScopeOfWorkRepository';
import { ScopeOfWorkRepository } from '../../../infrastructure/repositories/ScopeOfWorkRepository';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';
import { ScopeOfWork } from '../../../domain/entities/ScopeOfWork';

export class CarrierScopeOfWorkService {
    private linkRepository = new CarrierScopeOfWorkRepository();
    private scopeRepository = new ScopeOfWorkRepository();
    private profileStatusService = new CarrierProfileStatusService();
    private readonly requiredMessage = 'En az bir çalışma kapsamı seçmelisiniz.';
    private readonly allowedScopeNames = new Set(['Şehir İçi', 'Şehirler Arası']);

    async replaceSelectedTypes(carrierId: string, scopeIds: string[]): Promise<void> {
        const uniqueIds = Array.from(new Set(scopeIds ?? []));
        if (!uniqueIds.length) {
            throw new Error(this.requiredMessage);
        }

        const scopes = await this.scopeRepository.findByIds(uniqueIds);
        if (scopes.length !== uniqueIds.length) {
            throw new Error('Geçerli bir çalışma kapsamı seçmelisiniz.');
        }
        this.assertAllowedScopes(scopes);
        await this.persistSelections(carrierId, scopes);
    }

    async replaceSelectedTypeNames(carrierId: string, scopeNames: string[]): Promise<void> {
        const names = (scopeNames ?? []).map(name => String(name).trim()).filter(Boolean);
        if (!names.length) {
            throw new Error(this.requiredMessage);
        }

        const unsupported = names.filter(name => !this.allowedScopeNames.has(name));
        if (unsupported.length) {
            throw new Error('Desteklenmeyen çalışma kapsamı seçilemez.');
        }

        const scopes = await this.scopeRepository.ensureByNames(names);
        await this.persistSelections(carrierId, scopes);
    }

    async listSelectedTypes(carrierId: string) {
        return this.linkRepository.findByCarrierId(carrierId);
    }

    private async persistSelections(carrierId: string, scopes: ScopeOfWork[]): Promise<void> {
        if (!scopes.length) {
            throw new Error(this.requiredMessage);
        }

        await this.linkRepository.deleteByCarrierId(carrierId);

        await this.linkRepository.saveAll(scopes.map(scope => ({
            carrierId,
            scopeId: scope.id
        })));

        // await this.profileStatusService.syncVehiclesCompletion(carrierId); // May need a separate completion check
    }

    private assertAllowedScopes(scopes: ScopeOfWork[]): void {
        const hasUnsupported = scopes.some(scope => !this.allowedScopeNames.has(scope.name));
        if (hasUnsupported) {
            throw new Error('Desteklenmeyen çalışma kapsamı seçilemez.');
        }
    }
}
