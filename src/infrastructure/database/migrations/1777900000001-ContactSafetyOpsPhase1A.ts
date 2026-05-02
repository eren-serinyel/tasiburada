import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class ContactSafetyOpsPhase1A1777900000001 implements MigrationInterface {
  name = 'ContactSafetyOpsPhase1A1777900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('contact_filter_logs');
    if (!hasTable) return;

    await queryRunner.query(
      "ALTER TABLE `contact_filter_logs` MODIFY `surface` enum ('shipment_load_details','shipment_note','offer_message','platform_message','review_comment') NOT NULL",
    );

    if (!(await queryRunner.hasColumn('contact_filter_logs', 'entityType'))) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` ADD `entityType` varchar(50) NULL');
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'entityId'))) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` ADD `entityId` char(36) NULL');
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'severity'))) {
      await queryRunner.query(
        "ALTER TABLE `contact_filter_logs` ADD `severity` enum ('low','medium','high') NOT NULL DEFAULT 'medium'",
      );
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'riskScore'))) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` ADD `riskScore` int NOT NULL DEFAULT 0');
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'reviewStatus'))) {
      await queryRunner.query(
        "ALTER TABLE `contact_filter_logs` ADD `reviewStatus` enum ('unreviewed','false_positive','confirmed','ignored') NOT NULL DEFAULT 'unreviewed'",
      );
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'normalizedHash'))) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` ADD `normalizedHash` varchar(64) NULL');
    }
    if (!(await queryRunner.hasColumn('contact_filter_logs', 'metadataJson'))) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` ADD `metadataJson` json NULL');
    }

    await queryRunner.query(
      `UPDATE contact_filter_logs
       SET severity = CASE
         WHEN JSON_OVERLAPS(matchedRules, JSON_ARRAY('phone', 'email', 'url')) THEN 'high'
         WHEN JSON_OVERLAPS(matchedRules, JSON_ARRAY('messaging_app_keyword', 'direct_contact_keyword', 'turkish_digit_words')) THEN 'medium'
         ELSE 'low'
       END,
       riskScore = CASE
         WHEN JSON_OVERLAPS(matchedRules, JSON_ARRAY('phone', 'email', 'url')) THEN 85
         WHEN JSON_OVERLAPS(matchedRules, JSON_ARRAY('messaging_app_keyword', 'direct_contact_keyword', 'turkish_digit_words')) THEN 60
         ELSE 30
       END,
       reviewStatus = 'unreviewed'
       WHERE severity IS NOT NULL`,
    );

    await queryRunner.query(
      'UPDATE `contact_filter_logs` SET `entityType` = COALESCE(`entityType`, `surface`) WHERE `entityType` IS NULL',
    );

    const existing = await queryRunner.getTable('contact_filter_logs');
    const existingIndexNames = new Set((existing?.indices ?? []).map((idx) => idx.name));

    if (!existingIndexNames.has('IDX_contact_filter_actor_created')) {
      await queryRunner.createIndex(
        'contact_filter_logs',
        new TableIndex({
          name: 'IDX_contact_filter_actor_created',
          columnNames: ['actorType', 'actorId', 'createdAt'],
        }),
      );
    }

    if (!existingIndexNames.has('IDX_contact_filter_entity_created')) {
      await queryRunner.createIndex(
        'contact_filter_logs',
        new TableIndex({
          name: 'IDX_contact_filter_entity_created',
          columnNames: ['entityType', 'entityId', 'createdAt'],
        }),
      );
    }

    if (!existingIndexNames.has('IDX_contact_filter_review_status_created')) {
      await queryRunner.createIndex(
        'contact_filter_logs',
        new TableIndex({
          name: 'IDX_contact_filter_review_status_created',
          columnNames: ['reviewStatus', 'createdAt'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('contact_filter_logs');
    if (!hasTable) return;

    const existing = await queryRunner.getTable('contact_filter_logs');
    const existingIndexNames = new Set((existing?.indices ?? []).map((idx) => idx.name));

    if (existingIndexNames.has('IDX_contact_filter_review_status_created')) {
      await queryRunner.dropIndex('contact_filter_logs', 'IDX_contact_filter_review_status_created');
    }
    if (existingIndexNames.has('IDX_contact_filter_entity_created')) {
      await queryRunner.dropIndex('contact_filter_logs', 'IDX_contact_filter_entity_created');
    }
    if (existingIndexNames.has('IDX_contact_filter_actor_created')) {
      await queryRunner.dropIndex('contact_filter_logs', 'IDX_contact_filter_actor_created');
    }

    if (await queryRunner.hasColumn('contact_filter_logs', 'metadataJson')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `metadataJson`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'normalizedHash')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `normalizedHash`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'reviewStatus')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `reviewStatus`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'riskScore')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `riskScore`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'severity')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `severity`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'entityId')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `entityId`');
    }
    if (await queryRunner.hasColumn('contact_filter_logs', 'entityType')) {
      await queryRunner.query('ALTER TABLE `contact_filter_logs` DROP COLUMN `entityType`');
    }

    await queryRunner.query(
      "ALTER TABLE `contact_filter_logs` MODIFY `surface` enum ('shipment_load_details','shipment_note','offer_message','platform_message') NOT NULL",
    );
  }
}
