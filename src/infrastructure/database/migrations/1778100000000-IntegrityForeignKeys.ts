import { MigrationInterface, QueryRunner } from 'typeorm';

export class IntegrityForeignKeys1778100000000 implements MigrationInterface {
  name = 'IntegrityForeignKeys1778100000000';

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?`,
      [tableName],
    );
    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  private async constraintExists(queryRunner: QueryRunner, constraintName: string): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND CONSTRAINT_NAME = ?`,
      [constraintName],
    );
    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'carrier_extra_service_capabilities')) {
      // Cleanup orphan or inconsistent capability records before FK enforcement.
      await queryRunner.query(
        `DELETE cesc
           FROM \`carrier_extra_service_capabilities\` cesc
      LEFT JOIN \`carriers\` c ON c.\`id\` = cesc.\`carrier_id\`
      LEFT JOIN \`extra_services\` es ON es.\`id\` = cesc.\`extra_service_id\`
      LEFT JOIN \`extra_service_applicability\` esa
             ON esa.\`extra_service_id\` = cesc.\`extra_service_id\`
            AND esa.\`load_type\` = cesc.\`load_type\`
          WHERE c.\`id\` IS NULL
             OR es.\`id\` IS NULL
             OR esa.\`id\` IS NULL`,
      );

      if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_carrier_id'))) {
        await queryRunner.query(
          'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_carrier_id` FOREIGN KEY (`carrier_id`) REFERENCES `carriers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        );
      }

      if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_extra_service_id'))) {
        await queryRunner.query(
          'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_extra_service_id` FOREIGN KEY (`extra_service_id`) REFERENCES `extra_services`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        );
      }

      if (!(await this.constraintExists(queryRunner, 'FK_carrier_extra_service_capabilities_applicability'))) {
        await queryRunner.query(
          'ALTER TABLE `carrier_extra_service_capabilities` ADD CONSTRAINT `FK_carrier_extra_service_capabilities_applicability` FOREIGN KEY (`extra_service_id`, `load_type`) REFERENCES `extra_service_applicability`(`extra_service_id`, `load_type`) ON DELETE CASCADE ON UPDATE NO ACTION',
        );
      }
    }

    if (await this.tableExists(queryRunner, 'shipment_extra_services')) {
      // Cleanup junction orphans, then enforce FK constraints.
      await queryRunner.query(
        `DELETE sxs
           FROM \`shipment_extra_services\` sxs
      LEFT JOIN \`shipments\` s ON s.\`id\` = sxs.\`shipment_id\`
      LEFT JOIN \`extra_services\` es ON es.\`id\` = sxs.\`extra_service_id\`
          WHERE s.\`id\` IS NULL
             OR es.\`id\` IS NULL`,
      );

      if (!(await this.constraintExists(queryRunner, 'FK_shipment_extra_services_shipment_id'))) {
        await queryRunner.query(
          'ALTER TABLE `shipment_extra_services` ADD CONSTRAINT `FK_shipment_extra_services_shipment_id` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        );
      }

      if (!(await this.constraintExists(queryRunner, 'FK_shipment_extra_services_extra_service_id'))) {
        await queryRunner.query(
          'ALTER TABLE `shipment_extra_services` ADD CONSTRAINT `FK_shipment_extra_services_extra_service_id` FOREIGN KEY (`extra_service_id`) REFERENCES `extra_services`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'shipment_extra_services')) {
      if (await this.constraintExists(queryRunner, 'FK_shipment_extra_services_extra_service_id')) {
        await queryRunner.query('ALTER TABLE `shipment_extra_services` DROP FOREIGN KEY `FK_shipment_extra_services_extra_service_id`');
      }
      if (await this.constraintExists(queryRunner, 'FK_shipment_extra_services_shipment_id')) {
        await queryRunner.query('ALTER TABLE `shipment_extra_services` DROP FOREIGN KEY `FK_shipment_extra_services_shipment_id`');
      }
    }
  }
}
