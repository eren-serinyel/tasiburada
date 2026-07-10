import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

type ActivityRow = {
  carrierId: string;
  serviceAreasJson: unknown;
};

const SCOPE_BY_TOKEN: Record<string, string> = {
  sehirici: 'Şehir İçi',
  'şehir içi': 'Şehir İçi',
  'şehiriçi': 'Şehir İçi',
  sehirlerarasi: 'Şehirler Arası',
  'şehirler arası': 'Şehirler Arası',
  'şehirlerarası': 'Şehirler Arası',
};

export class NormalizeCarrierOnboardingData1789600000000 implements MigrationInterface {
  name = 'NormalizeCarrierOnboardingData1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`
      SELECT IS_NULLABLE AS isNullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'carrier_vehicles'
        AND COLUMN_NAME = 'capacity_kg'
    `) as Array<{ isNullable: 'YES' | 'NO' }>;

    if (columns[0]?.isNullable === 'NO') {
      await queryRunner.query('ALTER TABLE `carrier_vehicles` MODIFY `capacity_kg` int NULL');
    }

    const activities = await queryRunner.query(`
      SELECT carrierId, serviceAreasJson
      FROM carrier_activity
      WHERE serviceAreasJson IS NOT NULL
    `) as ActivityRow[];

    for (const activity of activities) {
      const serviceAreas = this.parseStringArray(activity.serviceAreasJson);
      const scopeNames = Array.from(new Set(
        serviceAreas
          .map(value => SCOPE_BY_TOKEN[value.trim().toLocaleLowerCase('tr-TR')])
          .filter((value): value is string => Boolean(value)),
      ));

      if (scopeNames.length === 0) continue;

      const cleanedServiceAreas = serviceAreas.filter(
        value => !SCOPE_BY_TOKEN[value.trim().toLocaleLowerCase('tr-TR')],
      );

      for (const scopeName of scopeNames) {
        let scopeRows = await queryRunner.query(
          'SELECT id FROM `scope_of_work` WHERE `name` = ? LIMIT 1',
          [scopeName],
        ) as Array<{ id: string }>;

        if (scopeRows.length === 0) {
          const scopeId = randomUUID();
          await queryRunner.query(
            'INSERT INTO `scope_of_work` (`id`, `name`, `status`) VALUES (?, ?, ?)',
            [scopeId, scopeName, 'ACTIVE'],
          );
          scopeRows = [{ id: scopeId }];
        }

        await queryRunner.query(
          'INSERT IGNORE INTO `carrier_scope_of_work` (`id`, `carrierId`, `scopeId`) VALUES (?, ?, ?)',
          [randomUUID(), activity.carrierId, scopeRows[0].id],
        );
      }

      await queryRunner.query(
        'UPDATE `carrier_activity` SET `serviceAreasJson` = ? WHERE `carrierId` = ?',
        [JSON.stringify(cleanedServiceAreas), activity.carrierId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE `carrier_vehicles` SET `capacity_kg` = 0 WHERE `capacity_kg` IS NULL');
    await queryRunner.query('ALTER TABLE `carrier_vehicles` MODIFY `capacity_kg` int NOT NULL');
    // Scope/region cleanup is intentionally not reversed: recreating invalid mixed data would be unsafe.
  }

  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.map(item => String(item).trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
