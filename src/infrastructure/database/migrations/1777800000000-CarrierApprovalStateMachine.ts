import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

type CarrierRow = {
  id: string;
  verifiedByAdmin: number;
  pendingApproval: number;
};

type ActivityRow = {
  carrierId: string;
  city: string | null;
  district: string | null;
  serviceAreasJson: string | null;
};

type CountRow = {
  carrierId: string;
  count: string;
};

type DocumentRow = {
  carrierId: string;
  type: string;
  status: string;
  fileUrl: string | null;
};

const REQUIRED_DOCUMENT_TYPES = new Set([
  'AUTHORIZATION_CERT',
  'SRC_CERT',
  'VEHICLE_LICENSE',
  'TAX_PLATE',
]);

export class CarrierApprovalStateMachine1777800000000 implements MigrationInterface {
  name = 'CarrierApprovalStateMachine1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({
        name: 'approval_state',
        type: 'enum',
        enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'],
        default: "'DRAFT'",
      }),
      new TableColumn({
        name: 'approval_version',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'resubmission_count',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'last_rejected_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'last_submitted_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'review_lock_admin_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
      new TableColumn({
        name: 'review_lock_expires_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'review_session_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
      new TableColumn({
        name: 'approval_readiness_cached',
        type: 'tinyint',
        width: 1,
        default: 0,
      }),
      new TableColumn({
        name: 'approval_readiness_computed_at',
        type: 'datetime',
        isNullable: true,
      }),
      new TableColumn({
        name: 'draft_revision',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'last_reviewed_draft_revision',
        type: 'int',
        default: 0,
      }),
    ];

    for (const column of columns) {
      const exists = await queryRunner.hasColumn('carriers', column.name);
      if (!exists) {
        await queryRunner.addColumn('carriers', column);
      }
    }

    await this.backfillApprovalState(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnNames = [
      'last_reviewed_draft_revision',
      'draft_revision',
      'approval_readiness_computed_at',
      'approval_readiness_cached',
      'review_session_id',
      'review_lock_expires_at',
      'review_lock_admin_id',
      'last_submitted_at',
      'last_rejected_at',
      'resubmission_count',
      'approval_version',
      'approval_state',
    ];

    for (const columnName of columnNames) {
      if (await queryRunner.hasColumn('carriers', columnName)) {
        await queryRunner.dropColumn('carriers', columnName);
      }
    }
  }

  private async backfillApprovalState(queryRunner: QueryRunner): Promise<void> {
    const carriers = await queryRunner.query(
      'SELECT id, verifiedByAdmin, pending_approval AS pendingApproval FROM `carriers`'
    ) as CarrierRow[];

    if (!carriers.length) return;

    const activities = await queryRunner.query(
      'SELECT carrierId, city, district, serviceAreasJson FROM `carrier_activity`'
    ) as ActivityRow[];
    const vehicleCounts = await queryRunner.query(
      'SELECT carrierId, COUNT(*) AS count FROM `carrier_vehicle_types` GROUP BY carrierId'
    ) as CountRow[];
    const serviceTypeCounts = await queryRunner.query(
      'SELECT carrierId, COUNT(*) AS count FROM `carrier_service_types` GROUP BY carrierId'
    ) as CountRow[];
    const documents = await queryRunner.query(
      "SELECT carrierId, type, status, fileUrl FROM `carrier_documents` WHERE type IN ('AUTHORIZATION_CERT','SRC_CERT','VEHICLE_LICENSE','TAX_PLATE')"
    ) as DocumentRow[];

    const activityByCarrier = new Map(activities.map((row) => [row.carrierId, row]));
    const vehicleCountByCarrier = new Map(vehicleCounts.map((row) => [row.carrierId, Number(row.count || 0)]));
    const serviceTypeCountByCarrier = new Map(serviceTypeCounts.map((row) => [row.carrierId, Number(row.count || 0)]));
    const documentsByCarrier = new Map<string, DocumentRow[]>();

    for (const document of documents) {
      const list = documentsByCarrier.get(document.carrierId) ?? [];
      list.push(document);
      documentsByCarrier.set(document.carrierId, list);
    }

    for (const carrier of carriers) {
      const readiness = this.computeLegacyReadiness(
        carrier.id,
        activityByCarrier.get(carrier.id) ?? null,
        vehicleCountByCarrier.get(carrier.id) ?? 0,
        serviceTypeCountByCarrier.get(carrier.id) ?? 0,
        documentsByCarrier.get(carrier.id) ?? [],
      );

      const approvalState = carrier.verifiedByAdmin
        ? 'APPROVED'
        : carrier.pendingApproval && readiness
          ? 'SUBMITTED'
          : 'DRAFT';

      await queryRunner.query(
        `UPDATE \`carriers\`
         SET \`approval_state\` = ?,
             \`approval_readiness_cached\` = ?,
             \`approval_readiness_computed_at\` = CURRENT_TIMESTAMP,
             \`approval_version\` = CASE WHEN ? = 'APPROVED' THEN 1 WHEN ? = 'SUBMITTED' THEN 1 ELSE 0 END,
             \`resubmission_count\` = CASE WHEN ? = 'SUBMITTED' THEN 1 ELSE 0 END,
             \`last_submitted_at\` = CASE WHEN ? = 'SUBMITTED' THEN CURRENT_TIMESTAMP ELSE NULL END,
             \`draft_revision\` = CASE WHEN ? = 1 THEN 1 ELSE 0 END,
             \`last_reviewed_draft_revision\` = CASE WHEN ? = 'APPROVED' THEN 1 ELSE 0 END
         WHERE \`id\` = ?`,
        [
          approvalState,
          readiness ? 1 : 0,
          approvalState,
          approvalState,
          approvalState,
          approvalState,
          readiness ? 1 : 0,
          approvalState,
          carrier.id,
        ],
      );
    }
  }

  private computeLegacyReadiness(
    carrierId: string,
    activity: ActivityRow | null,
    vehicleTypeCount: number,
    serviceTypeCount: number,
    documents: DocumentRow[],
  ): boolean {
    const hasProfileFields = Boolean(
      activity?.city &&
      activity?.district &&
      this.parseServiceAreas(activity?.serviceAreasJson).length > 0 &&
      vehicleTypeCount > 0 &&
      serviceTypeCount > 0,
    );

    if (!hasProfileFields) {
      return false;
    }

    const validTypes = new Set<string>();
    for (const document of documents) {
      if (!REQUIRED_DOCUMENT_TYPES.has(document.type)) continue;
      if (!document.fileUrl || !document.fileUrl.trim()) continue;
      if (String(document.status || '').toUpperCase() === 'REJECTED') {
        return false;
      }
      validTypes.add(document.type);
    }

    return REQUIRED_DOCUMENT_TYPES.size === validTypes.size;
  }

  private parseServiceAreas(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
}
