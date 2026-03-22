import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCascadeRules1774215058128 implements MigrationInterface {
    name = 'FixCascadeRules1774215058128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_5db11b49ab93261e6282a166102\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_80437aa2ec9a321b19f8c137b29\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_48177b1888046c1658c779ec636\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_9e4d457258786617a6e08de6283\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_3ac4e0429e46d846eab72ca2ac2\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_5636220340aee66120618079b75\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_80437aa2ec9a321b19f8c137b29\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_5db11b49ab93261e6282a166102\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_48177b1888046c1658c779ec636\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_9e4d457258786617a6e08de6283\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_3ac4e0429e46d846eab72ca2ac2\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_5636220340aee66120618079b75\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_5636220340aee66120618079b75\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_3ac4e0429e46d846eab72ca2ac2\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_9e4d457258786617a6e08de6283\``);
        await queryRunner.query(`ALTER TABLE \`offers\` DROP FOREIGN KEY \`FK_48177b1888046c1658c779ec636\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_5db11b49ab93261e6282a166102\``);
        await queryRunner.query(`ALTER TABLE \`shipments\` DROP FOREIGN KEY \`FK_80437aa2ec9a321b19f8c137b29\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_5636220340aee66120618079b75\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_3ac4e0429e46d846eab72ca2ac2\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_9e4d457258786617a6e08de6283\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`offers\` ADD CONSTRAINT \`FK_48177b1888046c1658c779ec636\` FOREIGN KEY (\`shipmentId\`) REFERENCES \`shipments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_80437aa2ec9a321b19f8c137b29\` FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipments\` ADD CONSTRAINT \`FK_5db11b49ab93261e6282a166102\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
