import { MigrationInterface, QueryRunner } from "typeorm";

export class DatabaseResetAndRefactor1769337500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop Tables to Remove (conversations, messages, notifications, offers, shipments)
        // Also drop tables that we are going to recreate to switch to UUIDs cleanly

        // Disable FK checks to allow dropping tables in any order
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToDrop = [
            'messages',
            'conversations',
            'notifications', // if exists
            'notification_types',
            'notification_channels',
            'carrier_notification_preferences',
            'carrier_notification_settings',
            'offers',
            'shipments',
            // Recreating these for UUID change:
            'service_types',
            'scope_of_work',
            'vehicle_types',
            'vehicles',
            'carrier_scope_of_work',
            'carrier_service_types',
            'carrier_vehicle_types',
            // Clean other data
            'carriers',
            'carrier_documents',
            'carrier_earnings',
            'carrier_profile_status',
            'carrier_activity',
            'carrier_security_settings'
        ];

        for (const table of tablesToDrop) {
            await queryRunner.query(`DROP TABLE IF EXISTS \`${table}\``);
        }

        // 2. Recreate Tables with UUIDs where needed

        // Candidates for UUID update: service_types, scope_of_work, vehicle_types
        // (Carriers was already UUID)

        // service_types
        await queryRunner.query(`
            CREATE TABLE \`service_types\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(100) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_service_type_name\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // scope_of_work
        await queryRunner.query(`
            CREATE TABLE \`scope_of_work\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(100) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_scope_name\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // vehicle_types (switching to UUID)
        await queryRunner.query(`
            CREATE TABLE \`vehicle_types\` (
                \`id\` varchar(36) NOT NULL,
                \`name\` varchar(100) NOT NULL,
                \`defaultCapacityKg\` int NOT NULL,
                \`defaultCapacityM3\` int NOT NULL,
                UNIQUE INDEX \`IDX_vehicle_type_name\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // carriers (Recreate to be clean, though schema was mostly fine, verifying relations)
        // Re-creating Carriers table strictly matching entity (simplified removal of relations)
        await queryRunner.query(`
            CREATE TABLE \`carriers\` (
                \`id\` varchar(36) NOT NULL,
                \`companyName\` varchar(255) NOT NULL,
                \`taxNumber\` varchar(32) NOT NULL,
                \`contactName\` varchar(255) NULL,
                \`phone\` varchar(15) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`pictureUrl\` longtext NULL,
                \`passwordHash\` varchar(255) NOT NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`profileCompletion\` int NOT NULL DEFAULT 0,
                \`foundedYear\` int NOT NULL,
                \`hasUploadedDocuments\` tinyint NOT NULL DEFAULT 0,
                \`verifiedByAdmin\` tinyint NOT NULL DEFAULT 0,
                \`documentCount\` int NOT NULL DEFAULT 0,
                \`balance\` decimal(12,2) NOT NULL DEFAULT '0.00',
                \`rating\` float NOT NULL DEFAULT '0',
                \`completedShipments\` int NOT NULL DEFAULT 0,
                \`cancelledShipments\` int NOT NULL DEFAULT 0,
                \`totalOffers\` int NOT NULL DEFAULT 0,
                \`successRate\` float NOT NULL DEFAULT '0',
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`lastLogin\` datetime NULL,
                UNIQUE INDEX \`IDX_carrier_tax\` (\`taxNumber\`),
                UNIQUE INDEX \`IDX_carrier_email\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // vehicles (with UUID vehicleTypeId)
        await queryRunner.query(`
            CREATE TABLE \`vehicles\` (
                \`id\` varchar(36) NOT NULL,
                \`vehicleTypeId\` varchar(36) NOT NULL,
                \`capacityKg\` decimal(8,2) NOT NULL,
                \`capacityM3\` decimal(6,2) NULL,
                \`licensePlate\` varchar(20) NULL,
                \`brand\` varchar(100) NULL,
                \`model\` varchar(100) NULL,
                \`year\` int NULL,
                \`description\` text NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`hasInsurance\` tinyint NOT NULL DEFAULT 0,
                \`insuranceExpiry\` date NULL,
                \`hasTrackingDevice\` tinyint NOT NULL DEFAULT 0,
                \`carrierId\` varchar(36) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_vehicle_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_vehicle_type\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\` (\`id\`)
            ) ENGINE=InnoDB
        `);

        // carrier_service_types (UUIDs)
        await queryRunner.query(`
            CREATE TABLE \`carrier_service_types\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`serviceTypeId\` varchar(36) NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_carrier_service\` (\`carrierId\`, \`serviceTypeId\`),
                CONSTRAINT \`FK_cst_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_cst_service\` FOREIGN KEY (\`serviceTypeId\`) REFERENCES \`service_types\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_scope_of_work (UUIDs)
        await queryRunner.query(`
            CREATE TABLE \`carrier_scope_of_work\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`scopeId\` varchar(36) NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_carrier_scope\` (\`carrierId\`, \`scopeId\`),
                CONSTRAINT \`FK_csw_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_csw_scope\` FOREIGN KEY (\`scopeId\`) REFERENCES \`scope_of_work\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_vehicle_types (UUIDs)
        await queryRunner.query(`
            CREATE TABLE \`carrier_vehicle_types\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`vehicleTypeId\` varchar(36) NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_carrier_vtype\` (\`carrierId\`, \`vehicleTypeId\`),
                CONSTRAINT \`FK_cvt_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_cvt_type\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Recreate other functional tables (just truncated effectively by drop/create logic or simplified)
        // carrier_activity
        await queryRunner.query(`
            CREATE TABLE \`carrier_activity\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`city\` varchar(120) NOT NULL,
                \`district\` varchar(120) NULL,
                \`address\` text NULL,
                \`serviceAreasJson\` json NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`REL_activity_carrier\` (\`carrierId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_activity_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_profile_status
        await queryRunner.query(`
            CREATE TABLE \`carrier_profile_status\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`companyInfoCompleted\` tinyint NOT NULL DEFAULT 0,
                \`activityInfoCompleted\` tinyint NOT NULL DEFAULT 0,
                \`vehiclesCompleted\` tinyint NOT NULL DEFAULT 0,
                \`documentsCompleted\` tinyint NOT NULL DEFAULT 0,
                \`earningsCompleted\` tinyint NOT NULL DEFAULT 0,
                \`securityCompleted\` tinyint NOT NULL DEFAULT 0,
                \`notificationsCompleted\` tinyint NOT NULL DEFAULT 0,
                \`overallPercentage\` int NOT NULL DEFAULT 0,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`REL_status_carrier\` (\`carrierId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_status_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_documents
        await queryRunner.query(`
            CREATE TABLE \`carrier_documents\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`documentType\` varchar(50) NOT NULL,
                \`fileUrl\` text NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'pending',
                \`rejectionReason\` text NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_docs_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_earnings
        await queryRunner.query(`
            CREATE TABLE \`carrier_earnings\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`iban\` varchar(34) NULL,
                \`bankName\` varchar(100) NULL,
                \`accountHolder\` varchar(100) NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`REL_earnings_carrier\` (\`carrierId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_earnings_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // carrier_security_settings
        await queryRunner.query(`
            CREATE TABLE \`carrier_security_settings\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`twoFactorEnabled\` tinyint NOT NULL DEFAULT 0,
                \`lastPasswordChange\` datetime NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`REL_security_carrier\` (\`carrierId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_security_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // Re-enable FK checks
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

        // 3. SEED DATA with UUIDs
        // We need to generate UUIDs. In SQL, UUID() function exists in MySQL 8.

        // Scope of Work
        await queryRunner.query(`INSERT INTO \`scope_of_work\` (id, name) VALUES (UUID(), 'Şehir İçi'), (UUID(), 'Şehirler Arası')`);

        // Service Types
        const serviceTypes = ['Ev Eşyası', 'Ofis Taşıma', 'Parsiyel', 'Komple Yük', 'Hassas Yük', 'Ağır Yük'];
        for (const s of serviceTypes) {
            await queryRunner.query(`INSERT INTO \`service_types\` (id, name) VALUES (UUID(), ?)`, [s]);
        }

        // Vehicle Types (Example defaults)
        const vTypes = [
            { name: 'Kamyonet', kg: 3500, m3: 20 },
            { name: 'Kamyon', kg: 15000, m3: 45 },
            { name: 'Tır', kg: 26000, m3: 90 },
            { name: 'Panelvan', kg: 1500, m3: 12 }
        ];
        for (const vt of vTypes) {
            await queryRunner.query(`INSERT INTO \`vehicle_types\` (id, name, defaultCapacityKg, defaultCapacityM3) VALUES (UUID(), ?, ?, ?)`, [vt.name, vt.kg, vt.m3]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This is a destructive migration, down is just dropping everything again essentially.
        // For simplicity, we won't implement a complex rollback to the previous mixed state.
    }

}
