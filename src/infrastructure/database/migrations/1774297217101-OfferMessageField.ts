import { MigrationInterface, QueryRunner } from "typeorm";

export class OfferMessageField1774297217101 implements MigrationInterface {
    name = 'OfferMessageField1774297217101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`offers\` ADD \`message\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`offers\` DROP COLUMN \`message\``);
    }

}
