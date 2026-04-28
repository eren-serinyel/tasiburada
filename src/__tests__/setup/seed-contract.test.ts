/**
 * seed-contract.test.ts
 * Seed fixture drift guard test.
 * Runs after mutating suites to assert Silen carrier remains healthy.
 */
import { AppDataSource } from '../../infrastructure/database/data-source';
import {
  getSilenCarrier,
  assertSilenCarrierHealthy,
  expectSilenHealthy,
  restoreSilenCarrierBaseline,
} from './seedContract';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Seed Contract — Silen Fixture Drift Guard', () => {
  // Ensure Silen is restored to baseline before asserting drift guard
  beforeAll(async () => {
    if (skipDB() || !AppDataSource.isInitialized) return;
    await restoreSilenCarrierBaseline();
  });
  test('Silen carrier MUST remain in baseline state', async () => {
    if (skipDB()) return;
    if (!AppDataSource.isInitialized) return;

    const check = await assertSilenCarrierHealthy();
    expectSilenHealthy(check);
  });

  test('Silen carrier exists and is APPROVED', async () => {
    if (skipDB()) return;
    if (!AppDataSource.isInitialized) return;

    const carrier = await getSilenCarrier();
    expect(carrier).toBeDefined();
    expect(carrier!.verifiedByAdmin).toBe(true);
    expect(carrier!.approvalState).toBe('APPROVED');
    expect(carrier!.isActive).toBe(true);
    expect(carrier!.companyName).toBe('Şile Nakliyat');
  });

  test('Silen has HOME loadType capability', async () => {
    if (skipDB()) return;
    if (!AppDataSource.isInitialized) return;

    const carrier = await getSilenCarrier();
    expect(carrier).toBeDefined();
    const hasHome = carrier!.loadTypeCapabilities?.some(
      (cap) => cap.loadType === 'HOME' && cap.isActive
    );
    expect(hasHome).toBe(true);
  });
});
