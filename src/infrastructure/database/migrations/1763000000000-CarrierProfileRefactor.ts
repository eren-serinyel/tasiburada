import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierProfileRefactor1763000000000 implements MigrationInterface {
  name = 'CarrierProfileRefactor1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carrier_profile_status\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`companyInfoCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`activityInfoCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`vehiclesCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`documentsCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`earningsCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`securityCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`notificationsCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`overallPercentage\` int NOT NULL DEFAULT 20,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_carrier_profile_status_carrier\` (\`carrierId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_carrier_profile_status_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carrier_activity\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`city\` varchar(120) NOT NULL,
        \`district\` varchar(120) NULL,
        \`address\` text NULL,
        \`serviceAreasJson\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_carrier_activity_carrier\` (\`carrierId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_carrier_activity_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      INSERT INTO \`carrier_activity\` (\`id\`, \`carrierId\`, \`city\`, \`district\`, \`address\`, \`serviceAreasJson\`, \`createdAt\`, \`updatedAt\`)
      SELECT UUID(), c.id,
        COALESCE(NULLIF(TRIM(c.activityCity), ''), 'Belirtilmedi'),
        NULLIF(TRIM(c.activityDistrict), ''),
        c.address,
        c.serviceAreas,
        NOW(), NOW()
      FROM \`carriers\` c
      WHERE (c.activityCity IS NOT NULL OR c.activityDistrict IS NOT NULL OR c.address IS NOT NULL OR c.serviceAreas IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1 FROM \`carrier_activity\` ca WHERE ca.carrierId = c.id
        );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carrier_vehicle_types\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`vehicleTypeId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_carrier_vehicle_types\` (\`carrierId\`, \`vehicleTypeId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_carrier_vehicle_type_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_carrier_vehicle_type_vehicle_type\` FOREIGN KEY (\`vehicleTypeId\`) REFERENCES \`vehicle_types\`(\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carrier_security_settings\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`twoFactorEnabled\` tinyint(1) NOT NULL DEFAULT 0,
        \`suspiciousLoginAlertsEnabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_carrier_security_settings_carrier\` (\`carrierId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_carrier_security_settings_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_channels\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`key\` varchar(60) NOT NULL,
        \`label\` varchar(120) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_notification_channels_key\` (\`key\`),
        PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_types\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`key\` varchar(120) NOT NULL,
        \`group\` varchar(60) NOT NULL,
        \`title\` varchar(180) NOT NULL,
        \`description\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_notification_types_key\` (\`key\`),
        PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`carrier_notification_preferences\` (
        \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`carrierId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`notificationTypeId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`channelId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_carrier_notification_preference\` (\`carrierId\`, \`notificationTypeId\`, \`channelId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_carrier_notification_pref_carrier\` FOREIGN KEY (\`carrierId\`) REFERENCES \`carriers\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_carrier_notification_pref_type\` FOREIGN KEY (\`notificationTypeId\`) REFERENCES \`notification_types\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_carrier_notification_pref_channel\` FOREIGN KEY (\`channelId\`) REFERENCES \`notification_channels\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`INSERT IGNORE INTO \`notification_channels\` (\`id\`, \`key\`, \`label\`) VALUES
      (UUID(), 'EMAIL', 'E-posta'),
      (UUID(), 'SMS', 'SMS'),
      (UUID(), 'APP', 'Uygulama İçi');
    `);

    await queryRunner.query(`INSERT IGNORE INTO \`notification_types\` (\`id\`, \`key\`, \`group\`, \`title\`, \`description\`) VALUES
      (UUID(), 'NEW_OFFER', 'TRANSPORT', 'Yeni Teklif Alındı', 'Yeni tekliflerden haberdar olun'),
      (UUID(), 'OFFER_ACCEPTED', 'TRANSPORT', 'Teklif Kabul Edildi', 'Teklifiniz onaylandığında bildirim alın'),
      (UUID(), 'ROUTE_UPDATED', 'TRANSPORT', 'Rota Güncellendi', 'Rota ve teslim güncellemeleri'),
      (UUID(), 'SECURITY_ALERT', 'SECURITY', 'Güvenlik Uyarıları', 'Şüpheli giriş ve güvenlik bildirimleri'),
      (UUID(), 'SYSTEM_NEWS', 'SYSTEM', 'Sistem Duyuruları', 'Platform duyuruları ve kampanyalar');
    `);

    const docTypeColumn = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'documentType'`);
    if (docTypeColumn.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` CHANGE COLUMN \`documentType\` \`type\` varchar(120) NOT NULL;`);
    }

    const docFilePathColumn = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'filePath'`);
    if (docFilePathColumn.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` CHANGE COLUMN \`filePath\` \`fileUrl\` varchar(500) NOT NULL;`);
    }

    const docIsRequired = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'isRequired'`);
    if (!docIsRequired.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD COLUMN \`isRequired\` tinyint(1) NOT NULL DEFAULT 1 AFTER \`fileUrl\`;`);
    }

    const docStatus = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'status'`);
    if (!docStatus.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD COLUMN \`status\` varchar(32) NOT NULL DEFAULT 'PENDING' AFTER \`isRequired\`;`);
    }

    const docVerifiedAt = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'verifiedAt'`);
    if (!docVerifiedAt.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD COLUMN \`verifiedAt\` datetime NULL AFTER \`uploadedAt\`;`);
    }

    const docCreatedAt = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'createdAt'`);
    if (!docCreatedAt.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD COLUMN \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER \`verifiedAt\`;`);
    }

    const docUpdatedAt = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_documents\` LIKE 'updatedAt'`);
    if (!docUpdatedAt.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_documents\` ADD COLUMN \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER \`createdAt\`;`);
    }

    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`type\` = 'AUTHORIZATION_CERT' WHERE \`type\` = 'K Yetki Belgesi';`);
    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`type\` = 'SRC_CERT' WHERE \`type\` = 'SRC Belgesi';`);
    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`type\` = 'VEHICLE_LICENSE' WHERE \`type\` = 'Araç Ruhsatı';`);
    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`type\` = 'TAX_PLATE' WHERE \`type\` = 'Vergi Levhası';`);
    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`type\` = 'INSURANCE_POLICY' WHERE \`type\` = 'Sigorta Poliçesi';`);

    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`status\` = 'PENDING' WHERE \`status\` IS NULL;`);
    await queryRunner.query(`UPDATE \`carrier_documents\` SET \`uploadedAt\` = COALESCE(\`uploadedAt\`, NOW());`);

    await queryRunner.query(`UPDATE \`carrier_earnings\` SET \`bankName\` = COALESCE(\`bankName\`, ''), \`iban\` = COALESCE(\`iban\`, ''), \`accountHolder\` = COALESCE(\`accountHolder\`, '');`);
    const earningsAccountHolder = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_earnings\` LIKE 'accountHolder'`);
    if (earningsAccountHolder.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_earnings\` CHANGE COLUMN \`accountHolder\` \`accountHolderTitle\` varchar(255) NOT NULL;`);
    }

    const earningsBankName = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_earnings\` LIKE 'bankName'`);
    if (earningsBankName.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_earnings\` MODIFY \`bankName\` varchar(255) NOT NULL;`);
    }

    const earningsIban = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_earnings\` LIKE 'iban'`);
    if (earningsIban.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_earnings\` MODIFY \`iban\` varchar(34) NOT NULL;`);
    }

    const earningsTotal = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_earnings\` LIKE 'totalEarnings'`);
    if (earningsTotal.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_earnings\` DROP COLUMN \`totalEarnings\`;`);
    }

    const earningsLastPayment = await queryRunner.query(`SHOW COLUMNS FROM \`carrier_earnings\` LIKE 'lastPaymentDate'`);
    if (earningsLastPayment.length) {
      await queryRunner.query(`ALTER TABLE \`carrier_earnings\` DROP COLUMN \`lastPaymentDate\`;`);
    }

    const dropColumnIfExists = async (table: string, column: string) => {
      const result = await queryRunner.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
      if (result.length) {
        await queryRunner.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\`;`);
      }
    };

    await dropColumnIfExists('carriers', 'bankName');
    await dropColumnIfExists('carriers', 'iban');
    await dropColumnIfExists('carriers', 'accountHolder');
    await dropColumnIfExists('carriers', 'activityCity');
    await dropColumnIfExists('carriers', 'activityDistrict');
    await dropColumnIfExists('carriers', 'address');
    await dropColumnIfExists('carriers', 'serviceAreas');

    await queryRunner.query(`
      INSERT INTO \`carrier_profile_status\` (\`id\`, \`carrierId\`, \`overallPercentage\`, \`createdAt\`, \`updatedAt\`)
      SELECT UUID(), c.id, COALESCE(c.profileCompletion, 20), NOW(), NOW()
      FROM \`carriers\` c
      WHERE NOT EXISTS (
        SELECT 1 FROM \`carrier_profile_status\` cps WHERE cps.carrierId = c.id
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `carrier_notification_preferences`');
    await queryRunner.query('DROP TABLE IF EXISTS `notification_types`');
    await queryRunner.query('DROP TABLE IF EXISTS `notification_channels`');
    await queryRunner.query('DROP TABLE IF EXISTS `carrier_security_settings`');
    await queryRunner.query('DROP TABLE IF EXISTS `carrier_vehicle_types`');
    await queryRunner.query('DROP TABLE IF EXISTS `carrier_activity`');
    await queryRunner.query('DROP TABLE IF EXISTS `carrier_profile_status`');
  }
}
