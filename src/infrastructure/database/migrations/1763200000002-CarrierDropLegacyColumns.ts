import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierDropLegacyColumns1763200000002 implements MigrationInterface {
  name = 'CarrierDropLegacyColumns1763200000002';

  private async columnExists(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SHOW COLUMNS FROM \`carriers\` LIKE '${column}'`
    );
    return Array.isArray(result) && result.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnsToDrop = [
      'serviceTypes',
      'city',
      'district',
      'description',
      'activityCity',
      'activityDistrict',
      'address',
      'serviceAreas',
      'lastDocumentUpdate'
    ];

    for (const column of columnsToDrop) {
      if (await this.columnExists(queryRunner, column)) {
        await queryRunner.query(`ALTER TABLE \`carriers\` DROP COLUMN \`${column}\``);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const addColumnIfMissing = async (column: string, ddl: string) => {
      if (!(await this.columnExists(queryRunner, column))) {
        await queryRunner.query(`ALTER TABLE \`carriers\` ADD COLUMN \`${column}\` ${ddl}`);
      }
    };

    await addColumnIfMissing('serviceTypes', 'json NULL');
    await addColumnIfMissing('city', 'varchar(100) NULL');
    await addColumnIfMissing('district', 'varchar(100) NULL');
    await addColumnIfMissing('description', 'text NULL');
    await addColumnIfMissing('activityCity', 'varchar(100) NULL');
    await addColumnIfMissing('activityDistrict', 'varchar(100) NULL');
    await addColumnIfMissing('address', 'text NULL');
    await addColumnIfMissing('serviceAreas', 'json NULL');
    await addColumnIfMissing('lastDocumentUpdate', 'datetime NULL');
  }
}
