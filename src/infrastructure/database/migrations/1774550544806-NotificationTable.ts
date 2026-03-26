import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationTable1774550544806 implements MigrationInterface {
    name = 'NotificationTable1774550544806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`notifications\` (\`id\` varchar(36) NOT NULL, \`userId\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NOT NULL, \`userType\` varchar(20) NOT NULL, \`type\` varchar(40) NOT NULL, \`title\` varchar(255) NOT NULL, \`message\` text NOT NULL, \`isRead\` tinyint NOT NULL DEFAULT 0, \`relatedId\` char(36) CHARACTER SET "utf8mb4" COLLATE "utf8mb4_unicode_ci" NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`notifications\``);
    }

}
