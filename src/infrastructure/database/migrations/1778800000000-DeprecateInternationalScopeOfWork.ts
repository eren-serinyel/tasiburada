import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeprecateInternationalScopeOfWork1778800000000 implements MigrationInterface {
  name = 'DeprecateInternationalScopeOfWork1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureStatusColumn(queryRunner);

    await queryRunner.query(`
      INSERT INTO \`carrier_scope_of_work\` (\`id\`, \`carrierId\`, \`scopeId\`)
      SELECT UUID(), \`international_only\`.\`carrierId\`, \`intercity\`.\`id\`
      FROM (
        SELECT \`csow\`.\`carrierId\`
        FROM \`carrier_scope_of_work\` \`csow\`
        INNER JOIN \`scope_of_work\` \`scope\`
          ON \`scope\`.\`id\` = \`csow\`.\`scopeId\`
        GROUP BY \`csow\`.\`carrierId\`
        HAVING SUM(CASE WHEN \`scope\`.\`name\` = 'Uluslararası' THEN 1 ELSE 0 END) > 0
           AND SUM(CASE WHEN \`scope\`.\`name\` IN ('Şehir İçi', 'Şehirler Arası') THEN 1 ELSE 0 END) = 0
      ) \`international_only\`
      INNER JOIN \`scope_of_work\` \`intercity\`
        ON \`intercity\`.\`name\` = 'Şehirler Arası'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`carrier_scope_of_work\` \`existing_intercity\`
        WHERE \`existing_intercity\`.\`carrierId\` = \`international_only\`.\`carrierId\`
          AND \`existing_intercity\`.\`scopeId\` = \`intercity\`.\`id\`
      )
    `);

    await queryRunner.query(`
      UPDATE \`scope_of_work\`
      SET \`status\` = 'DEPRECATED'
      WHERE \`name\` = 'Uluslararası'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.ensureStatusColumn(queryRunner);

    await queryRunner.query(`
      UPDATE \`scope_of_work\`
      SET \`status\` = 'ACTIVE'
      WHERE \`name\` = 'Uluslararası'
    `);
  }

  private async ensureStatusColumn(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ COLUMN_TYPE: string }> = await queryRunner.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'scope_of_work'
        AND COLUMN_NAME = 'status'
    `);

    if (!columns.length) {
      await queryRunner.query(`
        ALTER TABLE \`scope_of_work\`
        ADD \`status\` enum('ACTIVE','DEPRECATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE'
      `);
      return;
    }

    if (!String(columns[0].COLUMN_TYPE).includes('DEPRECATED')) {
      await queryRunner.query(`
        ALTER TABLE \`scope_of_work\`
        MODIFY \`status\` enum('ACTIVE','DEPRECATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE'
      `);
    }
  }
}
