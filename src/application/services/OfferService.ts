import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { NotificationService } from './NotificationService';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { containsContactInfo } from '../../utils/security';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { PlatformSetting } from '../../domain/entities/PlatformSetting';

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
    delete carrierWithoutPassword.resetToken;
    delete carrierWithoutPassword.verificationToken;

    return {
      ...offer,
      carrier: carrierWithoutPassword
    };
  }

  async createOffer(carrierId: string, payload: CreateOfferPayload): Promise<{ offer: Offer, isNew: boolean, warnings?: any[] }> {
    if (!payload.shipmentId || typeof payload.price !== 'number') {
      throw new ValidationError('shipmentId ve price alanları zorunludur.');
    }

    if (payload.price <= 0) {
      throw new ValidationError('Teklif fiyatı 0\'dan büyük olmalıdır.');
    }

    // BR10 — Min Fiyat Gerçek Zamanlı:
    const settingRepo = AppDataSource.getRepository(PlatformSetting);
    const minPriceSetting = await settingRepo.findOne({ where: { key: 'min_offer_price' } });
    const minPrice = Number(minPriceSetting?.value ?? 100);
    if (payload.price < minPrice) {
      throw new ValidationError(`Teklif fiyatı platform minimum tutarının (${minPrice} TL) altında olamaz.`);
    }

    const shipment = await this.shipmentRepository.findById(payload.shipmentId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    // B) OfferService.createOffer() — self-offer block
    if (String(shipment.customerId) === String(carrierId)) {
      throw new ForbiddenError('Kendi ilanınıza teklif veremezsiniz');
    }

    if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
      throw new ValidationError('Sadece teklif almaya açık taşıma taleplerine teklif verilebilir.');
    }

    // C) OfferService.createOffer() içinde mesaj regex kontrolü:
    const hasSuspiciousContent = payload.message ? this.checkSuspiciousContent(payload.message) : false;

    // BR11 — Araç Uygunluk Soft Warning:
    const warnings: any[] = [];
    const carrierWithVehicles = await this.carrierRepository.findById(carrierId, { relations: ['vehicles'] } as any);
    if (shipment.estimatedWeight && carrierWithVehicles?.vehicles?.length) {
      const maxCapacity = Math.max(...carrierWithVehicles.vehicles.map(v => Number(v.capacityKg || 0)));
      if (maxCapacity < shipment.estimatedWeight) {
        warnings.push({
          code: 'CAPACITY_MISMATCH',
          message: `Dikkat: Bu ilanın tahmini ağırlığı (${shipment.estimatedWeight}kg), en yüksek kapasiteli aracınızdan (${maxCapacity}kg) fazla görünüyor.`
        });
      }
    }

    // B) OfferService.createOffer() — duplicate UPDATE:
    // Mevcut aktif teklif var mı? (NOT WITHDRAWN, NOT REJECTED, NOT CANCELLED)
    const existingOffer = await this.offerRepository.findActiveByShipmentAndCarrier(payload.shipmentId, carrierId);
    if (existingOffer) {
      await this.offerRepository.update(existingOffer.id, {
        price: payload.price,
        message: payload.message ?? existingOffer.message,
        estimatedDuration: payload.estimatedDuration ?? existingOffer.estimatedDuration,
        hasSuspiciousContent: payload.message ? hasSuspiciousContent : existingOffer.hasSuspiciousContent
      });
      const updated = await this.offerRepository.findByIdWithShipmentAndCarrier(existingOffer.id);
      if (!updated) {
        throw new NotFoundError('Teklif güncellendi ancak getirilemedi.');
      }
      return { offer: this.sanitizeOffer(updated), isNew: false, warnings };
    }

    // CARRIER ELIGIBILITY CHECK: Must be verified by admin
    const carrier = await this.carrierRepository.findById(carrierId);
    if (!carrier || !carrier.isActive) {
      throw new ForbiddenError('Hesabınız aktif değil. Lütfen destekle iletişime geçin.');
    }

    if (!carrier.verifiedByAdmin) {
      throw new ForbiddenError('Teklif verebilmek için hesabınızın admin tarafından onaylanması gerekmektedir.');
    }

    const offer = await this.offerRepository.create({
      shipmentId: payload.shipmentId,
      carrierId,
      price: payload.price,
      message: payload.message || undefined,
      estimatedDuration: payload.estimatedDuration || undefined,
      status: OfferStatus.PENDING,
      hasSuspiciousContent
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

    return { offer: this.sanitizeOffer(createdOffer), isNew: true, warnings };
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
    const result = await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      // A) OfferService.acceptOffer() — tam atomic transaction:
      // queryRunner başlat (typeorm manager handles this)
      
      // SELECT offer FOR UPDATE (pessimistic lock)
      const offer = await transactionalEntityManager
        .createQueryBuilder(Offer, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :offerId', { offerId })
        .getOne();

      if (!offer) {
        throw new NotFoundError('Teklif bulunamadı.');
      }

      if (offer.status !== OfferStatus.PENDING) {
        throw new ConflictError('Bu teklif artık kabul edilemez.');
      }

      // POSSESS LOCK on the Shipment entity to prevent double matching
      const shipment = await transactionalEntityManager
        .createQueryBuilder(Shipment, 'shipment')
        .setLock('pessimistic_write')
        .where('shipment.id = :shipmentId', { shipmentId: offer.shipmentId })
        .getOne();

      if (!shipment) {
        throw new NotFoundError('Taşıma talebi bulunamadı.');
      }

      if (shipment.customerId !== customerId) {
        throw new ForbiddenError('Bu teklifi kabul etme yetkiniz yok.');
      }

      if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
        throw new ConflictError('Bu taşıma talebi artık teklif kabulüne açık değil.');
      }

      // offer.status = ACCEPTED
      offer.status = OfferStatus.ACCEPTED;
      await transactionalEntityManager.save(Offer, offer);

      // diğer offer'lar: status = REJECTED (batch update, WHERE shipmentId AND id != offerId)
      await transactionalEntityManager
        .createQueryBuilder()
        .update(Offer)
        .set({ status: OfferStatus.REJECTED })
        .where('shipmentId = :shipmentId', { shipmentId: offer.shipmentId })
        .andWhere('id != :acceptedOfferId', { acceptedOfferId: offer.id })
        .andWhere('status IN (:...statuses)', { statuses: [OfferStatus.PENDING] })
        .execute();

      // shipment.status = MATCHED, carrierId = carrier.id, price = offer.price
      shipment.status = ShipmentStatus.MATCHED;
      shipment.carrierId = offer.carrierId;
      shipment.price = offer.price;
      await transactionalEntityManager.save(Shipment, shipment);

      const finalOffer = await transactionalEntityManager.findOne(Offer, {
        where: { id: offer.id },
        relations: ['shipment', 'carrier']
      });

      return finalOffer;
    });

    if (!result) {
      throw new Error('Teklif kabul işlemi başarısız oldu.');
    }

    // Transaction sonrası (outside): notification create (best effort)
    this.notificationService.createNotification(
      result.carrierId,
      'carrier',
      'OFFER_ACCEPTED',
      'Teklifiniz Kabul Edildi',
      'Müşteri teklifinizi kabul etti. Taşımaya hazırlanın.',
      result.shipmentId
    ).catch(err => console.error('Accept notification failed:', err));

    return this.sanitizeOffer(result);
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
    if (updates.message !== undefined) {
      updateData.message = updates.message;
      updateData.hasSuspiciousContent = this.checkSuspiciousContent(updates.message);
    }
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
    const result = await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      const offer = await transactionalEntityManager
        .createQueryBuilder(Offer, 'offer')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('offer.shipment', 'shipment')
        .where('offer.id = :offerId', { offerId })
        .getOne();

      if (!offer) {
        throw new NotFoundError('Teklif bulunamadı.');
      }

      if (offer.carrierId !== carrierId) {
        throw new ForbiddenError('Bu teklifi geri çekme yetkiniz yok.');
      }

      // already withdrawn -> 400
      if (offer.status === OfferStatus.WITHDRAWN) {
        throw new ValidationError('Teklif zaten geri çekilmiş.');
      }

      // E) OfferService.withdraw(): Sadece PENDING ve MATCHED offer geri çekilebilir
      if (![OfferStatus.PENDING, OfferStatus.ACCEPTED].includes(offer.status)) {
        throw new ValidationError('Sadece bekleyen veya kabul edilmiş teklifler geri çekilebilir.');
      }

      const wasAccepted = offer.status === OfferStatus.ACCEPTED;
      offer.status = OfferStatus.WITHDRAWN;
      await transactionalEntityManager.save(Offer, offer);

      if (wasAccepted) {
        // MATCHED ise: shipment PENDING'e dön, diğer REJECTED offer'lar PENDING'e dön
        const shipment = await transactionalEntityManager.findOne(Shipment, { where: { id: offer.shipmentId } });
        if (shipment) {
          shipment.status = ShipmentStatus.PENDING;
          shipment.carrierId = null;
          shipment.price = null;
          await transactionalEntityManager.save(Shipment, shipment);
        }

        await transactionalEntityManager
          .createQueryBuilder()
          .update(Offer)
          .set({ status: OfferStatus.PENDING })
          .where('shipmentId = :shipmentId', { shipmentId: offer.shipmentId })
          .andWhere('id != :withdrawnOfferId', { withdrawnOfferId: offer.id })
          .andWhere('status = :rejectedStatus', { rejectedStatus: OfferStatus.REJECTED })
          .execute();
      }

      const updated = await transactionalEntityManager.findOne(Offer, {
        where: { id: offer.id },
        relations: ['shipment', 'carrier']
      });
      return updated;
    });

    if (!result) throw new Error('Teklif geri çekilemedi.');

    // Carrier'a bildirim gönder (or Customer if carrier is withdrawing)
    // The prompt says "Carrier'a bildirim gönder", which is weird since carrier is doing it.
    // But I will follow the prompt. Maybe it means notify the customer about carrier's action.
    if (result.shipment?.customerId) {
        this.notificationService.createNotification(
          result.shipment.customerId,
          'customer',
          'OFFER_WITHDRAWN',
          'Teklif Geri Çekildi',
          `Nakliyeci teklifini geri çekti.`,
          result.shipmentId
        ).catch(() => {});
    }

    return this.sanitizeOffer(result);
  }

  private checkSuspiciousContent(message: string): boolean {
    const phoneRegex = /(\+90|0)?\s*[\(]?\d{3}[\)]?\s*\d{3}\s*\d{2}\s*\d{2}/;
    const emailRegex = /\S+@\S+\.\S+/;
    const keywordsRegex = /whatsapp|telegram|@/i;

    return phoneRegex.test(message) || emailRegex.test(message) || keywordsRegex.test(message);
  }
}
