import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { NotificationService } from './NotificationService';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';

interface CreateOfferPayload {
  shipmentId: string;
  price: number;
  message?: string;
  estimatedDuration?: number;
}

interface RequestUser {
  customerId?: string;
  carrierId?: string;
  type?: 'customer' | 'carrier' | 'admin';
}

export class OfferService {
  private offerRepository = new OfferRepository();
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();
  private notificationService = new NotificationService();

  private sanitizeOffer(offer: Offer): Offer {
    if (!offer?.carrier) {
      return offer;
    }

    const carrierWithoutPassword = { ...offer.carrier } as any;
    delete carrierWithoutPassword.passwordHash;

    return {
      ...offer,
      carrier: carrierWithoutPassword
    };
  }

  async createOffer(carrierId: string, payload: CreateOfferPayload): Promise<Offer> {
    if (!payload.shipmentId || typeof payload.price !== 'number') {
      throw new ValidationError('shipmentId ve price alanları zorunludur.');
    }

    const shipment = await this.shipmentRepository.findById(payload.shipmentId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
      throw new ValidationError('Sadece teklif almaya açık taşıma taleplerine teklif verilebilir.');
    }

    const duplicateOffer = await this.offerRepository.existsByShipmentAndCarrier(payload.shipmentId, carrierId);
    if (duplicateOffer) {
      throw new ConflictError('Bu taşıma talebi için zaten teklif verdiniz.');
    }

    const offer = await this.offerRepository.create({
      shipmentId: payload.shipmentId,
      carrierId,
      price: payload.price,
      message: payload.message || undefined,
      estimatedDuration: payload.estimatedDuration || undefined,
      status: OfferStatus.PENDING
    });

    await this.carrierRepository.incrementTotalOffers(carrierId);

    if (shipment.status === ShipmentStatus.PENDING) {
      await this.shipmentRepository.update(payload.shipmentId, {
        status: ShipmentStatus.OFFER_RECEIVED
      });
    }

    const createdOffer = await this.offerRepository.findByIdWithShipmentAndCarrier(offer.id);
    if (!createdOffer) {
      throw new NotFoundError('Teklif oluşturuldu ancak getirilemedi.');
    }

    await this.notificationService.createNotification(
      shipment.customerId,
      'customer',
      'NEW_OFFER',
      'Yeni Teklif Aldınız',
      `${createdOffer.carrier?.companyName || 'Nakliyeci'} taşımanız için teklif verdi.`,
      shipment.id
    );

    return this.sanitizeOffer(createdOffer);
  }

  async getOfferById(offerId: string, user: RequestUser): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    const isCustomerOwner = user.type === 'customer' && user.customerId === offer.shipment?.customerId;
    const isCarrierOwner = user.type === 'carrier' && user.carrierId === offer.carrierId;

    if (!isCustomerOwner && !isCarrierOwner) {
      throw new ForbiddenError('Bu teklife erişim yetkiniz yok.');
    }

    return this.sanitizeOffer(offer);
  }

  async acceptOffer(customerId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    if (offer.shipment?.customerId !== customerId) {
      throw new ForbiddenError('Bu teklifi kabul etme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen teklifler kabul edilebilir.');
    }

    await this.offerRepository.update(offer.id, { status: OfferStatus.ACCEPTED });
    await this.offerRepository.rejectOtherPendingOffers(offer.shipmentId, offer.id);

    await this.shipmentRepository.update(offer.shipmentId, {
      status: ShipmentStatus.MATCHED,
      carrierId: offer.carrierId,
      price: offer.price
    });

    const updatedOffer = await this.offerRepository.findByIdWithShipmentAndCarrier(offer.id);
    if (!updatedOffer) {
      throw new NotFoundError('Teklif kabul edildi ancak getirilemedi.');
    }

    await this.notificationService.createNotification(
      offer.carrierId,
      'carrier',
      'OFFER_ACCEPTED',
      'Teklifiniz Kabul Edildi',
      'Müşteri teklifinizi kabul etti. Taşımaya hazırlanın.',
      offer.shipmentId
    );

    return this.sanitizeOffer(updatedOffer);
  }

  async rejectOffer(customerId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    if (offer.shipment?.customerId !== customerId) {
      throw new ForbiddenError('Bu teklifi reddetme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen teklifler reddedilebilir.');
    }

    const rejectedOffer = await this.offerRepository.update(offer.id, { status: OfferStatus.REJECTED });
    if (!rejectedOffer) {
      throw new ValidationError('Teklif reddedilemedi.');
    }

    await this.notificationService.createNotification(
      offer.carrierId,
      'carrier',
      'OFFER_REJECTED',
      'Teklifiniz Reddedildi',
      'Müşteri teklifinizi reddetti.',
      offer.shipmentId
    );

    return this.sanitizeOffer(rejectedOffer);
  }

  async getCarrierOffers(carrierId: string): Promise<Offer[]> {
    const offers = await this.offerRepository.findByCarrierId(carrierId);
    return offers.map(offer => this.sanitizeOffer(offer));
  }
}
