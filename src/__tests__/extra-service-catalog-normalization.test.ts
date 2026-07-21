import { createHash } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import {
  EXTRA_SERVICE_APPLICABILITY_SEED,
  EXTRA_SERVICE_CATALOG_MANIFEST,
} from '../application/services/extra-services/extraServiceApplicability';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { withSeedDataSource } from '../database/seed/seedDataSource';
import { ExtraServiceLoadType } from '../domain/entities/ExtraServiceApplicability';
import { NormalizeAndExpandExtraServiceCatalog71C1784820000000 } from '../infrastructure/database/canonical-migrations/1784820000000-NormalizeAndExpandExtraServiceCatalog71C';
import { canonicalDataSourceOptions } from '../infrastructure/database/canonical/canonicalDataSource';
import { CANONICAL_MIGRATIONS } from '../infrastructure/database/canonical/canonicalMigrationRegistry';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
} from '../infrastructure/database/disposable/disposableMysqlHarness';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from '../infrastructure/database/disposable/schemaIntrospection';

const ZERO_DATABASE = 'tasiburada_71c_zero_20260721_test';
const UPGRADE_DATABASE = 'tasiburada_71c_upgrade_20260721_test';
const LEGACY_CATALOG = EXTRA_SERVICE_CATALOG_MANIFEST.slice(0, 13);
const sha256 = (value: unknown): string => createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');

const legacyRows = () => LEGACY_CATALOG.map((entry, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: entry.name,
}));

describe('7.1-C extra-service catalog normalization', () => {
  test('declares exact 34-row catalog, statuses, codes and canonical applicability', () => {
    expect(EXTRA_SERVICE_CATALOG_MANIFEST).toHaveLength(34);
    expect(new Set(EXTRA_SERVICE_CATALOG_MANIFEST.map((entry) => entry.code)).size).toBe(34);
    expect(new Set(EXTRA_SERVICE_CATALOG_MANIFEST.map((entry) => entry.name)).size).toBe(34);
    expect(EXTRA_SERVICE_CATALOG_MANIFEST.every((entry) => /^[A-Z0-9_]+$/.test(entry.code))).toBe(true);
    expect(EXTRA_SERVICE_CATALOG_MANIFEST.filter((entry) => entry.status === 'INACTIVE').map((entry) => entry.code)).toEqual([
      'CORPORATE_INSURANCE',
      'ADDITIONAL_INSURANCE',
    ]);
    expect(EXTRA_SERVICE_APPLICABILITY_SEED).toHaveLength(89);
    expect(new Set(EXTRA_SERVICE_APPLICABILITY_SEED.map((rule) => `${rule.code}|${rule.loadType}`)).size).toBe(89);
    expect(EXTRA_SERVICE_APPLICABILITY_SEED.filter((rule) => rule.code === 'PROFESSIONAL_PACKING').map((rule) => rule.loadType)).toEqual([
      ExtraServiceLoadType.HOME,
      ExtraServiceLoadType.OFFICE,
      ExtraServiceLoadType.PARTIAL,
    ]);
    expect(EXTRA_SERVICE_APPLICABILITY_SEED.some((rule) => rule.loadType === ExtraServiceLoadType.STORAGE)).toBe(false);
    expect(CANONICAL_MIGRATIONS[4]).toBe(NormalizeAndExpandExtraServiceCatalog71C1784820000000);
  });

  test('migration accepts EMPTY and exact LEGACY_13 while preserving IDs and avoiding row replacement', async () => {
    const emptyQuery = jest.fn(async (statement: string) => {
      if (statement.includes('SELECT id, name')) return [];
      if (statement.includes('SELECT `code`')) return [];
      return [];
    });
    await new NormalizeAndExpandExtraServiceCatalog71C1784820000000().up({
      query: emptyQuery,
    } as unknown as QueryRunner);
    expect(emptyQuery.mock.calls.some(([statement]) => /^\s*UPDATE\b/i.test(statement))).toBe(false);

    const rows = legacyRows();
    const codeByName = new Map(LEGACY_CATALOG.map((entry) => [entry.name, entry.code]));
    const legacyQuery = jest.fn(async (statement: string, _parameters?: unknown[]) => {
      if (statement.includes('SELECT id, name')) return rows;
      if (statement.includes('SELECT `code`')) {
        return LEGACY_CATALOG.map((entry) => ({ code: entry.code }));
      }
      return [];
    });
    await new NormalizeAndExpandExtraServiceCatalog71C1784820000000().up({
      query: legacyQuery,
    } as unknown as QueryRunner);

    const updateCalls = legacyQuery.mock.calls.filter(([statement]) => /^\s*UPDATE\b/i.test(statement));
    expect(updateCalls).toHaveLength(13);
    expect(updateCalls.map(([, parameters]) => parameters)).toEqual(
      rows.map((row) => [codeByName.get(row.name), row.id, row.name]),
    );
    const sql = legacyQuery.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).not.toMatch(/\b(?:INSERT|DELETE)\b/i);
    expect(sql).not.toMatch(/shipment_extra_services|carrier_extra_services|carrier_extra_service_capabilities/i);
  });

  test.each([
    ['partial catalog', legacyRows().slice(0, 12)],
    ['unknown extra row', [...legacyRows(), { id: 'extra', name: 'Unknown' }]],
    ['case mismatch', legacyRows().map((row, index) => index === 3 ? { ...row, name: 'Geçici Depolama' } : row)],
  ])('rejects %s before first DDL', async (_label, rows) => {
    const query = jest.fn(async (_statement: string) => rows);
    await expect(
      new NormalizeAndExpandExtraServiceCatalog71C1784820000000().up({
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow('prevalidation failed');
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toMatch(/^SELECT|^\s*SELECT/);
    expect(String(query.mock.calls[0][0])).not.toMatch(/\b(?:ALTER|UPDATE|INSERT|DELETE)\b/i);
  });
});

type ProtocolMode = 'from-zero' | 'seeded-upgrade';

const initializeProtocolDataSource = async (
  migrations: readonly (new () => unknown)[],
): Promise<DataSource> => {
  const dataSource = new DataSource({
    ...canonicalDataSourceOptions(process.env, { loadEntities: true }),
    migrations: [...migrations] as never[],
  });
  await dataSource.initialize();
  await dataSource.query(`SET SESSION time_zone = '+00:00'`);
  return dataSource;
};

const validateCatalogContract = async (dataSource: DataSource): Promise<void> => {
  const catalog = await dataSource.query(
    'SELECT code, name, status, sort_order AS sortOrder FROM extra_services ORDER BY sort_order, code',
  );
  expect(catalog.map((row: any) => ({
    code: String(row.code),
    name: String(row.name),
    status: String(row.status),
    sortOrder: Number(row.sortOrder),
  }))).toEqual(EXTRA_SERVICE_CATALOG_MANIFEST.map((entry) => ({
    code: entry.code,
    name: entry.name,
    status: entry.status,
    sortOrder: entry.sortOrder,
  })));

  const applicability = await dataSource.query(
    `SELECT es.code, esa.load_type AS loadType
       FROM extra_service_applicability esa
       JOIN extra_services es ON es.id = esa.extra_service_id
      WHERE esa.load_type IN ('HOME', 'OFFICE', 'PARTIAL')
      ORDER BY es.code, esa.load_type`,
  );
  expect(applicability.map((row: any) => `${row.code}|${row.loadType}`)).toEqual(
    [...EXTRA_SERVICE_APPLICABILITY_SEED]
      .sort((left, right) =>
        left.code < right.code
          ? -1
          : left.code > right.code
            ? 1
            : left.loadType < right.loadType
              ? -1
              : left.loadType > right.loadType
                ? 1
                : 0,
      )
      .map((rule) => `${rule.code}|${rule.loadType}`),
  );

  const codeRows = await dataSource.query(
    'SELECT code FROM extra_services ORDER BY code',
  );
  const codes = codeRows.map((row: any) => String(row.code));
  expect(codes.every((code: string) => /^[A-Z0-9_]+$/.test(code))).toBe(true);
  expect(new Set(codes).size).toBe(codes.length);
  expect(await dataSource.query(
    'SELECT name FROM extra_services GROUP BY name HAVING COUNT(*) > 1',
  )).toEqual([]);
  expect(await dataSource.query(
    `SELECT esa.id
       FROM extra_service_applicability esa
       LEFT JOIN extra_services es ON es.id = esa.extra_service_id
      WHERE es.id IS NULL`,
  )).toEqual([]);
  expect(await dataSource.query(
    `SELECT extra_service_id, load_type
       FROM extra_service_applicability
      GROUP BY extra_service_id, load_type
     HAVING COUNT(*) > 1`,
  )).toEqual([]);
  const storage = await dataSource.query(
    `SELECT es.code
       FROM extra_service_applicability esa
       JOIN extra_services es ON es.id = esa.extra_service_id
      WHERE esa.load_type = 'STORAGE'
      ORDER BY es.code`,
  );
  expect(storage.map((row: any) => String(row.code)).every((code: string) => [
    'ADDITIONAL_INSURANCE',
    'WEEKEND_DELIVERY',
  ].includes(code))).toBe(true);

  const columnRows = await dataSource.query(
    `SELECT CHARACTER_SET_NAME AS characterSet,
            COLLATION_NAME AS collation,
            IS_NULLABLE AS isNullable,
            CHARACTER_MAXIMUM_LENGTH AS maxLength
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'extra_services'
        AND COLUMN_NAME = 'code'`,
  );
  expect(columnRows).toHaveLength(1);
  expect(columnRows[0]).toEqual(expect.objectContaining({
    characterSet: 'ascii',
    collation: 'ascii_bin',
    isNullable: 'NO',
  }));
  const maxLength = Number(columnRows[0].maxLength);
  expect(Number.isFinite(maxLength)).toBe(true);
  expect(maxLength).toBe(64);
  const migrationNames = (await dataSource.query(
    'SELECT name FROM migrations ORDER BY timestamp, id, name',
  )).map((row: any) => String(row.name));
  expect(migrationNames).toEqual(CANONICAL_MIGRATIONS.map((migration) => migration.name));
  expect(await dataSource.showMigrations()).toBe(false);
};

const relationSnapshot = async (dataSource: DataSource) => {
  const specs = [
    ['shipment_extra_services', ['shipment_id', 'extra_service_id']],
    ['carrier_extra_services', ['carrier_id', 'extra_service_id']],
    ['carrier_extra_service_capabilities', ['id', 'carrier_id', 'extra_service_id', 'load_type']],
  ] as const;
  const snapshot: Record<string, { count: number; hash: string }> = {};
  for (const [table, columns] of specs) {
    const rows = await dataSource.query(
      `SELECT ${columns.join(',')} FROM ${table} ORDER BY ${columns.join(',')}`,
    );
    const keys = rows.map((row: any) => columns.map((column) => String(row[column])).join('|'));
    snapshot[table] = { count: keys.length, hash: sha256(keys) };
  }
  return snapshot;
};

const existingIdSnapshot = async (dataSource: DataSource, hasCode: boolean) => {
  const expectedByName = new Map(LEGACY_CATALOG.map((entry) => [entry.name, entry.code]));
  const expectedByCode = new Map(LEGACY_CATALOG.map((entry) => [entry.code, entry.name]));
  const legacyCodes = LEGACY_CATALOG.map((entry) => entry.code);
  const rows = await dataSource.query(
    hasCode
      ? `SELECT id, name, code
           FROM extra_services
          WHERE code IN (${legacyCodes.map(() => '?').join(', ')})
          ORDER BY code`
      : 'SELECT id, name FROM extra_services ORDER BY BINARY name',
    hasCode ? legacyCodes : [],
  );
  expect(rows).toHaveLength(13);

  const snapshot = rows.map((row: any) => {
    const id = String(row.id);
    const name = String(row.name);
    const code = hasCode ? String(row.code) : expectedByName.get(name);
    expect(code).toBeDefined();
    expect(expectedByCode.get(code as string)).toBe(name);
    return { code: code as string, id, name };
  });
  expect(new Set(snapshot.map((row) => row.code)).size).toBe(13);
  expect(new Set(snapshot.map((row) => row.name)).size).toBe(13);
  expect(new Set(snapshot.map((row) => row.id)).size).toBe(13);

  return snapshot.sort((left, right) =>
    left.code < right.code ? -1 : left.code > right.code ? 1 : 0,
  );
};

const LEGACY_LOAD_TYPES: Record<string, readonly ExtraServiceLoadType[]> = {
  ELEVATOR_TRANSPORT: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE],
  PROFESSIONAL_PACKING: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL],
  ASSEMBLY_DISASSEMBLY: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE],
  TEMPORARY_STORAGE: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE],
  PIANO_TRANSPORT: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.PARTIAL],
  PACKAGING: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL],
  APPLIANCE_INSTALLATION: [ExtraServiceLoadType.HOME],
  IT_SPECIAL_TRANSPORT: [ExtraServiceLoadType.OFFICE],
  CABLE_LABELING: [ExtraServiceLoadType.OFFICE],
  CORPORATE_INSURANCE: [ExtraServiceLoadType.OFFICE],
  ADDITIONAL_INSURANCE: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL, ExtraServiceLoadType.STORAGE],
  WEEKEND_DELIVERY: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL, ExtraServiceLoadType.STORAGE],
  FLOOR_TO_FLOOR_TRANSPORT: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE],
};

const insertLegacyFixture = async (dataSource: DataSource): Promise<void> => {
  const idByCode = new Map<string, string>();
  for (const [index, entry] of LEGACY_CATALOG.entries()) {
    const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    idByCode.set(entry.code, id);
    await dataSource.query(
      'INSERT INTO extra_services (id, name, description, status, sort_order) VALUES (?, ?, NULL, ?, ?)',
      [id, entry.name, 'ACTIVE', entry.sortOrder],
    );
  }

  let ruleIndex = 0;
  for (const entry of LEGACY_CATALOG) {
    for (const loadType of LEGACY_LOAD_TYPES[entry.code]) {
      ruleIndex += 1;
      await dataSource.query(
        `INSERT INTO extra_service_applicability
           (id, extra_service_id, load_type, is_default_visible, is_recommended_by_converter, sort_order)
         VALUES (?, ?, ?, 1, 0, 1)`,
        [
          `10000000-0000-4000-8000-${String(ruleIndex).padStart(12, '0')}`,
          idByCode.get(entry.code),
          loadType,
        ],
      );
    }
  }

  const customerId = '20000000-0000-4000-8000-000000000001';
  const carrierId = '30000000-0000-4000-8000-000000000001';
  const shipmentId = '40000000-0000-4000-8000-000000000001';
  await dataSource.query(
    'INSERT INTO customers (id, firstName, lastName, email, passwordHash) VALUES (?, ?, ?, ?, ?)',
    [customerId, 'Fixture', 'Customer', 'fixture-customer@example.invalid', 'fixture'],
  );
  await dataSource.query(
    `INSERT INTO carriers
       (id, companyName, taxNumber, phone, email, passwordHash, foundedYear)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [carrierId, 'Fixture Carrier', '0000000000', '0000000000', 'fixture-carrier@example.invalid', 'fixture', 2020],
  );
  await dataSource.query(
    'INSERT INTO shipments (id, load_details, shipment_date, customer_id) VALUES (?, ?, ?, ?)',
    [shipmentId, '7.1-C disposable fixture', '2026-08-01', customerId],
  );
  await dataSource.query(
    'INSERT INTO shipment_extra_services (shipment_id, extra_service_id) VALUES (?, ?)',
    [shipmentId, idByCode.get('PIANO_TRANSPORT')],
  );
  await dataSource.query(
    'INSERT INTO carrier_extra_services (carrier_id, extra_service_id) VALUES (?, ?)',
    [carrierId, idByCode.get('ELEVATOR_TRANSPORT')],
  );
  await dataSource.query(
    `INSERT INTO carrier_extra_service_capabilities
       (id, carrier_id, extra_service_id, load_type, is_active)
     VALUES (?, ?, ?, 'PARTIAL', 1)`,
    ['50000000-0000-4000-8000-000000000001', carrierId, idByCode.get('PROFESSIONAL_PACKING')],
  );
};

const runDisposableProtocol = async (mode: ProtocolMode): Promise<void> => {
  const target = mode === 'from-zero' ? ZERO_DATABASE : UPGRADE_DATABASE;
  if (
    process.env.NODE_ENV !== 'test' ||
    !['localhost', '127.0.0.1', '::1'].includes(String(process.env.DB_HOST).toLowerCase()) ||
    process.env.DB_NAME !== target ||
    process.env.CANONICAL_DB_NAME !== target ||
    process.env.DISPOSABLE_DB_NAME !== target ||
    process.env.SKIP_DB_TESTS === 'true'
  ) {
    throw new Error('7.1-C disposable protocol environment gate failed');
  }

  let created = false;
  let dataSource: DataSource | undefined;
  try {
    await createDisposableDatabase(process.env, target);
    created = true;

    if (mode === 'from-zero') {
      dataSource = await initializeProtocolDataSource(CANONICAL_MIGRATIONS);
      const applied = await dataSource.runMigrations({ transaction: 'none' });
      expect(applied.map((migration) => migration.name)).toEqual(
        CANONICAL_MIGRATIONS.map((migration) => migration.name),
      );
    } else {
      dataSource = await initializeProtocolDataSource(CANONICAL_MIGRATIONS.slice(0, 4));
      const firstApplied = await dataSource.runMigrations({ transaction: 'none' });
      expect(firstApplied).toHaveLength(4);
      await insertLegacyFixture(dataSource);
      const beforeIds = await existingIdSnapshot(dataSource, false);
      const beforeRelations = await relationSnapshot(dataSource);
      await dataSource.destroy();

      dataSource = await initializeProtocolDataSource(CANONICAL_MIGRATIONS);
      const applied = await dataSource.runMigrations({ transaction: 'none' });
      expect(applied.map((migration) => migration.name)).toEqual([
        NormalizeAndExpandExtraServiceCatalog71C1784820000000.name,
      ]);
      await withSeedDataSource(dataSource, () => seedExtraServices());
      expect(await existingIdSnapshot(dataSource, true)).toEqual(beforeIds);
      expect(await relationSnapshot(dataSource)).toEqual(beforeRelations);
    }

    await withSeedDataSource(dataSource, () => seedExtraServices());
    const beforeSecondSeed = {
      catalog: Number((await dataSource.query('SELECT COUNT(*) AS count FROM extra_services'))[0].count),
      applicability: Number((await dataSource.query('SELECT COUNT(*) AS count FROM extra_service_applicability'))[0].count),
    };
    await withSeedDataSource(dataSource, () => seedExtraServices());
    expect({
      catalog: Number((await dataSource.query('SELECT COUNT(*) AS count FROM extra_services'))[0].count),
      applicability: Number((await dataSource.query('SELECT COUNT(*) AS count FROM extra_service_applicability'))[0].count),
    }).toEqual(beforeSecondSeed);
    await validateCatalogContract(dataSource);
    const timezoneRows = await dataSource.query('SELECT @@session.time_zone AS sessionTimezone');
    expect(String(timezoneRows[0].sessionTimezone)).toBe('+00:00');

    const manifest = await inspectCanonicalSchema(
      readOnlySchemaConnectionOptionsFromEnvironment({ ...process.env, DB_NAME: target }),
    );
    console.log(`7.1-C disposable mode: ${mode}`);
    console.log(`7.1-C disposable fingerprint: ${manifest.schemaFingerprint}`);
    console.log(`7.1-C disposable relation snapshot: ${JSON.stringify(await relationSnapshot(dataSource))}`);
  } finally {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (created) await dropDisposableDatabase(process.env, target);
  }
};

const protocolMode = process.env.TB_71C_DISPOSABLE_MODE as ProtocolMode | undefined;
const protocolTest = protocolMode ? test : test.skip;

protocolTest('runs the explicitly gated 7.1-C disposable protocol', async () => {
  if (protocolMode !== 'from-zero' && protocolMode !== 'seeded-upgrade') {
    throw new Error('TB_71C_DISPOSABLE_MODE must be from-zero or seeded-upgrade');
  }
  await runDisposableProtocol(protocolMode);
}, 120_000);
