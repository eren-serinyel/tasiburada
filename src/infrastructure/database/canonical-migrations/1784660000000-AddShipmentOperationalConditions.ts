import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipmentOperationalConditions1784660000000
implements MigrationInterface {
  readonly name =
    'AddShipmentOperationalConditions1784660000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD COLUMN \`date_flexibility_code\`
           VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL
           AFTER \`date_flexibility\`,
         ADD COLUMN \`date_window_start\` DATE NULL
           AFTER \`date_flexibility_code\`,
         ADD COLUMN \`date_window_end\` DATE NULL
           AFTER \`date_window_start\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_date_flexibility_code\`
         CHECK (
           \`date_flexibility_code\` IS NULL
           OR \`date_flexibility_code\` IN (
             'EXACT_DATE',
             'PLUS_MINUS_1_DAY',
             'PLUS_MINUS_3_DAYS',
             'ANY_DAY_IN_SELECTED_WEEK',
             'UNDECIDED'
           )
         )`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_date_window_pair\`
         CHECK (
           (
             \`date_window_start\` IS NULL
             AND \`date_window_end\` IS NULL
           )
           OR (
             \`date_window_start\` IS NOT NULL
             AND \`date_window_end\` IS NOT NULL
           )
         )`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_date_window_order\`
         CHECK (
           \`date_window_start\` IS NULL
           OR \`date_window_start\` <= \`date_window_end\`
         )`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         ADD CONSTRAINT \`CHK_shipments_date_flexibility_semantics\`
         CHECK (
           \`date_flexibility_code\` IS NULL
           OR \`date_flexibility_code\` = 'UNDECIDED'
           OR (
             \`date_flexibility_code\` = 'EXACT_DATE'
             AND \`shipment_date\` IS NOT NULL
             AND \`date_window_start\` = \`shipment_date\`
             AND \`date_window_end\` = \`shipment_date\`
           )
           OR (
             \`date_flexibility_code\` IN (
               'PLUS_MINUS_1_DAY',
               'PLUS_MINUS_3_DAYS'
             )
             AND \`shipment_date\` IS NOT NULL
             AND \`date_window_start\` IS NOT NULL
             AND \`date_window_end\` IS NOT NULL
           )
           OR (
             \`date_flexibility_code\` =
               'ANY_DAY_IN_SELECTED_WEEK'
             AND \`date_window_start\` IS NOT NULL
             AND \`date_window_end\` IS NOT NULL
           )
         )`,
    );

    await queryRunner.query(
      `CREATE TABLE \`shipment_location_conditions\` (
         \`id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`side_code\` varchar(16) CHARACTER SET ascii
           COLLATE ascii_bin NOT NULL,
         \`floor_number\` smallint DEFAULT NULL,
         \`elevator_type_code\` varchar(32) CHARACTER SET ascii
           COLLATE ascii_bin DEFAULT NULL,
         \`vehicle_access_distance_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`has_narrow_street\` tinyint(1) DEFAULT NULL,
         \`has_site_entry_restriction\` tinyint(1) DEFAULT NULL,
         \`has_time_restriction\` tinyint(1) DEFAULT NULL,
         \`restriction_note\` varchar(500) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci DEFAULT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`id\`),
         UNIQUE KEY
           \`UQ_shipment_location_conditions_shipment_side\`
           (\`shipment_id\`, \`side_code\`),
         KEY \`IDX_shipment_location_conditions_shipment_id\`
           (\`shipment_id\`),
         CONSTRAINT \`CHK_shipment_location_conditions_side\`
           CHECK (\`side_code\` IN ('ORIGIN', 'DESTINATION')),
         CONSTRAINT \`CHK_shipment_location_conditions_floor\`
           CHECK (
             \`floor_number\` IS NULL
             OR \`floor_number\` BETWEEN -10 AND 200
           ),
         CONSTRAINT \`CHK_shipment_location_conditions_elevator\`
           CHECK (
             \`elevator_type_code\` IS NULL
             OR \`elevator_type_code\` IN (
               'NONE',
               'STANDARD',
               'FREIGHT',
               'NOT_SUITABLE',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_shipment_location_conditions_access\`
           CHECK (
             \`vehicle_access_distance_code\` IS NULL
             OR \`vehicle_access_distance_code\` IN (
               'AT_ENTRANCE',
               'BETWEEN_20_AND_50_METERS',
               'OVER_50_METERS',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_shipment_location_conditions_narrow\`
           CHECK (
             \`has_narrow_street\` IS NULL
             OR \`has_narrow_street\` IN (0, 1)
           ),
         CONSTRAINT \`CHK_shipment_location_conditions_site\`
           CHECK (
             \`has_site_entry_restriction\` IS NULL
             OR \`has_site_entry_restriction\` IN (0, 1)
           ),
         CONSTRAINT \`CHK_shipment_location_conditions_time\`
           CHECK (
             \`has_time_restriction\` IS NULL
             OR \`has_time_restriction\` IN (0, 1)
           ),
         CONSTRAINT \`FK_shipment_location_conditions_shipment\`
           FOREIGN KEY (\`shipment_id\`) REFERENCES \`shipments\` (\`id\`)
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `UPDATE \`shipments\`
          SET \`date_flexibility_code\` =
                CASE \`date_flexibility\`
                  WHEN 'EXACT' THEN 'EXACT_DATE'
                  WHEN 'PLUS_MINUS_1_DAY'
                    THEN 'PLUS_MINUS_1_DAY'
                  WHEN 'PLUS_MINUS_3_DAYS'
                    THEN 'PLUS_MINUS_3_DAYS'
                  ELSE NULL
                END,
              \`date_window_start\` =
                CASE \`date_flexibility\`
                  WHEN 'EXACT' THEN \`shipment_date\`
                  WHEN 'PLUS_MINUS_1_DAY'
                    THEN DATE_SUB(\`shipment_date\`, INTERVAL 1 DAY)
                  WHEN 'PLUS_MINUS_3_DAYS'
                    THEN DATE_SUB(\`shipment_date\`, INTERVAL 3 DAY)
                  ELSE NULL
                END,
              \`date_window_end\` =
                CASE \`date_flexibility\`
                  WHEN 'EXACT' THEN \`shipment_date\`
                  WHEN 'PLUS_MINUS_1_DAY'
                    THEN DATE_ADD(\`shipment_date\`, INTERVAL 1 DAY)
                  WHEN 'PLUS_MINUS_3_DAYS'
                    THEN DATE_ADD(\`shipment_date\`, INTERVAL 3 DAY)
                  ELSE NULL
                END`,
    );

    await queryRunner.query(
      `INSERT INTO \`shipment_location_conditions\` (
         \`id\`,
         \`shipment_id\`,
         \`side_code\`,
         \`floor_number\`
       )
       SELECT UUID(), \`id\`, 'ORIGIN', \`origin_floor\`
         FROM \`shipments\``,
    );
    await queryRunner.query(
      `INSERT INTO \`shipment_location_conditions\` (
         \`id\`,
         \`shipment_id\`,
         \`side_code\`,
         \`floor_number\`
       )
       SELECT UUID(), \`id\`, 'DESTINATION', \`destination_floor\`
         FROM \`shipments\``,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE `shipment_location_conditions`',
    );
    await queryRunner.query(
      `ALTER TABLE \`shipments\`
         DROP CHECK \`CHK_shipments_date_flexibility_semantics\`,
         DROP CHECK \`CHK_shipments_date_window_order\`,
         DROP CHECK \`CHK_shipments_date_window_pair\`,
         DROP CHECK \`CHK_shipments_date_flexibility_code\`,
         DROP COLUMN \`date_window_end\`,
         DROP COLUMN \`date_window_start\`,
         DROP COLUMN \`date_flexibility_code\``,
    );
  }
}
