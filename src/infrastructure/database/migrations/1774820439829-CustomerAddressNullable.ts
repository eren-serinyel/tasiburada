import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerAddressNullable1774820439829 implements MigrationInterface {
    name = 'CustomerAddressNullable1774820439829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`addressLine1\` \`addressLine1\` varchar(500) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`customers\` CHANGE \`addressLine1\` \`addressLine1\` varchar(500) NOT NULL`);
    }

}
