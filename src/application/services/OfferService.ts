import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';

interface CreateOfferPayload {
  shipmentId: string;
  price: number;
}

interface RequestUser {
  customerId?: string;
  carrierId?: string;
  type?: 'customer' | 'carrier';
}

export class OfferService {
  private offerRepository = new OfferRepository();
  private shipmentRepository = new ShipmentRepository();

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
      throw new Error('shipmentId ve price alanları zorunludur.');
    }

    const shipment = await this.shipmentRepository.findById(payload.shipmentId);
    if (!shipment) {
      throw new Error('Taşıma talebi bulunamadı.');
    }

    if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
      throw new Error('Sadece teklif almaya açık taşıma taleplerine teklif verilebilir.');
    }

    const duplicateOffer = await this.offerRepository.existsByShipmentAndCarrier(payload.shipmentId, carrierId);
    if (duplicateOffer) {
      throw new Error('Bu taşıma talebi için zaten teklif verdiniz.');
    }

    const offer = await this.offerRepository.create({
      shipmentId: payload.shipmentId,
      carrierId,
      price: payload.price,
      status: OfferStatus.PENDING
    });

    if (shipment.status === ShipmentStatus.PENDING) {
      await this.shipmentRepository.update(payload.shipmentId, {
        status: ShipmentStatus.OFFER_RECEIVED
      });
    }

    const createdOffer = await this.offerRepository.findByIdWithShipmentAndCarrier(offer.id);
    if (!createdOffer) {
      throw new Error('Teklif oluşturuldu ancak getirilemedi.');
    }

    return this.sanitizeOffer(createdOffer);
  }

  async getOfferById(offerId: string, user: RequestUser): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new Error('Teklif bulunamadı.');
    }

    const isCustomerOwner = user.type === 'customer' && user.customerId === offer.shipment?.customerId;
    const isCarrierOwner = user.type === 'carrier' && user.carrierId === offer.carrierId;

    if (!isCustomerOwner && !isCarrierOwner) {
      throw new Error('Bu teklife erişim yetkiniz yok.');
    }

    return this.sanitizeOffer(offer);
  }

  async acceptOffer(customerId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new Error('Teklif bulunamadı.');
    }

    if (offer.shipment?.customerId !== customerId) {
      throw new Error('Bu teklifi kabul etme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new Error('Sadece bekleyen teklifler kabul edilebilir.');
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
      throw new Error('Teklif kabul edildi ancak getirilemedi.');
    }

    return this.sanitizeOffer(updatedOffer);
  }

  async rejectOffer(customerId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new Error('Teklif bulunamadı.');
    }

    if (offer.shipment?.customerId !== customerId) {
      throw new Error('Bu teklifi reddetme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new Error('Sadece bekleyen teklifler reddedilebilir.');
    }

    const rejectedOffer = await this.offerRepository.update(offer.id, { status: OfferStatus.REJECTED });
    if (!rejectedOffer) {
      throw new Error('Teklif reddedilemedi.');
    }

    return this.sanitizeOffer(rejectedOffer);
  }

  async getCarrierOffers(carrierId: string): Promise<Offer[]> {
    const offers = await this.offerRepository.findByCarrierId(carrierId);
    return offers.map(offer => this.sanitizeOffer(offer));
  }
}
