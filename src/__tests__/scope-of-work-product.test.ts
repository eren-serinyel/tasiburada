import request from 'supertest';
import { testApp } from './helpers/testApp';
import { SCOPE_OF_WORKS } from '../database/seed/data/constants';
import { ScopeOfWork } from '../domain/entities/ScopeOfWork';
import { AppDataSource } from '../infrastructure/database/data-source';

const BASE = '/api/v1';
const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Product scope of work contract', () => {
  beforeAll(async () => {
    if (skipDB() || !AppDataSource.isInitialized) return;

    const repo = AppDataSource.getRepository(ScopeOfWork);
    const desiredScopes: Array<Pick<ScopeOfWork, 'name' | 'status'>> = [
      { name: 'Şehir İçi', status: 'ACTIVE' },
      { name: 'Şehirler Arası', status: 'ACTIVE' },
      { name: 'Uluslararası', status: 'DEPRECATED' },
    ];

    for (const desired of desiredScopes) {
      const existing = await repo.findOne({ where: { name: desired.name } });
      if (existing) {
        existing.status = desired.status;
        await repo.save(existing);
      } else {
        await repo.save(repo.create(desired));
      }
    }
  });

  test('new seed data only creates active product scopes', () => {
    expect(SCOPE_OF_WORKS).toEqual(['Şehir İçi', 'Şehirler Arası']);
    expect(SCOPE_OF_WORKS).not.toContain('Uluslararası');
  });

  test('scope lookup API exposes only active product scopes', async () => {
    if (skipDB()) return;

    const res = await request(testApp).get(`${BASE}/scope-of-works`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const names = (res.body.data || []).map((scope: ScopeOfWork) => scope.name);
    expect(names).toEqual(['Şehir İçi', 'Şehirler Arası']);
    expect(names).not.toContain('Uluslararası');
  });
});
