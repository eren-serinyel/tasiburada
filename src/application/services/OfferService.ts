import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { NotificationService } from './NotificationService';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { containsContactInfo } from '../../utils/security';
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

    if (payload.price <= 0) {
      throw new ValidationError('Teklif fiyatı 0\'dan büyük olmalıdır.');
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

    // CARRIER ELIGIBILITY CHECK: Must be verified by admin
    const carrier = await this.carrierRepository.findById(carrierId);
    if (!carrier || !carrier.isActive) {
      throw new ForbiddenError('Hesabınız aktif değil. Lütfen destekle iletişime geçin.');
    }

    if (!carrier.verifiedByAdmin) {
      throw new ForbiddenError('Teklif verebilmek için hesabınızın admin tarafından onaylanması gerekmektedir.');
    }

    // PLATFORM BYPASS PROTECTION: Basic check for phone numbers / emails in message
    if (payload.message && containsContactInfo(payload.message)) {
      throw new ValidationError('Teklif mesajında iletişim bilgisi (telefon, e-posta, link) paylaşılması güvenlik kurallarımız gereği yasaktır.');
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
      // First, get the offer to know which shipment it belongs to
      const offerBase = await transactionalEntityManager.findOne(Offer, {
        where: { id: offerId },
        relations: ['shipment']
      });

      if (!offerBase) {
        throw new NotFoundError('Teklif bulunamadı.');
      }

      // POSSESS LOCK on the Shipment entity to prevent double matching
      // All other attempts to accept ANY offer for this shipment will wait here
      const shipment = await transactionalEntityManager
        .createQueryBuilder(Shipment, 'shipment')
        .setLock('pessimistic_write')
        .where('shipment.id = :shipmentId', { shipmentId: offerBase.shipmentId })
        .getOne();

      if (!shipment) {
        throw new NotFoundError('Taşıma talebi bulunamadı.');
      }

      if (shipment.customerId !== customerId) {
        throw new ForbiddenError('Bu teklifi kabul etme yetkiniz yok.');
      }

      if (offerBase.status !== OfferStatus.PENDING) {
        throw new ValidationError('Sadece bekleyen teklifler kabul edilebilir.');
      }

      if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
        throw new ValidationError('Bu taşıma talebi artık teklif kabulüne açık değil (Eşleşmiş veya İptal edilmiş olabilir).');
      }

      // Update the accepted offer
      await transactionalEntityManager.update(Offer, offerId, { status: OfferStatus.ACCEPTED });

      await transactionalEntityManager
        .createQueryBuilder()
        .update(Offer)
        .set({ status: OfferStatus.REJECTED })
        .where('shipmentId = :shipmentId', { shipmentId: offerBase.shipmentId })
        .andWhere('id != :acceptedOfferId', { acceptedOfferId: offerBase.id })
        .andWhere('status = :pendingStatus', { pendingStatus: OfferStatus.PENDING })
        .execute();

      await transactionalEntityManager.update(Shipment, offerBase.shipmentId, {
        status: ShipmentStatus.MATCHED,
        carrierId: offerBase.carrierId,
        price: offerBase.price
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
        offerBase.carrierId,
        'carrier',
        'OFFER_ACCEPTED',
        'Teklifiniz Kabul Edildi',
        'Müşteri teklifinizi kabul etti. Taşımaya hazırlanın.',
        offerBase.shipmentId
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
