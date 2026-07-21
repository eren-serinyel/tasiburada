import type { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY_EXTRA_SERVICE_CODE_BY_NAME = new Map<string, string>([
  ['Asansörlü Taşıma', 'ELEVATOR_TRANSPORT'],
  ['Profesyonel Paketleme', 'PROFESSIONAL_PACKING'],
  ['Montaj/Demontaj', 'ASSEMBLY_DISASSEMBLY'],
  ['Geçici depolama', 'TEMPORARY_STORAGE'],
  ['Piyano Taşıma', 'PIANO_TRANSPORT'],
  ['Ambalajlama', 'PACKAGING'],
  ['Beyaz Eşya Kurulumu', 'APPLIANCE_INSTALLATION'],
  ['Server/IT özel taşıma', 'IT_SPECIAL_TRANSPORT'],
  ['Kablo etiketleme', 'CABLE_LABELING'],
  ['Kurumsal sigorta', 'CORPORATE_INSURANCE'],
  ['Ek sigorta', 'ADDITIONAL_INSURANCE'],
  ['Hafta sonu teslimat', 'WEEKEND_DELIVERY'],
  ['Kat arası taşıma', 'FLOOR_TO_FLOOR_TRANSPORT'],
]);

type ExistingCatalogState =
  | { kind: 'EMPTY' }
  | {
      kind: 'LEGACY_13';
      rows: Array<{ id: string; name: string; code: string }>;
    };

const classifyExistingCatalog = (
  rows: Array<{ id: unknown; name: unknown }>,
): ExistingCatalogState => {
  if (rows.length === 0) return { kind: 'EMPTY' };

  if (rows.length !== LEGACY_EXTRA_SERVICE_CODE_BY_NAME.size) {
    throw new Error(
      '7.1-C migration prevalidation failed: expected an empty catalog or the exact 13-row legacy catalog',
    );
  }

  const seenNames = new Set<string>();
  const classifiedRows = rows.map((row) => {
    const id = String(row.id);
    const name = String(row.name);
    const code = LEGACY_EXTRA_SERVICE_CODE_BY_NAME.get(name);
    if (!code || seenNames.has(name)) {
      throw new Error(
        '7.1-C migration prevalidation failed: legacy catalog contains an unknown, duplicate, or case-mismatched name',
      );
    }
    seenNames.add(name);
    return { id, name, code };
  });

  if (seenNames.size !== LEGACY_EXTRA_SERVICE_CODE_BY_NAME.size) {
    throw new Error(
      '7.1-C migration prevalidation failed: legacy catalog mapping is incomplete',
    );
  }

  return { kind: 'LEGACY_13', rows: classifiedRows };
};

export class NormalizeAndExpandExtraServiceCatalog71C1784820000000
implements MigrationInterface {
  readonly name =
    'NormalizeAndExpandExtraServiceCatalog71C1784820000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT id, name
         FROM extra_services
        ORDER BY BINARY name, BINARY id`,
    ) as Array<{ id: unknown; name: unknown }>;
    const state = classifyExistingCatalog(rows);

    await queryRunner.query(
      `ALTER TABLE extra_services
         ADD COLUMN code VARCHAR(64)
           CHARACTER SET ascii COLLATE ascii_bin NULL
           AFTER id`,
    );

    if (state.kind === 'LEGACY_13') {
      for (const row of state.rows) {
        await queryRunner.query(
          `UPDATE extra_services
              SET code = ?
            WHERE id = ?
              AND BINARY name = BINARY ?
              AND code IS NULL`,
          [row.code, row.id, row.name],
        );
      }
    }

    const codeRows = await queryRunner.query(
      'SELECT `code` FROM `extra_services` ORDER BY BINARY `code`',
    ) as Array<{ code: unknown }>;
    const codes = codeRows.map((row) =>
      row.code === null || row.code === undefined ? null : String(row.code),
    );
    const nonNullCodes = codes.filter((code): code is string => code !== null);
    if (
      codes.some((code) => code === null) ||
      new Set(nonNullCodes).size !== nonNullCodes.length ||
      nonNullCodes.some((code) => !/^[A-Z0-9_]+$/.test(code))
    ) {
      throw new Error(
        '7.1-C migration backfill verification failed: code must be non-null, unique uppercase ASCII',
      );
    }

    await queryRunner.query(
      `ALTER TABLE extra_services
         MODIFY COLUMN code VARCHAR(64)
           CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
         ADD CONSTRAINT UQ_extra_services_code UNIQUE (code)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE extra_services
         DROP INDEX UQ_extra_services_code,
         DROP COLUMN code`,
    );
  }
}
