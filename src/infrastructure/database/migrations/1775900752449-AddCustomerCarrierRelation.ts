import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerCarrierRelation1775900752449 implements MigrationInterface {
    name = 'AddCustomerCarrierRelation1775900752449'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`customer_carrier_relations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`customerId\` varchar(36) NOT NULL, \`carrierId\` varchar(36) NOT NULL, \`firstShipmentId\` char(36) NULL, \`lastShipmentId\` char(36) NULL, \`completedJobsCount\` int NOT NULL DEFAULT '0', \`isSaved\` tinyint NOT NULL DEFAULT 0, \`canInviteAgain\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b0cbe29aa4ab84dbf2893e2626\` (\`customerId\`, \`carrierId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`customer_carrier_relations\` ADD CONSTRAINT \`FK_83bc63e7ee9015f9a1692097216\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`customer_carrier_relations\` ADD CONSTRAINT \`FK_b020063fca17393a8c009d1d2b8\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`customer_carrier_relations\` DROP FOREIGN KEY \`FK_b020063fca17393a8c009d1d2b8\``);
        await queryRunner.query(`ALTER TABLE \`customer_carrier_relations\` DROP FOREIGN KEY \`FK_83bc63e7ee9015f9a1692097216\``);
        await queryRunner.query(`DROP INDEX \`IDX_b0cbe29aa4ab84dbf2893e2626\` ON \`customer_carrier_relations\``);
        await queryRunner.query(`DROP TABLE \`customer_carrier_relations\``);
    }

}
