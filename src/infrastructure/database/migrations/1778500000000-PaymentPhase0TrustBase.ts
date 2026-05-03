import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentPhase0TrustBase1778500000000 implements MigrationInterface {
  name = 'PaymentPhase0TrustBase1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `payments` ADD `offerId` varchar(255) NULL");
    await queryRunner.query("ALTER TABLE `payments` ADD `carrierId` varchar(255) NULL");
    await queryRunner.query("ALTER TABLE `payments` ADD `platformFee` decimal(12,2) NOT NULL DEFAULT '0.00'");
    await queryRunner.query("ALTER TABLE `payments` ADD `carrierAmount` decimal(12,2) NOT NULL DEFAULT '0.00'");
    await queryRunner.query("ALTER TABLE `payments` ADD `currency` varchar(3) NOT NULL DEFAULT 'TRY'");
    await queryRunner.query("ALTER TABLE `payments` ADD `provider` varchar(40) NOT NULL DEFAULT 'manual'");
    await queryRunner.query("ALTER TABLE `payments` ADD `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)");
    await queryRunner.query("ALTER TABLE `payments` CHANGE `amount` `amount` decimal(12,2) NOT NULL");
    await queryRunner.query("ALTER TABLE `payments` CHANGE `status` `status` enum ('pending', 'authorized', 'captured', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `payments` CHANGE `status` `status` enum ('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending'");
    await queryRunner.query("ALTER TABLE `payments` CHANGE `amount` `amount` decimal(10,2) NOT NULL");
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `updatedAt`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `provider`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `currency`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `carrierAmount`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `platformFee`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `carrierId`');
    await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `offerId`');
  }
}
