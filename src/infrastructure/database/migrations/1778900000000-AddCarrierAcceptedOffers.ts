import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCarrierAcceptedOffers1778900000000 implements MigrationInterface {
  name = 'AddCarrierAcceptedOffers1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAcceptedOffers = await queryRunner.hasColumn('carriers', 'acceptedOffers');
    if (!hasAcceptedOffers) {
      await queryRunner.addColumn('carriers', new TableColumn({
        name: 'acceptedOffers',
        type: 'int',
        isNullable: false,
        default: 0,
      }));
    }

    await queryRunner.query(`
      UPDATE carriers c
      SET c.acceptedOffers = (
        SELECT COUNT(*)
        FROM offers o
        WHERE o.carrierId = c.id
          AND o.status IN ('accepted', 'completed')
      )
    `);

    await queryRunner.query(`
      UPDATE carriers
      SET successRate = CASE
        WHEN acceptedOffers > 0 THEN ROUND((completedShipments / acceptedOffers) * 100, 2)
        ELSE 0
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAcceptedOffers = await queryRunner.hasColumn('carriers', 'acceptedOffers');
    if (hasAcceptedOffers) {
      await queryRunner.dropColumn('carriers', 'acceptedOffers');
    }
  }
}
