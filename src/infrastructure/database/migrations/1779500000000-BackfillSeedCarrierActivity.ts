import { MigrationInterface, QueryRunner } from 'typeorm';
import { CARRIER_COMPANIES } from '../../../database/seed/data/constants';

type MissingCarrierActivityRow = {
  id: string;
  companyName: string;
  activityId: string | null;
};

export class BackfillSeedCarrierActivity1779500000000 implements MigrationInterface {
  name = 'BackfillSeedCarrierActivity1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cityByCompany = new Map(
      CARRIER_COMPANIES.map((company) => [company.companyName, company.city]),
    );

    const carriers = await queryRunner.query(`
      SELECT
        \`c\`.\`id\` AS \`id\`,
        \`c\`.\`companyName\` AS \`companyName\`,
        \`a\`.\`id\` AS \`activityId\`
      FROM \`carriers\` \`c\`
      LEFT JOIN \`carrier_activity\` \`a\` ON \`a\`.\`carrierId\` = \`c\`.\`id\`
      WHERE \`a\`.\`id\` IS NULL
        OR \`a\`.\`city\` IS NULL
        OR TRIM(\`a\`.\`city\`) = ''
    `) as MissingCarrierActivityRow[];

    for (const carrier of carriers) {
      const seedCity = cityByCompany.get(carrier.companyName);
      if (!seedCity) {
        continue;
      }

      const serviceAreasJson = JSON.stringify([seedCity]);

      if (carrier.activityId) {
        await queryRunner.query(
          `
          UPDATE \`carrier_activity\`
          SET
            \`city\` = ?,
            \`serviceAreasJson\` = CASE
              WHEN \`serviceAreasJson\` IS NULL
                OR JSON_TYPE(\`serviceAreasJson\`) = 'NULL'
                OR JSON_LENGTH(\`serviceAreasJson\`) = 0
              THEN ?
              ELSE \`serviceAreasJson\`
            END
          WHERE \`id\` = ?
            AND (\`city\` IS NULL OR TRIM(\`city\`) = '')
          `,
          [seedCity, serviceAreasJson, carrier.activityId],
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
          [carrier.id, seedCity, serviceAreasJson],
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data backfill migration.
  }
}
