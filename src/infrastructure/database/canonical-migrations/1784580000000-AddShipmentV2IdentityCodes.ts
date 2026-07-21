import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipmentV2IdentityCodes1784580000000
implements MigrationInterface {
  readonly name = 'AddShipmentV2IdentityCodes1784580000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD COLUMN \`service_category_code\`
           VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL
           AFTER \`shipment_category\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD COLUMN \`route_scope_code\`
           VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL
           AFTER \`service_category_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_service_category_code\`
         CHECK (
           \`service_category_code\` IS NULL
           OR \`service_category_code\` IN (
             'HOME_MOVE',
             'OFFICE_MOVE',
             'PARTIAL_ITEM'
           )
         )`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_route_scope_code\`
         CHECK (
           \`route_scope_code\` IS NULL
           OR \`route_scope_code\` IN (
             'INTRACITY',
             'INTERCITY'
           )
         )`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_shipments_service_category_code\`
         ON \`shipments\` (\`service_category_code\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_shipments_route_scope_code\`
         ON \`shipments\` (\`route_scope_code\`)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_shipments_id_service_category_code\`
         ON \`shipments\` (\`id\`, \`service_category_code\`)`,
    );
    await queryRunner.query(
      `UPDATE \`shipments\`
          SET \`service_category_code\` =
                CASE \`shipment_category\`
                  WHEN 'HOME_MOVE' THEN 'HOME_MOVE'
                  WHEN 'OFFICE_MOVE' THEN 'OFFICE_MOVE'
                  WHEN 'PARTIAL_ITEM' THEN 'PARTIAL_ITEM'
                  WHEN 'STORAGE' THEN NULL
                  ELSE NULL
                END,
              \`route_scope_code\` =
                CASE
                  WHEN \`origin_city\` IS NULL
                    OR \`destination_city\` IS NULL
                    OR TRIM(\`origin_city\`) = ''
                    OR TRIM(\`destination_city\`) = ''
                    THEN NULL
                  WHEN TRIM(\`origin_city\`) =
                    TRIM(\`destination_city\`)
                    THEN 'INTRACITY'
                  ELSE 'INTERCITY'
                END`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`UQ_shipments_id_service_category_code\`
         ON \`shipments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_shipments_route_scope_code\`
         ON \`shipments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_shipments_service_category_code\`
         ON \`shipments\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         DROP CHECK \`CHK_shipments_route_scope_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         DROP CHECK \`CHK_shipments_service_category_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         DROP COLUMN \`route_scope_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         DROP COLUMN \`service_category_code\``,
    );
  }
}
