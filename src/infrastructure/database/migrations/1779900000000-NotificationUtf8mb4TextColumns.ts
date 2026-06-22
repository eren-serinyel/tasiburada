import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationUtf8mb4TextColumns1779900000000 implements MigrationInterface {
  name = 'NotificationUtf8mb4TextColumns1779900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `notifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    await queryRunner.query(
      'ALTER TABLE `notifications` ' +
        'MODIFY `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ' +
        'MODIFY `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ' +
        'MODIFY `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `notifications` ' +
        'MODIFY `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ' +
        'MODIFY `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, ' +
        'MODIFY `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL',
    );
  }
}
