import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { NotificationService } from './NotificationService';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { AppDataSource } from '../../infrastructure/database/data-source';

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
    return await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      // Peshimistic lock over the Offer entity
      const offer = await transactionalEntityManager
        .createQueryBuilder(Offer, 'offer')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('offer.shipment', 'shipment')
        .leftJoinAndSelect('offer.carrier', 'carrier')
        .where('offer.id = :offerId', { offerId })
        .getOne();

      if (!offer) {
        throw new NotFoundError('Teklif bulunamadı.');
      }

      if (offer.shipment?.customerId !== customerId) {
        throw new ForbiddenError('Bu teklifi kabul etme yetkiniz yok.');
      }

      if (offer.status !== OfferStatus.PENDING) {
        throw new ValidationError('Sadece bekleyen teklifler kabul edilebilir.');
      }

      if (offer.shipment.status !== ShipmentStatus.PENDING && offer.shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
        throw new ValidationError('Bu taşıma talebi artık teklif kabulüne açık değil.');
      }

      await transactionalEntityManager.update(Offer, offer.id, { status: OfferStatus.ACCEPTED });

      await transactionalEntityManager
        .createQueryBuilder()
        .update(Offer)
        .set({ status: OfferStatus.REJECTED })
        .where('shipmentId = :shipmentId', { shipmentId: offer.shipmentId })
        .andWhere('id != :acceptedOfferId', { acceptedOfferId: offer.id })
        .andWhere('status = :pendingStatus', { pendingStatus: OfferStatus.PENDING })
        .execute();

      await transactionalEntityManager.update(Shipment, offer.shipmentId, {
        status: ShipmentStatus.MATCHED,
        carrierId: offer.carrierId,
        price: offer.price
      });

      const updatedOffer = await transactionalEntityManager
         .createQueryBuilder(Offer, 'offer')
         .leftJoinAndSelect('offer.shipment', 'shipment')
         .leftJoinAndSelect('offer.carrier', 'carrier')
         .where('offer.id = :offerId', { offerId })
         .getOne();

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
    });
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

  async updateOffer(carrierId: string, offerId: string, updates: { price?: number; message?: string; estimatedDuration?: number }): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    if (offer.carrierId !== carrierId) {
      throw new ForbiddenError('Bu teklifi güncelleme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen teklifler güncellenebilir.');
    }

    const updateData: Partial<Offer> = {};
    if (updates.price !== undefined) {
      if (typeof updates.price !== 'number' || updates.price <= 0) {
        throw new ValidationError('Geçerli bir fiyat giriniz.');
      }
      updateData.price = updates.price;
    }
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;

    await this.offerRepository.update(offerId, updateData);

    const updatedOffer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!updatedOffer) {
      throw new NotFoundError('Teklif güncellendi ancak getirilemedi.');
    }

    if (offer.shipment?.customerId) {
      await this.notificationService.createNotification(
        offer.shipment.customerId,
        'customer',
        'OFFER_UPDATED',
        'Teklif Güncellendi',
        `${updatedOffer.carrier?.companyName || 'Nakliyeci'} teklifini güncelledi.`,
        offer.shipmentId
      );
    }

    return this.sanitizeOffer(updatedOffer);
  }

  async withdrawOffer(carrierId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    if (offer.carrierId !== carrierId) {
      throw new ForbiddenError('Bu teklifi geri çekme yetkiniz yok.');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen teklifler geri çekilebilir.');
    }

    await this.offerRepository.update(offerId, { status: OfferStatus.WITHDRAWN });

    const updatedOffer = await this.offerRepository.findByIdWithShipmentAndCarrier(offerId);
    if (!updatedOffer) {
      throw new NotFoundError('Teklif geri çekildi ancak getirilemedi.');
    }

    if (offer.shipment?.customerId) {
      await this.notificationService.createNotification(
        offer.shipment.customerId,
        'customer',
        'OFFER_WITHDRAWN',
        'Teklif Geri Çekildi',
        `${updatedOffer.carrier?.companyName || 'Nakliyeci'} teklifini geri çekti.`,
        offer.shipmentId
      );
    }

    return this.sanitizeOffer(updatedOffer);
  }
}
