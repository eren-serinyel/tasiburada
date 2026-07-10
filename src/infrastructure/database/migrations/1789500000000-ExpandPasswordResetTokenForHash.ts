import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPasswordResetTokenForHash1789500000000 implements MigrationInterface {
  name = 'ExpandPasswordResetTokenForHash1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ['customers', 'carriers']) {
      const table = await queryRunner.getTable(tableName);
      const resetTokenColumn = table?.findColumnByName('resetToken');
      if (!resetTokenColumn) continue;

      await queryRunner.query(`UPDATE \`${tableName}\` SET \`resetToken\` = NULL, \`resetTokenExpiry\` = NULL WHERE \`resetToken\` IS NOT NULL`);

      const needsAlter = resetTokenColumn.length !== '64' || resetTokenColumn.type.toLowerCase() !== 'varchar';
      if (needsAlter) {
        await queryRunner.query(`ALTER TABLE \`${tableName}\` MODIFY \`resetToken\` varchar(64) NULL`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ['customers', 'carriers']) {
      const table = await queryRunner.getTable(tableName);
      const resetTokenColumn = table?.findColumnByName('resetToken');
      if (!resetTokenColumn) continue;

      await queryRunner.query(`UPDATE \`${tableName}\` SET \`resetToken\` = NULL, \`resetTokenExpiry\` = NULL WHERE \`resetToken\` IS NOT NULL`);
      if (resetTokenColumn.length !== '10' || resetTokenColumn.type.toLowerCase() !== 'varchar') {
        await queryRunner.query(`ALTER TABLE \`${tableName}\` MODIFY \`resetToken\` varchar(10) NULL`);
      }
    }
  }
}
