import { MigrationInterface, QueryRunner } from "typeorm";

export class CarrierVehicleSchemaAlign1762000000003 implements MigrationInterface {
  name = 'CarrierVehicleSchemaAlign1762000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // carriers.city and carriers.district -> make nullable to avoid old NOT NULL blocking fast register
    const cityCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'city'`);
    if (cityCol && cityCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`city\` varchar(100) NULL`);
    }
    const districtCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'district'`);
    if (districtCol && districtCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`district\` varchar(100) NULL`);
    }

    // vehicles.type column is obsolete; we now use vehicleTypeId FK
    const typeCol = await queryRunner.query(`SHOW COLUMNS FROM \`vehicles\` LIKE 'type'`);
    if (typeCol && typeCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`type\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // revert carriers.city/district to NOT NULL (best-effort)
    const cityCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'city'`);
    if (cityCol && cityCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`city\` varchar(100) NOT NULL`);
    }
    const districtCol = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'district'`);
    if (districtCol && districtCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`district\` varchar(100) NOT NULL`);
    }

    // can't easily recreate vehicles.type enum with values; skip to avoid data loss
  }
}
