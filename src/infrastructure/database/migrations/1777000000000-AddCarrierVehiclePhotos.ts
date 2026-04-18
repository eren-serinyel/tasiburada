import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCarrierVehiclePhotos1777000000000 implements MigrationInterface {
    name = 'AddCarrierVehiclePhotos1777000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('carrier_vehicles', 'photo_urls');
        if (!hasColumn) {
            await queryRunner.query("ALTER TABLE `carrier_vehicles` ADD `photo_urls` json NULL");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('carrier_vehicles', 'photo_urls');
        if (hasColumn) {
            await queryRunner.query("ALTER TABLE `carrier_vehicles` DROP COLUMN `photo_urls`");
        }
    }
}
