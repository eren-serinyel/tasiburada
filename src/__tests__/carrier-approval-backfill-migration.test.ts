import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { BackfillCarrierApprovalStateFromVerified1778300000000 } from '../infrastructure/database/migrations/1778300000000-BackfillCarrierApprovalStateFromVerified';

describe('BackfillCarrierApprovalStateFromVerified migration', () => {
  test('backfill only updates verified+active+non-approved and skips other states', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const migration = new BackfillCarrierApprovalStateFromVerified1778300000000();
      const suffix = Date.now();

      const makeCarrier = async (params: {
        id: string;
        taxNumber: string;
        email: string;
        verifiedByAdmin: number;
        isActive: number;
        approvalState: string;
      }) => {
        await queryRunner.query(
          `
          INSERT INTO carriers (
            id, companyName, taxNumber, phone, email, passwordHash, foundedYear,
            verifiedByAdmin, isActive, approval_state, approval_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            params.id,
            `Migration Test ${params.id.slice(0, 6)}`,
            params.taxNumber,
            '05000000000',
            params.email,
            'hash',
            2010,
            params.verifiedByAdmin,
            params.isActive,
            params.approvalState,
            0,
          ],
        );
      };

      const a = randomUUID();
      const b = randomUUID();
      const c = randomUUID();
      const d = randomUUID();

      await makeCarrier({
        id: a,
        taxNumber: `MIG${suffix}001`,
        email: `mig.${suffix}.a@tasiburada.test`,
        verifiedByAdmin: 1,
        isActive: 1,
        approvalState: 'DRAFT',
      });
      await makeCarrier({
        id: b,
        taxNumber: `MIG${suffix}002`,
        email: `mig.${suffix}.b@tasiburada.test`,
        verifiedByAdmin: 0,
        isActive: 1,
        approvalState: 'DRAFT',
      });
      await makeCarrier({
        id: c,
        taxNumber: `MIG${suffix}003`,
        email: `mig.${suffix}.c@tasiburada.test`,
        verifiedByAdmin: 1,
        isActive: 0,
        approvalState: 'DRAFT',
      });
      await makeCarrier({
        id: d,
        taxNumber: `MIG${suffix}004`,
        email: `mig.${suffix}.d@tasiburada.test`,
        verifiedByAdmin: 1,
        isActive: 1,
        approvalState: 'SUSPENDED',
      });

      await migration.up(queryRunner);

      const rows = await queryRunner.query(
        `
        SELECT id, approval_state AS approvalState, approval_version AS approvalVersion
        FROM carriers
        WHERE id IN (?, ?, ?, ?)
        ORDER BY id
        `,
        [a, b, c, d],
      ) as Array<{ id: string; approvalState: string; approvalVersion: number }>;

      const byId = new Map(rows.map((row: any) => [row.id, row]));

      expect(byId.get(a)?.approvalState).toBe('APPROVED');
      expect(Number(byId.get(a)?.approvalVersion)).toBe(1);

      expect(byId.get(b)?.approvalState).toBe('DRAFT');
      expect(byId.get(c)?.approvalState).toBe('DRAFT');
      expect(byId.get(d)?.approvalState).toBe('SUSPENDED');
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
