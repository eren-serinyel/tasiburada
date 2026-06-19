import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOfferExtraServicesBreakdown1779000000000 implements MigrationInterface {
  name = 'AddOfferExtraServicesBreakdown1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('offers', 'base_price'))) {
      await queryRunner.addColumn('offers', new TableColumn({
        name: 'base_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }

    if (!(await queryRunner.hasColumn('offers', 'extra_services_total'))) {
      await queryRunner.addColumn('offers', new TableColumn({
        name: 'extra_services_total',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }));
    }

    if (!(await queryRunner.hasColumn('offers', 'extra_services_breakdown'))) {
      await queryRunner.addColumn('offers', new TableColumn({
        name: 'extra_services_breakdown',
        type: 'json',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('offers', 'extra_services_breakdown')) {
      await queryRunner.dropColumn('offers', 'extra_services_breakdown');
    }
    if (await queryRunner.hasColumn('offers', 'extra_services_total')) {
      await queryRunner.dropColumn('offers', 'extra_services_total');
    }
    if (await queryRunner.hasColumn('offers', 'base_price')) {
      await queryRunner.dropColumn('offers', 'base_price');
    }
  }
}
