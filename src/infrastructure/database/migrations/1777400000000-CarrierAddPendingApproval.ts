import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierAddPendingApproval1777400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`carriers\` ADD COLUMN \`pending_approval\` tinyint(1) NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`carriers\` DROP COLUMN \`pending_approval\``
    );
  }
}
