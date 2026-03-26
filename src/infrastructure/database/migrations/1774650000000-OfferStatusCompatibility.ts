import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class OfferStatusCompatibility1774650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasStatus = await queryRunner.hasColumn('offers', 'status');
    if (hasStatus) {
      return;
    }

    const hasLegacyOfferStatus = await queryRunner.hasColumn('offers', 'offerStatus');

    if (hasLegacyOfferStatus) {
      await queryRunner.query(
        "ALTER TABLE `offers` CHANGE `offerStatus` `status` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending'"
      );
      return;
    }

    await queryRunner.addColumn(
      'offers',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['pending', 'accepted', 'rejected'],
        default: "'pending'"
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasStatus = await queryRunner.hasColumn('offers', 'status');
    if (hasStatus) {
      await queryRunner.dropColumn('offers', 'status');
    }
  }
}
