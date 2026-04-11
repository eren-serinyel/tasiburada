import { MigrationInterface, QueryRunner } from "typeorm";

export class ShipmentInvites1775478728439 implements MigrationInterface {
    name = 'ShipmentInvites1775478728439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`shipment_invites\` (\`id\` varchar(36) NOT NULL, \`shipmentId\` varchar(36) NOT NULL, \`carrierId\` varchar(36) NOT NULL, \`status\` enum ('pending', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`favorite_carriers\` (\`id\` varchar(36) NOT NULL, \`customerId\` varchar(255) NOT NULL, \`carrierId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_edb95f6211d5a13ef2ad5a8817\` (\`customerId\`, \`carrierId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`shipment_invites\` ADD CONSTRAINT \`FK_03cc1a88508b9f032e4e3b45725\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipment_invites\` ADD CONSTRAINT \`FK_3cf72468c7a70d050889f173eba\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favorite_carriers\` ADD CONSTRAINT \`FK_e38ba0a71789ab0fbf5e3043426\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favorite_carriers\` ADD CONSTRAINT \`FK_38edcf149e1bc42551d2fb7dedc\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`favorite_carriers\` DROP FOREIGN KEY \`FK_38edcf149e1bc42551d2fb7dedc\``);
        await queryRunner.query(`ALTER TABLE \`favorite_carriers\` DROP FOREIGN KEY \`FK_e38ba0a71789ab0fbf5e3043426\``);
        await queryRunner.query(`ALTER TABLE \`shipment_invites\` DROP FOREIGN KEY \`FK_3cf72468c7a70d050889f173eba\``);
        await queryRunner.query(`ALTER TABLE \`shipment_invites\` DROP FOREIGN KEY \`FK_03cc1a88508b9f032e4e3b45725\``);
        await queryRunner.query(`DROP INDEX \`IDX_edb95f6211d5a13ef2ad5a8817\` ON \`favorite_carriers\``);
        await queryRunner.query(`DROP TABLE \`favorite_carriers\``);
        await queryRunner.query(`DROP TABLE \`shipment_invites\``);
    }

}
