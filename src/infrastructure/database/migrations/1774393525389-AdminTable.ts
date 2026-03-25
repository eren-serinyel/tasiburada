import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminTable1774393525389 implements MigrationInterface {
    name = 'AdminTable1774393525389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`admins\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`role\` varchar(20) NOT NULL DEFAULT 'admin', \`isActive\` tinyint NOT NULL DEFAULT 1, \`lastLogin\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_admins_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`audit_logs\` (\`id\` varchar(36) NOT NULL, \`adminId\` varchar(36) NOT NULL, \`action\` varchar(100) NOT NULL, \`targetType\` varchar(50) NOT NULL, \`targetId\` varchar(36) NOT NULL, \`details\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`admins\``);
    }

}
