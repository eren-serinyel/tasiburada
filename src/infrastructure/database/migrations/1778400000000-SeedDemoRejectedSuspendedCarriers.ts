import { MigrationInterface, QueryRunner } from 'typeorm';

interface DemoSeedOptions {
  rejectedEmail?: string;
  suspendedEmail?: string;
  dbNamePattern?: RegExp;
  skipExistingStateCheck?: boolean;
}

export class SeedDemoRejectedSuspendedCarriers1778400000000 implements MigrationInterface {
  name = 'SeedDemoRejectedSuspendedCarriers1778400000000';

  private readonly rejectedEmail: string;
  private readonly suspendedEmail: string;
  private readonly dbNamePattern: RegExp;
  private readonly skipExistingStateCheck: boolean;

  constructor(options?: DemoSeedOptions) {
    this.rejectedEmail = options?.rejectedEmail ?? 'info@merkezsurlojistik.com';
    this.suspendedEmail = options?.suspendedEmail ?? 'info@diyarbakirbismilrotanakliyat.com';
    this.dbNamePattern = options?.dbNamePattern ?? /(dev|test)/i;
    this.skipExistingStateCheck = options?.skipExistingStateCheck ?? false;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [dbRow] = await queryRunner.query('SELECT DATABASE() AS dbName');
    const dbName = String(dbRow?.dbName ?? '');
    if (!this.dbNamePattern.test(dbName)) {
      return;
    }

    const hasReviewedAt = await queryRunner.hasColumn('carriers', 'approval_reviewed_at');
    const hasDecisionReason = await queryRunner.hasColumn('carriers', 'approval_last_decision_reason');
    const hasReviewLockAdminId = await queryRunner.hasColumn('carriers', 'review_lock_admin_id');
    const hasReviewLockExpiresAt = await queryRunner.hasColumn('carriers', 'review_lock_expires_at');
    const hasReviewSessionId = await queryRunner.hasColumn('carriers', 'review_session_id');
    const hasLastRejectedAt = await queryRunner.hasColumn('carriers', 'last_rejected_at');

    const rejectedExists = this.skipExistingStateCheck
      ? false
      : await this.stateExists(queryRunner, 'REJECTED');
    const suspendedExists = this.skipExistingStateCheck
      ? false
      : await this.stateExists(queryRunner, 'SUSPENDED');

    if (!rejectedExists) {
      await this.seedState(queryRunner, {
        email: this.rejectedEmail,
        targetState: 'REJECTED',
        decisionReason: 'demo_rejected_carrier',
        setInactive: false,
        hasReviewedAt,
        hasDecisionReason,
        hasReviewLockAdminId,
        hasReviewLockExpiresAt,
        hasReviewSessionId,
        hasLastRejectedAt,
      });
    }

    if (!suspendedExists) {
      await this.seedState(queryRunner, {
        email: this.suspendedEmail,
        targetState: 'SUSPENDED',
        decisionReason: 'demo_suspended_carrier',
        setInactive: true,
        hasReviewedAt,
        hasDecisionReason,
        hasReviewLockAdminId,
        hasReviewLockExpiresAt,
        hasReviewSessionId,
        hasLastRejectedAt,
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDecisionReason = await queryRunner.hasColumn('carriers', 'approval_last_decision_reason');

    const rejectedWhere = hasDecisionReason
      ? "`approval_last_decision_reason` = 'demo_rejected_carrier'"
      : "`approval_state` = 'REJECTED'";

    const suspendedWhere = hasDecisionReason
      ? "`approval_last_decision_reason` = 'demo_suspended_carrier'"
      : "`approval_state` = 'SUSPENDED'";

    await queryRunner.query(
      `
      UPDATE \`carriers\`
      SET
        \`approval_state\` = 'DRAFT',
        \`verifiedByAdmin\` = 0,
        \`pending_approval\` = 0,
        \`isActive\` = 1
      WHERE \`email\` = ?
        AND ${rejectedWhere}
      `,
      [this.rejectedEmail],
    );

    await queryRunner.query(
      `
      UPDATE \`carriers\`
      SET
        \`approval_state\` = 'DRAFT',
        \`verifiedByAdmin\` = 0,
        \`pending_approval\` = 0,
        \`isActive\` = 1
      WHERE \`email\` = ?
        AND ${suspendedWhere}
      `,
      [this.suspendedEmail],
    );
  }

  private async stateExists(queryRunner: QueryRunner, state: 'REJECTED' | 'SUSPENDED'): Promise<boolean> {
    const [row] = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM carriers WHERE approval_state = ?",
      [state],
    );
    return Number(row?.total ?? 0) > 0;
  }

  private async seedState(
    queryRunner: QueryRunner,
    params: {
      email: string;
      targetState: 'REJECTED' | 'SUSPENDED';
      decisionReason: string;
      setInactive: boolean;
      hasReviewedAt: boolean;
      hasDecisionReason: boolean;
      hasReviewLockAdminId: boolean;
      hasReviewLockExpiresAt: boolean;
      hasReviewSessionId: boolean;
      hasLastRejectedAt: boolean;
    },
  ): Promise<void> {
    const setClauses = [
      `\`approval_state\` = '${params.targetState}'`,
      '`verifiedByAdmin` = 0',
      '`pending_approval` = 0',
    ];

    if (params.setInactive) {
      setClauses.push('`isActive` = 0');
    }

    if (params.hasReviewedAt) {
      setClauses.push('`approval_reviewed_at` = COALESCE(`approval_reviewed_at`, CURRENT_TIMESTAMP)');
    }

    if (params.hasDecisionReason) {
      setClauses.push(`\`approval_last_decision_reason\` = '${params.decisionReason}'`);
    }

    if (params.hasReviewLockAdminId) {
      setClauses.push('`review_lock_admin_id` = NULL');
    }

    if (params.hasReviewLockExpiresAt) {
      setClauses.push('`review_lock_expires_at` = NULL');
    }

    if (params.hasReviewSessionId) {
      setClauses.push('`review_session_id` = NULL');
    }

    if (params.hasLastRejectedAt && params.targetState === 'REJECTED') {
      setClauses.push('`last_rejected_at` = COALESCE(`last_rejected_at`, CURRENT_TIMESTAMP)');
    }

    await queryRunner.query(
      `
      UPDATE \`carriers\`
      SET ${setClauses.join(',\n          ')}
      WHERE \`email\` = ?
        AND \`approval_state\` = 'DRAFT'
        AND \`verifiedByAdmin\` = 0
        AND \`pending_approval\` = 0
        AND NOT EXISTS (
          SELECT 1
          FROM \`offers\` o
          WHERE o.\`carrierId\` = \`carriers\`.\`id\`
        )
      `,
      [params.email],
    );
  }
}
