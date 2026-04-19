import { MigrationInterface, QueryRunner } from "typeorm";

export class DropVehiclesTable1777100000000 implements MigrationInterface {
    name = 'DropVehiclesTable1777100000000'
    transaction = true

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('vehicles');
        if (!hasTable) {
            return;
        }

        await queryRunner.query("ALTER TABLE `vehicles` DROP FOREIGN KEY `FK_72d0f0ecfc71ee89771f3de60dc`");
        await queryRunner.query("ALTER TABLE `vehicles` DROP FOREIGN KEY `FK_fa9aca6fceb8256c4312fe889ce`");
        await queryRunner.query("DROP TABLE `vehicles`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasTable = await queryRunner.hasTable('vehicles');
        if (hasTable) {
            return;
        }

        await queryRunner.query(
            "CREATE TABLE `vehicles` (`id` varchar(36) NOT NULL, `vehicleTypeId` varchar(255) NOT NULL, `capacityKg` decimal(8,2) NOT NULL, `capacityM3` decimal(6,2) NULL, `licensePlate` varchar(20) NULL, `brand` varchar(100) NULL, `model` varchar(100) NULL, `year` int NULL, `description` text NULL, `isActive` tinyint NOT NULL DEFAULT 1, `hasInsurance` tinyint NOT NULL DEFAULT 0, `insuranceExpiry` date NULL, `hasTrackingDevice` tinyint NOT NULL DEFAULT 0, `carrierId` varchar(255) NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB"
        );
        await queryRunner.query(
            "ALTER TABLE `vehicles` ADD CONSTRAINT `FK_fa9aca6fceb8256c4312fe889ce` FOREIGN KEY (`carrierId`) REFERENCES `carriers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION"
        );
        await queryRunner.query(
            "ALTER TABLE `vehicles` ADD CONSTRAINT `FK_72d0f0ecfc71ee89771f3de60dc` FOREIGN KEY (`vehicleTypeId`) REFERENCES `vehicle_types`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION"
        );
    }
}
