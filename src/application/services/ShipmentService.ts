import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { CarrierStatsRepository } from '../../infrastructure/repositories/CarrierStatsRepository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';

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

  async getPendingShipmentsForCarrier(_carrierId: string): Promise<Shipment[]> {
    // TODO: Filter by carrier activity/service areas.
    return await this.shipmentRepository.findPendingShipments();
  }

  async createShipment(customerId: string, payload: CreateShipmentPayload): Promise<Shipment> {
    if (!payload.origin || !payload.destination || !payload.loadDetails || !payload.shipmentDate) {
      throw new ValidationError('origin, destination, loadDetails ve shipmentDate alanları zorunludur.');
    }

    return await this.shipmentRepository.createShipmentRecord({
      customerId,
      origin: payload.origin,
      destination: payload.destination,
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
      status: ShipmentStatus.PENDING
    });
  }

  async getMyShipments(customerId: string): Promise<Array<Shipment & { offerCount: number }>> {
    return await this.shipmentRepository.findByCustomerIdWithOfferCount(customerId);
  }

  async getShipmentById(shipmentId: string): Promise<Shipment | null> {
    return await this.shipmentRepository.findByIdWithOffers(shipmentId);
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
    if (!updatedShipment) {
      throw new NotFoundError('Taşıma tamamlandı ancak kayıt getirilemedi.');
    }

    return updatedShipment;
  }

}
