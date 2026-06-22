import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivateShipmentOpenAddressText1780200000000 implements MigrationInterface {
  name = 'ActivateShipmentOpenAddressText1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOriginAddressText = await queryRunner.hasColumn('shipments', 'origin_address_text');
    const hasDestinationAddressText = await queryRunner.hasColumn('shipments', 'destination_address_text');

    if (!hasOriginAddressText) {
      await queryRunner.query("ALTER TABLE `shipments` ADD `origin_address_text` varchar(500) NULL");
    } else {
      await queryRunner.query("ALTER TABLE `shipments` MODIFY `origin_address_text` varchar(500) NULL");
    }

    if (!hasDestinationAddressText) {
      await queryRunner.query("ALTER TABLE `shipments` ADD `destination_address_text` varchar(500) NULL");
    } else {
      await queryRunner.query("ALTER TABLE `shipments` MODIFY `destination_address_text` varchar(500) NULL");
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally left as no-op to avoid dropping production shipment history.
  }
}
