import {
  existsSync,
  mkdirSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, parse, resolve } from 'path';
import {
  assertSafeDisposableFixtureDirectory,
  cleanupDisposableFixtureDirectory,
  createDisposableFixtureDirectory,
  type DisposableFixtureDirectory,
} from '../infrastructure/database/canonical/disposableFixtureSafety';

const fakeScope = (
  directory: string,
): DisposableFixtureDirectory => ({
  directory,
  token: 'not-a-valid-marker-token',
});

describe('M1A disposable fixture cleanup safety', () => {
  it('cleans only seeded files in its own marked temp directory', () => {
    const scope = createDisposableFixtureDirectory();
    const fixtureName =
      '12345678-1234-1234-1234-123456789abc-proof.pdf';
    writeFileSync(join(scope.directory, fixtureName), '%PDF-1.4');

    expect(
      assertSafeDisposableFixtureDirectory(scope),
    ).toBe(resolve(scope.directory));
    expect(cleanupDisposableFixtureDirectory(scope)).toBe(1);
    expect(existsSync(scope.directory)).toBe(false);
  });

  it.each([
    '',
    '.',
    '..',
    parse(process.cwd()).root,
    process.cwd(),
    resolve(process.cwd(), 'uploads', 'documents'),
    resolve(tmpdir()),
    join(
      resolve(tmpdir()),
      'tasiburada-m1a-seed-documents-safe',
      '..',
      'tasiburada-m1a-seed-documents-escape',
    ),
  ])('rejects an unsafe cleanup target: %s', target => {
    expect(() =>
      assertSafeDisposableFixtureDirectory(fakeScope(target)),
    ).toThrow(
      'M1A fixture cleanup refused an unsafe disposable target',
    );
  });

  it('rejects marker mismatch without deleting fixture files', () => {
    const scope = createDisposableFixtureDirectory();
    const fixturePath = join(
      scope.directory,
      '12345678-1234-1234-1234-123456789abc-proof.pdf',
    );
    writeFileSync(fixturePath, '%PDF-1.4');

    expect(() =>
      cleanupDisposableFixtureDirectory({
        ...scope,
        token: 'wrong-token',
      }),
    ).toThrow(
      'M1A fixture cleanup refused an unsafe disposable target',
    );
    expect(existsSync(fixturePath)).toBe(true);

    expect(cleanupDisposableFixtureDirectory(scope)).toBe(1);
  });

  it('fails closed before deleting when the directory has an unexpected entry', () => {
    const scope = createDisposableFixtureDirectory();
    const fixturePath = join(
      scope.directory,
      '12345678-1234-1234-1234-123456789abc-proof.pdf',
    );
    const unexpectedDirectory = join(
      scope.directory,
      'unexpected-directory',
    );
    writeFileSync(fixturePath, '%PDF-1.4');
    mkdirSync(unexpectedDirectory);

    expect(() =>
      cleanupDisposableFixtureDirectory(scope),
    ).toThrow(
      'M1A fixture cleanup refused an unsafe disposable target',
    );
    expect(existsSync(fixturePath)).toBe(true);

    rmdirSync(unexpectedDirectory);
    expect(cleanupDisposableFixtureDirectory(scope)).toBe(1);
  });

  it('rejects a junction that resolves outside the disposable temp root', () => {
    const junctionPath = join(
      resolve(tmpdir()),
      `tasiburada-m1a-seed-documents-junction-${Date.now()}`,
    );
    symlinkSync(process.cwd(), junctionPath, 'junction');

    try {
      expect(() =>
        assertSafeDisposableFixtureDirectory(
          fakeScope(junctionPath),
        ),
      ).toThrow(
        'M1A fixture cleanup refused an unsafe disposable target',
      );
    } finally {
      unlinkSync(junctionPath);
    }
  });
});
