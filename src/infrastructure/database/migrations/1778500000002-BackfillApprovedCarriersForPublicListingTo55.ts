import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillApprovedCarriersForPublicListingTo551778500000002 implements MigrationInterface {
  name = 'BackfillApprovedCarriersForPublicListingTo551778500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`carriers\`
      SET
        \`approval_state\` = 'APPROVED',
        \`approval_version\` = COALESCE(\`approval_version\`, 0) + 1,
        \`pending_approval\` = 0,
        \`review_lock_admin_id\` = NULL,
        \`review_lock_expires_at\` = NULL,
        \`review_session_id\` = NULL
      WHERE \`isActive\` = 1
        AND \`verifiedByAdmin\` = 1
        AND \`approval_state\` = 'DRAFT'
      ORDER BY COALESCE(\`rating\`, 0) DESC, \`completedShipments\` DESC, \`createdAt\` ASC
      LIMIT 42
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible data backfill migration.
  }
}