import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanSchema1774175351630 implements MigrationInterface {
    name = 'CleanSchema1774175351630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`carriers\` (\`id\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NOT NULL, \`companyName\` varchar(255) NOT NULL, \`taxNumber\` varchar(32) NOT NULL, \`contactName\` varchar(255) NULL, \`phone\` varchar(15) NOT NULL, \`email\` varchar(255) NOT NULL, \`pictureUrl\` longtext NULL, \`passwordHash\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`profileCompletion\` int NOT NULL DEFAULT '0', \`foundedYear\` int NOT NULL, \`hasUploadedDocuments\` tinyint NOT NULL DEFAULT 0, \`verifiedByAdmin\` tinyint NOT NULL DEFAULT 0, \`documentCount\` int NOT NULL DEFAULT '0', \`balance\` decimal(12,2) NOT NULL DEFAULT '0.00', \`rating\` float NOT NULL DEFAULT '0', \`completedShipments\` int NOT NULL DEFAULT '0', \`cancelledShipments\` int NOT NULL DEFAULT '0', \`totalOffers\` int NOT NULL DEFAULT '0', \`successRate\` float NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`lastLogin\` datetime NULL, UNIQUE INDEX \`IDX_e9d1deff05c7fee1775ce4307c\` (\`taxNumber\`), UNIQUE INDEX \`IDX_0e85f78d9b46eeeb74a20db72b\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`vehicles\` (\`id\` varchar(36) NOT NULL, \`vehicleTypeId\` varchar(255) NOT NULL, \`capacityKg\` decimal(8,2) NOT NULL, \`capacityM3\` decimal(6,2) NULL, \`licensePlate\` varchar(20) NULL, \`brand\` varchar(100) NULL, \`model\` varchar(100) NULL, \`year\` int NULL, \`description\` text NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`hasInsurance\` tinyint NOT NULL DEFAULT 0, \`insuranceExpiry\` date NULL, \`hasTrackingDevice\` tinyint NOT NULL DEFAULT 0, \`carrierId\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`customers\` (\`id\` varchar(36) NOT NULL, \`firstName\` varchar(100) NOT NULL, \`lastName\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`phone\` varchar(15) NOT NULL, \`addressLine1\` varchar(500) NOT NULL, \`addressLine2\` varchar(500) NULL, \`city\` varchar(100) NOT NULL, \`district\` varchar(100) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`isVerified\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8536b8b85c06969f84f0c098b0\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`shipments\` (\`id\` varchar(36) NOT NULL, \`customerId\` varchar(255) NOT NULL, \`carrierId\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NULL, \`status\` enum ('pending', 'offer_received', 'matched', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'pending', \`price\` decimal(10,2) NULL, \`origin\` varchar(255) NOT NULL, \`destination\` varchar(255) NOT NULL, \`loadDetails\` varchar(255) NOT NULL, \`weight\` decimal(10,2) NULL, \`shipmentDate\` date NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`offers\` (\`id\` varchar(36) NOT NULL, \`shipmentId\` varchar(255) NOT NULL, \`carrierId\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NOT NULL, \`price\` decimal(10,2) NOT NULL, \`status\` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', \`offeredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD CONSTRAINT \`FK_54eeed8bf884c68298c3c49bb0e\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_earnings\` ADD CONSTRAINT \`FK_cf5b6eaa7ff9e421934fde2c9c2\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_vehicle_types\` ADD CONSTRAINT \`FK_f9a55950d3e2a6dfde9067c1b14\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_vehicle_types\` ADD CONSTRAINT \`FK_304f0fc674ad38448a7907f9102\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_profile_status\` ADD CONSTRAINT \`FK_d1b4d44f60dd9d0ca4495f7fcb7\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_activity\` ADD CONSTRAINT \`FK_5c86c511608cc6846f28616c421\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_security_settings\` ADD CONSTRAINT \`FK_a09ffa9364ac74287f490fcb3bc\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_service_types\` ADD CONSTRAINT \`FK_f1422b6afac58bfe16a94d7a16f\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_service_types\` ADD CONSTRAINT \`FK_3e1e028d79774cb1772ff3613be\` FOREIGN KEY (\`serviceTypeId\`) REFERENCES \`service_types\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_scope_of_work\` ADD CONSTRAINT \`FK_90e69f658698c8a4081305c5fa8\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_scope_of_work\` ADD CONSTRAINT \`FK_0189cf8d8bcbc72b51cf75ca419\` FOREIGN KEY (\`scopeId\`) REFERENCES \`scope_of_work\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD CONSTRAINT \`FK_fa9aca6fceb8256c4312fe889ce\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD CONSTRAINT \`FK_72d0f0ecfc71ee89771f3de60dc\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_80437aa2ec9a321b19f8c137b29\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_5db11b49ab93261e6282a166102\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_3ac4e0429e46d846eab72ca2ac2\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_5636220340aee66120618079b75\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_6d99bdfa69280ede313699fab92\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_stats\` ADD CONSTRAINT \`FK_86ad2cb4e9a731ecc21d8d69925\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`carrier_earnings_log\` ADD CONSTRAINT \`FK_b22c4cb9cd2198f330d006f96cb\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_48177b1888046c1658c779ec636\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_9e4d457258786617a6e08de6283\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_9e4d457258786617a6e08de6283\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_48177b1888046c1658c779ec636\``);
        await queryRunner.query(`ALTER TABLE \`carrier_earnings_log\` DROP FOREIGN KEY \`FK_b22c4cb9cd2198f330d006f96cb\``);
        await queryRunner.query(`ALTER TABLE \`carrier_stats\` DROP FOREIGN KEY \`FK_86ad2cb4e9a731ecc21d8d69925\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_6d99bdfa69280ede313699fab92\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_5636220340aee66120618079b75\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_3ac4e0429e46d846eab72ca2ac2\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_5db11b49ab93261e6282a166102\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_80437aa2ec9a321b19f8c137b29\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP FOREIGN KEY \`FK_72d0f0ecfc71ee89771f3de60dc\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP FOREIGN KEY \`FK_fa9aca6fceb8256c4312fe889ce\``);
        await queryRunner.query(`ALTER TABLE \`carrier_scope_of_work\` DROP FOREIGN KEY \`FK_0189cf8d8bcbc72b51cf75ca419\``);
        await queryRunner.query(`ALTER TABLE \`carrier_scope_of_work\` DROP FOREIGN KEY \`FK_90e69f658698c8a4081305c5fa8\``);
        await queryRunner.query(`ALTER TABLE \`carrier_service_types\` DROP FOREIGN KEY \`FK_3e1e028d79774cb1772ff3613be\``);
        await queryRunner.query(`ALTER TABLE \`carrier_service_types\` DROP FOREIGN KEY \`FK_f1422b6afac58bfe16a94d7a16f\``);
        await queryRunner.query(`ALTER TABLE \`carrier_security_settings\` DROP FOREIGN KEY \`FK_a09ffa9364ac74287f490fcb3bc\``);
        await queryRunner.query(`ALTER TABLE \`carrier_activity\` DROP FOREIGN KEY \`FK_5c86c511608cc6846f28616c421\``);
        await queryRunner.query(`ALTER TABLE \`carrier_profile_status\` DROP FOREIGN KEY \`FK_d1b4d44f60dd9d0ca4495f7fcb7\``);
        await queryRunner.query(`ALTER TABLE \`carrier_vehicle_types\` DROP FOREIGN KEY \`FK_304f0fc674ad38448a7907f9102\``);
        await queryRunner.query(`ALTER TABLE \`carrier_vehicle_types\` DROP FOREIGN KEY \`FK_f9a55950d3e2a6dfde9067c1b14\``);
        await queryRunner.query(`ALTER TABLE \`carrier_earnings\` DROP FOREIGN KEY \`FK_cf5b6eaa7ff9e421934fde2c9c2\``);
        await queryRunner.query(`ALTER TABLE \`carrier_documents\` DROP FOREIGN KEY \`FK_54eeed8bf884c68298c3c49bb0e\``);
        await queryRunner.query(`DROP TABLE \`offers\``);
        await queryRunner.query(`DROP TABLE \`shipments\``);
        await queryRunner.query(`DROP INDEX \`IDX_8536b8b85c06969f84f0c098b0\` ON \`customers\``);
        await queryRunner.query(`DROP TABLE \`customers\``);
        await queryRunner.query(`DROP TABLE \`vehicles\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e85f78d9b46eeeb74a20db72b\` ON \`carriers\``);
        await queryRunner.query(`DROP INDEX \`IDX_e9d1deff05c7fee1775ce4307c\` ON \`carriers\``);
        await queryRunner.query(`DROP TABLE \`carriers\``);
    }

}
