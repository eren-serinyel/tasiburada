import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { CarrierStatsRepository } from '../../infrastructure/repositories/CarrierStatsRepository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { NotificationService } from './NotificationService';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CarrierEarningsLog } from '../../domain/entities/CarrierEarningsLog';

interface CreateShipmentPayload {
  origin: string;
  destination: string;
  loadDetails: string;
  transportType?: string;
  placeType?: string;
  hasElevator?: boolean;
  floor?: number;
  insuranceType?: string;
  timePreference?: string;
  extraServices?: string[];
  weight?: number;
  shipmentDate: string | Date;
  price?: number;
  note?: string;
  vehiclePreference?: string;
  contactPhone?: string;
}

interface UpdateShipmentPayload {
  origin?: string;
  destination?: string;
  loadDetails?: string;
  transportType?: string;
  placeType?: string;
  hasElevator?: boolean;
  floor?: number;
  insuranceType?: string;
  timePreference?: string;
  extraServices?: string[];
  weight?: number;
  shipmentDate?: string | Date;
  price?: number;
}

export class ShipmentService {
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();
  private carrierStatsRepository = new CarrierStatsRepository();
  private notificationService = new NotificationService();
  private earningsLogRepo = AppDataSource.getRepository(CarrierEarningsLog);

  async getPendingShipmentsForCarrier(_carrierId: string): Promise<Shipment[]> {
    // TODO: Filter by carrier activity/service areas.
    return await this.shipmentRepository.findPendingShipments();
  }

  async createShipment(customerId: string, payload: CreateShipmentPayload): Promise<Shipment> {
    if (!payload.origin || !payload.destination || !payload.loadDetails || !payload.shipmentDate) {
      throw new ValidationError('origin, destination, loadDetails ve shipmentDate alanları zorunludur.');
    }

    const origin = payload.origin.trim();
    const destination = payload.destination.trim();

    if (origin.length < 3) {
      throw new ValidationError('Çıkış noktası en az 3 karakter olmalıdır.');
    }
    if (destination.length < 3) {
      throw new ValidationError('Varış noktası en az 3 karakter olmalıdır.');
    }

    return await this.shipmentRepository.createShipmentRecord({
      customerId,
      origin,
      destination,
      loadDetails: payload.loadDetails,
      transportType: payload.transportType,
      placeType: payload.placeType,
      hasElevator: payload.hasElevator ?? false,
      floor: payload.floor,
      insuranceType: payload.insuranceType ?? 'none',
      timePreference: payload.timePreference,
      extraServices: payload.extraServices,
      weight: payload.weight,
      shipmentDate: new Date(payload.shipmentDate),
      price: payload.price,
      note: payload.note,
      vehiclePreference: payload.vehiclePreference,
      contactPhone: payload.contactPhone ?? null,
      status: ShipmentStatus.PENDING
    });
  }

  async getMyShipments(customerId: string): Promise<Array<Shipment & { offerCount: number }>> {
    return await this.shipmentRepository.findByCustomerIdWithOfferCount(customerId);
  }

  async getShipmentById(
    shipmentId: string,
    requestingUserId: string,
    requestingUserType: 'customer' | 'carrier' | 'admin'
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdWithOffers(shipmentId);

    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    // Admin her gönderiyi görebilir
    if (requestingUserType === 'admin') {
      return shipment;
    }

    // Müşteri: sadece kendi gönderisini görebilir
    if (requestingUserType === 'customer') {
      if (shipment.customerId !== requestingUserId) {
        throw new ForbiddenError('Bu gönderiye erişim yetkiniz yok.');
      }
      return shipment;
    }

    // Nakliyeci: kendisine atanmış veya teklif verilebilir (PENDING/OFFER_RECEIVED) gönderileri görebilir
    if (requestingUserType === 'carrier') {
      const isAssigned = shipment.carrierId === requestingUserId;
      const isOpenForOffers = (
        shipment.status === ShipmentStatus.PENDING ||
        shipment.status === ShipmentStatus.OFFER_RECEIVED
      );
      if (!isAssigned && !isOpenForOffers) {
        throw new ForbiddenError('Bu gönderiye erişim yetkiniz yok.');
      }
      return shipment;
    }

    throw new ForbiddenError('Bu gönderiye erişim yetkiniz yok.');
  }

  async updateShipment(customerId: string, shipmentId: string, payload: UpdateShipmentPayload): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen taşıma talepleri güncellenebilir.');
    }

    const updatedShipment = await this.shipmentRepository.update(shipmentId, {
      origin: payload.origin,
      destination: payload.destination,
      loadDetails: payload.loadDetails,
      transportType: payload.transportType,
      placeType: payload.placeType,
      hasElevator: payload.hasElevator,
      floor: payload.floor,
      insuranceType: payload.insuranceType,
      timePreference: payload.timePreference,
      extraServices: payload.extraServices,
      weight: payload.weight,
      shipmentDate: payload.shipmentDate ? new Date(payload.shipmentDate) : undefined,
      price: payload.price
    });

    if (!updatedShipment) {
      throw new ValidationError('Taşıma talebi güncellenemedi.');
    }

    return updatedShipment;
  }

  async cancelShipment(customerId: string, shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (shipment.status === ShipmentStatus.COMPLETED || shipment.status === ShipmentStatus.CANCELLED) {
      throw new ValidationError('Bu taşıma talebi iptal edilemez.');
    }

    const cancelledShipment = await this.shipmentRepository.update(shipmentId, {
      status: ShipmentStatus.CANCELLED
    });

    if (!cancelledShipment) {
      throw new ValidationError('Taşıma talebi iptal edilemedi.');
    }

    if (shipment.carrierId) {
      await this.carrierRepository.incrementCancelledShipments(shipment.carrierId);
      await this.carrierRepository.recalculateSuccessRate(shipment.carrierId);
      try {
        await this.notificationService.createNotification(
          shipment.carrierId,
          'carrier',
          'SHIPMENT_CANCELLED',
          'Taşıma İptal Edildi',
          'Müşteri taşıma talebini iptal etti.',
          shipmentId
        );
      } catch { /* bildirim hatası taşımayı etkilemesin */ }
    }

    return cancelledShipment;
  }

  async startShipmentByCarrier(carrierId: string, shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (shipment.carrierId !== carrierId) {
      throw new ForbiddenError('Bu taşıma talebini başlatma yetkiniz yok.');
    }

    if (shipment.status !== ShipmentStatus.MATCHED) {
      throw new ValidationError('Sadece eşleşen taşıma talepleri başlatılabilir.');
    }

    const transitioned = await this.shipmentRepository.transitionStatusIfCurrent(
      shipmentId,
      ShipmentStatus.MATCHED,
      ShipmentStatus.IN_TRANSIT
    );

    if (!transitioned) {
      throw new ValidationError('Taşıma durumu değiştirilemedi. Lütfen tekrar deneyin.');
    }

    await this.carrierStatsRepository.incrementActiveJobs(carrierId, 1);

    const updatedShipment = await this.shipmentRepository.findById(shipmentId);
    if (!updatedShipment) {
      throw new NotFoundError('Taşıma başlatıldı ancak kayıt getirilemedi.');
    }

    try {
      await this.notificationService.createNotification(
        updatedShipment.customerId,
        'customer',
        'SHIPMENT_STARTED',
        'Taşımanız Başladı',
        'Nakliyeci taşımanızı başlattı. Teslimatı takip edebilirsiniz.',
        shipmentId
      );
    } catch { /* bildirim hatası taşımayı etkilemesin */ }

    return updatedShipment;
  }

  async completeShipmentByCarrier(carrierId: string, shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (shipment.carrierId !== carrierId) {
      throw new ForbiddenError('Bu taşıma talebini tamamlama yetkiniz yok.');
    }

    if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
      throw new ValidationError('Sadece yolda olan taşıma talepleri tamamlanabilir.');
    }

    const transitioned = await this.shipmentRepository.transitionStatusIfCurrent(
      shipmentId,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.COMPLETED
    );

    if (!transitioned) {
      throw new ValidationError('Taşıma durumu değiştirilemedi. Lütfen tekrar deneyin.');
    }

    await this.carrierRepository.incrementCompletedShipments(carrierId);
    await this.carrierRepository.recalculateSuccessRate(carrierId);
    await this.carrierStatsRepository.incrementTotalJobs(carrierId, 1);
    await this.carrierStatsRepository.incrementActiveJobs(carrierId, -1);

    const updatedShipment = await this.shipmentRepository.findById(shipmentId);
    if (updatedShipment?.price && Number(updatedShipment.price) > 0) {
      try {
        const log = this.earningsLogRepo.create({
          carrierId,
          shipmentId,
          amount: Number(updatedShipment.price),
        });
        await this.earningsLogRepo.save(log);

        await this.carrierStatsRepository.incrementTotalEarnings(carrierId, Number(updatedShipment.price));
      } catch { /* kazanç logu hatası taşımayı etkilemesin */ }
    }
    if (!updatedShipment) {
      throw new NotFoundError('Taşıma tamamlandı ancak kayıt getirilemedi.');
    }

    try {
      await this.notificationService.createNotification(
        updatedShipment.customerId,
        'customer',
        'SHIPMENT_COMPLETED',
        'Taşımanız Tamamlandı',
        'Eşyalarınız teslim edildi. Lütfen nakliyeciyi değerlendirin.',
        shipmentId
      );
    } catch { /* bildirim hatası taşımayı etkilemesin */ }

    return updatedShipment;
  }

  async searchShipments(params: {
    origin?: string;
    destination?: string;
    status?: string;
    loadType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ shipments: Shipment[], total: number }> {
    const { origin, destination, status, loadType, page = 1, limit = 10 } = params;

    const qb = AppDataSource.getRepository(Shipment)
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('shipment.carrier', 'carrier');

    if (origin) qb.andWhere('shipment.origin LIKE :origin', { origin: `%${origin}%` });
    if (destination) qb.andWhere('shipment.destination LIKE :destination', { destination: `%${destination}%` });
    if (status) qb.andWhere('shipment.status = :status', { status });
    if (loadType) qb.andWhere('shipment.loadDetails LIKE :loadType', { loadType: `%${loadType}%` });

    qb.orderBy('shipment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [shipments, total] = await qb.getManyAndCount();
    return { shipments, total };
  }

  async assignCarrier(
    shipmentId: string,
    carrierId: string,
    requestingCustomerId: string
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Taşıma bulunamadı');

    // Ownership kontrolü
    if (shipment.customerId !== requestingCustomerId) {
      throw new ForbiddenError('Bu gönderiye nakliyeci atama yetkiniz yok.');
    }

    const updated = await this.shipmentRepository.update(shipmentId, {
      carrierId,
      status: ShipmentStatus.MATCHED
    });

    if (!updated) throw new Error('Taşıma güncellenemedi');
    return updated;
  }

}
