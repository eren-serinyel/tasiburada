import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShipmentInviteRequestedServices1779400000000 implements MigrationInterface {
  name = 'AddShipmentInviteRequestedServices1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRequestedServices = await queryRunner.hasColumn('shipment_invites', 'requestedServices');
    if (!hasRequestedServices) {
      await queryRunner.addColumn('shipment_invites', new TableColumn({
        name: 'requestedServices',
        type: 'json',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasRequestedServices = await queryRunner.hasColumn('shipment_invites', 'requestedServices');
    if (hasRequestedServices) {
      await queryRunner.dropColumn('shipment_invites', 'requestedServices');
    }
  }
}
