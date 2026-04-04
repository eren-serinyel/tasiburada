import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerMissingColumns1774820285974 implements MigrationInterface {
    name = 'CustomerMissingColumns1774820285974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`platform_settings\` (\`id\` varchar(36) NOT NULL, \`key\` varchar(100) NOT NULL, \`value\` text NOT NULL, \`type\` varchar(50) NOT NULL DEFAULT 'string', \`description\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_5d9031e30fac3ec3ec8b9602e1\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`addressLine1\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`addressLine2\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`district\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`activityCity\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`resetToken\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`resetTokenExpiry\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD \`verificationToken\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD \`pictureUrl\` longtext NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD \`resetToken\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD \`resetTokenExpiry\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` ADD \`verificationToken\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`photoUrls\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`note\` varchar(1000) NULL`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD \`vehiclePreference\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`offers\` CHANGE \`status\` \`status\` enum ('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`offers\` CHANGE \`status\` \`status\` enum ('pending', 'accepted', 'rejected', 'withdrawn') NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`vehiclePreference\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`note\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP COLUMN \`photoUrls\``);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP COLUMN \`verificationToken\``);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP COLUMN \`resetTokenExpiry\``);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP COLUMN \`resetToken\``);
        await queryRunner.query(`ALTER TABLE \`customers\` DROP COLUMN \`pictureUrl\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`verificationToken\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`resetTokenExpiry\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`resetToken\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`activityCity\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`district\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`addressLine2\``);
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`addressLine1\``);
        await queryRunner.query(`DROP INDEX \`IDX_5d9031e30fac3ec3ec8b9602e1\` ON \`platform_settings\``);
        await queryRunner.query(`DROP TABLE \`platform_settings\``);
    }

}
