import { MigrationInterface, QueryRunner } from "typeorm";

export class ShipmentContactPhone1776000000000 implements MigrationInterface {
    name = 'ShipmentContactPhone1776000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`contactPhone\` varchar(20) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`contactPhone\``);
    }
}
