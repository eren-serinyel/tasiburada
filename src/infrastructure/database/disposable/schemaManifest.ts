import { createHash } from 'crypto';

export const MANIFEST_SCHEMA_VERSION = '1.0.0';

export interface SchemaColumn {
  readonly name: string;
  readonly ordinalPosition: number;
  readonly physicalType: string;
  readonly characterMaximumLength: number | null;
  readonly numericPrecision: number | null;
  readonly numericScale: number | null;
  readonly datetimePrecision: number | null;
  readonly nullable: boolean;
  readonly defaultValue: string | null;
  readonly generatedExpression: string | null;
  readonly extra: string;
  readonly characterSet: string | null;
  readonly collation: string | null;
}

export interface OrderedColumn {
  readonly name: string;
  readonly position: number;
}

export interface SchemaConstraint {
  readonly name: string;
  readonly columns: OrderedColumn[];
}

export interface SchemaIndexColumn {
  readonly name: string | null;
  readonly position: number;
  readonly direction: string | null;
  readonly prefixLength: number | null;
  readonly expression: string | null;
}

export interface SchemaIndex {
  readonly name: string;
  readonly unique: boolean;
  readonly type: string;
  readonly visible: boolean | null;
  readonly columns: SchemaIndexColumn[];
}

export interface SchemaForeignKey {
  readonly name: string;
  readonly columns: OrderedColumn[];
  readonly referencedTable: string;
  readonly referencedColumns: OrderedColumn[];
  readonly updateRule: string;
  readonly deleteRule: string;
}

export interface SchemaCheckConstraint {
  readonly name: string;
  readonly expression: string;
}

export interface SchemaTable {
  readonly name: string;
  readonly engine: string;
  readonly characterSet: string;
  readonly collation: string;
  readonly columns: SchemaColumn[];
  readonly primaryKey: OrderedColumn[];
  readonly uniqueConstraints: SchemaConstraint[];
  readonly indexes: SchemaIndex[];
  readonly foreignKeys: SchemaForeignKey[];
  readonly checkConstraints: SchemaCheckConstraint[];
}

export interface AppliedMigration {
  readonly id: number;
  readonly timestamp: number;
  readonly name: string;
}

export interface SchemaManifestInput {
  readonly mysqlVersion: string;
  readonly databaseName: string;
  readonly databaseCharacterSet: string;
  readonly databaseCollation: string;
  readonly tables: SchemaTable[];
  readonly migrations: AppliedMigration[];
}

export interface CanonicalSchemaManifest {
  readonly manifestSchemaVersion: string;
  readonly metadata: {
    readonly generatedAt: string;
    readonly source: 'read-only-information-schema';
    readonly mysqlVersion: string;
    readonly databaseName: string;
  };
  readonly database: {
    readonly characterSet: string;
    readonly collation: string;
  };
  readonly tables: SchemaTable[];
  readonly migrations: AppliedMigration[];
  readonly schemaFingerprint: string;
}

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const comparePosition = (
  left: { readonly position: number },
  right: { readonly position: number },
): number => left.position - right.position;

const nullableNumber = (value: number | null): number | null =>
  value === null ? null : Number(value);

const copyOrderedColumn = (column: OrderedColumn): OrderedColumn => ({
  name: String(column.name),
  position: Number(column.position),
});

const normalizeTable = (table: SchemaTable): SchemaTable => ({
  name: String(table.name),
  engine: String(table.engine),
  characterSet: String(table.characterSet),
  collation: String(table.collation),
  columns: table.columns
    .map(column => ({
      name: String(column.name),
      ordinalPosition: Number(column.ordinalPosition),
      physicalType: String(column.physicalType),
      characterMaximumLength: nullableNumber(column.characterMaximumLength),
      numericPrecision: nullableNumber(column.numericPrecision),
      numericScale: nullableNumber(column.numericScale),
      datetimePrecision: nullableNumber(column.datetimePrecision),
      nullable: Boolean(column.nullable),
      defaultValue:
        column.defaultValue === null ? null : String(column.defaultValue),
      generatedExpression:
        column.generatedExpression === null
          ? null
          : String(column.generatedExpression),
      extra: String(column.extra),
      characterSet:
        column.characterSet === null ? null : String(column.characterSet),
      collation: column.collation === null ? null : String(column.collation),
    }))
    .sort((left, right) =>
      left.ordinalPosition - right.ordinalPosition ||
      compareText(left.name, right.name),
    ),
  primaryKey: table.primaryKey.map(copyOrderedColumn).sort(comparePosition),
  uniqueConstraints: table.uniqueConstraints
    .map(constraint => ({
      name: String(constraint.name),
      columns: constraint.columns.map(copyOrderedColumn).sort(comparePosition),
    }))
    .sort((left, right) => compareText(left.name, right.name)),
  indexes: table.indexes
    .map(index => ({
      name: String(index.name),
      unique: Boolean(index.unique),
      type: String(index.type),
      visible: index.visible === null ? null : Boolean(index.visible),
      columns: index.columns
        .map(column => ({
          name: column.name === null ? null : String(column.name),
          position: Number(column.position),
          direction:
            column.direction === null ? null : String(column.direction),
          prefixLength: nullableNumber(column.prefixLength),
          expression:
            column.expression === null ? null : String(column.expression),
        }))
        .sort(comparePosition),
    }))
    .sort((left, right) => compareText(left.name, right.name)),
  foreignKeys: table.foreignKeys
    .map(foreignKey => ({
      name: String(foreignKey.name),
      columns: foreignKey.columns.map(copyOrderedColumn).sort(comparePosition),
      referencedTable: String(foreignKey.referencedTable),
      referencedColumns: foreignKey.referencedColumns
        .map(copyOrderedColumn)
        .sort(comparePosition),
      updateRule: String(foreignKey.updateRule),
      deleteRule: String(foreignKey.deleteRule),
    }))
    .sort((left, right) => compareText(left.name, right.name)),
  checkConstraints: table.checkConstraints
    .map(constraint => ({
      name: String(constraint.name),
      expression: String(constraint.expression),
    }))
    .sort((left, right) => compareText(left.name, right.name)),
});

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }

  return value;
};

export const stableStringify = (value: unknown): string =>
  `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;

export const schemaFingerprintProjection = (
  manifest: Pick<CanonicalSchemaManifest, 'tables'>,
): object => ({
  tables: manifest.tables,
});

export const fingerprintSchemaManifest = (
  manifest: Pick<CanonicalSchemaManifest, 'tables'>,
): string =>
  createHash('sha256')
    .update(stableStringify(schemaFingerprintProjection(manifest)), 'utf8')
    .digest('hex');

export const createCanonicalSchemaManifest = (
  input: SchemaManifestInput,
  generatedAt = new Date().toISOString(),
): CanonicalSchemaManifest => {
  const withoutFingerprint = {
    manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
    metadata: {
      generatedAt,
      source: 'read-only-information-schema' as const,
      mysqlVersion: String(input.mysqlVersion),
      databaseName: String(input.databaseName),
    },
    database: {
      characterSet: String(input.databaseCharacterSet),
      collation: String(input.databaseCollation),
    },
    tables: input.tables
      .map(normalizeTable)
      .sort((left, right) => compareText(left.name, right.name)),
    migrations: input.migrations
      .map(migration => ({
        id: Number(migration.id),
        timestamp: Number(migration.timestamp),
        name: String(migration.name),
      }))
      .sort((left, right) =>
        left.timestamp - right.timestamp ||
        left.id - right.id ||
        compareText(left.name, right.name),
      ),
  };

  return {
    ...withoutFingerprint,
    schemaFingerprint: fingerprintSchemaManifest(withoutFingerprint),
  };
};

const valuesMatch = (left: unknown, right: unknown): boolean =>
  stableStringify(left) === stableStringify(right);

const mapByName = <T extends { readonly name: string }>(
  values: readonly T[],
): Map<string, T> => new Map(values.map(value => [value.name, value]));

const reportNamedCollectionDiff = <T extends { readonly name: string }>(
  differences: string[],
  tableName: string,
  label: string,
  storedValues: readonly T[],
  currentValues: readonly T[],
): void => {
  const stored = mapByName(storedValues);
  const current = mapByName(currentValues);
  const names = Array.from(new Set([...stored.keys(), ...current.keys()])).sort(
    compareText,
  );

  for (const name of names) {
    if (!stored.has(name)) {
      differences.push(`table ${tableName}: ${label} ${name} added`);
    } else if (!current.has(name)) {
      differences.push(`table ${tableName}: ${label} ${name} removed`);
    } else if (!valuesMatch(stored.get(name), current.get(name))) {
      differences.push(`table ${tableName}: ${label} ${name} changed`);
    }
  }
};

export const diffSchemaManifests = (
  stored: CanonicalSchemaManifest,
  current: CanonicalSchemaManifest,
): string[] => {
  const differences: string[] = [];

  const storedTables = mapByName(stored.tables);
  const currentTables = mapByName(current.tables);
  const tableNames = Array.from(
    new Set([...storedTables.keys(), ...currentTables.keys()]),
  ).sort(compareText);

  for (const tableName of tableNames) {
    const storedTable = storedTables.get(tableName);
    const currentTable = currentTables.get(tableName);
    if (!storedTable) {
      differences.push(`table ${tableName}: added`);
      continue;
    }
    if (!currentTable) {
      differences.push(`table ${tableName}: removed`);
      continue;
    }

    if (
      storedTable.engine !== currentTable.engine ||
      storedTable.characterSet !== currentTable.characterSet ||
      storedTable.collation !== currentTable.collation
    ) {
      differences.push(`table ${tableName}: physical options changed`);
    }

    reportNamedCollectionDiff(
      differences,
      tableName,
      'column',
      storedTable.columns,
      currentTable.columns,
    );

    if (!valuesMatch(storedTable.primaryKey, currentTable.primaryKey)) {
      differences.push(`table ${tableName}: primary key changed`);
    }

    reportNamedCollectionDiff(
      differences,
      tableName,
      'unique constraint',
      storedTable.uniqueConstraints,
      currentTable.uniqueConstraints,
    );
    reportNamedCollectionDiff(
      differences,
      tableName,
      'index',
      storedTable.indexes,
      currentTable.indexes,
    );
    reportNamedCollectionDiff(
      differences,
      tableName,
      'foreign key',
      storedTable.foreignKeys,
      currentTable.foreignKeys,
    );
    reportNamedCollectionDiff(
      differences,
      tableName,
      'check constraint',
      storedTable.checkConstraints,
      currentTable.checkConstraints,
    );
  }

  return differences;
};

export const diffSchemaProvenance = (
  stored: CanonicalSchemaManifest,
  current: CanonicalSchemaManifest,
): string[] => {
  const differences: string[] = [];

  if (stored.manifestSchemaVersion !== current.manifestSchemaVersion) {
    differences.push('manifest schema version changed');
  }
  if (stored.metadata.source !== current.metadata.source) {
    differences.push('manifest source changed');
  }
  if (stored.metadata.mysqlVersion !== current.metadata.mysqlVersion) {
    differences.push('MySQL server version changed');
  }
  if (stored.metadata.databaseName !== current.metadata.databaseName) {
    differences.push('database name changed');
  }
  if (!valuesMatch(stored.database, current.database)) {
    differences.push('database default charset/collation changed');
  }
  if (!valuesMatch(stored.migrations, current.migrations)) {
    differences.push('applied migration records changed');
  }

  return differences;
};
