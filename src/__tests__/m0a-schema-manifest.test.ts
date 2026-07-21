import {
  createCanonicalSchemaManifest,
  diffSchemaManifests,
  diffSchemaProvenance,
  stableStringify,
  type SchemaManifestInput,
} from '../infrastructure/database/disposable/schemaManifest';

const fixture = (): SchemaManifestInput => ({
  mysqlVersion: '8.0.fixture',
  databaseName: 'fixture_database',
  databaseCharacterSet: 'utf8mb4',
  databaseCollation: 'utf8mb4_unicode_ci',
  tables: [
    {
      name: 'zeta',
      engine: 'InnoDB',
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      columns: [
        {
          name: 'label',
          ordinalPosition: 2,
          physicalType: 'varchar(100)',
          characterMaximumLength: 100,
          numericPrecision: null,
          numericScale: null,
          datetimePrecision: null,
          nullable: true,
          defaultValue: null,
          generatedExpression: null,
          extra: '',
          characterSet: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
        },
        {
          name: 'id',
          ordinalPosition: 1,
          physicalType: 'int',
          characterMaximumLength: null,
          numericPrecision: 10,
          numericScale: 0,
          datetimePrecision: null,
          nullable: false,
          defaultValue: null,
          generatedExpression: null,
          extra: 'auto_increment',
          characterSet: null,
          collation: null,
        },
      ],
      primaryKey: [{ name: 'id', position: 1 }],
      uniqueConstraints: [],
      indexes: [
        {
          name: 'idx_label_id',
          unique: false,
          type: 'BTREE',
          visible: true,
          columns: [
            {
              name: 'label',
              position: 1,
              direction: 'A',
              prefixLength: null,
              expression: null,
            },
            {
              name: 'id',
              position: 2,
              direction: 'A',
              prefixLength: null,
              expression: null,
            },
          ],
        },
      ],
      foreignKeys: [],
      checkConstraints: [],
    },
    {
      name: 'alpha',
      engine: 'InnoDB',
      characterSet: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      columns: [],
      primaryKey: [],
      uniqueConstraints: [],
      indexes: [],
      foreignKeys: [],
      checkConstraints: [],
    },
  ],
  migrations: [
    { id: 2, timestamp: 200, name: 'Second200' },
    { id: 1, timestamp: 100, name: 'First100' },
  ],
});

describe('canonical schema manifest', () => {
  it('uses stable semantic ordering and stable JSON keys', () => {
    const manifest = createCanonicalSchemaManifest(
      fixture(),
      '2026-01-01T00:00:00.000Z',
    );

    expect(manifest.tables.map(table => table.name)).toEqual(['alpha', 'zeta']);
    expect(manifest.tables[1].columns.map(column => column.name)).toEqual([
      'id',
      'label',
    ]);
    expect(manifest.migrations.map(migration => migration.id)).toEqual([1, 2]);
    expect(stableStringify(manifest)).toBe(stableStringify(manifest));
  });

  it('excludes environment and provenance metadata from fingerprint', () => {
    const first = createCanonicalSchemaManifest(
      {
        ...fixture(),
        mysqlVersion: '8.0.46',
      },
      '2026-01-01T00:00:00.000Z',
    );
    const changedMetadata = {
      ...fixture(),
      mysqlVersion: '8.0.47',
      databaseName: 'another_database',
      databaseCharacterSet: 'latin1',
      databaseCollation: 'latin1_swedish_ci',
    };
    const second = createCanonicalSchemaManifest(
      changedMetadata,
      '2026-02-02T00:00:00.000Z',
    );

    expect(first.schemaFingerprint).toBe(second.schemaFingerprint);
  });

  it('gives 81 historical and one canonical migration row the same schema fingerprint', () => {
    const historical = fixture();
    historical.migrations.splice(
      0,
      historical.migrations.length,
      ...Array.from({ length: 81 }, (_value, index) => ({
        id: index + 1,
        timestamp: 1000 + index,
        name: `Historical${index + 1}`,
      })),
    );
    const canonical = fixture();
    canonical.migrations.splice(0, canonical.migrations.length, {
      id: 1,
      timestamp: 9000,
      name: 'CanonicalBaseline9000',
    });

    const historicalManifest = createCanonicalSchemaManifest(historical);
    const canonicalManifest = createCanonicalSchemaManifest(canonical);

    expect(historicalManifest.schemaFingerprint).toBe(
      canonicalManifest.schemaFingerprint,
    );
    expect(
      diffSchemaManifests(historicalManifest, canonicalManifest),
    ).toEqual([]);
    expect(
      diffSchemaProvenance(historicalManifest, canonicalManifest),
    ).toContain('applied migration records changed');
  });

  it('produces the same fingerprint for the same physical schema', () => {
    const first = createCanonicalSchemaManifest(fixture());
    const second = createCanonicalSchemaManifest(fixture());
    expect(first.schemaFingerprint).toBe(second.schemaFingerprint);
  });

  it('changes fingerprint when a column physical type changes', () => {
    const original = fixture();
    const changed = fixture();
    changed.tables[0].columns[0] = {
      ...changed.tables[0].columns[0],
      physicalType: 'varchar(200)',
      characterMaximumLength: 200,
    };

    expect(createCanonicalSchemaManifest(original).schemaFingerprint).not.toBe(
      createCanonicalSchemaManifest(changed).schemaFingerprint,
    );
  });

  it('changes fingerprint when index column order changes', () => {
    const original = fixture();
    const changed = fixture();
    changed.tables[0].indexes[0].columns.splice(0, 2,
      {
        ...changed.tables[0].indexes[0].columns[0],
        position: 2,
      },
      {
        ...changed.tables[0].indexes[0].columns[1],
        position: 1,
      },
    );

    expect(createCanonicalSchemaManifest(original).schemaFingerprint).not.toBe(
      createCanonicalSchemaManifest(changed).schemaFingerprint,
    );
  });

  it('changes fingerprint when a foreign key delete rule changes', () => {
    const original = fixture();
    const changed = fixture();
    const foreignKey = {
      name: 'fk_zeta_alpha',
      columns: [{ name: 'id', position: 1 }],
      referencedTable: 'alpha',
      referencedColumns: [{ name: 'id', position: 1 }],
      updateRule: 'CASCADE',
      deleteRule: 'CASCADE',
    };
    original.tables[0].foreignKeys.push(foreignKey);
    changed.tables[0].foreignKeys.push({
      ...foreignKey,
      deleteRule: 'RESTRICT',
    });

    expect(createCanonicalSchemaManifest(original).schemaFingerprint).not.toBe(
      createCanonicalSchemaManifest(changed).schemaFingerprint,
    );
  });

  it('does not copy row data or secret fields into the manifest', () => {
    const unsafeInput = fixture() as SchemaManifestInput & {
      rows?: unknown[];
      password?: string;
    };
    unsafeInput.rows = [{ email: 'private@example.com' }];
    unsafeInput.password = 'not-for-a-manifest';

    const serialized = stableStringify(
      createCanonicalSchemaManifest(unsafeInput),
    );
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('not-for-a-manifest');
    expect(serialized).not.toContain('"rows"');
    expect(serialized).not.toContain('"password"');
  });

  it('reports table and column level verification differences', () => {
    const stored = createCanonicalSchemaManifest(fixture());
    const changed = fixture();
    changed.tables[0].columns[0] = {
      ...changed.tables[0].columns[0],
      physicalType: 'text',
    };
    const differences = diffSchemaManifests(
      stored,
      createCanonicalSchemaManifest(changed),
    );

    expect(differences).toContain('table zeta: column label changed');
  });
});
