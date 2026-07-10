import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureCarrierTaxNumberUnique1789400000000 implements MigrationInterface {
  name = 'EnsureCarrierTaxNumberUnique1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('carriers');
    if (!table) return;

    const taxNumberColumn = table.findColumnByName('taxNumber');
    if (!taxNumberColumn) return;

    const hasUniqueTaxNumberIndex = table.indices.some((index) =>
      index.isUnique
      && index.columnNames.length === 1
      && index.columnNames[0] === 'taxNumber',
    );
    if (hasUniqueTaxNumberIndex) return;

    const duplicateRows = await queryRunner.query(`
      SELECT taxNumber, COUNT(*) AS duplicateCount
      FROM \`carriers\`
      WHERE taxNumber IS NOT NULL AND TRIM(taxNumber) != ''
      GROUP BY taxNumber
      HAVING COUNT(*) > 1
      LIMIT 10
    `) as Array<{ taxNumber: string; duplicateCount: string | number }>;

    if (duplicateRows.length > 0) {
      const sample = duplicateRows
        .map((row) => `${row.taxNumber} (${row.duplicateCount})`)
        .join(', ');
      throw new Error(`Cannot add unique index to carriers.taxNumber; duplicate values exist: ${sample}`);
    }

    await queryRunner.query('CREATE UNIQUE INDEX `IDX_carriers_taxNumber_unique` ON `carriers` (`taxNumber`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('carriers');
    if (!table) return;

    const index = table.indices.find((candidate) => candidate.name === 'IDX_carriers_taxNumber_unique');
    if (index) {
      await queryRunner.query('DROP INDEX `IDX_carriers_taxNumber_unique` ON `carriers`');
    }
  }
}
