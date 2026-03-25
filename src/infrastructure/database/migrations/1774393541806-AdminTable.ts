import { MigrationInterface, QueryRunner } from "typeorm";

// No-op: duplicate of AdminTable1774393525389 — kept for migration history integrity
export class AdminTable1774393541806 implements MigrationInterface {
    name = 'AdminTable1774393541806'

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // no-op
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
