import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class PlatformPolicyPhaseOne1777200000000 implements MigrationInterface {
  name = 'PlatformPolicyPhaseOne1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMatchedAt = await queryRunner.hasColumn('shipments', 'matched_at');
    if (!hasMatchedAt) {
      await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`matched_at\` datetime NULL`);
    }

    const hasContactFilterLogs = await queryRunner.hasTable('contact_filter_logs');
    if (!hasContactFilterLogs) {
      await queryRunner.createTable(new Table({
        name: 'contact_filter_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'actorType', type: 'varchar', length: '32', isNullable: false },
          { name: 'actorId', type: 'char', length: '36', isNullable: true },
          {
            name: 'surface',
            type: 'enum',
            enum: ['shipment_load_details', 'shipment_note', 'offer_message', 'platform_message'],
            isNullable: false,
          },
          { name: 'shipmentId', type: 'char', length: '36', isNullable: true },
          { name: 'offerId', type: 'char', length: '36', isNullable: true },
          { name: 'action', type: 'enum', enum: ['blocked', 'flagged'], isNullable: false },
          { name: 'matchedRules', type: 'json', isNullable: false },
          { name: 'textHash', type: 'varchar', length: '64', isNullable: false },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }));
      await queryRunner.createIndex('contact_filter_logs', new TableIndex({
        name: 'IDX_contact_filter_actor_surface',
        columnNames: ['actorType', 'actorId', 'surface'],
      }));
    }

    const hasMatchCooldowns = await queryRunner.hasTable('match_cooldowns');
    if (!hasMatchCooldowns) {
      await queryRunner.createTable(new Table({
        name: 'match_cooldowns',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customerId', type: 'char', length: '36', isNullable: false },
          { name: 'carrierId', type: 'char', length: '36', isNullable: false },
          { name: 'shipmentId', type: 'char', length: '36', isNullable: false },
          { name: 'reason', type: 'varchar', length: '255', isNullable: true },
          { name: 'matchedAt', type: 'datetime', isNullable: false },
          { name: 'cancelledAt', type: 'datetime', isNullable: false },
          { name: 'activeUntil', type: 'datetime', isNullable: false },
          { name: 'status', type: 'enum', enum: ['active', 'expired', 'waived'], default: "'active'" },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }));
      await queryRunner.createIndex('match_cooldowns', new TableIndex({
        name: 'IDX_match_cooldown_pair_until',
        columnNames: ['customerId', 'carrierId', 'activeUntil'],
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('match_cooldowns')) {
      await queryRunner.dropTable('match_cooldowns');
    }

    if (await queryRunner.hasTable('contact_filter_logs')) {
      await queryRunner.dropTable('contact_filter_logs');
    }

    if (await queryRunner.hasColumn('shipments', 'matched_at')) {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`matched_at\``);
    }
  }
}
