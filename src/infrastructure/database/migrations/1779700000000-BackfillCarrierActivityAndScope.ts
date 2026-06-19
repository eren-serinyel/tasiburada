import { MigrationInterface, QueryRunner } from 'typeorm';
import { CARRIER_COMPANIES } from '../../../database/seed/data/constants';
import { PRODUCT_SCOPE_OF_WORK_NAMES } from '../../repositories/ScopeOfWorkRepository';

type MissingCarrierActivityRow = {
  id: string;
  companyName: string;
  activityId: string | null;
};

type ScopeRow = {
  id: string;
};

export class BackfillCarrierActivityAndScope1779700000000 implements MigrationInterface {
  name = 'BackfillCarrierActivityAndScope1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.backfillSeedCarrierActivity(queryRunner);
    await this.backfillMissingCarrierScopes(queryRunner);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data backfill migration.
  }

  private async backfillSeedCarrierActivity(queryRunner: QueryRunner): Promise<void> {
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

  private async backfillMissingCarrierScopes(queryRunner: QueryRunner): Promise<void> {
    const intercityScopeName = PRODUCT_SCOPE_OF_WORK_NAMES[1];
    let intercityScopes = await queryRunner.query(
      `
      SELECT \`id\`
      FROM \`scope_of_work\`
      WHERE \`name\` = ?
      LIMIT 1
      `,
      [intercityScopeName],
    ) as ScopeRow[];

    if (!intercityScopes.length) {
      await queryRunner.query(
        `
        INSERT INTO \`scope_of_work\` (\`id\`, \`name\`, \`status\`)
        VALUES (UUID(), ?, 'ACTIVE')
        `,
        [intercityScopeName],
      );
      intercityScopes = await queryRunner.query(
        `
        SELECT \`id\`
        FROM \`scope_of_work\`
        WHERE \`name\` = ?
        LIMIT 1
        `,
        [intercityScopeName],
      ) as ScopeRow[];
    }

    const intercityScopeId = intercityScopes[0]?.id;
    if (!intercityScopeId) {
      return;
    }

    await queryRunner.query(
      `
      INSERT IGNORE INTO \`carrier_scope_of_work\` (
        \`id\`,
        \`carrierId\`,
        \`scopeId\`
      )
      SELECT UUID(), \`c\`.\`id\`, ?
      FROM \`carriers\` \`c\`
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`carrier_scope_of_work\` \`existing_scope\`
        WHERE \`existing_scope\`.\`carrierId\` = \`c\`.\`id\`
      )
      `,
      [intercityScopeId],
    );
  }
}
