import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShipmentCustomExtraServices1780300000000 implements MigrationInterface {
  name = 'CreateShipmentCustomExtraServices1780300000000';

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    );
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'shipment_custom_extra_services')) return;

    await queryRunner.query(`
      CREATE TABLE \`shipment_custom_extra_services\` (
        \`id\` varchar(36) NOT NULL,
        \`shipment_id\` varchar(36) NOT NULL,
        \`custom_extra_service_id\` varchar(36) NULL,
        \`carrier_id\` char(36) NULL,
        \`name_snapshot\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`price_snapshot\` decimal(10,2) NULL,
        INDEX \`IDX_shipment_custom_extra_services_shipment\` (\`shipment_id\`),
        INDEX \`IDX_shipment_custom_extra_services_custom\` (\`custom_extra_service_id\`),
        INDEX \`IDX_shipment_custom_extra_services_carrier\` (\`carrier_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`shipment_custom_extra_services\`
      ADD CONSTRAINT \`FK_shipment_custom_extra_services_shipment\`
      FOREIGN KEY (\`shipment_id\`) REFERENCES \`shipments\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`shipment_custom_extra_services\`
      ADD CONSTRAINT \`FK_shipment_custom_extra_services_custom\`
      FOREIGN KEY (\`custom_extra_service_id\`) REFERENCES \`carrier_custom_extra_services\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'shipment_custom_extra_services'))) return;
    await queryRunner.query('ALTER TABLE `shipment_custom_extra_services` DROP FOREIGN KEY `FK_shipment_custom_extra_services_custom`').catch(() => undefined);
    await queryRunner.query('ALTER TABLE `shipment_custom_extra_services` DROP FOREIGN KEY `FK_shipment_custom_extra_services_shipment`').catch(() => undefined);
    await queryRunner.query('DROP TABLE `shipment_custom_extra_services`');
  }
}
