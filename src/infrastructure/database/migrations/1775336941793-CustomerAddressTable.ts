import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerAddressTable1775336941793 implements MigrationInterface {
    name = 'CustomerAddressTable1775336941793'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`customer_addresses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`customerId\` varchar(36) NOT NULL, \`label\` varchar(50) NULL, \`addressLine1\` varchar(255) NOT NULL, \`addressLine2\` varchar(255) NULL, \`city\` varchar(100) NOT NULL, \`district\` varchar(100) NOT NULL, \`isDefault\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`phone\` \`phone\` varchar(15) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`city\` \`city\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`district\` \`district\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`customer_addresses\` ADD CONSTRAINT \`FK_7bd088b1c8d3506953240ebf030\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`customer_addresses\` DROP FOREIGN KEY \`FK_7bd088b1c8d3506953240ebf030\``);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`district\` \`district\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`city\` \`city\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`phone\` \`phone\` varchar(15) NOT NULL`);
        await queryRunner.query(`DROP TABLE \`customer_addresses\``);
    }

}
