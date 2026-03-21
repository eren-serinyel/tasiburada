import { MigrationInterface, QueryRunner } from "typeorm";

export class FullInit1761859000000 implements MigrationInterface {
    name = 'FullInit1761859000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // carriers
        await queryRunner.query(`CREATE TABLE \`carriers\` (\`id\` varchar(36) NOT NULL, \`companyName\` varchar(255) NOT NULL, \`taxNumber\` varchar(11) NOT NULL, \`contactName\` varchar(255) NOT NULL, \`phone\` varchar(15) NOT NULL, \`email\` varchar(255) NOT NULL, \`vehicleTypes\` json NOT NULL, \`city\` varchar(100) NOT NULL, \`district\` varchar(100) NOT NULL, \`description\` text NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`rating\` decimal(3,2) NOT NULL DEFAULT '0.00', \`completedShipments\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e9d1deff05c7fee1775ce4307c\` (\`taxNumber\`), UNIQUE INDEX \`IDX_0e85f78d9b46eeeb74a20db72b\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // vehicles
        await queryRunner.query(`CREATE TABLE \`vehicles\` (\`id\` varchar(36) NOT NULL, \`type\` enum ('kamyon', 'kamyonet', 'panelvan', 'pickup', 'motor', 'bisiklet') NOT NULL, \`capacityKg\` decimal(8,2) NOT NULL, \`capacityM3\` decimal(6,2) NULL, \`licensePlate\` varchar(20) NOT NULL, \`brand\` varchar(100) NULL, \`model\` varchar(100) NULL, \`year\` int NULL, \`description\` text NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`hasInsurance\` tinyint NOT NULL DEFAULT 0, \`insuranceExpiry\` date NULL, \`hasTrackingDevice\` tinyint NOT NULL DEFAULT 0, \`carrierId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // customers
        await queryRunner.query(`CREATE TABLE \`customers\` (\`id\` varchar(36) NOT NULL, \`firstName\` varchar(100) NOT NULL, \`lastName\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`phone\` varchar(15) NOT NULL, \`addressLine1\` varchar(500) NOT NULL, \`addressLine2\` varchar(500) NULL, \`city\` varchar(100) NOT NULL, \`district\` varchar(100) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`isVerified\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8536b8b85c06969f84f0c098b0\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // shipments
        await queryRunner.query(`CREATE TABLE \`shipments\` (\`id\` varchar(36) NOT NULL, \`originCity\` varchar(100) NOT NULL, \`originDistrict\` varchar(100) NOT NULL, \`originAddress\` varchar(500) NOT NULL, \`destinationCity\` varchar(100) NOT NULL, \`destinationDistrict\` varchar(100) NOT NULL, \`destinationAddress\` varchar(500) NOT NULL, \`shipmentDate\` date NOT NULL, \`priceRangeMin\` decimal(10,2) NOT NULL, \`priceRangeMax\` decimal(10,2) NOT NULL, \`status\` enum ('pending', 'offers_received', 'assigned', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending', \`cargoType\` enum ('ev_esyasi', 'beyaz_esya', 'mobilya', 'elektronik', 'tekstil', 'gida', 'diger') NOT NULL, \`description\` text NULL, \`weight\` decimal(5,2) NULL, \`volume\` decimal(5,2) NULL, \`isInsured\` tinyint NOT NULL DEFAULT 0, \`finalPrice\` decimal(10,2) NULL, \`customerId\` varchar(255) NOT NULL, \`carrierId\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // offers
        await queryRunner.query(`CREATE TABLE \`offers\` (\`id\` varchar(36) NOT NULL, \`price\` decimal(10,2) NOT NULL, \`message\` text NULL, \`status\` enum ('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending', \`estimatedDays\` int NULL, \`isInsuranceIncluded\` tinyint NOT NULL DEFAULT 0, \`insuranceAmount\` decimal(10,2) NULL, \`shipmentId\` varchar(255) NOT NULL, \`carrierId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // Foreign keys
        await queryRunner.query(`ALTER TABLE \`vehicles\` ADD CONSTRAINT \`FK_fa9aca6fceb8256c4312fe889ce\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_80437aa2ec9a321b19f8c137b29\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_5db11b49ab93261e6282a166102\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_48177b1888046c1658c779ec636\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_9e4d457258786617a6e08de6283\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_9e4d457258786617a6e08de6283\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_48177b1888046c1658c779ec636\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_5db11b49ab93261e6282a166102\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_80437aa2ec9a321b19f8c137b29\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP FOREIGN KEY \`FK_fa9aca6fceb8256c4312fe889ce\``);

        await queryRunner.query(`DROP TABLE \`offers\``);
        await queryRunner.query(`DROP TABLE \`shipments\``);
        await queryRunner.query(`DROP INDEX \`IDX_8536b8b85c06969f84f0c098b0\` ON \`customers\``);
        await queryRunner.query(`DROP TABLE \`customers\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e85f78d9b46eeeb74a20db72b\` ON \`carriers\``);
        await queryRunner.query(`DROP INDEX \`IDX_e9d1deff05c7fee1775ce4307c\` ON \`carriers\``);
        await queryRunner.query(`DROP TABLE \`vehicles\``);
        await queryRunner.query(`DROP TABLE \`carriers\``);
    }
}
