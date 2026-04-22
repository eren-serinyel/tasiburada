import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShipmentConverterApplyFields1777700000000 implements MigrationInterface {
  name = 'ShipmentConverterApplyFields1777700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_session_id` varchar(36) NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_estimated_volume_min` decimal(7,2) NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_estimated_volume_max` decimal(7,2) NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_recommended_vehicle_code` varchar(100) NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_special_items_json` json NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_applied_at` datetime NULL");
    await queryRunner.query("ALTER TABLE `shipments` ADD `converter_last_applied_by` varchar(36) NULL");
    await queryRunner.query("CREATE INDEX `IDX_shipments_converter_session_id` ON `shipments` (`converter_session_id`)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX `IDX_shipments_converter_session_id` ON `shipments`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_last_applied_by`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_applied_at`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_special_items_json`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_recommended_vehicle_code`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_estimated_volume_max`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_estimated_volume_min`");
    await queryRunner.query("ALTER TABLE `shipments` DROP COLUMN `converter_session_id`");
  }
}
