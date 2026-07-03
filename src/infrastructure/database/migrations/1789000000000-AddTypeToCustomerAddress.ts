import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeToCustomerAddress1789000000000 implements MigrationInterface {
  name = 'AddTypeToCustomerAddress1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customer_addresses ADD COLUMN \`type\` VARCHAR(20) NULL DEFAULT 'ev'`
    );

    // Backfill: labels containing 'iş/ofis/work/office/plaza' → ofis
    await queryRunner.query(`
      UPDATE customer_addresses
      SET \`type\` = 'ofis'
      WHERE LOWER(label) REGEXP 'i[sş]|ofis|work|office|plaza'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customer_addresses DROP COLUMN \`type\``);
  }
}
