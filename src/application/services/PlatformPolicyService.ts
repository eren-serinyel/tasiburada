import { createHash } from 'crypto';
import { In, MoreThan } from 'typeorm';
import {
  ContactFilterAction,
  ContactFilterLog,
  ContactFilterSurface,
  MatchCooldown,
  MatchCooldownStatus,
  Shipment,
  ShipmentStatus,
} from '../../domain/entities';
import { ValidationError, ConflictError } from '../../domain/errors/AppError';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { analyzeContactInfo } from '../../utils/security';

type ActorType = 'customer' | 'carrier' | 'admin' | 'system';

interface ContactPolicyInput {
  actorType: ActorType;
  actorId?: string | null;
  surface: ContactFilterSurface;
  text?: string | null;
  shipmentId?: string | null;
  offerId?: string | null;
  action?: ContactFilterAction;
}

const DIRECT_CONTACT_MESSAGE =
  'Guvenliginiz icin telefon, e-posta, link veya platform disi iletisim yonlendirmesi paylasilamaz.';

export class PlatformPolicyService {
  async hasActiveCooldown(customerId: string, carrierId: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(MatchCooldown);
    const cooldown = await repo.findOne({
      where: {
        customerId,
        carrierId,
        status: MatchCooldownStatus.ACTIVE,
        activeUntil: MoreThan(new Date()),
      },
      select: ['id'],
    });

    return Boolean(cooldown);
  }

  async getActiveCooldownCustomerIdsForCarrier(carrierId: string, customerIds: string[]): Promise<Set<string>> {
    if (!carrierId || customerIds.length === 0) {
      return new Set<string>();
    }

    const uniqueCustomerIds = Array.from(new Set(customerIds.filter(Boolean)));
    if (uniqueCustomerIds.length === 0) {
      return new Set<string>();
    }

    const repo = AppDataSource.getRepository(MatchCooldown);
    const rows = await repo.find({
      where: {
        carrierId,
        customerId: In(uniqueCustomerIds),
        status: MatchCooldownStatus.ACTIVE,
        activeUntil: MoreThan(new Date()),
      },
      select: ['customerId'],
    });

    return new Set(rows.map((row) => row.customerId));
  }

  async enforceNoContactInfo(input: ContactPolicyInput): Promise<void> {
    if (!input.text?.trim()) return;

    const analysis = analyzeContactInfo(input.text);
    if (!analysis.hasContactInfo) return;

    await this.logContactPolicyHit({
      ...input,
      action: input.action ?? ContactFilterAction.BLOCKED,
      rules: analysis.rules,
    });

    throw new ValidationError(DIRECT_CONTACT_MESSAGE);
  }

  async logContactPolicyHit(input: ContactPolicyInput & { rules: string[] }): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(ContactFilterLog);
      const textHash = createHash('sha256')
        .update(input.text ?? '')
        .digest('hex');

      const log = repo.create({
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        surface: input.surface,
        shipmentId: input.shipmentId ?? null,
        offerId: input.offerId ?? null,
        action: input.action ?? ContactFilterAction.BLOCKED,
        matchedRules: input.rules,
        textHash,
      });
      await repo.save(log);
    } catch (err) {
      console.error('[PlatformPolicyService] contact filter log failed:', err);
    }
  }

  shouldRevealDirectContact(shipment: Shipment, viewerType: 'customer' | 'carrier' | 'admin', viewerId: string): boolean {
    if (viewerType === 'admin') return true;
    if (![ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT].includes(shipment.status)) return false;
    if (viewerType === 'customer' && shipment.customerId !== viewerId) return false;
    if (viewerType === 'carrier' && shipment.carrierId !== viewerId) return false;
    if (shipment.status === ShipmentStatus.IN_TRANSIT) return true;

    const shipmentDate = new Date(shipment.shipmentDate);
    if (Number.isNaN(shipmentDate.getTime())) return false;

    const revealAt = new Date(shipmentDate);
    revealAt.setHours(revealAt.getHours() - 24);
    return new Date() >= revealAt;
  }

  async assertNoActiveCooldown(customerId: string, carrierId: string): Promise<void> {
    if (await this.hasActiveCooldown(customerId, carrierId)) {
      throw new ConflictError(
        'Bu musteri ve nakliyeci eslesmesi aktif bekleme suresinde.'
      );
    }
  }

  shouldCreateCancellationCooldown(shipment: Shipment, reason?: string | null): boolean {
    if (!shipment.carrierId || shipment.status !== ShipmentStatus.MATCHED) return false;

    const normalizedReason = (reason ?? '').toLocaleLowerCase('tr-TR');
    const mutualCancellation =
      normalizedReason.includes('karsilikli') ||
      normalizedReason.includes('karşılıklı') ||
      normalizedReason.includes('mutabakat') ||
      normalizedReason.includes('anlasma') ||
      normalizedReason.includes('anlaşma');

    if (mutualCancellation) return false;

    const matchedAt = shipment.matchedAt ?? shipment.updatedAt ?? shipment.createdAt;
    const matchedForMs = Date.now() - new Date(matchedAt).getTime();
    return matchedForMs >= 48 * 60 * 60 * 1000;
  }

  async createCancellationCooldown(shipment: Shipment, reason?: string | null): Promise<void> {
    if (!shipment.carrierId) return;

    const repo = AppDataSource.getRepository(MatchCooldown);
    const now = new Date();
    const activeUntil = new Date(now);
    activeUntil.setDate(activeUntil.getDate() + 30);

    const cooldown = repo.create({
      customerId: shipment.customerId,
      carrierId: shipment.carrierId,
      shipmentId: shipment.id,
      reason: reason ?? null,
      matchedAt: shipment.matchedAt ?? shipment.updatedAt ?? shipment.createdAt,
      cancelledAt: now,
      activeUntil,
      status: MatchCooldownStatus.ACTIVE,
    });

    await repo.save(cooldown);
  }
}
