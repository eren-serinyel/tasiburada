import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class BackfillShipmentCustomExtraServicesFromInvites1780400000000 implements MigrationInterface {
  name = 'BackfillShipmentCustomExtraServicesFromInvites1780400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('shipment_custom_extra_services');
    const inviteTableExists = await queryRunner.hasTable('shipment_invites');
    const serviceTableExists = await queryRunner.hasTable('carrier_custom_extra_services');
    if (!tableExists || !inviteTableExists || !serviceTableExists) return;

    const invites = await queryRunner.query(`
      SELECT shipmentId, carrierId, requestedServices
      FROM shipment_invites
      WHERE requestedServices IS NOT NULL
    `);

    for (const invite of invites as Array<{ shipmentId: string; carrierId: string; requestedServices: unknown }>) {
      const requestedServices = this.parseRequestedServices(invite.requestedServices);
      const customServiceIds = requestedServices.customServiceIds;
      if (!customServiceIds.length) continue;

      for (const customServiceId of customServiceIds) {
        const existing = await queryRunner.query(`
          SELECT id
          FROM shipment_custom_extra_services
          WHERE shipment_id = ? AND custom_extra_service_id = ?
          LIMIT 1
        `, [invite.shipmentId, customServiceId]);
        if (existing.length) continue;

        const services = await queryRunner.query(`
          SELECT id, carrier_id, title, base_price
          FROM carrier_custom_extra_services
          WHERE id = ? AND carrier_id = ? AND is_active = 1
          LIMIT 1
        `, [customServiceId, invite.carrierId]);
        const service = services[0];
        if (!service?.title) continue;

        await queryRunner.query(`
          INSERT INTO shipment_custom_extra_services
            (id, shipment_id, custom_extra_service_id, carrier_id, name_snapshot, price_snapshot)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          randomUUID(),
          invite.shipmentId,
          service.id,
          service.carrier_id,
          service.title,
          service.base_price == null ? null : Number(service.base_price),
        ]);
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Snapshot backfills are data-preserving and intentionally not reverted.
  }

  private parseRequestedServices(raw: unknown): { customServiceIds: string[] } {
    const value = typeof raw === 'string'
      ? this.safeParseJson(raw)
      : raw;
    const customServiceIds = Array.isArray((value as any)?.customServiceIds)
      ? (value as any).customServiceIds
      : [];

    return {
      customServiceIds: Array.from(new Set(
        customServiceIds
          .map((id: unknown) => String(id || '').trim())
          .filter(Boolean),
      )),
    };
  }

  private safeParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
