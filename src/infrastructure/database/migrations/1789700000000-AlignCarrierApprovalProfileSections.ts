import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlignCarrierApprovalProfileSections1789700000000 implements MigrationInterface {
  name = 'AlignCarrierApprovalProfileSections1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('carrier_profile_status');
    if (table && !table.findColumnByName('servicesCompleted')) {
      await queryRunner.addColumn('carrier_profile_status', new TableColumn({
        name: 'servicesCompleted',
        type: 'tinyint',
        width: 1,
        isNullable: false,
        default: 0,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('carrier_profile_status');
    if (table?.findColumnByName('servicesCompleted')) {
      await queryRunner.dropColumn('carrier_profile_status', 'servicesCompleted');
    }
  }
}
