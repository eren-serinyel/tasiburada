import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupExtraServicesJsonColumn1776854053138 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const [rows] = await queryRunner.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'shipments'
               AND COLUMN_NAME = 'extraServices'`
        );
        if (rows) {
            await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`extraServices\``);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`extraServices\` json NULL`);
    }

}
