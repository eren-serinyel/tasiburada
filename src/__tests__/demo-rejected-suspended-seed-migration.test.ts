import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { SeedDemoRejectedSuspendedCarriers1778400000000 } from '../infrastructure/database/migrations/1778400000000-SeedDemoRejectedSuspendedCarriers';

describe('SeedDemoRejectedSuspendedCarriers migration', () => {
  test('seeds one REJECTED and one SUSPENDED from DRAFT without touching APPROVED', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const suffix = Date.now();
      const rejectedEmail = `demo.seed.rejected.${suffix}@tasiburada.test`;
      const suspendedEmail = `demo.seed.suspended.${suffix}@tasiburada.test`;
      const approvedEmail = `demo.seed.approved.${suffix}@tasiburada.test`;

      const rejectedId = randomUUID();
      const suspendedId = randomUUID();
      const approvedId = randomUUID();

      const makeCarrier = async (params: {
        id: string;
        email: string;
        taxNumber: string;
        approvalState: string;
        verifiedByAdmin: number;
        isActive: number;
      }) => {
        await queryRunner.query(
          `
          INSERT INTO carriers (
            id, companyName, taxNumber, phone, email, passwordHash, foundedYear,
            verifiedByAdmin, isActive, approval_state, pending_approval, approval_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            params.id,
            `Demo Seed ${params.id.slice(0, 6)}`,
            params.taxNumber,
            '05000000000',
            params.email,
            'hash',
            2010,
            params.verifiedByAdmin,
            params.isActive,
            params.approvalState,
            0,
            0,
          ],
        );
      };

      await makeCarrier({
        id: rejectedId,
        email: rejectedEmail,
        taxNumber: `DSR${suffix}01`,
        approvalState: 'DRAFT',
        verifiedByAdmin: 0,
        isActive: 1,
      });

      await makeCarrier({
        id: suspendedId,
        email: suspendedEmail,
        taxNumber: `DSR${suffix}02`,
        approvalState: 'DRAFT',
        verifiedByAdmin: 0,
        isActive: 1,
      });

      await makeCarrier({
        id: approvedId,
        email: approvedEmail,
        taxNumber: `DSR${suffix}03`,
        approvalState: 'APPROVED',
        verifiedByAdmin: 1,
        isActive: 1,
      });

      const migration = new SeedDemoRejectedSuspendedCarriers1778400000000({
        rejectedEmail,
        suspendedEmail,
        dbNamePattern: /.*/,
        skipExistingStateCheck: true,
      });

      await migration.up(queryRunner);

      const hasDecisionReason = await queryRunner.hasColumn('carriers', 'approval_last_decision_reason');
      const decisionReasonSelect = hasDecisionReason
        ? 'approval_last_decision_reason'
        : 'NULL';

      const rows = await queryRunner.query(
        `
        SELECT id, approval_state AS approvalState, verifiedByAdmin, isActive, ${decisionReasonSelect} AS decisionReason
        FROM carriers
        WHERE id IN (?, ?, ?)
        ORDER BY id
        `,
        [rejectedId, suspendedId, approvedId],
      ) as Array<{
        id: string;
        approvalState: string;
        verifiedByAdmin: number;
        isActive: number;
        decisionReason: string | null;
      }>;

      const byId = new Map(rows.map((row: any) => [row.id, row]));

      expect(byId.get(rejectedId)?.approvalState).toBe('REJECTED');
      expect(Number(byId.get(rejectedId)?.verifiedByAdmin)).toBe(0);
      if (hasDecisionReason) {
        expect(byId.get(rejectedId)?.decisionReason).toBe('demo_rejected_carrier');
      }

      expect(byId.get(suspendedId)?.approvalState).toBe('SUSPENDED');
      expect(Number(byId.get(suspendedId)?.verifiedByAdmin)).toBe(0);
      expect(Number(byId.get(suspendedId)?.isActive)).toBe(0);
      if (hasDecisionReason) {
        expect(byId.get(suspendedId)?.decisionReason).toBe('demo_suspended_carrier');
      }

      expect(byId.get(approvedId)?.approvalState).toBe('APPROVED');
      expect(Number(byId.get(approvedId)?.verifiedByAdmin)).toBe(1);
      expect(Number(byId.get(approvedId)?.isActive)).toBe(1);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });

  test('is idempotent and does not reseed if REJECTED/SUSPENDED already exists', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const suffix = Date.now();
      const rejectedEmail = `demo.seed.rejected.idempotent.${suffix}@tasiburada.test`;
      const suspendedEmail = `demo.seed.suspended.idempotent.${suffix}@tasiburada.test`;

      const rejectedId = randomUUID();
      const suspendedId = randomUUID();
      const alreadyRejectedId = randomUUID();
      const alreadySuspendedId = randomUUID();

      const makeCarrier = async (params: {
        id: string;
        email: string;
        taxNumber: string;
        approvalState: string;
        verifiedByAdmin: number;
        isActive: number;
      }) => {
        await queryRunner.query(
          `
          INSERT INTO carriers (
            id, companyName, taxNumber, phone, email, passwordHash, foundedYear,
            verifiedByAdmin, isActive, approval_state, pending_approval, approval_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            params.id,
            `Demo Seed ${params.id.slice(0, 6)}`,
            params.taxNumber,
            '05000000000',
            params.email,
            'hash',
            2010,
            params.verifiedByAdmin,
            params.isActive,
            params.approvalState,
            0,
            0,
          ],
        );
      };

      await makeCarrier({
        id: rejectedId,
        email: rejectedEmail,
        taxNumber: `DSI${suffix}01`,
        approvalState: 'DRAFT',
        verifiedByAdmin: 0,
        isActive: 1,
      });

      await makeCarrier({
        id: suspendedId,
        email: suspendedEmail,
        taxNumber: `DSI${suffix}02`,
        approvalState: 'DRAFT',
        verifiedByAdmin: 0,
        isActive: 1,
      });

      await makeCarrier({
        id: alreadyRejectedId,
        email: `demo.seed.already.rejected.${suffix}@tasiburada.test`,
        taxNumber: `DSI${suffix}03`,
        approvalState: 'REJECTED',
        verifiedByAdmin: 0,
        isActive: 1,
      });

      await makeCarrier({
        id: alreadySuspendedId,
        email: `demo.seed.already.suspended.${suffix}@tasiburada.test`,
        taxNumber: `DSI${suffix}04`,
        approvalState: 'SUSPENDED',
        verifiedByAdmin: 0,
        isActive: 0,
      });

      const migration = new SeedDemoRejectedSuspendedCarriers1778400000000({
        rejectedEmail,
        suspendedEmail,
        dbNamePattern: /.*/,
      });

      await migration.up(queryRunner);
      await migration.up(queryRunner);

      const rows = await queryRunner.query(
        `
        SELECT id, approval_state AS approvalState, isActive
        FROM carriers
        WHERE id IN (?, ?)
        ORDER BY id
        `,
        [rejectedId, suspendedId],
      ) as Array<{ id: string; approvalState: string; isActive: number }>;

      const byId = new Map(rows.map((row: any) => [row.id, row]));

      // Because one rejected and one suspended already exist, migration must not seed new ones.
      expect(byId.get(rejectedId)?.approvalState).toBe('DRAFT');
      expect(byId.get(suspendedId)?.approvalState).toBe('DRAFT');
      expect(Number(byId.get(suspendedId)?.isActive)).toBe(1);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
