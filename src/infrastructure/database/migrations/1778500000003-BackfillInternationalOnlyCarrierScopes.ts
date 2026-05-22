import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillInternationalOnlyCarrierScopes1778500000003 implements MigrationInterface {
  name = 'BackfillInternationalOnlyCarrierScopes1778500000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`carrier_scope_of_work\` (\`id\`, \`carrierId\`, \`scopeId\`)
      SELECT UUID(), \`c\`.\`id\`, \`intercity\`.\`id\`
      FROM \`carriers\` \`c\`
      INNER JOIN \`carrier_scope_of_work\` \`international_link\`
        ON \`international_link\`.\`carrierId\` = \`c\`.\`id\`
      INNER JOIN \`scope_of_work\` \`international\`
        ON \`international\`.\`id\` = \`international_link\`.\`scopeId\`
       AND \`international\`.\`name\` = 'Uluslararası'
      INNER JOIN \`scope_of_work\` \`intercity\`
        ON \`intercity\`.\`name\` = 'Şehirler Arası'
      WHERE \`c\`.\`isActive\` = 1
        AND \`c\`.\`verifiedByAdmin\` = 1
        AND \`c\`.\`approval_state\` = 'APPROVED'
        AND NOT EXISTS (
          SELECT 1
          FROM \`carrier_scope_of_work\` \`visible_link\`
          INNER JOIN \`scope_of_work\` \`visible\`
            ON \`visible\`.\`id\` = \`visible_link\`.\`scopeId\`
          WHERE \`visible_link\`.\`carrierId\` = \`c\`.\`id\`
            AND \`visible\`.\`name\` IN ('Şehir İçi', 'Şehirler Arası')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM \`carrier_scope_of_work\` \`existing_intercity\`
          WHERE \`existing_intercity\`.\`carrierId\` = \`c\`.\`id\`
            AND \`existing_intercity\`.\`scopeId\` = \`intercity\`.\`id\`
        )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data backfill migration.
  }
}
