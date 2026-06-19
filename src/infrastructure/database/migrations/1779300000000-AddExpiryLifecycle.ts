import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExpiryLifecycle1779300000000 implements MigrationInterface {
  name = 'AddExpiryLifecycle1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`shipments\` MODIFY COLUMN \`status\` enum('pending','offer_received','matched','in_transit','completed','cancelled','expired') NOT NULL DEFAULT 'pending'`
    );

    await queryRunner.query(
      `ALTER TABLE \`offers\` MODIFY COLUMN \`status\` enum('pending','accepted','rejected','withdrawn','cancelled','expired') NOT NULL DEFAULT 'pending'`
    );

    if (!(await queryRunner.hasColumn('offers', 'valid_until'))) {
      await queryRunner.addColumn('offers', new TableColumn({
        name: 'valid_until',
        type: 'datetime',
        isNullable: true,
      }));
    }

    await queryRunner.query(`
      UPDATE \`offers\` o
      INNER JOIN \`shipments\` s ON s.\`id\` = o.\`shipmentId\`
      SET o.\`valid_until\` = LEAST(
        DATE_ADD(o.\`offeredAt\`, INTERVAL 7 DAY),
        TIMESTAMP(s.\`shipment_date\`, '23:59:59')
      )
      WHERE o.\`valid_until\` IS NULL
        AND o.\`status\` = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('offers', 'valid_until')) {
      await queryRunner.dropColumn('offers', 'valid_until');
    }

    await queryRunner.query(
      `ALTER TABLE \`offers\` MODIFY COLUMN \`status\` enum('pending','accepted','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending'`
    );

    await queryRunner.query(
      `ALTER TABLE \`shipments\` MODIFY COLUMN \`status\` enum('pending','offer_received','matched','in_transit','completed','cancelled') NOT NULL DEFAULT 'pending'`
    );
  }
}
