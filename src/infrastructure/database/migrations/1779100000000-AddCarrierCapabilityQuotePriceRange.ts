import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCarrierCapabilityQuotePriceRange1779100000000 implements MigrationInterface {
  name = 'AddCarrierCapabilityQuotePriceRange1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('carrier_extra_service_capabilities', 'quote_min_price'))) {
      await queryRunner.addColumn('carrier_extra_service_capabilities', new TableColumn({
        name: 'quote_min_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }

    if (!(await queryRunner.hasColumn('carrier_extra_service_capabilities', 'quote_max_price'))) {
      await queryRunner.addColumn('carrier_extra_service_capabilities', new TableColumn({
        name: 'quote_max_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('carrier_extra_service_capabilities', 'quote_max_price')) {
      await queryRunner.dropColumn('carrier_extra_service_capabilities', 'quote_max_price');
    }
    if (await queryRunner.hasColumn('carrier_extra_service_capabilities', 'quote_min_price')) {
      await queryRunner.dropColumn('carrier_extra_service_capabilities', 'quote_min_price');
    }
  }
}
