import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipmentCategoryDetails1784740000000
implements MigrationInterface {
  readonly name =
    'AddShipmentCategoryDetails1784740000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`shipment_home_move_details\` (
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`service_category_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`residence_type_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`room_layout_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`household_density_code\` varchar(48)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`box_count_band_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`shipment_id\`),
         KEY \`IDX_home_details_shipment_category\`
           (\`shipment_id\`, \`service_category_code\`),
         CONSTRAINT \`CHK_home_details_category\`
           CHECK (\`service_category_code\` = 'HOME_MOVE'),
         CONSTRAINT \`CHK_home_details_residence_type\`
           CHECK (
             \`residence_type_code\` IS NULL
             OR \`residence_type_code\` IN (
               'APARTMENT',
               'DUPLEX',
               'DETACHED_HOUSE',
               'VILLA',
               'OTHER',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_home_details_room_layout\`
           CHECK (
             \`room_layout_code\` IS NULL
             OR \`room_layout_code\` IN (
               'STUDIO_1_0',
               'ONE_PLUS_ONE',
               'TWO_PLUS_ONE',
               'THREE_PLUS_ONE',
               'FOUR_PLUS_ONE',
               'FIVE_PLUS_ONE_OR_MORE',
               'OTHER',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_home_details_household_density\`
           CHECK (
             \`household_density_code\` IS NULL
             OR \`household_density_code\` IN (
               'LIGHT',
               'STANDARD',
               'DENSE',
               'VERY_DENSE_MULTI_VEHICLE_POSSIBLE',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_home_details_box_count_band\`
           CHECK (
             \`box_count_band_code\` IS NULL
             OR \`box_count_band_code\` IN (
               'ZERO_TO_10',
               'ELEVEN_TO_25',
               'TWENTY_SIX_TO_50',
               'FIFTY_ONE_TO_80',
               'OVER_80',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`FK_home_details_shipment_category\`
           FOREIGN KEY (
             \`shipment_id\`,
             \`service_category_code\`
           )
           REFERENCES \`shipments\` (
             \`id\`,
             \`service_category_code\`
           )
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `CREATE TABLE \`shipment_home_move_items\` (
         \`id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`item_type_code\` varchar(48)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`quantity\` smallint unsigned NOT NULL,
         \`custom_label\` varchar(120) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci DEFAULT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`id\`),
         KEY \`IDX_home_items_shipment_id\` (\`shipment_id\`),
         CONSTRAINT \`CHK_home_items_type\`
           CHECK (
             \`item_type_code\` IN (
               'PIANO',
               'SAFE',
               'LARGE_AQUARIUM',
               'ANTIQUE',
               'MARBLE_TABLE',
               'LARGE_BOOKCASE',
               'EXERCISE_EQUIPMENT',
               'LARGE_SCREEN_TV',
               'AMERICAN_STYLE_REFRIGERATOR',
               'OTHER'
             )
           ),
         CONSTRAINT \`CHK_home_items_quantity\`
           CHECK (\`quantity\` BETWEEN 1 AND 100),
         CONSTRAINT \`CHK_home_items_other_label\`
           CHECK (
             \`item_type_code\` <> 'OTHER'
             OR (
               \`custom_label\` IS NOT NULL
               AND CHAR_LENGTH(TRIM(\`custom_label\`))
                 BETWEEN 2 AND 120
             )
           ),
         CONSTRAINT \`FK_home_items_home_detail\`
           FOREIGN KEY (\`shipment_id\`)
           REFERENCES \`shipment_home_move_details\`
             (\`shipment_id\`)
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `CREATE TABLE \`shipment_office_move_details\` (
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`service_category_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`office_size_band_code\` varchar(40)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`workstation_count_band_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`archive_unit_count_band_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`archive_density_code\` varchar(24)
           CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
         \`has_server_room\` tinyint(1) DEFAULT NULL,
         \`has_sensitive_electronics\` tinyint(1) DEFAULT NULL,
         \`has_heavy_equipment\` tinyint(1) DEFAULT NULL,
         \`requires_after_hours_move\` tinyint(1) DEFAULT NULL,
         \`has_fixed_completion_deadline\` tinyint(1)
           DEFAULT NULL,
         \`completion_deadline_at\` datetime(3) DEFAULT NULL,
         \`must_remain_operational\` tinyint(1) DEFAULT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`shipment_id\`),
         KEY \`IDX_office_details_shipment_category\`
           (\`shipment_id\`, \`service_category_code\`),
         CONSTRAINT \`CHK_office_details_category\`
           CHECK (\`service_category_code\` = 'OFFICE_MOVE'),
         CONSTRAINT \`CHK_office_details_size_band\`
           CHECK (
             \`office_size_band_code\` IS NULL
             OR \`office_size_band_code\` IN (
               'ZERO_TO_50_SQM',
               'FIFTY_ONE_TO_100_SQM',
               'ONE_HUNDRED_ONE_TO_250_SQM',
               'TWO_HUNDRED_FIFTY_ONE_TO_500_SQM',
               'OVER_500_SQM',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_office_details_workstations\`
           CHECK (
             \`workstation_count_band_code\` IS NULL
             OR \`workstation_count_band_code\` IN (
               'ONE_TO_5',
               'SIX_TO_15',
               'SIXTEEN_TO_30',
               'THIRTY_ONE_TO_60',
               'OVER_60',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_office_details_archive_units\`
           CHECK (
             \`archive_unit_count_band_code\` IS NULL
             OR \`archive_unit_count_band_code\` IN (
               'ZERO',
               'ONE_TO_5',
               'SIX_TO_15',
               'SIXTEEN_TO_30',
               'OVER_30',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_office_details_archive_density\`
           CHECK (
             \`archive_density_code\` IS NULL
             OR \`archive_density_code\` IN (
               'NONE',
               'LIGHT',
               'STANDARD',
               'DENSE',
               'VERY_DENSE',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_office_details_boolean_values\`
           CHECK (
             (\`has_server_room\` IS NULL
               OR \`has_server_room\` IN (0, 1))
             AND (\`has_sensitive_electronics\` IS NULL
               OR \`has_sensitive_electronics\` IN (0, 1))
             AND (\`has_heavy_equipment\` IS NULL
               OR \`has_heavy_equipment\` IN (0, 1))
             AND (\`requires_after_hours_move\` IS NULL
               OR \`requires_after_hours_move\` IN (0, 1))
             AND (\`has_fixed_completion_deadline\` IS NULL
               OR \`has_fixed_completion_deadline\` IN (0, 1))
             AND (\`must_remain_operational\` IS NULL
               OR \`must_remain_operational\` IN (0, 1))
           ),
         CONSTRAINT \`CHK_office_details_fixed_deadline\`
           CHECK (
             (
               \`has_fixed_completion_deadline\` = 1
               AND \`completion_deadline_at\` IS NOT NULL
             )
             OR (
               (
                 \`has_fixed_completion_deadline\` = 0
                 OR \`has_fixed_completion_deadline\` IS NULL
               )
               AND \`completion_deadline_at\` IS NULL
             )
           ),
         CONSTRAINT \`FK_office_details_shipment_category\`
           FOREIGN KEY (
             \`shipment_id\`,
             \`service_category_code\`
           )
           REFERENCES \`shipments\` (
             \`id\`,
             \`service_category_code\`
           )
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `CREATE TABLE \`shipment_partial_item_details\` (
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`service_category_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`shipment_id\`),
         KEY \`IDX_partial_details_shipment_category\`
           (\`shipment_id\`, \`service_category_code\`),
         CONSTRAINT \`CHK_partial_details_category\`
           CHECK (\`service_category_code\` = 'PARTIAL_ITEM'),
         CONSTRAINT \`FK_partial_details_shipment_category\`
           FOREIGN KEY (
             \`shipment_id\`,
             \`service_category_code\`
           )
           REFERENCES \`shipments\` (
             \`id\`,
             \`service_category_code\`
           )
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `CREATE TABLE \`shipment_partial_items\` (
         \`id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`shipment_id\` varchar(36) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci NOT NULL,
         \`item_type_code\` varchar(32)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`custom_label\` varchar(120) CHARACTER SET utf8mb4
           COLLATE utf8mb4_unicode_ci DEFAULT NULL,
         \`quantity\` smallint unsigned NOT NULL,
         \`size_class_code\` varchar(40)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         \`is_fragile\` tinyint(1) DEFAULT NULL,
         \`requires_disassembly\` tinyint(1) DEFAULT NULL,
         \`requires_installation\` tinyint(1) DEFAULT NULL,
         \`requires_packaging\` tinyint(1) DEFAULT NULL,
         \`width_cm\` decimal(8,2) DEFAULT NULL,
         \`length_cm\` decimal(8,2) DEFAULT NULL,
         \`height_cm\` decimal(8,2) DEFAULT NULL,
         \`approximate_weight_kg\` decimal(10,2) DEFAULT NULL,
         \`created_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6),
         \`updated_at\` datetime(6) NOT NULL
           DEFAULT CURRENT_TIMESTAMP(6)
           ON UPDATE CURRENT_TIMESTAMP(6),
         PRIMARY KEY (\`id\`),
         KEY \`IDX_partial_items_shipment_id\` (\`shipment_id\`),
         CONSTRAINT \`CHK_partial_items_type\`
           CHECK (
             \`item_type_code\` IN (
               'SOFA',
               'ARMCHAIR',
               'BED',
               'WARDROBE',
               'TABLE',
               'CHAIR',
               'WASHING_MACHINE',
               'DISHWASHER',
               'REFRIGERATOR',
               'TELEVISION',
               'DESK',
               'BOOKCASE',
               'BOX',
               'PIANO',
               'SAFE',
               'OTHER'
             )
           ),
         CONSTRAINT \`CHK_partial_items_other_label\`
           CHECK (
             \`item_type_code\` <> 'OTHER'
             OR (
               \`custom_label\` IS NOT NULL
               AND CHAR_LENGTH(TRIM(\`custom_label\`))
                 BETWEEN 2 AND 120
             )
           ),
         CONSTRAINT \`CHK_partial_items_quantity\`
           CHECK (\`quantity\` BETWEEN 1 AND 1000),
         CONSTRAINT \`CHK_partial_items_size_class\`
           CHECK (
             \`size_class_code\` IN (
               'STANDARD',
               'LARGE_TWO_PERSON',
               'OVERSIZED_SPECIAL_EQUIPMENT',
               'MEASUREMENTS_PROVIDED',
               'UNKNOWN'
             )
           ),
         CONSTRAINT \`CHK_partial_items_boolean_values\`
           CHECK (
             (\`is_fragile\` IS NULL
               OR \`is_fragile\` IN (0, 1))
             AND (\`requires_disassembly\` IS NULL
               OR \`requires_disassembly\` IN (0, 1))
             AND (\`requires_installation\` IS NULL
               OR \`requires_installation\` IN (0, 1))
             AND (\`requires_packaging\` IS NULL
               OR \`requires_packaging\` IN (0, 1))
           ),
         CONSTRAINT \`CHK_partial_items_dimensions\`
           CHECK (
             (
               \`width_cm\` IS NULL
               AND \`length_cm\` IS NULL
               AND \`height_cm\` IS NULL
             )
             OR (
               \`width_cm\` > 0 AND \`width_cm\` <= 5000
               AND \`length_cm\` > 0
               AND \`length_cm\` <= 5000
               AND \`height_cm\` > 0
               AND \`height_cm\` <= 5000
             )
           ),
         CONSTRAINT \`CHK_partial_items_measurement_semantics\`
           CHECK (
             \`size_class_code\` <> 'MEASUREMENTS_PROVIDED'
             OR (
               \`width_cm\` IS NOT NULL
               AND \`length_cm\` IS NOT NULL
               AND \`height_cm\` IS NOT NULL
             )
           ),
         CONSTRAINT \`CHK_partial_items_weight\`
           CHECK (
             \`approximate_weight_kg\` IS NULL
             OR (
               \`approximate_weight_kg\` > 0
               AND \`approximate_weight_kg\` <= 100000
             )
           ),
         CONSTRAINT \`FK_partial_items_partial_detail\`
           FOREIGN KEY (\`shipment_id\`)
           REFERENCES \`shipment_partial_item_details\`
             (\`shipment_id\`)
           ON DELETE CASCADE ON UPDATE RESTRICT
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
         COLLATE=utf8mb4_unicode_ci`,
    );

    await queryRunner.query(
      `INSERT INTO \`shipment_home_move_details\` (
         \`shipment_id\`,
         \`service_category_code\`,
         \`residence_type_code\`
       )
       SELECT
         \`id\`,
         \`service_category_code\`,
         CASE \`origin_place_type\`
           WHEN 'Daire' THEN 'APARTMENT'
           WHEN 'Apartman Dairesi' THEN 'APARTMENT'
           WHEN 'Site İçi Daire' THEN 'APARTMENT'
           WHEN 'Müstakil Ev' THEN 'DETACHED_HOUSE'
           WHEN 'Villa' THEN 'VILLA'
           ELSE NULL
         END
       FROM \`shipments\`
       WHERE \`service_category_code\` = 'HOME_MOVE'`,
    );
    await queryRunner.query(
      `INSERT INTO \`shipment_office_move_details\` (
         \`shipment_id\`,
         \`service_category_code\`
       )
       SELECT \`id\`, \`service_category_code\`
       FROM \`shipments\`
       WHERE \`service_category_code\` = 'OFFICE_MOVE'`,
    );
    await queryRunner.query(
      `INSERT INTO \`shipment_partial_item_details\` (
         \`shipment_id\`,
         \`service_category_code\`
       )
       SELECT \`id\`, \`service_category_code\`
       FROM \`shipments\`
       WHERE \`service_category_code\` = 'PARTIAL_ITEM'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE `shipment_partial_items`',
    );
    await queryRunner.query(
      'DROP TABLE `shipment_home_move_items`',
    );
    await queryRunner.query(
      'DROP TABLE `shipment_partial_item_details`',
    );
    await queryRunner.query(
      'DROP TABLE `shipment_office_move_details`',
    );
    await queryRunner.query(
      'DROP TABLE `shipment_home_move_details`',
    );
  }
}
