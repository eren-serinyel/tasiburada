import { ShipmentInviteRepository } from '../../infrastructure/repositories/ShipmentInviteRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { NotificationService } from './NotificationService';
import { NotFoundError, ConflictError } from '../../domain/errors/AppError';

export class ShipmentInviteService {
  private inviteRepo = new ShipmentInviteRepository();
  private shipmentRepo = new ShipmentRepository();
  private carrierRepo = new CarrierRepository();
  private notificationService = new NotificationService();

  async invite(customerId: string, shipmentId: string, carrierId: string) {
    const shipment = await this.shipmentRepo.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) throw new NotFoundError('İlan bulunamadı');

    const carrier = await this.carrierRepo.findById(carrierId);
    if (!carrier) throw new NotFoundError('Nakliyeci bulunamadı');

    const existing = await this.inviteRepo.findByShipmentAndCarrier(shipmentId, carrierId);
    if (existing) throw new ConflictError('Bu nakliyeciye zaten davet gönderilmiş');

    const invite = await this.inviteRepo.create({
      shipmentId,
      carrierId,
      status: 'pending'
    });

    await this.notificationService.createNotification(
      carrierId,
      'carrier',
      'shipment_invite',
      'Yeni Davet',
      'Daha önce çalıştığınız bir müşteri sizi yeni talebine davet etti.',
      shipmentId
    );

    return invite;
  }

  async getCarrierInvites(carrierId: string) {
    return this.inviteRepo.findByCarrierId(carrierId, 'pending');
  }

  async getShipmentInvites(shipmentId: string) {
    return this.inviteRepo.findByShipmentId(shipmentId);
  }
}
