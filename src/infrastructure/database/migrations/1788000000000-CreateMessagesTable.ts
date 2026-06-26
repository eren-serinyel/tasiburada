import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMessagesTable1788000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'shipment_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'sender_type', type: 'enum', enum: ['customer', 'carrier'], isNullable: false },
          { name: 'sender_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'content', type: 'text', isNullable: false },
          { name: 'is_read', type: 'boolean', default: false },
          { name: 'created_at', type: 'datetime', length: '6', default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('messages', new TableIndex({ name: 'IDX_messages_shipment_id', columnNames: ['shipment_id'] }));
    await queryRunner.createIndex('messages', new TableIndex({ name: 'IDX_messages_sender', columnNames: ['sender_type', 'sender_id'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages', true);
  }
}
