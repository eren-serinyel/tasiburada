import { assertSafeSeedDatabase } from '../../infrastructure/database/seedSafety';

const mode = process.argv[2];

if (mode !== 'seed' && mode !== 'reset') {
  console.error('Unsafe database seed configuration: mode must be seed or reset');
  process.exitCode = 1;
} else {
  try {
    assertSafeSeedDatabase(process.env, mode);
  } catch (error: unknown) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Unsafe database seed configuration: validation failed',
    );
    process.exitCode = 1;
  }
}
