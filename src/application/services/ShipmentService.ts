import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { Shipment, ShipmentStatus, ShipmentCategory, PlaceType, InsuranceType, LoadProfile, AccessDistance, DateFlexibility } from '../../domain/entities/Shipment';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ExtraService } from '../../domain/entities/ExtraService';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceApplicability';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { CarrierStatsRepository } from '../../infrastructure/repositories/CarrierStatsRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { NotificationService } from './NotificationService';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CarrierEarningsLog } from '../../domain/entities/CarrierEarningsLog';
import { PlatformSetting } from '../../domain/entities/PlatformSetting';
import { CustomerCarrierRelationRepository } from '../../infrastructure/repositories/CustomerCarrierRelationRepository';
import { ScopeOfWorkRepository } from '../../infrastructure/repositories/ScopeOfWorkRepository';
import { ServiceTypeRepository } from '../../infrastructure/repositories/ServiceTypeRepository';
import { CustomerPreference } from '../../domain/entities/CustomerPreference';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';
import { PlatformPolicyService } from './PlatformPolicyService';
import { ContactFilterSurface } from '../../domain/entities';
import { MatchingService } from './MatchingService';
import { getCarrierEligibility } from './carrier/carrierEligibility';
import {
  EXTRA_SERVICE_NAME_ALIASES,
  inferExtraServiceLoadTypeFromShipmentCategory,
  inferExtraServiceLoadTypeFromTransportType,
  inferShipmentCategoryFromTransportType,
} from './extra-services/extraServiceApplicability';

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
  transportType?: string;
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
  transportType?: string;
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

interface PendingShipmentListItem {
  id: string;
  status: ShipmentStatus;
  price: number | null;
  weight: number | null;
  estimatedWeight: number | null;
  shipmentDate: Date;
  createdAt: Date;
  origin: string;
  destination: string;
  originCity: string | null;
  originDistrict: string | null;
  destinationCity: string | null;
  destinationDistrict: string | null;
  shipmentCategory: ShipmentCategory | null;
  insuranceType: InsuranceType | null;
  dateFlexibility: DateFlexibility | null;
  originPlaceType: PlaceType | null;
  destinationPlaceType: PlaceType | null;
  originFloor: number | null;
  destinationFloor: number | null;
  originHasElevator: boolean | null;
  destinationHasElevator: boolean | null;
  extraServices: string[];
  converter: ShipmentConverterSummary;
  loadDetails: string;
  customerDisplayName: string;
}

type ShipmentConverterSummary = {
  converterSessionId: string | null;
  converterAppliedAt: Date | null;
  converterEstimatedVolumeMin: number | null;
  converterEstimatedVolumeMax: number | null;
  converterRecommendedVehicleCode: string | null;
  converterLastAppliedBy: string | null;
} | null;

export class ShipmentService {
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();
  private carrierStatsRepository = new CarrierStatsRepository();
  private notificationService = new NotificationService();
  private earningsLogRepo = AppDataSource.getRepository(CarrierEarningsLog);
  private scopeOfWorkRepository = new ScopeOfWorkRepository();
  private serviceTypeRepository = new ServiceTypeRepository();
  private platformPolicy = new PlatformPolicyService();
  private matchingService = new MatchingService();

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

  private normalizeExtraServiceInputs(extraServices?: string[]): string[] {
    if (!Array.isArray(extraServices)) return [];
    return Array.from(new Set(
      extraServices
        .map(service => String(service).trim())
        .filter(Boolean)
        .map(service => EXTRA_SERVICE_NAME_ALIASES[service] ?? service)
    ));
  }

  private normalizeExtraServiceNames(extraServices?: string[]): string[] {
    return this.normalizeExtraServiceInputs(extraServices);
  }

  private resolveExtraServiceLoadType(
    shipmentCategory?: ShipmentCategory | string | null,
    transportType?: string | null,
  ): ExtraServiceLoadType | null {
    return inferExtraServiceLoadTypeFromShipmentCategory(shipmentCategory)
      ?? inferExtraServiceLoadTypeFromTransportType(transportType);
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

  private buildLocationLabel(city?: string | null, district?: string | null): string {
    const safeCity = city?.trim() ?? '';
    const safeDistrict = district?.trim() ?? '';

    if (safeCity && safeDistrict) {
      return `${safeCity}, ${safeDistrict}`;
    }

    return safeCity || safeDistrict || '';
  }

  private buildDisplayName(firstName?: string | null, lastName?: string | null): string {
    const safeFirstName = firstName?.trim() ?? '';
    const safeLastName = lastName?.trim() ?? '';

    if (!safeFirstName && !safeLastName) return 'Müşteri';
    if (!safeLastName) return safeFirstName;

    const last = safeLastName.split(/\s+/)[0] ?? '';
    return `${safeFirstName} ${last.charAt(0).toUpperCase()}*`;
  }

  private maskOpenAddressForCarrier<T extends Shipment>(shipment: T, canViewOpenAddress: boolean): T {
    if (!canViewOpenAddress) {
      shipment.originAddressText = null as any;
      shipment.destinationAddressText = null as any;
    }
    return shipment;
  }

  private maskCarrierDirectContact(carrier: any): void {
    if (!carrier) return;
    delete carrier.phone;
    delete carrier.email;
  }

  private maskOfferCarriers(shipment: any): void {
    if (!Array.isArray(shipment?.offers)) return;
    shipment.offers = shipment.offers.map((offer: any) => {
      if (offer?.carrier) {
        this.maskCarrierDirectContact(offer.carrier);
      }
      offer.carrierEligibility = getCarrierEligibility(offer?.carrier ?? null);
      return offer;
    });
  }

  private buildShipmentConverterSummary(shipment: Shipment): ShipmentConverterSummary {
    const hasConverterData = [
      shipment.converterSessionId,
      shipment.converterAppliedAt,
      shipment.converterEstimatedVolumeMin,
      shipment.converterEstimatedVolumeMax,
      shipment.converterRecommendedVehicleCode,
      shipment.converterLastAppliedBy,
    ].some((value) => value !== null && value !== undefined);

    if (!hasConverterData) {
      return null;
    }

    return {
      converterSessionId: shipment.converterSessionId ?? null,
      converterAppliedAt: shipment.converterAppliedAt ?? null,
      converterEstimatedVolumeMin: shipment.converterEstimatedVolumeMin ?? null,
      converterEstimatedVolumeMax: shipment.converterEstimatedVolumeMax ?? null,
      converterRecommendedVehicleCode: shipment.converterRecommendedVehicleCode ?? null,
      converterLastAppliedBy: shipment.converterLastAppliedBy ?? null,
    };
  }

  private attachShipmentConverterSummary<T extends Shipment>(shipment: T): T {
    const target = shipment as T & { converter?: ShipmentConverterSummary };
    target.converter = this.buildShipmentConverterSummary(shipment);

    // Keep API surface minimal by hiding internal/raw converter payload details.
    delete (target as any).converterSpecialItemsJson;

    return target;
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

      const missingServices = normalizedNames.filter(name => !existingByName.has(name));
    if (missingServices.length > 0) {
      throw new ValidationError(`Tanımsız ek hizmet(ler): ${missingServices.join(', ')}`);
    }

    const targetIds = normalizedNames.map(name => existingByName.get(name)!.id);
    await AppDataSource.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(shipmentId)
      .addAndRemove(targetIds.filter(id => !currentIds.includes(id)), currentIds.filter(id => !targetIds.includes(id)));
  }

  private async resolveValidatedExtraServices(
    extraServices: string[] | undefined,
    loadType: ExtraServiceLoadType | null,
  ): Promise<ExtraService[]> {
    const normalizedValues = this.normalizeExtraServiceInputs(extraServices);
    if (!normalizedValues.length) return [];

    const repo = AppDataSource.getRepository(ExtraService);
    const uuidValues = normalizedValues.filter((value) => /^[0-9a-f-]{36}$/i.test(value));
    const nameValues = normalizedValues.filter((value) => !uuidValues.includes(value));

    const qb = repo
      .createQueryBuilder('extraService')
      .leftJoinAndSelect('extraService.applicabilityRules', 'applicability')
      .where('extraService.status = :status', { status: 'ACTIVE' });

    if (uuidValues.length && nameValues.length) {
      qb.andWhere('(extraService.id IN (:...ids) OR extraService.name IN (:...names))', {
        ids: uuidValues,
        names: nameValues,
      });
    } else if (uuidValues.length) {
      qb.andWhere('extraService.id IN (:...ids)', { ids: uuidValues });
    } else {
      qb.andWhere('extraService.name IN (:...names)', { names: nameValues });
    }

    if (loadType) {
      qb.andWhere('applicability.loadType = :loadType', { loadType });
    }

    const resolved = await qb.getMany();
    const resolvedIds = new Set(resolved.map((item) => item.id));
    const resolvedNames = new Set(resolved.map((item) => item.name));
    const missingValues = normalizedValues.filter((value) => !resolvedIds.has(value) && !resolvedNames.has(value));

    if (missingValues.length > 0) {
      const messageBase = `Tanimsiz veya bu yuk turu icin gecersiz ek hizmet(ler): ${missingValues.join(', ')}`;
      throw new ValidationError(loadType ? `${messageBase}. loadType=${loadType}` : messageBase);
    }

    return resolved;
  }

  private async applyShipmentExtraServices(
    shipmentId: string,
    extraServices: string[] | undefined,
    loadType: ExtraServiceLoadType | null,
  ): Promise<string[]> {
    const resolvedServices = await this.resolveValidatedExtraServices(extraServices, loadType);

    const shipmentWithRelations = await AppDataSource.getRepository(Shipment).findOne({
      where: { id: shipmentId },
      relations: ['extraServices'],
    });
    const currentIds = shipmentWithRelations?.extraServices?.map((item) => item.id) ?? [];

    if (!resolvedServices.length) {
      if (currentIds.length) {
        await AppDataSource.createQueryBuilder()
          .relation(Shipment, 'extraServices')
          .of(shipmentId)
          .remove(currentIds);
      }
      return [];
    }

    const targetIds = resolvedServices.map((item) => item.id);
    await AppDataSource.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(shipmentId)
      .addAndRemove(
        targetIds.filter((id) => !currentIds.includes(id)),
        currentIds.filter((id) => !targetIds.includes(id)),
      );

    return resolvedServices.map((item) => item.name);
  }

  async getPendingShipmentsForCarrier(carrierId: string): Promise<PendingShipmentListItem[]> {
    const carrier = await this.matchingService.getCarrierForMatching(carrierId);
    const shipments = await this.shipmentRepository.findPendingShipmentsForCarrier(carrierId);
    const matchingShipments = shipments.filter(shipment =>
      this.matchingService.isShipmentMatchingCarrier(shipment, carrier)
    );

    const customerIds = Array.from(new Set(
      matchingShipments
        .map((shipment) => shipment.customerId)
        .filter((customerId): customerId is string => Boolean(customerId))
    ));

    const cooldownCustomerIds = await this.platformPolicy.getActiveCooldownCustomerIdsForCarrier(carrierId, customerIds);
    const visibleShipments = matchingShipments.filter((shipment) => !cooldownCustomerIds.has(shipment.customerId));

    // ANTI-DISINTERMEDIATION: contactPhone ve müşteri PII maskeleme
    // Bekleyen talepleri listelerken carrier iletişim bilgisi göremez
    return visibleShipments.map(s => {
      s.contactPhone = null as any;
      this.maskOpenAddressForCarrier(s, false);
      this.flattenExtraServices(s);
      return {
        id: s.id,
        status: s.status,
        price: s.price,
        weight: s.weight,
        estimatedWeight: s.estimatedWeight,
        shipmentDate: s.shipmentDate,
        createdAt: s.createdAt,
        origin: this.buildLocationLabel(s.originCity, s.originDistrict),
        destination: this.buildLocationLabel(s.destinationCity, s.destinationDistrict),
        originCity: s.originCity,
        originDistrict: s.originDistrict,
        destinationCity: s.destinationCity,
        destinationDistrict: s.destinationDistrict,
        shipmentCategory: s.shipmentCategory,
        insuranceType: s.insuranceType,
        dateFlexibility: s.dateFlexibility,
        originPlaceType: s.originPlaceType,
        destinationPlaceType: s.destinationPlaceType,
        originFloor: s.originFloor,
        destinationFloor: s.destinationFloor,
        originHasElevator: s.originHasElevator,
        destinationHasElevator: s.destinationHasElevator,
        extraServices: Array.isArray(s.extraServices) ? (s.extraServices as unknown as string[]) : [],
        converter: this.buildShipmentConverterSummary(s),
        loadDetails: s.loadDetails,
        customerDisplayName: this.buildDisplayName(s.customer?.firstName, s.customer?.lastName),
      };
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

    await this.platformPolicy.enforceNoContactInfo({
      actorType: 'customer',
      actorId: customerId,
      surface: ContactFilterSurface.SHIPMENT_LOAD_DETAILS,
      text: payload.loadDetails,
    });
    await this.platformPolicy.enforceNoContactInfo({
      actorType: 'customer',
      actorId: customerId,
      surface: ContactFilterSurface.SHIPMENT_NOTE,
      text: payload.note,
    });

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

    const normalizedShipmentCategory = (payload.shipmentCategory as ShipmentCategory | undefined)
      ?? inferShipmentCategoryFromTransportType(payload.transportType)
      ?? null;
    const extraServiceLoadType = this.resolveExtraServiceLoadType(normalizedShipmentCategory, payload.transportType);

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
      shipmentCategory: normalizedShipmentCategory,
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

    shipment.extraServices = await this.applyShipmentExtraServices(
      shipment.id,
      payload.extraServices,
      extraServiceLoadType,
    ) as any;

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
    return shipments.map(shipment => {
      const normalized = this.flattenExtraServices(shipment as Shipment & { offerCount: number });
      return this.attachShipmentConverterSummary(normalized as Shipment & { offerCount: number });
    });
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
      return this.attachShipmentConverterSummary(shipment);
    }

    // Müşteri: sadece kendi gönderisini görebilir
    if (requestingUserType === 'customer') {
      if (shipment.customerId !== requestingUserId) {
        throw new ForbiddenError('Bu gönderiye erişim yetkiniz yok.');
      }
      const canViewCarrierContact = this.platformPolicy.shouldRevealDirectContact(shipment, 'customer', requestingUserId);
      this.maskOfferCarriers(shipment);
      if (shipment.carrier) {
        delete (shipment.carrier as any).email;
        if (!canViewCarrierContact) {
          delete (shipment.carrier as any).phone;
        }
      }
      if (!canViewCarrierContact) {
        shipment.contactPhone = null as any;
      }
      return this.attachShipmentConverterSummary(shipment);
    }

    // A) ShipmentService.getById() — requester tipine göre maskeleme:
    if (requestingUserType === 'carrier') {
      const isAssigned = shipment.carrierId === requestingUserId;
      const canViewDetails = isAssigned && this.platformPolicy.shouldRevealDirectContact(shipment, 'carrier', requestingUserId);

      if (shipment.customer) {
        const maskedName = this.buildDisplayName(shipment.customer.firstName, shipment.customer.lastName);
        const nameParts = maskedName.split(' ');
        const maskedFirstName = nameParts[0] || shipment.customer.firstName;
        const maskedLastName = nameParts[1] || undefined;

        shipment.customer = {
          ...shipment.customer,
          firstName: maskedFirstName,
          lastName: canViewDetails ? shipment.customer.lastName : maskedLastName,
          phone: canViewDetails ? shipment.customer.phone : undefined,
          email: undefined,
          id: undefined,
        } as any;
      }

      // ANTI-DISINTERMEDIATION: contactPhone ve açık adres maskesi — atanmamış carrier göremez
      if (!canViewDetails) {
        shipment.contactPhone = null as any;
      }
      this.maskOpenAddressForCarrier(shipment, canViewDetails);
      this.maskOfferCarriers(shipment);
      if (shipment.carrier) {
        this.maskCarrierDirectContact(shipment.carrier);
      }

      return this.attachShipmentConverterSummary(shipment);
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

    await this.platformPolicy.enforceNoContactInfo({
      actorType: 'customer',
      actorId: customerId,
      surface: ContactFilterSurface.SHIPMENT_LOAD_DETAILS,
      text: payload.loadDetails,
      shipmentId,
    });
    await this.platformPolicy.enforceNoContactInfo({
      actorType: 'customer',
      actorId: customerId,
      surface: ContactFilterSurface.SHIPMENT_NOTE,
      text: payload.note,
      shipmentId,
    });

    const normalizedShipmentCategory = (payload.shipmentCategory as ShipmentCategory | undefined)
      ?? shipment.shipmentCategory
      ?? inferShipmentCategoryFromTransportType(payload.transportType)
      ?? null;
    const extraServiceLoadType = this.resolveExtraServiceLoadType(normalizedShipmentCategory, payload.transportType);

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
      shipmentCategory: normalizedShipmentCategory,
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
      (updatedShipment as any).extraServices = await this.applyShipmentExtraServices(
        shipmentId,
        payload.extraServices,
        extraServiceLoadType,
      );
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
    const shouldCreateCooldown = this.platformPolicy.shouldCreateCancellationCooldown(shipment, fullReason);

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

    if (shouldCreateCooldown) {
      await this.platformPolicy.createCancellationCooldown(shipment, fullReason);
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
      if (typeof (this.notificationService as any).createFromEvent === 'function') {
        await this.notificationService.createFromEvent('customer.shipment_in_transit', {
          recipientUserId: updatedShipment.customerId,
          entityId: shipmentId,
          carrierId,
          shipmentStatus: ShipmentStatus.IN_TRANSIT,
        });
      } else {
        await this.notificationService.createNotification(
          updatedShipment.customerId,
          'customer',
          'SHIPMENT_STARTED',
          'Taşımanız Başladı',
          'Nakliyeci taşımanızı başlattı. Teslimatı takip edebilirsiniz.',
          shipmentId
        );
      }
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
      if (typeof (this.notificationService as any).createFromEvent === 'function') {
        await this.notificationService.createFromEvent('customer.shipment_completed', {
          recipientUserId: updatedShipment.customerId,
          entityId: shipmentId,
          carrierId,
          shipmentStatus: ShipmentStatus.COMPLETED,
          reviewSuggested: true,
        });
      } else {
        await this.notificationService.createNotification(
          updatedShipment.customerId,
          'customer',
          'SHIPMENT_COMPLETED',
          'Taşımanız Tamamlandı',
          'Eşyalarınız teslim edildi. Lütfen nakliyeciyi değerlendirin.',
          shipmentId
        );
      }
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

    await this.platformPolicy.assertNoActiveCooldown(requestingCustomerId, carrierId);

    const updated = await this.shipmentRepository.update(shipmentId, {
      carrierId,
      status: ShipmentStatus.MATCHED,
      matchedAt: new Date()
    });

    if (!updated) throw new Error('Taşıma güncellenemedi');
    return updated;
  }

}
