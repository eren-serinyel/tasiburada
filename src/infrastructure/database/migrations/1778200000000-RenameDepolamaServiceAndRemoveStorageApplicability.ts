import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDepolamaServiceAndRemoveStorageApplicability1778200000000 implements MigrationInterface {
  name = 'RenameDepolamaServiceAndRemoveStorageApplicability1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE extra_services SET name = 'Geçici depolama' WHERE name = 'Depolama'`,
    );

    await queryRunner.query(
      `DELETE FROM extra_service_applicability
       WHERE extra_service_id = (SELECT id FROM extra_services WHERE name = 'Geçici depolama')
       AND load_type = 'STORAGE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE extra_services SET name = 'Depolama' WHERE name = 'Geçici depolama'`,
    );

    await queryRunner.query(
      `INSERT INTO extra_service_applicability
       (id, extra_service_id, load_type, is_default_visible, is_recommended_by_converter, sort_order, created_at, updated_at)
       SELECT UUID(), es.id, 'STORAGE', 1, 0, 1, NOW(), NOW()
       FROM extra_services es
       WHERE es.name = 'Depolama'
       AND NOT EXISTS (
         SELECT 1
         FROM extra_service_applicability esa
         WHERE esa.extra_service_id = es.id AND esa.load_type = 'STORAGE'
       )`,
    );
  }
}
