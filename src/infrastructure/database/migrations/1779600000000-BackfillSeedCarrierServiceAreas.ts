import { MigrationInterface, QueryRunner } from 'typeorm';
import { CARRIER_COMPANIES } from '../../../database/seed/data/constants';
import { resolveSuggestedServiceAreas } from '../../../shared/serviceAreaSuggestions';

type SeedCarrierActivityRow = {
  id: string;
  companyName: string;
  activityId: string | null;
  city: string | null;
};

export class BackfillSeedCarrierServiceAreas1779600000000 implements MigrationInterface {
  name = 'BackfillSeedCarrierServiceAreas1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cityByCompany = new Map(
      CARRIER_COMPANIES.map((company) => [company.companyName, company.city]),
    );

    const carriers = await queryRunner.query(`
      SELECT
        \`c\`.\`id\` AS \`id\`,
        \`c\`.\`companyName\` AS \`companyName\`,
        \`a\`.\`id\` AS \`activityId\`,
        \`a\`.\`city\` AS \`city\`
      FROM \`carriers\` \`c\`
      LEFT JOIN \`carrier_activity\` \`a\` ON \`a\`.\`carrierId\` = \`c\`.\`id\`
    `) as SeedCarrierActivityRow[];

    for (const carrier of carriers) {
      const seedCity = cityByCompany.get(carrier.companyName);
      if (!seedCity) {
        continue;
      }

      const city = (carrier.city || seedCity).trim();
      const serviceAreas = resolveSuggestedServiceAreas(city);
      if (!city || serviceAreas.length === 0) {
        continue;
      }

      const serviceAreasJson = JSON.stringify(serviceAreas);

      if (carrier.activityId) {
        await queryRunner.query(
          `
          UPDATE \`carrier_activity\`
          SET
            \`city\` = CASE
              WHEN \`city\` IS NULL OR TRIM(\`city\`) = '' THEN ?
              ELSE \`city\`
            END,
            \`serviceAreasJson\` = ?
          WHERE \`id\` = ?
          `,
          [city, serviceAreasJson, carrier.activityId],
        );
      } else {
        await queryRunner.query(
          `
          INSERT INTO \`carrier_activity\` (
            \`id\`,
            \`carrierId\`,
            \`city\`,
            \`serviceAreasJson\`
          )
          VALUES (UUID(), ?, ?, ?)
          `,
          [carrier.id, city, serviceAreasJson],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible deterministic demo-data backfill migration.
  }
}
