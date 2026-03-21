import { MigrationInterface, QueryRunner } from "typeorm";

export class CarrierColumnFix1762000000001 implements MigrationInterface {
    name = 'CarrierColumnFix1762000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make carriers.contactName nullable (optional field)
        const hasContactName = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'contactName'`);
        if (hasContactName && hasContactName.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`contactName\` varchar(255) NULL`);
        }

        // Expand taxNumber length to 32 to be flexible
        const hasTaxNumber = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'taxNumber'`);
        if (hasTaxNumber && hasTaxNumber.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`taxNumber\` varchar(32) NOT NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert contactName to NOT NULL (original schema).
        const hasContactName = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'contactName'`);
        if (hasContactName && hasContactName.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`contactName\` varchar(255) NOT NULL`);
        }
        const hasTaxNumber = await queryRunner.query(`SHOW COLUMNS FROM \`carriers\` LIKE 'taxNumber'`);
        if (hasTaxNumber && hasTaxNumber.length > 0) {
            await queryRunner.query(`ALTER TABLE \`carriers\` MODIFY \`taxNumber\` varchar(11) NOT NULL`);
        }
    }
}
