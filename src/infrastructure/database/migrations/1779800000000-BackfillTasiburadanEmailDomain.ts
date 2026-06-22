import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTasiburadanEmailDomain1779800000000 implements MigrationInterface {
  name = 'BackfillTasiburadanEmailDomain1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceDomain(queryRunner, this.oldDomain(), this.newDomain());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.replaceDomain(queryRunner, this.newDomain(), this.oldDomain());
  }

  private oldDomain(): string {
    return ['tasiburada', 'com'].join('.');
  }

  private newDomain(): string {
    return ['tasiburadan', 'com'].join('.');
  }

  private async replaceDomain(queryRunner: QueryRunner, from: string, to: string): Promise<void> {
    const emailTables = ['admins', 'carriers', 'customers'];
    for (const table of emailTables) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(
          `UPDATE \`${table}\` SET \`email\` = REPLACE(\`email\`, ?, ?) WHERE \`email\` LIKE ?`,
          [from, to, `%@${from}`],
        );
      }
    }

    if (await queryRunner.hasTable('platform_settings')) {
      await queryRunner.query(
        `
        UPDATE \`platform_settings\`
        SET \`value\` = REPLACE(\`value\`, ?, ?)
        WHERE \`value\` LIKE ?
        `,
        [from, to, `%@${from}%`],
      );
    }

    if (await queryRunner.hasTable('audit_logs')) {
      await queryRunner.query(
        `
        UPDATE \`audit_logs\`
        SET \`details\` = REPLACE(CAST(\`details\` AS CHAR), ?, ?)
        WHERE CAST(\`details\` AS CHAR) LIKE ?
        `,
        [from, to, `%@${from}%`],
      );
    }
  }
}
