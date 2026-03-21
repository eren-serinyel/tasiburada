import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarrierFoundedYearRequired1763300000003 implements MigrationInterface {
  name = 'CarrierFoundedYearRequired1763300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`carriers\`
      SET \`foundedYear\` = FLOOR(1990 + (RAND() * ((YEAR(CURDATE()) - 1990) + 1)))
      WHERE \`foundedYear\` IS NULL OR \`foundedYear\` < 1900;
    `);

    await queryRunner.query(`
      ALTER TABLE \`carriers\`
      MODIFY \`foundedYear\` int NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`carriers\`
      MODIFY \`foundedYear\` int NULL;
    `);
  }
}
