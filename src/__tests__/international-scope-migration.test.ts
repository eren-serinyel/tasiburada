import { DeprecateInternationalScopeOfWork1778800000000 } from '../infrastructure/database/migrations/1778800000000-DeprecateInternationalScopeOfWork';

describe('DeprecateInternationalScopeOfWork migration', () => {
  test('backfills intercity before deprecating international scope', async () => {
    const migration = new DeprecateInternationalScopeOfWork1778800000000();
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [];
        return [];
      }),
    } as any;

    await migration.up(queryRunner);

    const backfillIndex = queries.findIndex((sql) => sql.includes('INSERT INTO `carrier_scope_of_work`'));
    const deprecateIndex = queries.findIndex((sql) => sql.includes("SET `status` = 'DEPRECATED'"));

    expect(queries.some((sql) => sql.includes('ADD `status` enum'))).toBe(true);
    expect(backfillIndex).toBeGreaterThan(-1);
    expect(deprecateIndex).toBeGreaterThan(-1);
    expect(backfillIndex).toBeLessThan(deprecateIndex);
  });
});
