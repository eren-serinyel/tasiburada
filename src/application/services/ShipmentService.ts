import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { Shipment, ShipmentStatus, ShipmentCategory, PlaceType, InsuranceType, LoadProfile, AccessDistance, DateFlexibility } from '../../domain/entities/Shipment';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ExtraService } from '../../domain/entities/ExtraService';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { CarrierStatsRepository } from '../../infrastructure/repositories/CarrierStatsRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { NotificationService } from './NotificationService';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CarrierEarningsLog } from '../../domain/entities/CarrierEarningsLog';
import { PlatformSetting } from '../../domain/entities/PlatformSetting';
import { CustomerCarrierRelationRepository } from '../../infrastructure/repositories/CustomerCarrierRelationRepository';
import { containsContactInfo } from '../../utils/security';
import { ScopeOfWorkRepository } from '../../infrastructure/repositories/ScopeOfWorkRepository';
import { ServiceTypeRepository } from '../../infrastructure/repositories/ServiceTypeRepository';
import { CustomerPreference } from '../../domain/entities/CustomerPreference';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';

interface CreateShipmentPayload {
  origin: string;
  destination: string;
  originCity?: string;
  originAddressId?: number;
  originAddressText?: string;
  destinationAddressId?: number;
  destinationAddressText?: string;
  originDistrict?: string;
  originPlaceType?: string;
  originFloor?: number;
  originHasElevator?: boolean;
  originAccessDistance?: string;
  destinationCity?: string;
  destinationDistrict?: string;
  destinationPlaceType?: string;
  destinationFloor?: number;
  destinationHasElevator?: boolean;
  destinationAccessDistance?: string;
  loadDetails: string;
  loadProfile?: string;
  shipmentCategory?: string;
  insuranceType?: string;
  timePreference?: string;
  dateFlexibility?: string;
  weight?: number;
  estimatedWeight?: number;
  shipmentDate: string | Date;
  price?: number;
  note?: string;
  vehicleTypePreferenceId?: string;
  contactPhone?: string;
  extraServices?: string[];
}

interface UpdateShipmentPayload {
  origin?: string;
  destination?: string;
  originCity?: string;
  originAddressId?: number;
  originAddressText?: string;
  destinationAddressId?: number;
  destinationAddressText?: string;
  originDistrict?: string;
  originPlaceType?: string;
  originFloor?: number;
  originHasElevator?: boolean;
  originAccessDistance?: string;
  destinationCity?: string;
  destinationDistrict?: string;
  destinationPlaceType?: string;
  destinationFloor?: number;
  destinationHasElevator?: boolean;
  destinationAccessDistance?: string;
  loadDetails?: string;
  loadProfile?: string;
  shipmentCategory?: string;
  insuranceType?: string;
  timePreference?: string;
  dateFlexibility?: string;
  weight?: number;
  estimatedWeight?: number;
  shipmentDate?: string | Date;
  price?: number;
  note?: string;
  vehicleTypePreferenceId?: string;
  extraServices?: string[];
}

const EXTRA_SERVICE_ALIASES: Record<string, string> = {
  asansor: 'Asansörlü Taşıma',
  paketleme: 'Profesyonel Paketleme',
  ambalaj: 'Profesyonel Paketleme',
  profesyonelpaket: 'Profesyonel Paketleme',
  koli: 'Koli/Ambalaj Malzemesi',
  soktak: 'Mobilya Montaj/Demontaj',
  mobilya_montaj: 'Mobilya Montaj/Demontaj',
  beyaz_esya_montaj: 'Beyaz Eşya Montaj/Demontaj',
  'Asansörlü Taşıma': 'Asansörlü Taşıma',
  'Profesyonel Paketleme': 'Profesyonel Paketleme',
  'Mobilya Montaj/Demontaj': 'Mobilya Montaj/Demontaj',
  'Beyaz Eşya Montaj/Demontaj': 'Beyaz Eşya Montaj/Demontaj',
  'Koli/Ambalaj Malzemesi': 'Koli/Ambalaj Malzemesi',
};

export class ShipmentService {
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();
  private carrierStatsRepository = new CarrierStatsRepository();
  private notificationService = new NotificationService();
  private earningsLogRepo = AppDataSource.getRepository(CarrierEarningsLog);
  private scopeOfWorkRepository = new ScopeOfWorkRepository();
  private serviceTypeRepository = new ServiceTypeRepository();

  private ensureStatusTransition(current: ShipmentStatus, next: ShipmentStatus): void {
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.PENDING]: [ShipmentStatus.OFFER_RECEIVED, ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.OFFER_RECEIVED]: [ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED],
      [ShipmentStatus.MATCHED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
      [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.COMPLETED],
      [ShipmentStatus.COMPLETED]: [],
      [ShipmentStatus.CANCELLED]: []
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new ValidationError(`Bu işlem şu anki durum (${current}) için geçersizdir. Hedef durum: ${next}.`);
    }
  }

  private extractCity(address: string): string {
    // "İstanbul, Kadıköy" → "İstanbul" ; "Ankara" → "Ankara"
    return address.split(',')[0].trim();
  }

  private extractDistrict(address: string): string | null {
    const parts = address.split(',').map(part => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(', ') : null;
  }

  private normalizePlaceType(value?: string): PlaceType | null {
    if (!value) return null;

    const map: Record<string, PlaceType> = {
      DAIRE: PlaceType.DAIRE,
      APARTMAN_DAIRESI: PlaceType.APARTMAN_DAIRESI,
      SITE_ICI_DAIRE: PlaceType.SITE_ICI_DAIRE,
      MUSTAKIL: PlaceType.MUSTAKIL,
      VILLA: PlaceType.VILLA,
      OFIS: PlaceType.OFIS,
      PLAZA_OFIS: PlaceType.PLAZA_OFIS,
      DEPO: PlaceType.DEPO,
      DUKKAN: PlaceType.DUKKAN,
      DIGER: PlaceType.DIGER,
    };

    return map[value.trim()] ?? (value as PlaceType);
  }

  private normalizeInsuranceType(value?: string): InsuranceType {
    if (!value) return InsuranceType.NONE;

    const normalized = value.trim().toLowerCase();
    if (normalized === InsuranceType.STANDARD) return InsuranceType.STANDARD;
    if (normalized === InsuranceType.COMPREHENSIVE) return InsuranceType.COMPREHENSIVE;
    return InsuranceType.NONE;
  }

  private normalizeExtraServiceNames(extraServices?: string[]): string[] {
    if (!Array.isArray(extraServices)) return [];
    return Array.from(new Set(
      extraServices
        .map(service => String(service).trim())
        .filter(Boolean)
        .map(service => EXTRA_SERVICE_ALIASES[service] ?? service)
    ));
  }

  private async getCustomerPreferenceSafe(customerId: string): Promise<CustomerPreference | null> {
    try {
      const prefRepo = AppDataSource.getRepository(CustomerPreference);
      return await prefRepo.findOne({ where: { customerId } });
    } catch {
      return null;
    }
  }

  private flattenExtraServices<T extends Shipment>(shipment: T): T {
    if (Array.isArray((shipment as any).extraServices)) {
      (shipment as any).extraServices = (shipment as any).extraServices
        .map((item: any) => typeof item === 'string' ? item : item?.name)
        .filter(Boolean);
    }
    return shipment;
  }

  private maskOpenAddressForCarrier<T extends Shipment>(shipment: T, canViewOpenAddress: boolean): T {
    if (!canViewOpenAddress) {
      shipment.originAddressText = null as any;
      shipment.destinationAddressText = null as any;
    }
    return shipment;
  }

  private async setShipmentExtraServices(shipmentId: string, extraServices?: string[]): Promise<void> {
    const normalizedNames = this.normalizeExtraServiceNames(extraServices);
    const repo = AppDataSource.getRepository(ExtraService);

    const shipmentWithRelations = await AppDataSource.getRepository(Shipment).findOne({
      where: { id: shipmentId },
      relations: ['extraServices'],
    });
    const currentIds = shipmentWithRelations?.extraServices?.map(item => item.id) ?? [];

    if (!normalizedNames.length) {
      if (currentIds.length) {
        await AppDataSource.createQueryBuilder()
          .relation(Shipment, 'extraServices')
          .of(shipmentId)
          .remove(currentIds);
      }
      return;
    }

    const existing = await repo
      .createQueryBuilder('extraService')
      .where('extraService.name IN (:...names)', { names: normalizedNames })
      .getMany();

    const existingByName = new Map(existing.map(item => [item.name, item]));
    const toCreate = normalizedNames.filter(name => !existingByName.has(name));

    for (const name of toCreate) {
      const created = repo.create({
        name,
        description: `${name} hizmeti`,
        status: 'ACTIVE',
        sortOrder: 99,
      });
      const saved = await repo.save(created);
      existingByName.set(name, saved);
    }

    const targetIds = normalizedNames.map(name => existingByName.get(name)!.id);
    await AppDataSource.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(shipmentId)
      .addAndRemove(targetIds.filter(id => !currentIds.includes(id)), currentIds.filter(id => !targetIds.includes(id)));
  }

  async getPendingShipmentsForCarrier(_carrierId: string): Promise<Shipment[]> {
    // TODO: Filter by carrier activity/service areas.
    const shipments = await this.shipmentRepository.findPendingShipments();

    // ANTI-DISINTERMEDIATION: contactPhone ve müşteri PII maskeleme
    // Bekleyen talepleri listelerken carrier iletişim bilgisi göremez
    return shipments.map(s => {
      s.contactPhone = null as any;
      this.maskOpenAddressForCarrier(s, false);
      if (s.customer) {
        s.customer = {
          ...s.customer,
          lastName: (s.customer.lastName?.[0] ?? '') + '***',
          phone: undefined,
          email: undefined,
          id: undefined,
        } as any;
      }
      return this.flattenExtraServices(s);
    });
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

    const shipmentDate = new Date(payload.shipmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (shipmentDate < today) {
      throw new ValidationError('Taşıma tarihi geçmiş bir tarih olamaz.');
    }

    // PLATFORM BYPASS PROTECTION
    if (containsContactInfo(payload.loadDetails) || (payload.note && containsContactInfo(payload.note))) {
      throw new ValidationError('İlan detaylarında veya not kısmında iletişim bilgisi (telefon, e-posta, link) paylaşılması güvenlik kurallarımız gereği yasaktır.');
    }

    // BR3 — Çift İlan Engeli:
        const originCity = payload.originCity ?? (origin ? this.extractCity(origin) : '');
    const destinationCity = payload.destinationCity ?? (destination ? this.extractCity(destination) : '');
    const originDistrict = payload.originDistrict ?? this.extractDistrict(origin);
    const destinationDistrict = payload.destinationDistrict ?? this.extractDistrict(destination);

    const duplicate = await this.shipmentRepository.findDuplicateShipment(customerId, originCity, destinationCity, originDistrict, destinationDistrict, shipmentDate);
    if (duplicate) {
      throw new ConflictError('Bu rota için aktif ilanınız bulunuyor');
    }

        // Uygulama: reuseSavedAddresses
    if (!payload.originAddressId || !payload.originAddressText) {
      const preference = await this.getCustomerPreferenceSafe(customerId);

      if (preference?.reuseSavedAddresses) {
        const addressRepo = AppDataSource.getRepository(CustomerAddress);
        const defaultAddress = await addressRepo.findOne({ where: { customerId, isDefault: true } });
        if (defaultAddress) {
            if (!payload.originAddressId) payload.originAddressId = defaultAddress.id;
            if (!payload.originAddressText) payload.originAddressText = `${defaultAddress.addressLine1} ${defaultAddress.addressLine2 || ''} ${defaultAddress.district}/${defaultAddress.city}`.trim();
        }
      }
    }

    const shipment = await this.shipmentRepository.createShipmentRecord({
      customerId,
      originCity,
      originDistrict: payload.originDistrict ?? null,
      originPlaceType: this.normalizePlaceType(payload.originPlaceType),
      originFloor: payload.originFloor ?? null,
      originHasElevator: payload.originHasElevator ?? false,
      originAccessDistance: payload.originAccessDistance as AccessDistance ?? null,
      destinationCity,
      destinationDistrict: payload.destinationDistrict ?? null,
      destinationPlaceType: this.normalizePlaceType(payload.destinationPlaceType),
      destinationFloor: payload.destinationFloor ?? null,
      destinationHasElevator: payload.destinationHasElevator ?? false,
      destinationAccessDistance: payload.destinationAccessDistance as AccessDistance ?? null,
      originAddressId: payload.originAddressId ?? null,
      originAddressText: payload.originAddressText ?? null,
      destinationAddressId: payload.destinationAddressId ?? null,
      destinationAddressText: payload.destinationAddressText ?? null,
      loadProfile: payload.loadProfile as LoadProfile ?? null,
      loadDetails: payload.loadDetails,
      shipmentCategory: payload.shipmentCategory as any ?? null,
      insuranceType: this.normalizeInsuranceType(payload.insuranceType),
      timePreference: payload.timePreference,
      dateFlexibility: payload.dateFlexibility as DateFlexibility ?? DateFlexibility.EXACT,
      weight: payload.weight,
      estimatedWeight: payload.estimatedWeight ?? null,
      shipmentDate: new Date(payload.shipmentDate),
      price: payload.price,
      note: payload.note,
      vehicleTypePreferenceId: payload.vehicleTypePreferenceId ?? null,
      contactPhone: payload.contactPhone ?? null,
      status: ShipmentStatus.PENDING
    });

    await this.setShipmentExtraServices(shipment.id, payload.extraServices);
    shipment.extraServices = this.normalizeExtraServiceNames(payload.extraServices) as any;

    // Fire-and-forget: notify eligible carriers about the new shipment
    this.notifyEligibleCarriers(shipment).catch(err =>
      console.error('[ShipmentService] notifyEligibleCarriers error:', err)
    );

    return shipment;
  }

    private async notifyEligibleCarriers(shipment: Shipment): Promise<void> {
    const preference = await this.getCustomerPreferenceSafe(shipment.customerId);
    const preferVerified = preference?.preferVerifiedCarriers ?? false;

    const originCity = shipment.originCity ?? this.extractCity(shipment.origin);
    const destCity = shipment.destinationCity ?? this.extractCity(shipment.destination);
    const isSameCity = originCity.toLowerCase() === destCity.toLowerCase();
    const scopeName = isSameCity ? 'Şehir İçi' : 'Şehirlerarası';

    // Resolve scope ID
    const scopes = await this.scopeOfWorkRepository.findAll();
    const matchedScope = scopes.find(s => s.name === scopeName);
    const scopeIds = matchedScope ? [matchedScope.id] : [];

    // Service type matching is handled via carrier's serviceTypeLinks
    let serviceTypeIds: string[] = [];

        const { items } = await this.carrierRepository.searchCarriers({
      serviceCity: originCity,
      scopeIds,
      serviceTypeIds,
      isVerified: preferVerified ? true : undefined,
      hasDocuments: true,
      limit: 30,
      offset: 0,
    });

    const MAX_NOTIFICATIONS = 30;
    const carriers = items.slice(0, MAX_NOTIFICATIONS);

    for (const item of carriers) {
      try {
        await this.notificationService.createNotification(
          item.carrier.id,
          'carrier',
          'NEW_MATCHING_REQUEST',
          'Yeni Uygun Talep',
          `${shipment.origin} → ${shipment.destination} arasında yeni bir taşıma talebi var. Teklif vermek için inceleyin.`,
          shipment.id
        );
      } catch { /* individual notification failure should not block others */ }
    }
  }

  async getMyShipments(customerId: string): Promise<Array<Shipment & { offerCount: number }>> {
    const shipments = await this.shipmentRepository.findByCustomerIdWithOfferCount(customerId);
    return shipments.map(shipment => this.flattenExtraServices(shipment as Shipment & { offerCount: number }));
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

    this.flattenExtraServices(shipment);

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

    // A) ShipmentService.getById() — requester tipine göre maskeleme:
    if (requestingUserType === 'carrier') {
      const isAssigned = shipment.carrierId === requestingUserId;
      const isMatchedPlus = [ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.COMPLETED].includes(shipment.status);

      const canViewDetails = isAssigned && isMatchedPlus;

      if (shipment.customer) {
        shipment.customer = {
          ...shipment.customer,
          // Carrier için MATCHED+ aşamasında (atanan carrier ise) lastName tam, değilse maskeli
          lastName: canViewDetails
            ? shipment.customer.lastName
            : (shipment.customer.lastName?.[0] ?? '') + '***',

          // Carrier için MATCHED+ aşamasında (atanan carrier ise) phone görünür, değilse undefined
          phone: canViewDetails ? shipment.customer.phone : undefined,

          // customer.email → her durumda carrier için undefined (admin değilse)
          email: undefined,

          // customer.id → her durumda carrier için undefined
          id: undefined,
        } as any;
      }

      // ANTI-DISINTERMEDIATION: contactPhone ve açık adres maskesi — atanmamış carrier göremez
      if (!canViewDetails) {
        shipment.contactPhone = null as any;
      }
      this.maskOpenAddressForCarrier(shipment, canViewDetails);

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

    // PLATFORM BYPASS PROTECTION
    if (
      (payload.loadDetails && containsContactInfo(payload.loadDetails)) ||
      (payload.note && containsContactInfo(payload.note))
    ) {
      throw new ValidationError('İlan detaylarında veya not kısmında iletişim bilgisi (telefon, e-posta, link) paylaşılması yasaktır.');
    }

    const updatedShipment = await this.shipmentRepository.update(shipmentId, {
      originCity: payload.originCity,
      originDistrict: payload.originDistrict,
      originPlaceType: payload.originPlaceType ? this.normalizePlaceType(payload.originPlaceType) : undefined,
      originFloor: payload.originFloor,
      originHasElevator: payload.originHasElevator,
      originAccessDistance: payload.originAccessDistance as AccessDistance | undefined,
      destinationCity: payload.destinationCity,
      destinationDistrict: payload.destinationDistrict,
      destinationPlaceType: payload.destinationPlaceType ? this.normalizePlaceType(payload.destinationPlaceType) : undefined,
      destinationFloor: payload.destinationFloor,
      destinationHasElevator: payload.destinationHasElevator,
      destinationAccessDistance: payload.destinationAccessDistance as AccessDistance | undefined,
      originAddressId: payload.originAddressId !== undefined ? payload.originAddressId : undefined,
      originAddressText: payload.originAddressText !== undefined ? payload.originAddressText : undefined,
      destinationAddressId: payload.destinationAddressId !== undefined ? payload.destinationAddressId : undefined,
      destinationAddressText: payload.destinationAddressText !== undefined ? payload.destinationAddressText : undefined,
      loadDetails: payload.loadDetails,
      loadProfile: payload.loadProfile as LoadProfile | undefined,
      shipmentCategory: payload.shipmentCategory as any,
      insuranceType: payload.insuranceType ? this.normalizeInsuranceType(payload.insuranceType) : undefined,
      timePreference: payload.timePreference,
      dateFlexibility: payload.dateFlexibility as DateFlexibility | undefined,
      weight: payload.weight,
      estimatedWeight: payload.estimatedWeight,
      shipmentDate: payload.shipmentDate ? new Date(payload.shipmentDate) : undefined,
      price: payload.price,
      vehicleTypePreferenceId: payload.vehicleTypePreferenceId,
    });

    if (payload.extraServices !== undefined) {
      await this.setShipmentExtraServices(shipmentId, payload.extraServices);
      (updatedShipment as any).extraServices = this.normalizeExtraServiceNames(payload.extraServices);
    }

    if (!updatedShipment) {
      throw new ValidationError('Taşıma talebi güncellenemedi.');
    }

    return updatedShipment;
  }

  async cancel(customerId: string, shipmentId: string, reason?: string, note?: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    // C) Status transition guard: Geçersiz geçiş → 422
    this.ensureStatusTransition(shipment.status, ShipmentStatus.CANCELLED);

    const fullReason = note ? `${reason} (${note})` : reason;

    // D) ShipmentService.cancel():
    // MATCHED → offer CANCELLED + carrier notification
    if (shipment.status === ShipmentStatus.MATCHED && shipment.carrierId) {
      const offerRepo = AppDataSource.getRepository(Offer);
      await offerRepo
        .createQueryBuilder()
        .update(Offer)
        .set({ status: OfferStatus.CANCELLED })
        .where('shipmentId = :shipmentId', { shipmentId: shipment.id })
        .andWhere('status = :accepted', { accepted: OfferStatus.ACCEPTED })
        .execute();

      await this.carrierRepository.incrementCancelledShipments(shipment.carrierId);
      await this.carrierRepository.recalculateSuccessRate(shipment.carrierId);

      this.notificationService.createNotification(
        shipment.carrierId,
        'carrier',
        'SHIPMENT_CANCELLED',
        'Taşıma İptal Edildi',
        `Kabul ettiğiniz taşıma müşteri tarafından iptal edildi.${fullReason ? ` Sebep: ${fullReason}` : ''}`,
        shipmentId
      ).catch(() => { });
    }

    const cancelledShipment = await this.shipmentRepository.update(shipmentId, {
      status: ShipmentStatus.CANCELLED,
      cancellationReason: fullReason || null
    });

    if (!cancelledShipment) {
      throw new ValidationError('Taşıma talebi iptal edilemedi.');
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

    this.ensureStatusTransition(shipment.status, ShipmentStatus.IN_TRANSIT);

    const transitioned = await this.shipmentRepository.transitionStatusIfCurrent(
      shipmentId,
      shipment.status,
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

    this.ensureStatusTransition(shipment.status, ShipmentStatus.COMPLETED);

    const transitioned = await this.shipmentRepository.transitionStatusIfCurrent(
      shipmentId,
      shipment.status,
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
        // 1-D: Komisyon hesaplama
        const settingRepo = AppDataSource.getRepository(PlatformSetting);
        const commissionSetting = await settingRepo.findOne({ where: { key: 'platform_commission' } });
        const minSetting = await settingRepo.findOne({ where: { key: 'min_commission_amount' } });
        const rate = Number(commissionSetting?.value ?? 10) / 100;
        const minAmount = Number(minSetting?.value ?? 50);
        const gross = Number(updatedShipment.price);
        const commissionAmount = Math.max(gross * rate, minAmount);
        const netAmount = gross - commissionAmount;

        const log = this.earningsLogRepo.create({
          carrierId,
          shipmentId,
          amount: netAmount,
        });
        await this.earningsLogRepo.save(log);

        await this.carrierStatsRepository.incrementTotalEarnings(carrierId, netAmount);
      } catch (err) {
        // EarningsLog başarısız olsa bile taşıma tamamlansın
        console.error('[ShipmentService] EarningsLog error:', err);
      }
    }
    if (!updatedShipment) {
      throw new NotFoundError('Taşıma tamamlandı ancak kayıt getirilemedi.');
    }

    // CustomerCarrierRelation güncelle
    if (updatedShipment.carrierId && updatedShipment.customerId) {
      try {
        await CustomerCarrierRelationRepository.upsertRelation(
          updatedShipment.customerId,
          updatedShipment.carrierId,
          shipmentId
        );
      } catch { /* relation hatası taşımayı etkilemesin */ }
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
      .leftJoinAndSelect('shipment.carrier', 'carrier')
      .leftJoinAndSelect('shipment.extraServices', 'extraServices');

    if (origin) qb.andWhere('(shipment.originCity LIKE :origin OR shipment.originDistrict LIKE :origin)', { origin: `%${origin}%` });
    if (destination) qb.andWhere('(shipment.destinationCity LIKE :destination OR shipment.destinationDistrict LIKE :destination)', { destination: `%${destination}%` });
    if (status) qb.andWhere('shipment.status = :status', { status });
    if (loadType) qb.andWhere('shipment.loadDetails LIKE :loadType', { loadType: `%${loadType}%` });

    qb.orderBy('shipment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [shipments, total] = await qb.getManyAndCount();

    // ANTI-DISINTERMEDIATION: Arama sonuçlarında PII maskeleme
    const masked = shipments.map(s => {
      s.contactPhone = null as any;
      this.maskOpenAddressForCarrier(s, false);
      if (s.customer) {
        s.customer = {
          ...s.customer,
          lastName: (s.customer.lastName?.[0] ?? '') + '***',
          phone: undefined,
          email: undefined,
          id: undefined,
          passwordHash: undefined,
        } as any;
      }
      if (s.carrier) {
        const { passwordHash, resetToken, verificationToken, ...safeCarrier } = s.carrier as any;
        s.carrier = safeCarrier;
      }
      return s;
    });

    return { shipments: masked.map(s => this.flattenExtraServices(s)), total };
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
