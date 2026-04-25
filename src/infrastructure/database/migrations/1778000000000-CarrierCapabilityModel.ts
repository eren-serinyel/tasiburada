import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierCapabilityModel1778000000000 implements MigrationInterface {
  name = 'CarrierCapabilityModel1778000000000';

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

  private async constraintExists(queryRunner: QueryRunner, constraintName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND CONSTRAINT_NAME = ?`,
      [constraintName],
    );

    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'carrier_load_type_capabilities'))) {
      await queryRunner.query(
        "CREATE TABLE `carrier_load_type_capabilities` (`id` varchar(36) NOT NULL, `carrier_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, `load_type` enum ('HOME', 'OFFICE', 'PARTIAL', 'STORAGE') NOT NULL, `is_active` tinyint NOT NULL DEFAULT 1, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_carrier_load_type_capabilities_carrier_load_type` (`carrier_id`, `load_type`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    if (!(await this.constraintExists(queryRunner, 'FK_carrier_load_type_capabilities_carrier_id'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_load_type_capabilities` ADD CONSTRAINT `FK_carrier_load_type_capabilities_carrier_id` FOREIGN KEY (`carrier_id`) REFERENCES `carriers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }

    if (!(await this.tableExists(queryRunner, 'carrier_extra_service_capabilities'))) {
      await queryRunner.query(
        "CREATE TABLE `carrier_extra_service_capabilities` (`id` varchar(36) NOT NULL, `carrier_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, `extra_service_id` varchar(36) NOT NULL, `load_type` enum ('HOME', 'OFFICE', 'PARTIAL', 'STORAGE') NOT NULL, `is_active` tinyint NOT NULL DEFAULT 1, `price_mode` enum ('NONE', 'FIXED', 'QUOTE') NULL, `base_price` decimal(10,2) NULL, `notes` varchar(500) NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_carrier_extra_service_capabilities_scope` (`carrier_id`, `extra_service_id`, `load_type`), INDEX `IDX_carrier_extra_service_capabilities_load_type` (`load_type`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
      );
    }
    if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_carrier_id'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_carrier_id` FOREIGN KEY (`carrier_id`) REFERENCES `carriers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }
    if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_extra_service_id'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_extra_service_id` FOREIGN KEY (`extra_service_id`) REFERENCES `extra_services`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }
    if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_applicability'))) {
      await queryRunner.query(
        'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_applicability` FOREIGN KEY (`extra_service_id`, `load_type`) REFERENCES `extra_service_applicability`(`extra_service_id`, `load_type`) ON DELETE CASCADE ON UPDATE NO ACTION',
      );
    }

    // Load type capability backfill from existing carrier service types.
    await queryRunner.query(
      `INSERT INTO \`carrier_load_type_capabilities\` (\`id\`, \`carrier_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), cst.\`carrierId\`, 'HOME', 1
         FROM \`carrier_service_types\` cst
         INNER JOIN \`service_types\` st ON st.\`id\` = cst.\`serviceTypeId\`
        WHERE st.\`name\` IN ('Evden Eve Nakliyat', 'Şehir İçi Taşıma', 'Şehirlerarası Taşıma')
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_load_type_capabilities\` clc
             WHERE clc.\`carrier_id\` = cst.\`carrierId\`
               AND clc.\`load_type\` = 'HOME'
          )`,
    );
    await queryRunner.query(
      `INSERT INTO \`carrier_load_type_capabilities\` (\`id\`, \`carrier_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), cst.\`carrierId\`, 'OFFICE', 1
         FROM \`carrier_service_types\` cst
         INNER JOIN \`service_types\` st ON st.\`id\` = cst.\`serviceTypeId\`
        WHERE st.\`name\` = 'Ofis Taşıma'
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_load_type_capabilities\` clc
             WHERE clc.\`carrier_id\` = cst.\`carrierId\`
               AND clc.\`load_type\` = 'OFFICE'
          )`,
    );
    await queryRunner.query(
      `INSERT INTO \`carrier_load_type_capabilities\` (\`id\`, \`carrier_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), cst.\`carrierId\`, 'PARTIAL', 1
         FROM \`carrier_service_types\` cst
         INNER JOIN \`service_types\` st ON st.\`id\` = cst.\`serviceTypeId\`
        WHERE st.\`name\` IN ('Parça Eşya Taşıma', 'Şehir İçi Taşıma', 'Şehirlerarası Taşıma')
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_load_type_capabilities\` clc
             WHERE clc.\`carrier_id\` = cst.\`carrierId\`
               AND clc.\`load_type\` = 'PARTIAL'
          )`,
    );
    await queryRunner.query(
      `INSERT INTO \`carrier_load_type_capabilities\` (\`id\`, \`carrier_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), cst.\`carrierId\`, 'STORAGE', 1
         FROM \`carrier_service_types\` cst
         INNER JOIN \`service_types\` st ON st.\`id\` = cst.\`serviceTypeId\`
        WHERE st.\`name\` = 'Eşya Depolama'
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_load_type_capabilities\` clc
             WHERE clc.\`carrier_id\` = cst.\`carrierId\`
               AND clc.\`load_type\` = 'STORAGE'
          )`,
    );

    // Keep every active carrier reachable by assigning at least one default load type.
    await queryRunner.query(
      `INSERT INTO \`carrier_load_type_capabilities\` (\`id\`, \`carrier_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), c.\`id\`, 'HOME', 1
         FROM \`carriers\` c
        WHERE c.\`isActive\` = 1
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_load_type_capabilities\` clc
             WHERE clc.\`carrier_id\` = c.\`id\`
          )`,
    );

    // Legacy compatibility backfill: if old table exists, best-effort copy by known layouts.
    if (await this.tableExists(queryRunner, 'carrier_extra_services')) {
      try {
        await queryRunner.query(
          `INSERT INTO \`carrier_extra_service_capabilities\` (\`id\`, \`carrier_id\`, \`extra_service_id\`, \`load_type\`, \`is_active\`)
           SELECT UUID(), ces.\`carrier_id\`, ces.\`extra_service_id\`, COALESCE(ces.\`load_type\`, esa.\`load_type\`), COALESCE(ces.\`is_active\`, 1)
             FROM \`carrier_extra_services\` ces
             INNER JOIN \`extra_service_applicability\` esa
                     ON esa.\`extra_service_id\` = ces.\`extra_service_id\`
                    AND (ces.\`load_type\` IS NULL OR ces.\`load_type\` = esa.\`load_type\`)
             INNER JOIN \`carrier_load_type_capabilities\` clc
                     ON clc.\`carrier_id\` = ces.\`carrier_id\`
                    AND clc.\`load_type\` = COALESCE(ces.\`load_type\`, esa.\`load_type\`)
                    AND clc.\`is_active\` = 1
            WHERE NOT EXISTS (
              SELECT 1
                FROM \`carrier_extra_service_capabilities\` cesc
               WHERE cesc.\`carrier_id\` = ces.\`carrier_id\`
                 AND cesc.\`extra_service_id\` = ces.\`extra_service_id\`
                 AND cesc.\`load_type\` = COALESCE(ces.\`load_type\`, esa.\`load_type\`)
            )`,
        );
      } catch {
        try {
          await queryRunner.query(
            `INSERT INTO \`carrier_extra_service_capabilities\` (\`id\`, \`carrier_id\`, \`extra_service_id\`, \`load_type\`, \`is_active\`)
             SELECT UUID(), ces.\`carrierId\`, ces.\`extraServiceId\`, COALESCE(ces.\`loadType\`, esa.\`load_type\`), COALESCE(ces.\`isActive\`, 1)
               FROM \`carrier_extra_services\` ces
               INNER JOIN \`extra_service_applicability\` esa
                       ON esa.\`extra_service_id\` = ces.\`extraServiceId\`
                      AND (ces.\`loadType\` IS NULL OR ces.\`loadType\` = esa.\`load_type\`)
               INNER JOIN \`carrier_load_type_capabilities\` clc
                       ON clc.\`carrier_id\` = ces.\`carrierId\`
                      AND clc.\`load_type\` = COALESCE(ces.\`loadType\`, esa.\`load_type\`)
                      AND clc.\`is_active\` = 1
              WHERE NOT EXISTS (
                SELECT 1
                  FROM \`carrier_extra_service_capabilities\` cesc
                 WHERE cesc.\`carrier_id\` = ces.\`carrierId\`
                   AND cesc.\`extra_service_id\` = ces.\`extraServiceId\`
                   AND cesc.\`load_type\` = COALESCE(ces.\`loadType\`, esa.\`load_type\`)
              )`,
          );
        } catch {
          // Legacy table shape is unknown; default backfill below keeps data consistent.
        }
      }
    }

    // Deterministic default capabilities for active load type coverage.
    await queryRunner.query(
      `INSERT INTO \`carrier_extra_service_capabilities\` (\`id\`, \`carrier_id\`, \`extra_service_id\`, \`load_type\`, \`is_active\`)
       SELECT UUID(), clc.\`carrier_id\`, esa.\`extra_service_id\`, esa.\`load_type\`, 1
         FROM \`carrier_load_type_capabilities\` clc
         INNER JOIN \`extra_service_applicability\` esa
                 ON esa.\`load_type\` = clc.\`load_type\`
                AND esa.\`is_default_visible\` = 1
        WHERE clc.\`is_active\` = 1
          AND NOT EXISTS (
            SELECT 1
              FROM \`carrier_extra_service_capabilities\` cesc
             WHERE cesc.\`carrier_id\` = clc.\`carrier_id\`
               AND cesc.\`extra_service_id\` = esa.\`extra_service_id\`
               AND cesc.\`load_type\` = esa.\`load_type\`
          )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `carrier_extra_service_capabilities` DROP FOREIGN KEY `FK_carrier_extra_service_capabilities_applicability`');
    await queryRunner.query('ALTER TABLE `carrier_extra_service_capabilities` DROP FOREIGN KEY `FK_carrier_extra_service_capabilities_extra_service_id`');
    await queryRunner.query('ALTER TABLE `carrier_extra_service_capabilities` DROP FOREIGN KEY `FK_carrier_extra_service_capabilities_carrier_id`');
    await queryRunner.query('DROP INDEX `IDX_carrier_extra_service_capabilities_load_type` ON `carrier_extra_service_capabilities`');
    await queryRunner.query('DROP INDEX `UQ_carrier_extra_service_capabilities_scope` ON `carrier_extra_service_capabilities`');
    await queryRunner.query('DROP TABLE `carrier_extra_service_capabilities`');

    await queryRunner.query('ALTER TABLE `carrier_load_type_capabilities` DROP FOREIGN KEY `FK_carrier_load_type_capabilities_carrier_id`');
    await queryRunner.query('DROP INDEX `UQ_carrier_load_type_capabilities_carrier_load_type` ON `carrier_load_type_capabilities`');
    await queryRunner.query('DROP TABLE `carrier_load_type_capabilities`');
  }
}
