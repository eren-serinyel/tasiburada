import { randomUUID } from 'crypto';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
} from 'path';

const DISPOSABLE_FIXTURE_PREFIX =
  'tasiburada-m1a-seed-documents-';
const DISPOSABLE_FIXTURE_MARKER =
  '.tasiburada-m1a-disposable-fixture';
const SEEDED_DOCUMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

export interface DisposableFixtureDirectory {
  readonly directory: string;
  readonly token: string;
}

const failClosed = (): never => {
  throw new Error(
    'M1A fixture cleanup refused an unsafe disposable target',
  );
};

const isWithin = (
  parentDirectory: string,
  target: string,
): boolean => {
  const child = relative(parentDirectory, target);
  return (
    child !== '' &&
    !child.startsWith(`..\\`) &&
    !child.startsWith('../') &&
    child !== '..' &&
    !isAbsolute(child)
  );
};

const realDirectory = (directory: string): string => {
  if (!existsSync(directory)) failClosed();
  const metadata = lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    failClosed();
  }
  return realpathSync(directory);
};

export const assertSafeDisposableFixtureDirectory = (
  scope: DisposableFixtureDirectory,
  repositoryRoot = process.cwd(),
): string => {
  const candidate = scope?.directory;
  if (
    typeof candidate !== 'string' ||
    candidate.trim() === '' ||
    !isAbsolute(candidate) ||
    candidate.split(/[\\/]+/).includes('..')
  ) {
    failClosed();
  }

  const resolvedCandidate = resolve(candidate);
  if (resolvedCandidate === parse(resolvedCandidate).root) {
    failClosed();
  }

  const resolvedTempRoot = realDirectory(tmpdir());
  const realCandidate = realDirectory(resolvedCandidate);
  if (
    !isWithin(resolvedTempRoot, realCandidate) ||
    !basename(realCandidate).startsWith(
      DISPOSABLE_FIXTURE_PREFIX,
    )
  ) {
    failClosed();
  }

  const realRepositoryRoot = realDirectory(repositoryRoot);
  const realDevFixtureDirectory = resolve(
    realRepositoryRoot,
    'uploads',
    'documents',
  );
  if (
    realCandidate === realRepositoryRoot ||
    isWithin(realRepositoryRoot, realCandidate) ||
    isWithin(realCandidate, realRepositoryRoot) ||
    realCandidate === realDevFixtureDirectory ||
    isWithin(realDevFixtureDirectory, realCandidate) ||
    isWithin(realCandidate, realDevFixtureDirectory)
  ) {
    failClosed();
  }

  const markerPath = join(
    realCandidate,
    DISPOSABLE_FIXTURE_MARKER,
  );
  if (!existsSync(markerPath)) failClosed();
  const markerMetadata = lstatSync(markerPath);
  if (
    !markerMetadata.isFile() ||
    markerMetadata.isSymbolicLink() ||
    readFileSync(markerPath, 'utf8') !== scope.token
  ) {
    failClosed();
  }

  return realCandidate;
};

export const createDisposableFixtureDirectory =
  (): DisposableFixtureDirectory => {
    const tempRoot = realDirectory(tmpdir());
    const directory = mkdtempSync(
      join(tempRoot, DISPOSABLE_FIXTURE_PREFIX),
    );
    const token = randomUUID();
    const scope = { directory, token };

    try {
      writeFileSync(
        join(directory, DISPOSABLE_FIXTURE_MARKER),
        token,
        { encoding: 'utf8', flag: 'wx' },
      );
      assertSafeDisposableFixtureDirectory(scope);
      return scope;
    } catch (error) {
      if (existsSync(directory)) {
        const entries = readdirSync(directory);
        if (entries.length === 0) {
          rmdirSync(directory);
        }
      }
      throw error;
    }
  };

export const cleanupDisposableFixtureDirectory = (
  scope: DisposableFixtureDirectory,
): number => {
  const directory = assertSafeDisposableFixtureDirectory(scope);
  const markerPath = join(
    directory,
    DISPOSABLE_FIXTURE_MARKER,
  );
  const seededFiles: string[] = [];

  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    if (entry.name === DISPOSABLE_FIXTURE_MARKER) continue;
    if (
      !entry.isFile() ||
      entry.isSymbolicLink() ||
      !SEEDED_DOCUMENT_PATTERN.test(entry.name)
    ) {
      failClosed();
    }

    const filePath = join(directory, entry.name);
    const fileMetadata = lstatSync(filePath);
    if (
      !fileMetadata.isFile() ||
      fileMetadata.isSymbolicLink() ||
      dirname(realpathSync(filePath)) !== directory
    ) {
      failClosed();
    }
    seededFiles.push(filePath);
  }

  for (const filePath of seededFiles) {
    unlinkSync(filePath);
  }
  unlinkSync(markerPath);
  rmdirSync(directory);
  return seededFiles.length;
};
