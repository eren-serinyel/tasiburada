import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCarrierDefaultAvailabilityTimes1789300000000 implements MigrationInterface {
  name = 'BackfillCarrierDefaultAvailabilityTimes1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn('carrier_activity', 'default_availability_start'))
      || !(await queryRunner.hasColumn('carrier_activity', 'default_availability_end'))
      || !(await queryRunner.hasTable('carrier_available_dates'))
    ) {
      return;
    }

    await queryRunner.query(`
      UPDATE \`carrier_activity\` \`activity\`
      SET
        \`activity\`.\`default_availability_start\` = CASE MOD(CRC32(\`activity\`.\`carrierId\`), 5)
          WHEN 0 THEN '17:00:00'
          ELSE '08:00:00'
        END,
        \`activity\`.\`default_availability_end\` = CASE MOD(CRC32(\`activity\`.\`carrierId\`), 5)
          WHEN 0 THEN '00:00:00'
          WHEN 1 THEN '00:00:00'
          ELSE '17:00:00'
        END
      WHERE (
          \`activity\`.\`default_availability_start\` IS NULL
          OR \`activity\`.\`default_availability_end\` IS NULL
        )
        AND EXISTS (
          SELECT 1
          FROM \`carrier_available_dates\` \`available_date\`
          WHERE \`available_date\`.\`carrierId\` = \`activity\`.\`carrierId\`
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasColumn('carrier_activity', 'default_availability_start'))
      || !(await queryRunner.hasColumn('carrier_activity', 'default_availability_end'))
      || !(await queryRunner.hasTable('carrier_available_dates'))
    ) {
      return;
    }

    await queryRunner.query(`
      UPDATE \`carrier_activity\` \`activity\`
      SET
        \`activity\`.\`default_availability_start\` = NULL,
        \`activity\`.\`default_availability_end\` = NULL
      WHERE EXISTS (
          SELECT 1
          FROM \`carrier_available_dates\` \`available_date\`
          WHERE \`available_date\`.\`carrierId\` = \`activity\`.\`carrierId\`
        )
        AND (
          (\`activity\`.\`default_availability_start\` = '17:00:00' AND \`activity\`.\`default_availability_end\` = '00:00:00')
          OR (\`activity\`.\`default_availability_start\` = '08:00:00' AND \`activity\`.\`default_availability_end\` = '00:00:00')
          OR (\`activity\`.\`default_availability_start\` = '08:00:00' AND \`activity\`.\`default_availability_end\` = '17:00:00')
        )
    `);
  }
}
