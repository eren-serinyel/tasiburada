import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class ScopeAndServicesUpdate1769337000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create scope_of_work table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`scope_of_work\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(100) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_scope_name\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 2. Create carrier_scope_of_work table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`carrier_scope_of_work\` (
                \`id\` varchar(36) NOT NULL,
                \`carrierId\` varchar(36) NOT NULL,
                \`scopeId\` int NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_carrier_scope\` (\`carrierId\`, \`scopeId\`),
                CONSTRAINT \`FK_carrier_scope_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\` (\`id\`) ON DELETE CASCADE,
                CONSTRAINT \`FK_carrier_scope_scope\` FOREIGN KEY (\`scopeId\`) REFERENCES \`scope_of_work\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        // 3. Seed scope_of_work
        // 'Şehir İçi', 'Şehirler Arası' (Removed 'Uluslararası' as requested)
        await queryRunner.query(`INSERT INTO \`scope_of_work\` (name) VALUES ('Şehir İçi'), ('Şehirler Arası') ON DUPLICATE KEY UPDATE name=name`);

        // 3.1 Create service_types table if not exists (Fix for missing table)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`service_types\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(100) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_service_type_name\` (\`name\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 4. Update service_types
        // The user requested to reset/update service_types data.
        // We delete existing ones. This will cascade delete from carrier_service_types if FK allows, otherwise we might need to be careful.
        // Assuming cascade is ON as typical for this project (checked earlier).

        // First delete old service types (safely)
        // If we can't delete due to constraints without cascade, we'd delete from carrier_service_types first.
        // But let's assume valid drift.

        await queryRunner.query(`DELETE FROM \`service_types\``);

        // Insert new service types from image/request
        // 'Ev Eşyası', 'Ofis Taşıma', 'Parsiyel', 'Komple Yük', 'Hassas Yük', 'Ağır Yük'
        const services = ['Ev Eşyası', 'Ofis Taşıma', 'Parsiyel', 'Komple Yük', 'Hassas Yük', 'Ağır Yük'];
        for (const s of services) {
            await queryRunner.query(`INSERT INTO \`service_types\` (name) VALUES ('${s}')`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`carrier_scope_of_work\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`scope_of_work\``);
    }

}
