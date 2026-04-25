import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  EXTRA_SERVICE_APPLICABILITY_SEED,
  EXTRA_SERVICE_CATALOG,
} from '../../../application/services/extra-services/extraServiceApplicability';

export class ExtraServiceApplicability1777900000000 implements MigrationInterface {
  name = 'ExtraServiceApplicability1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `extra_service_applicability` (`id` varchar(36) NOT NULL, `extra_service_id` varchar(36) NOT NULL, `load_type` enum ('HOME', 'OFFICE', 'PARTIAL', 'STORAGE') NOT NULL, `is_default_visible` tinyint NOT NULL DEFAULT 1, `is_recommended_by_converter` tinyint NOT NULL DEFAULT 0, `sort_order` int NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_extra_service_applicability_service_load_type` (`extra_service_id`, `load_type`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `extra_service_applicability` ADD CONSTRAINT `FK_extra_service_applicability_extra_service_id` FOREIGN KEY (`extra_service_id`) REFERENCES `extra_services`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );

    for (const [index, name] of EXTRA_SERVICE_CATALOG.entries()) {
      await queryRunner.query(
        'INSERT INTO `extra_services` (`id`, `name`, `description`, `status`, `sort_order`) SELECT UUID(), ?, NULL, \'ACTIVE\', ? WHERE NOT EXISTS (SELECT 1 FROM `extra_services` WHERE `name` = ?)',
        [name, index + 1, name],
      );
      await queryRunner.query(
        'UPDATE `extra_services` SET `status` = \'ACTIVE\', `sort_order` = ? WHERE `name` = ?',
        [index + 1, name],
      );
    }

    for (const rule of EXTRA_SERVICE_APPLICABILITY_SEED) {
      await queryRunner.query(
        `INSERT INTO \`extra_service_applicability\` (\`id\`, \`extra_service_id\`, \`load_type\`, \`is_default_visible\`, \`is_recommended_by_converter\`, \`sort_order\`)
         SELECT UUID(), es.id, ?, ?, ?, ?
         FROM \`extra_services\` es
         WHERE es.name = ?
         AND NOT EXISTS (
           SELECT 1
           FROM \`extra_service_applicability\` esa
           WHERE esa.extra_service_id = es.id AND esa.load_type = ?
         )`,
        [
          rule.loadType,
          rule.isDefaultVisible ? 1 : 0,
          rule.isRecommendedByConverter ? 1 : 0,
          rule.sortOrder,
          rule.name,
          rule.loadType,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `extra_service_applicability` DROP FOREIGN KEY `FK_extra_service_applicability_extra_service_id`');
    await queryRunner.query('DROP INDEX `UQ_extra_service_applicability_service_load_type` ON `extra_service_applicability`');
    await queryRunner.query('DROP TABLE `extra_service_applicability`');
  }
}
