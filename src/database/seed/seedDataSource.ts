import type { DataSource } from 'typeorm';

let activeSeedDataSource: DataSource | undefined;

const requireActiveSeedDataSource = (): DataSource => {
  if (!activeSeedDataSource) {
    throw new Error('Seed DataSource has not been explicitly configured');
  }
  return activeSeedDataSource;
};

export const SeedDataSource = new Proxy({} as DataSource, {
  get: (_target, property) => {
    const dataSource = requireActiveSeedDataSource();
    const value = Reflect.get(dataSource, property, dataSource);
    return typeof value === 'function' ? value.bind(dataSource) : value;
  },
});

export const withSeedDataSource = async <T>(
  dataSource: DataSource,
  operation: () => Promise<T>,
): Promise<T> => {
  if (activeSeedDataSource) {
    throw new Error('Seed DataSource is already configured');
  }

  activeSeedDataSource = dataSource;
  try {
    return await operation();
  } finally {
    activeSeedDataSource = undefined;
  }
};
