import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCarrierCustomExtraServices1779200000000 implements MigrationInterface {
  name = 'CreateCarrierCustomExtraServices1779200000000';

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?`,
      [tableName],
    );
    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'carrier_custom_extra_services'))) {
      await queryRunner.query(
        "CREATE TABLE `carrier_custom_extra_services` (`id` varchar(36) NOT NULL, `carrier_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, `load_type` enum ('HOME', 'OFFICE', 'PARTIAL', 'STORAGE') NOT NULL, `title` varchar(120) NOT NULL, `description` varchar(700) NULL, `is_active` tinyint NOT NULL DEFAULT 1, `price_mode` enum ('NONE', 'FIXED', 'QUOTE') NOT NULL DEFAULT 'QUOTE', `base_price` decimal(10,2) NULL, `quote_min_price` decimal(10,2) NULL, `quote_max_price` decimal(10,2) NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_carrier_custom_extra_services_scope` (`carrier_id`, `load_type`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`carrier_custom_extra_services\`
       ADD CONSTRAINT \`FK_carrier_custom_extra_services_carrier_id\`
       FOREIGN KEY (\`carrier_id\`) REFERENCES \`carriers\`(\`id\`)
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    ).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'carrier_custom_extra_services')) {
      await queryRunner.query('ALTER TABLE `carrier_custom_extra_services` DROP FOREIGN KEY `FK_carrier_custom_extra_services_carrier_id`').catch(() => undefined);
      await queryRunner.query('DROP INDEX `IDX_carrier_custom_extra_services_scope` ON `carrier_custom_extra_services`').catch(() => undefined);
      await queryRunner.query('DROP TABLE `carrier_custom_extra_services`');
    }
  }
}
