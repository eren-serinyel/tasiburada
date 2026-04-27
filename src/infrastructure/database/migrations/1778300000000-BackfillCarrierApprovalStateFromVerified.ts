import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCarrierApprovalStateFromVerified1778300000000 implements MigrationInterface {
  name = 'BackfillCarrierApprovalStateFromVerified1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasApprovedAt = await queryRunner.hasColumn('carriers', 'approval_approved_at');
    const hasReviewedAt = await queryRunner.hasColumn('carriers', 'approval_reviewed_at');
    const hasLastDecisionReason = await queryRunner.hasColumn('carriers', 'approval_last_decision_reason');
    const hasApprovalVersion = await queryRunner.hasColumn('carriers', 'approval_version');

    const setClauses: string[] = ["`approval_state` = 'APPROVED'"];

    if (hasApprovedAt) {
      setClauses.push('`approval_approved_at` = COALESCE(`approval_approved_at`, CURRENT_TIMESTAMP)');
    }

    if (hasReviewedAt) {
      setClauses.push('`approval_reviewed_at` = COALESCE(`approval_reviewed_at`, CURRENT_TIMESTAMP)');
    }

    if (hasLastDecisionReason) {
      setClauses.push("`approval_last_decision_reason` = COALESCE(NULLIF(`approval_last_decision_reason`, ''), 'legacy_verified_backfill')");
    }

    if (hasApprovalVersion) {
      setClauses.push('`approval_version` = COALESCE(`approval_version`, 0) + 1');
    }

    if (setClauses.length === 0) return;

    await queryRunner.query(
      `
      UPDATE \`carriers\`
      SET ${setClauses.join(',\n          ')}
      WHERE \`verifiedByAdmin\` = 1
        AND \`isActive\` = 1
        AND (
          \`approval_state\` IS NULL
          OR (
            \`approval_state\` <> 'APPROVED'
            AND \`approval_state\` NOT IN ('REJECTED', 'SUSPENDED')
          )
        )
      `,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data backfill migration.
  }
}
