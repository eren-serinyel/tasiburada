import { MigrationInterface, QueryRunner } from "typeorm";

export class ShipmentRequestDetails1774385369064 implements MigrationInterface {
    name = 'ShipmentRequestDetails1774385369064'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`transportType\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`placeType\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`hasElevator\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`floor\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`insuranceType\` varchar(255) NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`timePreference\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`extraServices\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`extraServices\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`timePreference\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`insuranceType\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`floor\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`hasElevator\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`placeType\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`transportType\``);
    }

}
