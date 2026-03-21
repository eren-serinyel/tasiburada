import { MigrationInterface, QueryRunner } from "typeorm";

export class CarrierRegisterSystem1762000000000 implements MigrationInterface {
    name = 'CarrierRegisterSystem1762000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // vehicle_types table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`vehicle_types\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`defaultCapacityKg\` int NOT NULL, \`defaultCapacityM3\` int NOT NULL, UNIQUE INDEX \`IDX_vehicle_types_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // seed vehicle_types
        await queryRunner.query(`INSERT INTO \`vehicle_types\` (name, defaultCapacityKg, defaultCapacityM3) VALUES 
          ('Kamyon', 12000, 60),
          ('Kamyonet', 3500, 20),
          ('Tır', 24000, 80),
          ('Panelvan', 2000, 15)
        ON DUPLICATE KEY UPDATE name = VALUES(name)`);

        // alter vehicles: add vehicleTypeId FK, make licensePlate nullable
        const [vehiclesCols]: any = await queryRunner.query(`SHOW COLUMNS FROM \`vehicles\` LIKE 'vehicleTypeId'`);
        if (!vehiclesCols) {
          await queryRunner.query(`ALTER TABLE \`vehicles\` ADD \`vehicleTypeId\` int NOT NULL`);
          await queryRunner.query(`ALTER TABLE \`vehicles\` ADD CONSTRAINT \`FK_vehicles_vehicleType\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
        // make licensePlate nullable if exists non-nullable
        await queryRunner.query(`ALTER TABLE \`vehicles\` MODIFY \`licensePlate\` varchar(20) NULL`);

        // extend carriers with new columns if not exists
        const addColumnIfMissing = async (table: string, column: string, ddl: string) => {
          const result: any[] = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
          if (!result || result.length === 0) {
            await queryRunner.query(`ALTER TABLE \`${table}\` ADD \`${column}\` ${ddl}`);
          }
        };

        await addColumnIfMissing('carriers', 'passwordHash', "varchar(255) NOT NULL");
        await addColumnIfMissing('carriers', 'profileCompletion', "int NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'vehicleTypes', "json NULL");
        await addColumnIfMissing('carriers', 'activityCity', "varchar(100) NULL");
        await addColumnIfMissing('carriers', 'activityDistrict', "varchar(100) NULL");
        await addColumnIfMissing('carriers', 'address', "text NULL");
        await addColumnIfMissing('carriers', 'serviceAreas', "json NULL");
        await addColumnIfMissing('carriers', 'foundedYear', "int NULL");
        await addColumnIfMissing('carriers', 'hasUploadedDocuments', "tinyint NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'verifiedByAdmin', "tinyint NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'documentCount', "int NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'lastDocumentUpdate', "datetime NULL");
        await addColumnIfMissing('carriers', 'bankName', "varchar(255) NULL");
        await addColumnIfMissing('carriers', 'iban', "varchar(50) NULL");
        await addColumnIfMissing('carriers', 'accountHolder', "varchar(255) NULL");
        await addColumnIfMissing('carriers', 'balance', "decimal(12,2) NOT NULL DEFAULT 0");
        // rating might exist as decimal, keep as-is
        await addColumnIfMissing('carriers', 'cancelledShipments', "int NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'totalOffers', "int NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'successRate', "float NOT NULL DEFAULT 0");
        await addColumnIfMissing('carriers', 'lastLogin', "datetime NULL");

        // carrier_documents table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`carrier_documents\` (\`id\` varchar(36) NOT NULL, \`carrierId\` varchar(36) NOT NULL, \`documentType\` enum('K Yetki Belgesi','SRC Belgesi','Araç Ruhsatı','Vergi Levhası','Sigorta Poliçesi') NOT NULL, \`filePath\` varchar(500) NOT NULL, \`isApproved\` tinyint NOT NULL DEFAULT 0, \`uploadedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD INDEX \`IDX_carrier_documents_carrierId\` (\`carrierId\`)`);
        await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD CONSTRAINT \`FK_carrier_documents_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);

        // carrier_earnings table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`carrier_earnings\` (\`id\` varchar(36) NOT NULL, \`carrierId\` varchar(36) NOT NULL, \`bankName\` varchar(255) NULL, \`iban\` varchar(50) NULL, \`accountHolder\` varchar(255) NULL, \`totalEarnings\` decimal(12,2) NOT NULL DEFAULT 0, \`lastPaymentDate\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_carrier_earnings_carrier\` (\`carrierId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`carrier_earnings\` ADD CONSTRAINT \`FK_carrier_earnings_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
      }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`carrier_earnings\` DROP FOREIGN KEY \`FK_carrier_earnings_carrier\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`carrier_earnings\``);
        await queryRunner.query(`ALTER TABLE \`carrier_documents\` DROP FOREIGN KEY \`FK_carrier_documents_carrier\``);
        await queryRunner.query(`DROP INDEX IF EXISTS \`IDX_carrier_documents_carrierId\` ON \`carrier_documents\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`carrier_documents\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP FOREIGN KEY \`FK_vehicles_vehicleType\``);
        await queryRunner.query(`ALTER TABLE \`vehicles\` DROP COLUMN \`vehicleTypeId\``);
        await queryRunner.query(`DROP INDEX IF EXISTS \`IDX_vehicle_types_name\` ON \`vehicle_types\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`vehicle_types\``);
        // Note: columns added to carriers and licensePlate nullability are not reverted to avoid data loss.
    }
}
