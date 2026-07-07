import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

type ActivityAvailabilityRow = {
  carrierId: string;
  availableDates: string | null;
};

export class CreateCarrierAvailableDates1789200000000 implements MigrationInterface {
  name = 'CreateCarrierAvailableDates1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('carrier_activity', 'default_availability_start'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_activity` ADD COLUMN `default_availability_start` TIME NULL',
      );
    }

    if (!(await queryRunner.hasColumn('carrier_activity', 'default_availability_end'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_activity` ADD COLUMN `default_availability_end` TIME NULL',
      );
    }

    if (!(await queryRunner.hasTable('carrier_available_dates'))) {
      await queryRunner.query(`
        CREATE TABLE \`carrier_available_dates\` (
          \`id\` varchar(36) NOT NULL,
          \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          \`date\` date NOT NULL,
          \`start_time\` time NULL,
          \`end_time\` time NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_carrier_available_dates_carrier_date\` (\`carrierId\`, \`date\`),
          CONSTRAINT \`CHK_carrier_available_dates_override_pair\`
            CHECK ((\`start_time\` IS NULL AND \`end_time\` IS NULL) OR (\`start_time\` IS NOT NULL AND \`end_time\` IS NOT NULL)),
          CONSTRAINT \`CHK_carrier_available_dates_time_range\`
            CHECK (\`start_time\` IS NULL OR \`end_time\` IS NULL OR \`start_time\` < \`end_time\` OR \`end_time\` = '00:00:00')
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await queryRunner.query(`
        ALTER TABLE \`carrier_available_dates\`
        ADD CONSTRAINT \`FK_carrier_available_dates_carrier\`
        FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE
      `);
    }

    await this.backfillAvailableDates(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('carrier_available_dates')) {
      const table = await queryRunner.getTable('carrier_available_dates');
      const foreignKey = table?.foreignKeys.find((key) => key.name === 'FK_carrier_available_dates_carrier');
      if (foreignKey) {
        await queryRunner.dropForeignKey('carrier_available_dates', foreignKey);
      }
      await queryRunner.dropTable('carrier_available_dates');
    }

    if (await queryRunner.hasColumn('carrier_activity', 'default_availability_end')) {
      await queryRunner.query('ALTER TABLE `carrier_activity` DROP COLUMN `default_availability_end`');
    }

    if (await queryRunner.hasColumn('carrier_activity', 'default_availability_start')) {
      await queryRunner.query('ALTER TABLE `carrier_activity` DROP COLUMN `default_availability_start`');
    }
  }

  private async backfillAvailableDates(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      SELECT \`carrierId\`, \`availableDates\`
      FROM \`carrier_activity\`
      WHERE \`availableDates\` IS NOT NULL AND TRIM(\`availableDates\`) <> ''
    `) as ActivityAvailabilityRow[];

    for (const row of rows) {
      const dates = this.parseAvailableDates(row.availableDates);
      for (const date of dates) {
        await queryRunner.query(
          `
          INSERT IGNORE INTO \`carrier_available_dates\`
            (\`id\`, \`carrierId\`, \`date\`, \`start_time\`, \`end_time\`)
          VALUES (?, ?, ?, NULL, NULL)
          `,
          [randomUUID(), row.carrierId, date],
        );
      }
    }
  }

  private parseAvailableDates(raw: string | null): string[] {
    if (!raw) return [];

    const values: unknown[] = (() => {
      const trimmed = raw.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return trimmed.split(',');
      }
    })();

    return Array.from(
      new Set(
        values
          .map((value) => {
            if (typeof value === 'object' && value !== null && 'date' in value) {
              return String((value as { date?: unknown }).date ?? '').trim();
            }
            return String(value).trim();
          })
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
      ),
    );
  }
}
