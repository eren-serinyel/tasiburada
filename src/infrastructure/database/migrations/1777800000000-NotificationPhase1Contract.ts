import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPhase1Contract1777800000000 implements MigrationInterface {
  name = 'NotificationPhase1Contract1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `notifications` ADD `recipientUserId` char(36) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NULL",
    );
    await queryRunner.query("ALTER TABLE `notifications` ADD `recipientRole` varchar(20) NULL");
    await queryRunner.query("ALTER TABLE `notifications` ADD `body` text NULL");
    await queryRunner.query("ALTER TABLE `notifications` ADD `entityType` varchar(40) NULL");
    await queryRunner.query(
      "ALTER TABLE `notifications` ADD `entityId` char(36) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NULL",
    );
    await queryRunner.query("ALTER TABLE `notifications` ADD `severity` varchar(10) NOT NULL DEFAULT 'medium'");
    await queryRunner.query("ALTER TABLE `notifications` ADD `status` varchar(20) NOT NULL DEFAULT 'unread'");
    await queryRunner.query("ALTER TABLE `notifications` ADD `readAt` datetime(6) NULL");
    await queryRunner.query("ALTER TABLE `notifications` ADD `metadataJson` json NULL");
    await queryRunner.query("ALTER TABLE `notifications` ADD `dedupeKey` varchar(191) NULL");

    // Backfill core contract fields from legacy columns.
    await queryRunner.query(
      "UPDATE `notifications` SET `recipientUserId` = COALESCE(`recipientUserId`, `userId`) WHERE `recipientUserId` IS NULL",
    );
    await queryRunner.query(
      "UPDATE `notifications` SET `recipientRole` = COALESCE(`recipientRole`, LOWER(`userType`)) WHERE `recipientRole` IS NULL",
    );
    await queryRunner.query("UPDATE `notifications` SET `body` = COALESCE(`body`, `message`) WHERE `body` IS NULL");
    await queryRunner.query("UPDATE `notifications` SET `entityId` = COALESCE(`entityId`, `relatedId`) WHERE `entityId` IS NULL");

    // Normalize legacy notification types into typed vocabulary.
    await queryRunner.query(
      "UPDATE `notifications` SET `type` = CASE " +
        "WHEN LOWER(`type`) IN ('new_offer', 'offer_received') THEN 'customer.offer_received' " +
        "WHEN LOWER(`type`) IN ('shipment_started', 'customer.shipment_in_transit') THEN 'customer.shipment_in_transit' " +
        "WHEN LOWER(`type`) IN ('shipment_completed', 'customer.shipment_completed') THEN 'customer.shipment_completed' " +
        "WHEN LOWER(`type`) IN ('offer_accepted', 'carrier.offer_accepted') THEN 'carrier.offer_accepted' " +
        "WHEN LOWER(`type`) IN ('carrier.profile_approved') THEN 'carrier.profile_approved' " +
        "WHEN LOWER(`type`) IN ('admin.carrier_submitted_for_approval') THEN 'admin.carrier_submitted_for_approval' " +
        "ELSE LOWER(`type`) END",
    );

    // Infer entityType for legacy rows.
    await queryRunner.query(
      "UPDATE `notifications` SET `entityType` = CASE " +
        "WHEN `entityType` IS NOT NULL THEN `entityType` " +
        "WHEN `type` LIKE 'customer.offer_%' OR `type` LIKE 'carrier.offer_%' THEN 'offer' " +
        "WHEN `type` LIKE 'customer.shipment_%' OR `type` LIKE 'carrier.shipment_%' THEN 'shipment' " +
        "WHEN `type` LIKE '%document_%' THEN 'carrier_document' " +
        "WHEN `type` LIKE '%carrier_%' THEN 'carrier' " +
        "ELSE 'generic' END",
    );

    // Infer severity.
    await queryRunner.query(
      "UPDATE `notifications` SET `severity` = CASE " +
        "WHEN `type` IN ('customer.offer_received', 'customer.shipment_in_transit', 'customer.shipment_completed', 'carrier.offer_accepted', 'carrier.profile_approved', 'admin.carrier_submitted_for_approval') THEN 'high' " +
        "ELSE COALESCE(`severity`, 'medium') END",
    );

    // Convert legacy isRead into status/readAt.
    await queryRunner.query(
      "UPDATE `notifications` SET `status` = CASE WHEN `isRead` = 1 THEN 'read' ELSE 'unread' END",
    );
    await queryRunner.query(
      "UPDATE `notifications` SET `readAt` = CASE WHEN `isRead` = 1 AND `readAt` IS NULL THEN `createdAt` ELSE `readAt` END",
    );

    await queryRunner.query(
      'CREATE INDEX `idx_notifications_recipient_scope_created` ON `notifications` (`recipientRole`, `recipientUserId`, `createdAt`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_recipient_status` ON `notifications` (`recipientRole`, `recipientUserId`, `status`)',
    );
    await queryRunner.query('CREATE INDEX `idx_notifications_entity` ON `notifications` (`entityType`, `entityId`)');
    await queryRunner.query('CREATE INDEX `idx_notifications_type_created` ON `notifications` (`type`, `createdAt`)');
    await queryRunner.query('CREATE UNIQUE INDEX `uniq_notifications_dedupe_key` ON `notifications` (`dedupeKey`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `uniq_notifications_dedupe_key` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_type_created` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_entity` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_recipient_status` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_recipient_scope_created` ON `notifications`');

    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `dedupeKey`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `metadataJson`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `readAt`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `status`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `severity`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `entityId`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `entityType`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `body`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `recipientRole`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `recipientUserId`');
  }
}
