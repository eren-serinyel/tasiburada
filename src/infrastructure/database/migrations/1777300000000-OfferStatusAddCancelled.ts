import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferStatusAddCancelled1777300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`offers\` MODIFY COLUMN \`status\` enum('pending','accepted','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`offers\` MODIFY COLUMN \`status\` enum('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending'`
    );
  }
}
