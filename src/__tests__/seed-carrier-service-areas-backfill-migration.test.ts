import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { BackfillSeedCarrierServiceAreas1779600000000 } from '../infrastructure/database/migrations/1779600000000-BackfillSeedCarrierServiceAreas';
import { CARRIER_COMPANIES } from '../database/seed/data/constants';
import { resolveSuggestedServiceAreas } from '../shared/serviceAreaSuggestions';

function normalizeJson(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

describe('BackfillSeedCarrierServiceAreas migration', () => {
  test('sets deterministic nearby service areas for seed carriers only', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const migration = new BackfillSeedCarrierServiceAreas1779600000000();
      const suffix = Date.now();
      const seedCompany = CARRIER_COMPANIES.find(company => company.city === 'Antalya') ?? CARRIER_COMPANIES[0];

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

      const seedId = randomUUID();
      const nonSeedId = randomUUID();

      await makeCarrier({
        id: seedId,
        companyName: seedCompany.companyName,
        taxNumber: `AREA${suffix}001`,
        email: `area-seed-${suffix}@tasiburada.test`,
      });
      await makeCarrier({
        id: nonSeedId,
        companyName: `Real Service Area Carrier ${suffix}`,
        taxNumber: `AREA${suffix}002`,
        email: `area-real-${suffix}@tasiburada.test`,
      });

      await queryRunner.query(
        `
        INSERT INTO carrier_activity (id, carrierId, city, serviceAreasJson)
        VALUES (?, ?, ?, JSON_ARRAY())
        `,
        [randomUUID(), seedId, seedCompany.city],
      );
      await queryRunner.query(
        `
        INSERT INTO carrier_activity (id, carrierId, city, serviceAreasJson)
        VALUES (?, ?, ?, JSON_ARRAY())
        `,
        [randomUUID(), nonSeedId, seedCompany.city],
      );

      await migration.up(queryRunner);

      const rows = await queryRunner.query(
        `
        SELECT c.id, a.serviceAreasJson
        FROM carriers c
        LEFT JOIN carrier_activity a ON a.carrierId = c.id
        WHERE c.id IN (?, ?)
        `,
        [seedId, nonSeedId],
      ) as Array<{ id: string; serviceAreasJson: unknown }>;

      const byId = new Map(rows.map((row) => [row.id, row]));

      expect(normalizeJson(byId.get(seedId)?.serviceAreasJson)).toEqual(
        resolveSuggestedServiceAreas(seedCompany.city),
      );
      expect(normalizeJson(byId.get(nonSeedId)?.serviceAreasJson)).toEqual([]);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
