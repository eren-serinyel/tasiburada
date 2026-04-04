import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentTable1775247643589 implements MigrationInterface {
    name = 'PaymentTable1775247643589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`payments\` (\`id\` varchar(36) NOT NULL, \`shipmentId\` varchar(255) NOT NULL, \`customerId\` varchar(255) NOT NULL, \`amount\` decimal(10,2) NOT NULL, \`method\` enum ('credit_card', 'bank_transfer', 'cash') NOT NULL DEFAULT 'credit_card', \`status\` enum ('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending', \`transactionId\` varchar(255) NULL, \`note\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`completedAt\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_824be6feda5e655c49c4e0c534b\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_dd7c6848d29df961740614d055c\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_dd7c6848d29df961740614d055c\``);
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_824be6feda5e655c49c4e0c534b\``);
        await queryRunner.query(`DROP TABLE \`payments\``);
    }

}
