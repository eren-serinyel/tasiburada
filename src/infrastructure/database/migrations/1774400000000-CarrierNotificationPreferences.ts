import { MigrationInterface, QueryRunner } from "typeorm";

export class CarrierNotificationPreferences1774400000000 implements MigrationInterface {
    name = 'CarrierNotificationPreferences1774400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`carrier_notification_preferences\` (
                \`id\` char(36) NOT NULL,
                \`carrierId\` char(36) NOT NULL,
                \`preferences\` json NOT NULL,
                \`quietMode\` tinyint NOT NULL DEFAULT 0,
                \`dailySummary\` tinyint NOT NULL DEFAULT 1,
                \`smsDailyLimit\` int NOT NULL DEFAULT 5,
                \`timeWindowStart\` varchar(5) NOT NULL DEFAULT '09:00',
                \`timeWindowEnd\` varchar(5) NOT NULL DEFAULT '20:00',
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_carrier_notification_prefs_carrierId\` (\`carrierId\`),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_carrier_notification_prefs_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`carrier_notification_preferences\``);
    }
}
