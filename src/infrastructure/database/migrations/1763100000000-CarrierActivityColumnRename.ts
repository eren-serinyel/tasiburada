import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierActivityColumnRename1763100000000 implements MigrationInterface {
  name = 'CarrierActivityColumnRename1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasLegacyColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carrier_activity` LIKE 'serviceRegionsJson'"
    );

    if (hasLegacyColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carrier_activity` CHANGE COLUMN `serviceRegionsJson` `serviceAreasJson` json NULL'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNewColumn = await queryRunner.query(
      "SHOW COLUMNS FROM `carrier_activity` LIKE 'serviceAreasJson'"
    );

    if (hasNewColumn.length) {
      await queryRunner.query(
        'ALTER TABLE `carrier_activity` CHANGE COLUMN `serviceAreasJson` `serviceRegionsJson` json NULL'
      );
    }
  }
}
