import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConverterV1Schema1777600000000 implements MigrationInterface {
  name = 'ConverterV1Schema1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `converter_item_catalog` (`id` varchar(36) NOT NULL, `item_code` varchar(100) NOT NULL, `label` varchar(150) NOT NULL, `category` varchar(80) NOT NULL, `unit_volume_min` decimal(7,2) NOT NULL, `unit_volume_max` decimal(7,2) NOT NULL, `is_special` tinyint NOT NULL DEFAULT 0, `is_active` tinyint NOT NULL DEFAULT 1, `sort_order` int NOT NULL DEFAULT 0, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_converter_item_code` (`item_code`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );

    await queryRunner.query(
      "CREATE TABLE `converter_vehicle_rules` (`id` varchar(36) NOT NULL, `vehicle_code` varchar(100) NOT NULL, `label` varchar(120) NOT NULL, `volume_min` decimal(7,2) NOT NULL, `volume_max` decimal(7,2) NOT NULL, `priority` int NOT NULL DEFAULT 0, `special_item_override` tinyint NOT NULL DEFAULT 1, `near_threshold_override` tinyint NOT NULL DEFAULT 1, `is_active` tinyint NOT NULL DEFAULT 1, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_converter_vehicle_code` (`vehicle_code`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );

    await queryRunner.query(
      "CREATE TABLE `converter_sessions` (`id` varchar(36) NOT NULL, `user_id` varchar(36) NULL, `shipment_id` varchar(36) NULL, `flow_type` enum ('household') NOT NULL DEFAULT 'household', `status` enum ('draft', 'estimated', 'applied') NOT NULL DEFAULT 'draft', `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_converter_sessions_user_id` (`user_id`), INDEX `IDX_converter_sessions_shipment_id` (`shipment_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );

    await queryRunner.query(
      "CREATE TABLE `converter_answers` (`id` varchar(36) NOT NULL, `session_id` varchar(36) NOT NULL, `move_type` enum ('household', 'partial_load') NOT NULL, `property_type` enum ('studio', '1+1', '2+1', '3+1', '4+1_plus', 'unknown') NOT NULL, `origin_floor` smallint NULL, `destination_floor` smallint NULL, `building_elevator` tinyint NULL, `external_lift` tinyint NULL, `special_items_json` json NULL, `raw_answers_json` json NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_converter_answers_session_id` (`session_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );

    await queryRunner.query(
      "CREATE TABLE `converter_results` (`id` varchar(36) NOT NULL, `session_id` varchar(36) NOT NULL, `estimated_volume_min` decimal(7,2) NULL, `estimated_volume_max` decimal(7,2) NULL, `recommended_vehicle` enum ('panelvan', 'short_chassis_van', 'long_chassis_van', 'small_truck', 'large_truck') NULL, `confidence` enum ('high', 'medium', 'low') NULL, `warnings_json` json NULL, `summary_text` varchar(500) NULL, `manual_review_recommended` tinyint NOT NULL DEFAULT 0, `applied_to_shipment_at` datetime NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_converter_results_session_id` (`session_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB"
    );

    await queryRunner.query(
      'ALTER TABLE `converter_sessions` ADD CONSTRAINT `FK_converter_sessions_shipment_id` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `converter_answers` ADD CONSTRAINT `FK_converter_answers_session_id` FOREIGN KEY (`session_id`) REFERENCES `converter_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `converter_results` ADD CONSTRAINT `FK_converter_results_session_id` FOREIGN KEY (`session_id`) REFERENCES `converter_sessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `converter_results` DROP FOREIGN KEY `FK_converter_results_session_id`');
    await queryRunner.query('ALTER TABLE `converter_answers` DROP FOREIGN KEY `FK_converter_answers_session_id`');
    await queryRunner.query('ALTER TABLE `converter_sessions` DROP FOREIGN KEY `FK_converter_sessions_shipment_id`');

    await queryRunner.query('DROP INDEX `IDX_converter_results_session_id` ON `converter_results`');
    await queryRunner.query('DROP TABLE `converter_results`');

    await queryRunner.query('DROP INDEX `IDX_converter_answers_session_id` ON `converter_answers`');
    await queryRunner.query('DROP TABLE `converter_answers`');

    await queryRunner.query('DROP INDEX `IDX_converter_sessions_shipment_id` ON `converter_sessions`');
    await queryRunner.query('DROP INDEX `IDX_converter_sessions_user_id` ON `converter_sessions`');
    await queryRunner.query('DROP TABLE `converter_sessions`');

    await queryRunner.query('DROP INDEX `IDX_converter_vehicle_code` ON `converter_vehicle_rules`');
    await queryRunner.query('DROP TABLE `converter_vehicle_rules`');

    await queryRunner.query('DROP INDEX `IDX_converter_item_code` ON `converter_item_catalog`');
    await queryRunner.query('DROP TABLE `converter_item_catalog`');
  }
}
