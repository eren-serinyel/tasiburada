import { ShipmentInviteRepository } from '../../infrastructure/repositories/ShipmentInviteRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { NotificationService } from './NotificationService';
import { NotFoundError, ConflictError, ValidationError } from '../../domain/errors/AppError';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Offer } from '../../domain/entities/Offer';
import { CarrierCustomExtraService } from '../../domain/entities/CarrierCustomExtraService';
import { ShipmentCustomExtraService } from '../../domain/entities/ShipmentCustomExtraService';
import { CarrierApprovalState } from '../../domain/entities/Carrier';
import { In } from 'typeorm';

export interface InviteRequestedServices {
  catalogServiceIds?: string[];
  customServiceIds?: string[];
}

export class ShipmentInviteService {
  private inviteRepo = new ShipmentInviteRepository();
  private shipmentRepo = new ShipmentRepository();
  private carrierRepo = new CarrierRepository();
  private notificationService = new NotificationService();

  private normalizeRequestedServices(input?: InviteRequestedServices | null): {
    catalogServiceIds: string[];
    customServiceIds: string[];
  } {
    const normalizeIds = (values: unknown): string[] => {
      if (!Array.isArray(values)) return [];
      return Array.from(new Set(
        values
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      ));
    };

    return {
      catalogServiceIds: normalizeIds(input?.catalogServiceIds),
      customServiceIds: normalizeIds(input?.customServiceIds),
    };
  }

  private async snapshotRequestedCustomServices(
    shipmentId: string,
    carrierId: string,
    customServiceIds: string[],
  ): Promise<void> {
    if (!customServiceIds.length) return;

    const customServiceRepo = AppDataSource.getRepository(CarrierCustomExtraService);
    const snapshotRepo = AppDataSource.getRepository(ShipmentCustomExtraService);
    const services = await customServiceRepo.find({
      where: {
        id: In(customServiceIds),
        carrierId,
        isActive: true,
      },
    });

    if (!services.length) return;

    const existing = await snapshotRepo.find({ where: { shipmentId } });
    const existingCustomIds = new Set(existing.map((item) => item.customExtraServiceId).filter(Boolean));
    const snapshots = services
      .filter((service) => !existingCustomIds.has(service.id))
      .map((service) => snapshotRepo.create({
        shipmentId,
        customExtraServiceId: service.id,
        carrierId: service.carrierId,
        nameSnapshot: service.title,
        priceSnapshot: service.basePrice == null ? null : Number(service.basePrice),
      }));

    if (snapshots.length) {
      await snapshotRepo.save(snapshots);
    }
  }

  async invite(customerId: string, shipmentId: string, carrierId: string, requestedServices?: InviteRequestedServices | null) {
    const shipment = await this.shipmentRepo.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) throw new NotFoundError('İlan bulunamadı');

    const carrier = await this.carrierRepo.findById(carrierId);
    if (!carrier) throw new NotFoundError('Nakliyeci bulunamadı');
    if (!carrier.isActive || !carrier.verifiedByAdmin || carrier.approvalState !== CarrierApprovalState.APPROVED) {
      throw new ConflictError('Sadece belgeleri onaylanmis ve dogrulanmis nakliyecilere davet gonderilebilir.');
    }

    const existing = await this.inviteRepo.findByShipmentAndCarrier(shipmentId, carrierId);
    if (existing) throw new ConflictError('Bu nakliyeciye zaten davet gönderilmiş');

    const normalizedRequestedServices = this.normalizeRequestedServices(requestedServices);

    const invite = await this.inviteRepo.create({
      shipmentId,
      carrierId,
      status: 'pending',
      requestedServices: normalizedRequestedServices,
    });

    await this.snapshotRequestedCustomServices(shipmentId, carrierId, normalizedRequestedServices.customServiceIds);

    await this.notificationService.createNotification({
      recipientUserId: carrierId,
      recipientRole: 'carrier',
      type: 'shipment_invite',
      title: 'Yeni Davet',
      body: `Yeni Davet — ${shipment.origin} → ${shipment.destination} talebine davet edildiniz.`,
      entityType: 'shipment',
      entityId: shipmentId,
    });

    return invite;
  }

  private async assertInviteCanBeManaged(customerId: string, shipmentId: string, carrierId: string) {
    const shipment = await this.shipmentRepo.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) throw new NotFoundError('İlan bulunamadı');

    const invite = await this.inviteRepo.findByShipmentAndCarrier(shipmentId, carrierId);
    if (!invite) throw new NotFoundError('Davet bulunamadı');
    if (invite.status !== 'pending') {
      throw new ValidationError('Sadece bekleyen davetler yönetilebilir.');
    }

    const offerCount = await AppDataSource.getRepository(Offer).count({
      where: { shipmentId, carrierId },
    });
    if (offerCount > 0) {
      throw new ValidationError('Nakliyeci teklif verdikten sonra davet hizmetleri değiştirilemez veya geri çekilemez.');
    }

    return invite;
  }

  async withdraw(customerId: string, shipmentId: string, carrierId: string) {
    const invite = await this.assertInviteCanBeManaged(customerId, shipmentId, carrierId);
    await this.inviteRepo.delete(invite.id);
    return { withdrawn: true, shipmentId, carrierId };
  }

  async updateRequestedServices(customerId: string, shipmentId: string, carrierId: string, requestedServices?: InviteRequestedServices | null) {
    const invite = await this.assertInviteCanBeManaged(customerId, shipmentId, carrierId);
    return this.inviteRepo.update(invite.id, {
      requestedServices: this.normalizeRequestedServices(requestedServices),
    });
  }

  async getCarrierInvites(carrierId: string) {
    return this.inviteRepo.findByCarrierId(carrierId, 'pending');
  }

  async getShipmentInvites(shipmentId: string) {
    return this.inviteRepo.findByShipmentId(shipmentId);
  }
}
