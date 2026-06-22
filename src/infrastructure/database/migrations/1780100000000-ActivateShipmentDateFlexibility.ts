import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivateShipmentDateFlexibility1780100000000 implements MigrationInterface {
  name = 'ActivateShipmentDateFlexibility1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('shipments', 'date_flexibility');

    if (!hasColumn) {
      await queryRunner.query(
        "ALTER TABLE `shipments` ADD `date_flexibility` enum('EXACT','PLUS_MINUS_1_DAY','PLUS_MINUS_3_DAYS') NULL DEFAULT 'EXACT'",
      );
      return;
    }

    await queryRunner.query(
      "ALTER TABLE `shipments` MODIFY `date_flexibility` enum('EXACT','PLUS_MINUS_1_DAY','PLUS_MINUS_3_DAYS') NULL DEFAULT 'EXACT'",
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally left as no-op to avoid dropping production shipment history.
  }
}
