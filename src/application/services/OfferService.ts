import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { NotificationService } from './NotificationService';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { analyzeContactInfo } from '../../utils/security';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { In } from 'typeorm';
import { PlatformSetting } from '../../domain/entities/PlatformSetting';
import { PlatformPolicyService } from './PlatformPolicyService';
import { ContactFilterSurface } from '../../domain/entities';
import { CarrierLoadTypeCapability } from '../../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { CarrierCustomExtraService } from '../../domain/entities/CarrierCustomExtraService';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { getCarrierEligibility } from './carrier/carrierEligibility';
import { inferExtraServiceLoadTypeFromShipmentCategory } from './extra-services/extraServiceApplicability';

const TURKEY_TIME_ZONE = 'Europe/Istanbul';
const OFFER_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

function formatDateKey(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TURKEY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isShipmentDateBeforeToday(shipmentDate?: Date | string | null): boolean {
  if (!shipmentDate) return false;
  const parsed = new Date(shipmentDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatDateKey(parsed) < formatDateKey(new Date());
}

function computeOfferValidUntil(shipmentDate?: Date | string | null): Date {
  const byDays = new Date(Date.now() + OFFER_VALIDITY_MS);
  if (!shipmentDate) return byDays;

  const byShipment = new Date(shipmentDate);
  if (Number.isNaN(byShipment.getTime())) return byDays;
  byShipment.setHours(23, 59, 59, 999);

  return byShipment.getTime() < byDays.getTime() ? byShipment : byDays;
}

interface CreateOfferPayload {
  shipmentId: string;
  price: number;
  message?: string;
  estimatedDuration?: number;
  customExtraServiceIds?: string[];
}

interface RequestUser {
  customerId?: string;
  carrierId?: string;
  type?: 'customer' | 'carrier' | 'admin';
}

interface OfferExtraServiceBreakdownItem {
  extraServiceId?: string;
  customServiceId?: string;
  name: string;
  price: number;
  source: 'requested' | 'offered';
}

interface OfferWarning {
  code: string;
  message: string;
}

export class OfferService {
  private offerRepository = new OfferRepository();
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();
  private notificationService = new NotificationService();
  private platformPolicy = new PlatformPolicyService();

  private sanitizeOffer(offer: Offer): Offer {
    if (!offer?.carrier) {
      return offer;
    }

    const carrierWithoutPassword = { ...offer.carrier } as any;
    delete carrierWithoutPassword.passwordHash;
    delete carrierWithoutPassword.resetToken;
    delete carrierWithoutPassword.verificationToken;
    delete carrierWithoutPassword.phone;
    delete carrierWithoutPassword.email;

    const sanitized = {
      ...offer,
      carrier: carrierWithoutPassword
    };

    if ((sanitized as any).shipment) {
      (sanitized as any).shipment = {
        ...(sanitized as any).shipment,
        contactPhone: null,
        originAddressText: null,
        destinationAddressText: null,
      };
    }

    return sanitized;
  }

  private async assertCarrierCapabilityForShipment(carrierId: string, shipment: Shipment): Promise<OfferWarning[]> {
    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);
    if (!loadType) {
      return [];
    }

    const loadTypeCapability = await AppDataSource.getRepository(CarrierLoadTypeCapability).findOne({
      where: {
        carrierId,
        loadType,
        isActive: true,
      },
    });

    if (!loadTypeCapability) {
      throw new ForbiddenError(`Bu yuk turu icin teklif veremezsiniz. loadType=${loadType}`);
    }

    const extraServices = Array.isArray(shipment.extraServices) ? shipment.extraServices : [];
    if (extraServices.length === 0) {
      return [];
    }

    const extraServiceIds = extraServices.map((item) => item.id);
    const capabilities = await AppDataSource.getRepository(CarrierExtraServiceCapability)
      .createQueryBuilder('capability')
      .where('capability.carrierId = :carrierId', { carrierId })
      .andWhere('capability.loadType = :loadType', { loadType })
      .andWhere('capability.isActive = :isActive', { isActive: true })
      .andWhere('capability.extraServiceId IN (:...extraServiceIds)', { extraServiceIds })
      .getMany();

    const capableIds = new Set(capabilities.map((item) => item.extraServiceId));
    const missingExtraServiceNames = extraServices
      .filter((item) => !capableIds.has(item.id))
      .map((item) => item.name);

    if (missingExtraServiceNames.length > 0) {
      throw new ForbiddenError(
        `Bu ilandaki bazı ek hizmetler profilinizde aktif değil: ${missingExtraServiceNames.join(', ')}. Teklif verebilmek için eksik hizmetleri profilinize ekleyin.`
      );
    }

    return [];
  }

  private async calculateOfferPricing(
    carrierId: string,
    shipment: Shipment,
    basePrice: number,
    customExtraServiceIds: string[] = []
  ): Promise<{
    basePrice: number;
    finalPrice: number;
    extraServicesTotal: number | null;
    extraServicesBreakdown: OfferExtraServiceBreakdownItem[] | null;
  }> {
    const requestedExtraServices = Array.isArray(shipment.extraServices) ? shipment.extraServices : [];
    const requestedCustomExtraServices = Array.isArray((shipment as any).customExtraServices)
      ? (shipment as any).customExtraServices
      : [];
    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);
    const uniqueCustomIds = Array.from(new Set(
      (Array.isArray(customExtraServiceIds) ? customExtraServiceIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    ));
    const extraServicesBreakdown: OfferExtraServiceBreakdownItem[] = [];

    if (!loadType) {
      return {
        basePrice,
        finalPrice: basePrice,
        extraServicesTotal: null,
        extraServicesBreakdown: null,
      };
    }

    const requestedById = new Map(
      requestedExtraServices
        .filter((service) => Boolean(service?.id))
        .map((service) => [service.id, service])
    );
    const requestedIds = Array.from(requestedById.keys());

    if (requestedIds.length > 0) {
      const pricedCapabilities = await AppDataSource.getRepository(CarrierExtraServiceCapability).find({
        where: {
          carrierId,
          loadType,
          isActive: true,
          priceMode: 'FIXED' as any,
          extraServiceId: In(requestedIds),
        },
        relations: ['extraService'],
      });

      for (const capability of pricedCapabilities) {
        const price = Number(capability.basePrice || 0);
        if (price <= 0) continue;

        const requestedService = requestedById.get(capability.extraServiceId);
        extraServicesBreakdown.push({
          extraServiceId: capability.extraServiceId,
          name: capability.extraService?.name || requestedService?.name || 'Ek hizmet',
          price,
          source: 'requested',
        });
      }
    }

    for (const service of requestedCustomExtraServices) {
      if (service?.carrierId && service.carrierId !== carrierId) continue;
      const price = Number(service?.priceSnapshot || 0);
      if (price <= 0) continue;

      extraServicesBreakdown.push({
        customServiceId: service.customExtraServiceId ?? service.id,
        name: service.nameSnapshot || 'Özel ek hizmet',
        price,
        source: 'requested',
      });
    }

    if (uniqueCustomIds.length > 0) {
      const customServices = await AppDataSource.getRepository(CarrierCustomExtraService).find({
        where: {
          carrierId,
          loadType,
          isActive: true,
          priceMode: 'FIXED' as any,
          id: In(uniqueCustomIds),
        },
      });

      for (const service of customServices) {
        const price = Number(service.basePrice || 0);
        if (price <= 0) continue;

        extraServicesBreakdown.push({
          customServiceId: service.id,
          name: service.title || 'Özel ek hizmet',
          price,
          source: 'offered',
        });
      }
    }

    const extraServicesTotal = extraServicesBreakdown.reduce((sum, item) => sum + item.price, 0);
    if (extraServicesTotal <= 0) {
      return {
        basePrice,
        finalPrice: basePrice,
        extraServicesTotal: null,
        extraServicesBreakdown: null,
      };
    }

    return {
      basePrice,
      finalPrice: Number((basePrice + extraServicesTotal).toFixed(2)),
      extraServicesTotal: Number(extraServicesTotal.toFixed(2)),
      extraServicesBreakdown,
    };
  }

  private async assertCarrierCanCreateOrUpdateOffer(
    carrierId: string,
    shipment: Shipment,
    payload: CreateOfferPayload,
  ): Promise<{ carrier: Carrier; warnings: OfferWarning[] }> {
    const carrier = await this.carrierRepository.findById(carrierId, { relations: ['carrierVehicles'] } as any);
    if (!carrier || !carrier.isActive) {
      throw new ForbiddenError('Hesab\u0131n\u0131z aktif de\u011fil. L\u00fctfen destekle ileti\u015fime ge\u00e7in.');
    }

    if (!carrier.verifiedByAdmin) {
      throw new ForbiddenError('Teklif verebilmek i\u00e7in hesab\u0131n\u0131z\u0131n admin taraf\u0131ndan onaylanmas\u0131 gerekmektedir.');
    }

    if (carrier.approvalState !== CarrierApprovalState.APPROVED) {
      throw new ForbiddenError('Teklif verebilmek i\u00e7in hesab\u0131n\u0131z\u0131n onay durumunun APPROVED olmas\u0131 gerekmektedir.');
    }

    if (await this.platformPolicy.hasActiveCooldown(shipment.customerId, carrierId)) {
      throw new ConflictError('Bu m\u00fc\u015fteri ile aktif e\u015fle\u015fme bekleme s\u00fcresi bulundu\u011fu i\u00e7in teklif verilemez.');
    }

    const warnings = await this.assertCarrierCapabilityForShipment(carrierId, shipment);

    await this.platformPolicy.enforceNoContactInfo({
      actorType: 'carrier',
      actorId: carrierId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      text: payload.message,
      shipmentId: shipment.id,
    });

    return { carrier, warnings: warnings ?? [] };
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

    const shipment = await this.shipmentRepository.findById(payload.shipmentId, {
      relations: ['extraServices', 'customExtraServices'],
    });
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (isShipmentDateBeforeToday(shipment.shipmentDate)) {
      throw new ValidationError('Bu ilanın taşıma tarihi geçmiş, teklif verilemez.');
    }

    if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
      throw new ValidationError('Sadece teklif almaya açık taşıma taleplerine teklif verilebilir.');
    }

    const { carrier: eligibleCarrier, warnings: capabilityWarnings } = await this.assertCarrierCanCreateOrUpdateOffer(carrierId, shipment, payload);

    const hasSuspiciousContent = payload.message ? this.checkSuspiciousContent(payload.message) : false;
    const pricing = await this.calculateOfferPricing(carrierId, shipment, payload.price, payload.customExtraServiceIds);
    const validUntil = computeOfferValidUntil(shipment.shipmentDate);

    // BR11 — Araç Uygunluk Soft Warning:
    const warnings: any[] = [...capabilityWarnings];
    if (shipment.estimatedWeight && eligibleCarrier.carrierVehicles?.length) {
      const maxCapacity = Math.max(...eligibleCarrier.carrierVehicles.map((v: any) => Number(v.capacityKg || 0)));
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
        price: pricing.finalPrice,
        basePrice: pricing.basePrice,
        extraServicesTotal: pricing.extraServicesTotal,
        extraServicesBreakdown: pricing.extraServicesBreakdown,
        validUntil,
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

    const offer = await this.offerRepository.create({
      shipmentId: payload.shipmentId,
      carrierId,
      price: pricing.finalPrice,
      basePrice: pricing.basePrice,
      extraServicesTotal: pricing.extraServicesTotal,
      extraServicesBreakdown: pricing.extraServicesBreakdown,
      validUntil,
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

    if (typeof (this.notificationService as any).createFromEvent === 'function') {
      await this.notificationService.createFromEvent('customer.offer_received', {
        recipientUserId: shipment.customerId,
        entityId: shipment.id,
        offerId: createdOffer.id,
        carrierId,
        carrierName: createdOffer.carrier?.companyName || 'Nakliyeci',
        offeredPrice: Number(createdOffer.price),
      });
    } else {
      await this.notificationService.createNotification(
        shipment.customerId,
        'customer',
        'NEW_OFFER',
        'Yeni Teklif Aldınız',
        `${createdOffer.carrier?.companyName || 'Nakliyeci'} taşımanız için teklif verdi.`,
        shipment.id
      );
    }

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

      if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
        throw new ValidationError('Bu teklifin geçerlilik süresi dolmuş.');
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

      if (isShipmentDateBeforeToday(shipment.shipmentDate)) {
        throw new ValidationError('Bu ilanın taşıma tarihi geçmiş.');
      }

      if (shipment.status !== ShipmentStatus.PENDING && shipment.status !== ShipmentStatus.OFFER_RECEIVED) {
        throw new ConflictError('Bu taşıma talebi artık teklif kabulüne açık değil.');
      }

      const carrier = await transactionalEntityManager.findOne(Carrier, {
        where: { id: offer.carrierId },
      });
      const carrierEligibility = getCarrierEligibility(carrier);
      if (!carrierEligibility.isEligible) {
        throw new ConflictError('Bu taşıyıcı artık teklif kabulü için uygun değil.');
      }

      await this.platformPolicy.assertNoActiveCooldown(shipment.customerId, offer.carrierId);

      // offer.status = ACCEPTED
      offer.status = OfferStatus.ACCEPTED;
      await transactionalEntityManager.save(Offer, offer);

      await transactionalEntityManager
        .createQueryBuilder()
        .update(Carrier)
        .set({
          acceptedOffers: () => 'acceptedOffers + 1',
          successRate: () => 'CASE WHEN (acceptedOffers + 1) > 0 THEN ROUND((completedShipments / (acceptedOffers + 1)) * 100, 2) ELSE 0 END',
        })
        .where('id = :carrierId', { carrierId: offer.carrierId })
        .execute();

      const autoRejectedOffers = (await transactionalEntityManager.find(Offer, {
        select: ['id', 'carrierId', 'shipmentId'],
        where: {
          shipmentId: offer.shipmentId,
          status: OfferStatus.PENDING,
        },
      })).filter((pendingOffer) => pendingOffer.id !== offer.id);

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
      shipment.matchedAt = new Date();
      await transactionalEntityManager.save(Shipment, shipment);

      const finalOffer = await transactionalEntityManager.findOne(Offer, {
        where: { id: offer.id },
        relations: ['shipment', 'carrier']
      });

      return { finalOffer, autoRejectedOffers };
    });

    if (!result?.finalOffer) {
      throw new Error('Teklif kabul işlemi başarısız oldu.');
    }

    const acceptedOffer = result.finalOffer;

    // Transaction sonrası (outside): notification create (best effort)
    if (typeof (this.notificationService as any).createFromEvent === 'function') {
      this.notificationService.createFromEvent('carrier.offer_accepted', {
        recipientUserId: acceptedOffer.carrierId,
        entityId: acceptedOffer.shipmentId,
        offerId: acceptedOffer.id,
        customerId,
        acceptedPrice: Number(acceptedOffer.price),
      }).catch(err => console.error('Accept notification failed:', err));
    } else {
      this.notificationService.createNotification(
        acceptedOffer.carrierId,
        'carrier',
        'OFFER_ACCEPTED',
        'Teklifiniz Kabul Edildi',
        'Müşteri teklifinizi kabul etti. Taşımaya hazırlanın.',
        acceptedOffer.shipmentId
      ).catch(err => console.error('Accept notification failed:', err));
    }

    for (const rejectedOffer of result.autoRejectedOffers) {
      this.notificationService.createNotification(
        rejectedOffer.carrierId,
        'carrier',
        'OFFER_REJECTED',
        'Teklifiniz Değerlendirildi',
        'Müşteri bu taşıma için başka bir firmayı seçti. Bu kez teklifiniz kabul edilmedi.',
        rejectedOffer.shipmentId
      ).catch(err => console.error('Auto-reject notification failed:', err));
    }

    return this.sanitizeOffer(acceptedOffer);
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
      await this.platformPolicy.enforceNoContactInfo({
        actorType: 'carrier',
        actorId: carrierId,
        surface: ContactFilterSurface.OFFER_MESSAGE,
        text: updates.message,
        shipmentId: offer.shipmentId,
        offerId,
      });
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
      if (wasAccepted && offer.shipment && offer.shipment.status !== ShipmentStatus.MATCHED) {
        throw new ValidationError('Taşıma başladıktan sonra teklif geri çekilemez.');
      }

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
    return analyzeContactInfo(message).hasContactInfo;
  }
}
