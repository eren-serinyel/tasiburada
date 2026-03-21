import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierPictureUrlLongText1763200000001 implements MigrationInterface {
  name = 'CarrierPictureUrlLongText1763200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carriers` LIKE 'pictureUrl'"
    );

    if (hasColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carriers` MODIFY COLUMN `pictureUrl` longtext NULL'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carriers` LIKE 'pictureUrl'"
    );

    if (hasColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carriers` MODIFY COLUMN `pictureUrl` varchar(255) NULL'
      );
    }
  }
}
