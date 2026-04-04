import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminSoftDeleteAndNames1775900000000 implements MigrationInterface {
  name = 'AdminSoftDeleteAndNames1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`admins\` ADD \`firstName\` varchar(100) NULL`);
    await queryRunner.query(`ALTER TABLE \`admins\` ADD \`lastName\` varchar(100) NULL`);
    await queryRunner.query(`ALTER TABLE \`admins\` ADD \`deletedAt\` datetime NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`admins\` DROP COLUMN \`deletedAt\``);
    await queryRunner.query(`ALTER TABLE \`admins\` DROP COLUMN \`lastName\``);
    await queryRunner.query(`ALTER TABLE \`admins\` DROP COLUMN \`firstName\``);
  }
}
