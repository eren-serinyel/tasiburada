import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { BackfillSeedCarrierActivity1779500000000 } from '../infrastructure/database/migrations/1779500000000-BackfillSeedCarrierActivity';
import { CARRIER_COMPANIES } from '../database/seed/data/constants';

function normalizeJson(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

describe('BackfillSeedCarrierActivity migration', () => {
  test('backfills only seed carrier activity data and leaves non-seed carriers empty', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const migration = new BackfillSeedCarrierActivity1779500000000();
      const suffix = Date.now();
      const missingActivitySeed = CARRIER_COMPANIES[0];
      const blankCitySeed = CARRIER_COMPANIES[1];

      const makeCarrier = async (params: {
        id: string;
        companyName: string;
        taxNumber: string;
        email: string;
      }) => {
        await queryRunner.query(
          `
          INSERT INTO carriers (
            id, companyName, taxNumber, phone, email, passwordHash, foundedYear
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            params.id,
            params.companyName,
            params.taxNumber,
            '05000000000',
            params.email,
            'hash',
            2010,
          ],
        );
      };

      const missingActivitySeedId = randomUUID();
      const blankCitySeedId = randomUUID();
      const nonSeedId = randomUUID();
      const blankCityActivityId = randomUUID();

      await makeCarrier({
        id: missingActivitySeedId,
        companyName: missingActivitySeed.companyName,
        taxNumber: `ACT${suffix}001`,
        email: `activity-seed-missing-${suffix}@tasiburada.test`,
      });
      await makeCarrier({
        id: blankCitySeedId,
        companyName: blankCitySeed.companyName,
        taxNumber: `ACT${suffix}002`,
        email: `activity-seed-blank-${suffix}@tasiburada.test`,
      });
      await makeCarrier({
        id: nonSeedId,
        companyName: `Real Carrier ${suffix}`,
        taxNumber: `ACT${suffix}003`,
        email: `activity-real-${suffix}@tasiburada.test`,
      });

      await queryRunner.query(
        `
        INSERT INTO carrier_activity (id, carrierId, city, serviceAreasJson)
        VALUES (?, ?, '', JSON_ARRAY('Existing Area'))
        `,
        [blankCityActivityId, blankCitySeedId],
      );

      await migration.up(queryRunner);

      const rows = await queryRunner.query(
        `
        SELECT c.id, a.city, a.serviceAreasJson
        FROM carriers c
        LEFT JOIN carrier_activity a ON a.carrierId = c.id
        WHERE c.id IN (?, ?, ?)
        `,
        [missingActivitySeedId, blankCitySeedId, nonSeedId],
      ) as Array<{ id: string; city: string | null; serviceAreasJson: unknown }>;

      const byId = new Map(rows.map((row) => [row.id, row]));

      expect(byId.get(missingActivitySeedId)?.city).toBe(missingActivitySeed.city);
      expect(normalizeJson(byId.get(missingActivitySeedId)?.serviceAreasJson)).toEqual([
        missingActivitySeed.city,
      ]);

      expect(byId.get(blankCitySeedId)?.city).toBe(blankCitySeed.city);
      expect(normalizeJson(byId.get(blankCitySeedId)?.serviceAreasJson)).toEqual([
        'Existing Area',
      ]);

      expect(byId.get(nonSeedId)?.city).toBeNull();
      expect(byId.get(nonSeedId)?.serviceAreasJson).toBeNull();
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
