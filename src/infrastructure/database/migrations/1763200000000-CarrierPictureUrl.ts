import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierPictureUrl1763200000000 implements MigrationInterface {
  name = 'CarrierPictureUrl1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carriers` LIKE 'pictureUrl'"
    );

    if (!hasColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carriers` ADD COLUMN `pictureUrl` varchar(255) NULL'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carriers` LIKE 'pictureUrl'"
    );

    if (hasColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carriers` DROP COLUMN `pictureUrl`'
      );
    }
  }
}
