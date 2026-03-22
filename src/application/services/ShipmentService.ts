import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';

interface CreateShipmentPayload {
  origin: string;
  destination: string;
  loadDetails: string;
  weight?: number;
  shipmentDate: string | Date;
  price?: number;
}

interface UpdateShipmentPayload {
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number;
  shipmentDate?: string | Date;
  price?: number;
}

export class ShipmentService {
  private shipmentRepository = new ShipmentRepository();

  async getPendingShipmentsForCarrier(_carrierId: string): Promise<Shipment[]> {
    // TODO: Filter by carrier activity/service areas.
    return await this.shipmentRepository.findPendingShipments();
  }

  async createShipment(customerId: string, payload: CreateShipmentPayload): Promise<Shipment> {
    if (!payload.origin || !payload.destination || !payload.loadDetails || !payload.shipmentDate) {
      throw new Error('origin, destination, loadDetails ve shipmentDate alanları zorunludur.');
    }

    return await this.shipmentRepository.create({
      customerId,
      origin: payload.origin,
      destination: payload.destination,
      loadDetails: payload.loadDetails,
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
      throw new Error('Taşıma talebi bulunamadı.');
    }

    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new Error('Sadece bekleyen taşıma talepleri güncellenebilir.');
    }

    const updatedShipment = await this.shipmentRepository.update(shipmentId, {
      origin: payload.origin,
      destination: payload.destination,
      loadDetails: payload.loadDetails,
      weight: payload.weight,
      shipmentDate: payload.shipmentDate ? new Date(payload.shipmentDate) : undefined,
      price: payload.price
    });

    if (!updatedShipment) {
      throw new Error('Taşıma talebi güncellenemedi.');
    }

    return updatedShipment;
  }

  async cancelShipment(customerId: string, shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) {
      throw new Error('Taşıma talebi bulunamadı.');
    }

    if (shipment.status === ShipmentStatus.COMPLETED || shipment.status === ShipmentStatus.CANCELLED) {
      throw new Error('Bu taşıma talebi iptal edilemez.');
    }

    const cancelledShipment = await this.shipmentRepository.update(shipmentId, {
      status: ShipmentStatus.CANCELLED
    });

    if (!cancelledShipment) {
      throw new Error('Taşıma talebi iptal edilemedi.');
    }

    return cancelledShipment;
  }
}
