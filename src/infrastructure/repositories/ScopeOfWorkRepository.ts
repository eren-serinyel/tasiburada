import { BaseRepository } from './BaseRepository';
import { ScopeOfWork } from '../../domain/entities/ScopeOfWork';
import { In } from 'typeorm';

export class ScopeOfWorkRepository extends BaseRepository<ScopeOfWork> {
    constructor() {
        super(ScopeOfWork);
    }

    async findByIds(ids: string[]): Promise<ScopeOfWork[]> {
        if (!ids.length) return [];
        return this.repository.find({
            where: { id: In(ids) }
        });
    }

    async ensureByNames(names: string[]): Promise<ScopeOfWork[]> {
        if (!names.length) return [];
        const existing = await this.repository.find({
            where: { name: In(names) }
        });

        const existingNames = new Set(existing.map(s => s.name));
        const missingNames = names.filter(name => !existingNames.has(name));

        const newScopes: ScopeOfWork[] = [];
        for (const name of missingNames) {
            const scope = await this.repository.save({ name } as ScopeOfWork); // Assuming just name is needed
            newScopes.push(scope);
        }

        return [...existing, ...newScopes];
    }
    
    async findAll(): Promise<ScopeOfWork[]> {
        return this.repository.find();
    }
}
