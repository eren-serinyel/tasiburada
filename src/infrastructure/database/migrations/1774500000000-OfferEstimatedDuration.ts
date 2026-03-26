import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class OfferEstimatedDuration1774500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('offers', 'estimatedDuration');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'offers',
        new TableColumn({
          name: 'estimatedDuration',
          type: 'int',
          isNullable: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('offers', 'estimatedDuration');
    if (hasColumn) {
      await queryRunner.dropColumn('offers', 'estimatedDuration');
    }
  }
}
