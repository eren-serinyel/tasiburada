import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import fs from 'node:fs';
import path from 'node:path';
import { EntityManager } from 'typeorm';
import { Shipment, ShipmentStatus, ShipmentCategory, PlaceType, InsuranceType, LoadProfile, AccessDistance, DateFlexibility } from '../../domain/entities/Shipment';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ExtraService } from '../../domain/entities/ExtraService';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceApplicability';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { CarrierStatsRepository } from '../../infrastructure/repositories/CarrierStatsRepository';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { CarrierStats } from '../../domain/entities/CarrierStats';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { NotificationService } from './NotificationService';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CarrierEarningsLog } from '../../domain/entities/CarrierEarningsLog';
import { CustomerCarrierRelationRepository } from '../../infrastructure/repositories/CustomerCarrierRelationRepository';
import { ScopeOfWorkRepository } from '../../infrastructure/repositories/ScopeOfWorkRepository';
import { ServiceTypeRepository } from '../../infrastructure/repositories/ServiceTypeRepository';
import { CustomerPreference } from '../../domain/entities/CustomerPreference';
import { CustomerAddress } from '../../domain/entities/CustomerAddress';
import { CarrierCustomExtraService } from '../../domain/entities/CarrierCustomExtraService';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { ShipmentCustomExtraService } from '../../domain/entities/ShipmentCustomExtraService';
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
  photoUrls?: string[];
  extraServices?: string[];
  customExtraServices?: string[];
  customExtraServiceIds?: string[];
  requestedCarrierServices?: RequestedCarrierServicesByCarrier;
  loadType?: ExtraServiceLoadType | string | null;
}

interface RequestedCarrierServicesPayload {
  catalogServiceIds?: string[];
  customServiceIds?: string[];
}

type RequestedCarrierServicesByCarrier = Record<string, RequestedCarrierServicesPayload>;

interface ValidatedCarrierRequestedServices {
  catalogServiceIds: string[];
  customServiceIds: string[];
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
  photoUrls?: string[];
  extraServices?: string[];
  customExtraServices?: string[];
  customExtraServiceIds?: string[];
  loadType?: ExtraServiceLoadType | string | null;
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
  private offerRepository = new OfferRepository();
  private carrierRepository = new CarrierRepository();
  private carrierStatsRepository = new CarrierStatsRepository();
  private notificationService = new NotificationService();
  private scopeOfWorkRepository = new ScopeOfWorkRepository();
  private serviceTypeRepository = new ServiceTypeRepository();
  private platformPolicy = new PlatformPolicyService();
  private matchingService = new MatchingService();

  private ensureStatusTransition(current: ShipmentStatus, next: ShipmentStatus): void {
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.PENDING]: [ShipmentStatus.OFFER_RECEIVED, ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED, ShipmentStatus.EXPIRED],
      [ShipmentStatus.OFFER_RECEIVED]: [ShipmentStatus.MATCHED, ShipmentStatus.CANCELLED, ShipmentStatus.EXPIRED],
      [ShipmentStatus.MATCHED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
      [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.COMPLETED],
      [ShipmentStatus.COMPLETED]: [],
      [ShipmentStatus.CANCELLED]: [],
      [ShipmentStatus.EXPIRED]: []
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new ValidationError(`Bu iÅŸlem ÅŸu anki durum (${current}) iÃ§in geÃ§ersizdir. Hedef durum: ${next}.`);
    }
  }

  private extractCity(address: string): string {
    // "Ä°stanbul, KadÄ±kÃ¶y" â†’ "Ä°stanbul" ; "Ankara" â†’ "Ankara"
    return address.split(',')[0].trim();
  }

  private extractDistrict(address: string): string | null {
    const parts = address.split(',').map(part => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(', ') : null;
  }

  private normalizePlaceType(value?: string): PlaceType | null {
    if (!value) return null;

    const normalized = value.trim();
    if (!normalized) return null;

    if (Object.values(PlaceType).includes(normalized as PlaceType)) {
      return normalized as PlaceType;
    }

    const key = normalized
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ')
      .trim();

    const map: Record<string, PlaceType> = {
      daire: PlaceType.DAIRE,
      apartman: PlaceType.APARTMAN_DAIRESI,
      'apartman dairesi': PlaceType.APARTMAN_DAIRESI,
      'site içi daire': PlaceType.SITE_ICI_DAIRE,
      'site ici daire': PlaceType.SITE_ICI_DAIRE,
      müstakil: PlaceType.MUSTAKIL,
      mustakil: PlaceType.MUSTAKIL,
      'müstakil ev': PlaceType.MUSTAKIL,
      'mustakil ev': PlaceType.MUSTAKIL,
      villa: PlaceType.VILLA,
      ofis: PlaceType.OFIS,
      'küçük ofis': PlaceType.OFIS,
      'kucuk ofis': PlaceType.OFIS,
      'orta ofis': PlaceType.OFIS,
      'büyük ofis': PlaceType.OFIS,
      'buyuk ofis': PlaceType.OFIS,
      'plaza ofis': PlaceType.PLAZA_OFIS,
      'plaza/ofis': PlaceType.PLAZA_OFIS,
      depo: PlaceType.DEPO,
      dükkan: PlaceType.DUKKAN,
      dükkân: PlaceType.DUKKAN,
      dukkan: PlaceType.DUKKAN,
      diğer: PlaceType.DIGER,
      diger: PlaceType.DIGER,
      '1+1': PlaceType.DAIRE,
      '2+1': PlaceType.DAIRE,
      '3+1': PlaceType.DAIRE,
      '4+1': PlaceType.DAIRE,
      '5+1': PlaceType.DAIRE,
      '5+2': PlaceType.DAIRE,
      '1+1 ev': PlaceType.DAIRE,
      '2+1 ev': PlaceType.DAIRE,
      '3+1 ev': PlaceType.DAIRE,
      '4+1 ev': PlaceType.DAIRE,
      '5+1 ev': PlaceType.DAIRE,
      '5+2 ev': PlaceType.DAIRE,
      'dubleks / müstakil': PlaceType.MUSTAKIL,
      'dubleks / mustakil': PlaceType.MUSTAKIL,
      'diğer / emin değilim': PlaceType.DIGER,
      'diger / emin degilim': PlaceType.DIGER,
      'sadece beyaz eşya': PlaceType.DIGER,
      'sadece beyaz esya': PlaceType.DIGER,
      'sadece mobilya': PlaceType.DIGER,
      'tek parça eşya': PlaceType.DIGER,
      'tek parca esya': PlaceType.DIGER,
      'küçük depo': PlaceType.DEPO,
      'kucuk depo': PlaceType.DEPO,
      'orta depo': PlaceType.DEPO,
      'büyük depo': PlaceType.DEPO,
      'buyuk depo': PlaceType.DEPO,
    };

    if (map[key]) return map[key];

    const fuzzyMatch = Object.entries(map)
      .sort(([left], [right]) => right.length - left.length)
      .find(([candidate]) => key.includes(candidate));

    return fuzzyMatch?.[1] ?? PlaceType.DIGER;
  }

  private normalizeInsuranceType(value?: string): InsuranceType {
    if (!value) return InsuranceType.NONE;

    const normalized = value.trim().toLowerCase();
    if (normalized === InsuranceType.STANDARD) return InsuranceType.STANDARD;
    if (normalized === InsuranceType.COMPREHENSIVE) return InsuranceType.COMPREHENSIVE;
    return InsuranceType.NONE;
  }

  private normalizeDateFlexibility(value?: string | DateFlexibility | null): DateFlexibility {
    if (!value) return DateFlexibility.EXACT;
    const normalized = String(value).trim().toUpperCase();
    if (normalized === 'FLEXIBLE' || normalized === 'WITHIN_WEEK') {
      return DateFlexibility.PLUS_MINUS_3_DAYS;
    }
    return Object.values(DateFlexibility).includes(normalized as DateFlexibility)
      ? normalized as DateFlexibility
      : DateFlexibility.EXACT;
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

  async expireStale(): Promise<{ shipments: number; offers: number }> {
    const [shipments, offers] = await Promise.all([
      this.shipmentRepository.expireStaleOpenShipments(),
      this.offerRepository.expireStalePendingOffers(),
    ]);

    return { shipments, offers };
  }

  private resolveExtraServiceLoadType(
    shipmentCategory?: ShipmentCategory | string | null,
    transportType?: string | null,
    loadType?: ExtraServiceLoadType | string | null,
  ): ExtraServiceLoadType | null {
    return inferExtraServiceLoadTypeFromShipmentCategory(shipmentCategory)
      ?? this.normalizeExtraServiceLoadType(loadType)
      ?? inferExtraServiceLoadTypeFromTransportType(transportType);
  }

  private normalizeExtraServiceLoadType(loadType?: ExtraServiceLoadType | string | null): ExtraServiceLoadType | null {
    if (!loadType) return null;
    const normalized = String(loadType).trim().toUpperCase();
    return Object.values(ExtraServiceLoadType).includes(normalized as ExtraServiceLoadType)
      ? normalized as ExtraServiceLoadType
      : null;
  }

  private async getCustomerPreferenceSafe(customerId: string): Promise<CustomerPreference | null> {
    try {
      const prefRepo = AppDataSource.getRepository(CustomerPreference);
      return await prefRepo.findOne({ where: { customerId } });
    } catch {
      return null;
    }
  }

  private flattenExtraServices<T extends Shipment>(shipment: T, customCarrierId?: string | null): T {
    const catalogNames = Array.isArray((shipment as any).extraServices)
      ? (shipment as any).extraServices
          .map((item: any) => typeof item === 'string' ? item : item?.name)
          .filter(Boolean)
      : [];
    const customNames = Array.isArray((shipment as any).customExtraServices)
      ? (shipment as any).customExtraServices
          .filter((item: any) => !customCarrierId || !item?.carrierId || item.carrierId === customCarrierId)
          .map((item: any) => item?.nameSnapshot)
          .filter(Boolean)
      : [];

    (shipment as any).extraServices = Array.from(new Set([...catalogNames, ...customNames]));
    delete (shipment as any).customExtraServices;
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

    if (!safeFirstName && !safeLastName) return 'MÃ¼ÅŸteri';
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
    delete carrier.passwordHash;
    delete carrier.resetToken;
    delete carrier.resetTokenExpiry;
    delete carrier.verificationToken;
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

  private extractPhotoFilename(value?: string | null): string | null {
    if (!value) return null;

    const withoutQuery = String(value).split('?')[0].split('#')[0];
    let pathname = withoutQuery;

    try {
      pathname = new URL(withoutQuery, 'http://tasiburada.local').pathname;
    } catch {
      pathname = withoutQuery;
    }

    let decoded = pathname;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      decoded = pathname;
    }

    const filename = decoded.replace(/\\/g, '/').split('/').pop() || '';
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }

    return filename;
  }

  private normalizeShipmentPhotoUrls(photoUrls?: string[] | null): string[] | undefined {
    if (!Array.isArray(photoUrls)) return undefined;

    const normalized = photoUrls
      .map((url) => String(url || '').trim())
      .filter(Boolean)
      .filter((url) => Boolean(this.extractPhotoFilename(url)));

    return normalized.length ? Array.from(new Set(normalized)) : [];
  }

  private buildSecureShipmentPhotoUrls(shipment: Shipment): string[] {
    if (!Array.isArray(shipment.photoUrls)) return [];

    return shipment.photoUrls
      .map((url) => this.extractPhotoFilename(url))
      .filter((filename): filename is string => Boolean(filename))
      .map((filename) => `/api/v1/shipments/${shipment.id}/photos/${encodeURIComponent(filename)}`);
  }

  private exposeShipmentPhotos<T extends Shipment>(shipment: T, canViewPhotos: boolean): T {
    shipment.photoUrls = canViewPhotos ? this.buildSecureShipmentPhotoUrls(shipment) : [];
    return shipment;
  }

  private canAccessShipmentPhotos(
    shipment: Shipment,
    requestingUserId: string,
    requestingUserType: 'customer' | 'carrier' | 'admin',
  ): boolean {
    if (requestingUserType === 'admin') return true;
    if (requestingUserType === 'customer') return shipment.customerId === requestingUserId;
    if (requestingUserType === 'carrier') return shipment.carrierId === requestingUserId;
    return false;
  }

  async getShipmentPhotoFilePath(
    shipmentId: string,
    photoId: string,
    requestingUserId: string,
    requestingUserType: 'customer' | 'carrier' | 'admin',
  ): Promise<string> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Taşıma talebi bulunamadı.');
    }

    if (!this.canAccessShipmentPhotos(shipment, requestingUserId, requestingUserType)) {
      throw new ForbiddenError('Bu fotoğrafa erişim yetkiniz yok.');
    }

    const requestedFilename = this.extractPhotoFilename(photoId);
    if (!requestedFilename) {
      throw new NotFoundError('Fotoğraf bulunamadı.');
    }

    const allowedFilenames = new Set(
      (Array.isArray(shipment.photoUrls) ? shipment.photoUrls : [])
        .map((url) => this.extractPhotoFilename(url))
        .filter((filename): filename is string => Boolean(filename)),
    );

    if (!allowedFilenames.has(requestedFilename)) {
      throw new NotFoundError('Fotoğraf bulunamadı.');
    }

    const picturesRoot = path.resolve(process.cwd(), 'uploads', 'pictures');
    const filePath = path.resolve(picturesRoot, requestedFilename);
    if (!filePath.startsWith(picturesRoot + path.sep) || !fs.existsSync(filePath)) {
      throw new NotFoundError('Fotoğraf bulunamadı.');
    }

    return filePath;
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
      throw new ValidationError(`TanÄ±msÄ±z ek hizmet(ler): ${missingServices.join(', ')}`);
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
    manager: EntityManager = AppDataSource.manager,
  ): Promise<ExtraService[]> {
    const normalizedValues = this.normalizeExtraServiceInputs(extraServices);
    if (!normalizedValues.length) return [];

    const repo = manager.getRepository(ExtraService);
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
    manager: EntityManager = AppDataSource.manager,
    validatedServices?: ExtraService[],
  ): Promise<string[]> {
    const resolvedServices = validatedServices
      ?? await this.resolveValidatedExtraServices(extraServices, loadType, manager);

    const shipmentWithRelations = await manager.getRepository(Shipment).findOne({
      where: { id: shipmentId },
      relations: ['extraServices'],
    });
    const currentIds = shipmentWithRelations?.extraServices?.map((item) => item.id) ?? [];

    if (!resolvedServices.length) {
      if (currentIds.length) {
        await manager.createQueryBuilder()
          .relation(Shipment, 'extraServices')
          .of(shipmentId)
          .remove(currentIds);
      }
      return [];
    }

    const targetIds = resolvedServices.map((item) => item.id);
    await manager.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(shipmentId)
      .addAndRemove(
        targetIds.filter((id) => !currentIds.includes(id)),
        currentIds.filter((id) => !targetIds.includes(id)),
      );

    return resolvedServices.map((item) => item.name);
  }

  private normalizeCustomExtraServiceIds(...sources: Array<string[] | undefined>): string[] {
    return Array.from(new Set(
      sources
        .flatMap((source) => Array.isArray(source) ? source : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    ));
  }

  private normalizeRequestedCarrierServices(
    requested?: RequestedCarrierServicesByCarrier,
  ): RequestedCarrierServicesByCarrier {
    if (!requested || typeof requested !== 'object' || Array.isArray(requested)) {
      return {};
    }

    return Object.entries(requested).reduce<RequestedCarrierServicesByCarrier>((acc, [carrierId, services]) => {
      const normalizedCarrierId = String(carrierId || '').trim();
      if (!normalizedCarrierId || !services || typeof services !== 'object' || Array.isArray(services)) {
        return acc;
      }

      acc[normalizedCarrierId] = {
        catalogServiceIds: this.normalizeCustomExtraServiceIds(services.catalogServiceIds),
        customServiceIds: this.normalizeCustomExtraServiceIds(services.customServiceIds),
      };
      return acc;
    }, {});
  }

  private hasLooseExtraServicePayload(payload: CreateShipmentPayload): boolean {
    return this.normalizeExtraServiceInputs(payload.extraServices).length > 0
      || this.normalizeCustomExtraServiceIds(payload.customExtraServices, payload.customExtraServiceIds).length > 0;
  }

  private assertLoosePayloadMatchesCarrierSelection(
    payload: CreateShipmentPayload,
    validated: ValidatedCarrierRequestedServices,
  ): void {
    const catalogIds = new Set(validated.catalogServiceIds);
    const customIds = new Set(validated.customServiceIds);
    const looseCatalogValues = this.normalizeExtraServiceInputs(payload.extraServices);
    const looseCustomValues = this.normalizeCustomExtraServiceIds(payload.customExtraServices, payload.customExtraServiceIds);

    const hasUnknownCatalogValue = looseCatalogValues.some((value) => !catalogIds.has(value));
    const hasUnknownCustomValue = looseCustomValues.some((value) => !customIds.has(value));
    if (hasUnknownCatalogValue || hasUnknownCustomValue) {
      throw new ValidationError('Seçilen ek hizmet bu nakliyeci tarafından sunulmuyor.');
    }
  }

  private async validateRequestedCarrierServices(
    requested: RequestedCarrierServicesByCarrier,
    loadType: ExtraServiceLoadType | null,
  ): Promise<ValidatedCarrierRequestedServices> {
    const entries = Object.entries(requested);
    if (!entries.length) {
      return { catalogServiceIds: [], customServiceIds: [] };
    }

    const selectedCatalogIds = Array.from(new Set(entries.flatMap(([, services]) => services.catalogServiceIds ?? [])));
    const selectedCustomIds = Array.from(new Set(entries.flatMap(([, services]) => services.customServiceIds ?? [])));

    if ((selectedCatalogIds.length || selectedCustomIds.length) && !loadType) {
      throw new ValidationError('Ek hizmet seçimi için yük türü gereklidir.');
    }

    const validCatalogIds = new Set<string>();
    const validCustomIds = new Set<string>();
    const capabilityRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);
    const customRepo = AppDataSource.getRepository(CarrierCustomExtraService);

    for (const [carrierId, services] of entries) {
      const catalogServiceIds = services.catalogServiceIds ?? [];
      if (catalogServiceIds.length) {
        const capabilities = await capabilityRepo
          .createQueryBuilder('capability')
          .innerJoin('capability.extraService', 'extraService')
          .where('capability.carrierId = :carrierId', { carrierId })
          .andWhere('capability.isActive = :isActive', { isActive: true })
          .andWhere('capability.loadType = :loadType', { loadType })
          .andWhere('capability.extraServiceId IN (:...catalogServiceIds)', { catalogServiceIds })
          .andWhere('extraService.status = :status', { status: 'ACTIVE' })
          .getMany();
        const offeredIds = new Set(capabilities.map((capability) => capability.extraServiceId));
        if (catalogServiceIds.some((id) => !offeredIds.has(id))) {
          throw new ValidationError('Seçilen ek hizmet bu nakliyeci tarafından sunulmuyor.');
        }
        catalogServiceIds.forEach((id) => validCatalogIds.add(id));
      }

      const customServiceIds = services.customServiceIds ?? [];
      if (customServiceIds.length) {
        const customServices = await customRepo
          .createQueryBuilder('customService')
          .where('customService.carrierId = :carrierId', { carrierId })
          .andWhere('customService.isActive = :isActive', { isActive: true })
          .andWhere('customService.loadType = :loadType', { loadType })
          .andWhere('customService.id IN (:...customServiceIds)', { customServiceIds })
          .getMany();
        const offeredIds = new Set(customServices.map((service) => service.id));
        if (customServiceIds.some((id) => !offeredIds.has(id))) {
          throw new ValidationError('Seçilen ek hizmet bu nakliyeci tarafından sunulmuyor.');
        }
        customServiceIds.forEach((id) => validCustomIds.add(id));
      }
    }

    return {
      catalogServiceIds: Array.from(validCatalogIds),
      customServiceIds: Array.from(validCustomIds),
    };
  }

  private async resolveValidatedCustomExtraServices(
    ids: string[],
    loadType: ExtraServiceLoadType | null,
  ): Promise<CarrierCustomExtraService[]> {
    if (!ids.length) return [];

    const serviceRepo = AppDataSource.getRepository(CarrierCustomExtraService);
    const qb = serviceRepo
      .createQueryBuilder('customService')
      .where('customService.id IN (:...ids)', { ids })
      .andWhere('customService.isActive = :isActive', { isActive: true });

    if (loadType) {
      qb.andWhere('customService.loadType = :loadType', { loadType });
    }

    const services = await qb.getMany();
    const foundIds = new Set(services.map((service) => service.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      const messageBase = `Tanimsiz veya bu yuk turu icin gecersiz ozel hizmet(ler): ${missingIds.join(', ')}`;
      throw new ValidationError(loadType ? `${messageBase}. loadType=${loadType}` : messageBase);
    }

    return services;
  }

  private async applyShipmentCustomExtraServices(
    shipmentId: string,
    customExtraServices: string[] | undefined,
    customExtraServiceIds: string[] | undefined,
    loadType: ExtraServiceLoadType | null,
  ): Promise<ShipmentCustomExtraService[]> {
    const ids = this.normalizeCustomExtraServiceIds(customExtraServices, customExtraServiceIds);
    const repo = AppDataSource.getRepository(ShipmentCustomExtraService);

    await repo.delete({ shipmentId });
    const services = await this.resolveValidatedCustomExtraServices(ids, loadType);
    if (!services.length) return [];

    const snapshots = services.map((service) => repo.create({
      shipmentId,
      customExtraServiceId: service.id,
      carrierId: service.carrierId,
      nameSnapshot: service.title,
      priceSnapshot: service.basePrice == null ? null : Number(service.basePrice),
    }));

    return repo.save(snapshots);
  }

  async getPendingShipmentsForCarrier(carrierId: string): Promise<PendingShipmentListItem[]> {
    await this.expireStale();

    const carrier = await this.matchingService.getCarrierForMatching(carrierId);
    if (!carrier || !carrier.isActive || !carrier.verifiedByAdmin || carrier.approvalState !== CarrierApprovalState.APPROVED) {
      throw new ForbiddenError('Tasima taleplerini gorebilmek icin belgelerinizin yuklenmis ve admin tarafindan onaylanmis olmasi gerekir.');
    }

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

    // ANTI-DISINTERMEDIATION: contactPhone ve mÃ¼ÅŸteri PII maskeleme
    // Bekleyen talepleri listelerken carrier iletiÅŸim bilgisi gÃ¶remez
    return visibleShipments.map(s => {
      s.contactPhone = null as any;
      this.maskOpenAddressForCarrier(s, false);
      this.flattenExtraServices(s, carrierId);
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
      throw new ValidationError('origin, destination, loadDetails ve shipmentDate alanlarÄ± zorunludur.');
    }

    const origin = payload.origin.trim();
    const destination = payload.destination.trim();

    if (origin.length < 3) {
      throw new ValidationError('Ã‡Ä±kÄ±ÅŸ noktasÄ± en az 3 karakter olmalÄ±dÄ±r.');
    }
    if (destination.length < 3) {
      throw new ValidationError('VarÄ±ÅŸ noktasÄ± en az 3 karakter olmalÄ±dÄ±r.');
    }

    const shipmentDate = new Date(payload.shipmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (shipmentDate < today) {
      throw new ValidationError('TaÅŸÄ±ma tarihi geÃ§miÅŸ bir tarih olamaz.');
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

    // BR3 â€” Ã‡ift Ä°lan Engeli:
    const originCity = payload.originCity ?? (origin ? this.extractCity(origin) : '');
    const destinationCity = payload.destinationCity ?? (destination ? this.extractCity(destination) : '');
    const originDistrict = payload.originDistrict ?? this.extractDistrict(origin);
    const destinationDistrict = payload.destinationDistrict ?? this.extractDistrict(destination);

    const duplicate = await this.shipmentRepository.findDuplicateShipment(customerId, originCity, destinationCity, originDistrict, destinationDistrict, shipmentDate);
    if (duplicate) {
      throw new ConflictError('Bu rota iÃ§in aktif ilanÄ±nÄ±z bulunuyor');
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
    const extraServiceLoadType = this.resolveExtraServiceLoadType(
      normalizedShipmentCategory,
      payload.transportType,
      payload.loadType,
    );
    const requestedCarrierServices = this.normalizeRequestedCarrierServices(payload.requestedCarrierServices);
    const hasRequestedCarrierServices = Object.keys(requestedCarrierServices).length > 0;
    const supportsCarrierIndependentCatalogSelection = normalizedShipmentCategory === ShipmentCategory.HOME_MOVE
      || normalizedShipmentCategory === ShipmentCategory.OFFICE_MOVE
      || normalizedShipmentCategory === ShipmentCategory.PARTIAL_ITEM;
    const requestedCatalogServiceIds = Object.values(requestedCarrierServices)
      .flatMap((services) => services.catalogServiceIds ?? []);
    const selectedCatalogServices = supportsCarrierIndependentCatalogSelection
      ? this.normalizeExtraServiceInputs([
          ...(payload.extraServices ?? []),
          ...requestedCatalogServiceIds,
        ])
      : [];
    const resolvedCatalogServices = supportsCarrierIndependentCatalogSelection
      ? await this.resolveValidatedExtraServices(selectedCatalogServices, extraServiceLoadType)
      : [];
    let validatedRequestedServices: ValidatedCarrierRequestedServices = {
      catalogServiceIds: [],
      customServiceIds: [],
    };

    if (hasRequestedCarrierServices) {
      const carrierServicesToValidate = supportsCarrierIndependentCatalogSelection
        ? Object.fromEntries(Object.entries(requestedCarrierServices).map(([carrierId, services]) => [
            carrierId,
            { ...services, catalogServiceIds: [] },
          ]))
        : requestedCarrierServices;
      validatedRequestedServices = await this.validateRequestedCarrierServices(
        carrierServicesToValidate,
        extraServiceLoadType,
      );
      this.assertLoosePayloadMatchesCarrierSelection(
        supportsCarrierIndependentCatalogSelection ? { ...payload, extraServices: undefined } : payload,
        validatedRequestedServices,
      );
    } else if (supportsCarrierIndependentCatalogSelection
      ? this.normalizeCustomExtraServiceIds(payload.customExtraServices, payload.customExtraServiceIds).length > 0
      : this.hasLooseExtraServicePayload(payload)) {
      throw new ValidationError('Seçilen ek hizmet bu nakliyeci tarafından sunulmuyor.');
    }

    await this.resolveValidatedCustomExtraServices(
      validatedRequestedServices.customServiceIds,
      extraServiceLoadType,
    );

    const shipment = await this.shipmentRepository.createShipmentRecord({
      customerId,
      originCity,
      originDistrict: originDistrict || null,
      originPlaceType: this.normalizePlaceType(payload.originPlaceType),
      originFloor: payload.originFloor ?? null,
      originHasElevator: payload.originHasElevator ?? false,
      originAccessDistance: payload.originAccessDistance as AccessDistance ?? null,
      destinationCity,
      destinationDistrict: destinationDistrict || null,
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
      dateFlexibility: this.normalizeDateFlexibility(payload.dateFlexibility),
      weight: payload.weight,
      estimatedWeight: payload.estimatedWeight ?? null,
      shipmentDate: new Date(payload.shipmentDate),
      price: payload.price,
      note: payload.note,
      vehicleTypePreferenceId: payload.vehicleTypePreferenceId ?? null,
      contactPhone: payload.contactPhone ?? null,
      photoUrls: this.normalizeShipmentPhotoUrls(payload.photoUrls) ?? [],
      status: ShipmentStatus.PENDING
    });

    shipment.extraServices = await this.applyShipmentExtraServices(
      shipment.id,
      supportsCarrierIndependentCatalogSelection
        ? resolvedCatalogServices.map((service) => service.id)
        : validatedRequestedServices.catalogServiceIds,
      extraServiceLoadType,
    ) as any;
    const customExtraServices = await this.applyShipmentCustomExtraServices(
      shipment.id,
      validatedRequestedServices.customServiceIds,
      undefined,
      extraServiceLoadType,
    );
    (shipment as any).customExtraServices = customExtraServices;

    // Fire-and-forget: notify eligible carriers about the new shipment
    this.notifyEligibleCarriers(shipment).catch(err =>
      console.error('[ShipmentService] notifyEligibleCarriers error:', err)
    );

    return this.exposeShipmentPhotos(this.flattenExtraServices(shipment), true);
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

    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);

    const { items } = await this.carrierRepository.searchCarriers({
      serviceCity: originCity,
      scopeIds,
      serviceTypeIds,
      loadTypes: loadType ? [loadType] : [],
      availableDate: this.formatDateForCarrierSearch(shipment.shipmentDate),
      availableDates: this.buildCarrierSearchDateWindow(shipment.shipmentDate, shipment.dateFlexibility),
      availabilityTimeFilter: this.parseCarrierSearchTimePreference(shipment.timePreference),
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

  private formatDateForCarrierSearch(date: Date | string): string {
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  private buildCarrierSearchDateWindow(date: Date | string, flexibility?: DateFlexibility | null): string[] {
    const center = this.formatDateForCarrierSearch(date);
    const flexDays = flexibility === DateFlexibility.PLUS_MINUS_1_DAY
      ? 1
      : flexibility === DateFlexibility.PLUS_MINUS_3_DAYS ? 3 : 0;
    if (flexDays === 0) return [center];

    const dates: string[] = [];
    const base = new Date(center + 'T12:00:00Z');
    for (let offset = -flexDays; offset <= flexDays; offset++) {
      const next = new Date(base);
      next.setUTCDate(next.getUTCDate() + offset);
      dates.push(next.toISOString().slice(0, 10));
    }
    return dates;
  }

  private parseCarrierSearchTimePreference(timePreference?: string | null) {
    const normalized = String(timePreference ?? '').trim().toLocaleLowerCase('tr-TR');
    const toSeconds = (time: string, isEndTime = false) => {
      const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
      if (!match) return Number.NaN;
      const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
      return isEndTime && seconds === 0 ? 24 * 3600 : seconds;
    };

    if (!normalized || normalized === 'farketmez' || normalized === 'esnek') return undefined;
    if (normalized === 'sabah') {
      return { mode: 'overlap' as const, startSeconds: toSeconds('08:00'), endSeconds: toSeconds('17:00') };
    }
    if (normalized === 'aksam' || normalized === 'akşam') {
      return { mode: 'overlap' as const, startSeconds: toSeconds('17:00'), endSeconds: toSeconds('00:00', true) };
    }
    if (normalized.startsWith('belirli:')) {
      const selectedSeconds = toSeconds(normalized.slice('belirli:'.length));
      return Number.isFinite(selectedSeconds)
        ? { mode: 'contains' as const, startSeconds: selectedSeconds, endSeconds: selectedSeconds }
        : undefined;
    }
    return undefined;
  }

  async getMyShipments(customerId: string): Promise<Array<Shipment & { offerCount: number }>> {
    await this.expireStale();

    const shipments = await this.shipmentRepository.findByCustomerIdWithOfferCount(customerId);
    return shipments.map(shipment => {
      const normalized = this.flattenExtraServices(shipment as Shipment & { offerCount: number });
      return this.attachShipmentConverterSummary(this.exposeShipmentPhotos(normalized as Shipment & { offerCount: number }, true));
    });
  }

  async getShipmentById(
    shipmentId: string,
    requestingUserId: string,
    requestingUserType: 'customer' | 'carrier' | 'admin'
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdWithOffers(shipmentId);

    if (!shipment) {
      throw new NotFoundError('TaÅŸÄ±ma talebi bulunamadÄ±.');
    }

    this.flattenExtraServices(shipment);

    // Admin her gÃ¶nderiyi gÃ¶rebilir
    if (requestingUserType === 'admin') {
      return this.attachShipmentConverterSummary(this.exposeShipmentPhotos(this.flattenExtraServices(shipment), true));
    }

    // MÃ¼ÅŸteri: sadece kendi gÃ¶nderisini gÃ¶rebilir
    if (requestingUserType === 'customer') {
      if (shipment.customerId !== requestingUserId) {
        throw new ForbiddenError('Bu gÃ¶nderiye eriÅŸim yetkiniz yok.');
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
      return this.attachShipmentConverterSummary(this.exposeShipmentPhotos(this.flattenExtraServices(shipment), true));
    }

    // A) ShipmentService.getById() â€” requester tipine gÃ¶re maskeleme:
    if (requestingUserType === 'carrier') {
      const isAssigned = shipment.carrierId === requestingUserId;
      if (!isAssigned) {
        throw new ForbiddenError('Bu gönderiye erişim yetkiniz yok.');
      }
      const canViewDetails = isAssigned && this.platformPolicy.shouldRevealDirectContact(shipment, 'carrier', requestingUserId);
      const canViewOpenAddress = isAssigned && shipment.status === ShipmentStatus.IN_TRANSIT;

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

      // ANTI-DISINTERMEDIATION: contactPhone ve aÃ§Ä±k adres maskesi â€” atanmamÄ±ÅŸ carrier gÃ¶remez
      if (!canViewDetails) {
        shipment.contactPhone = null as any;
      }
      this.maskOpenAddressForCarrier(shipment, canViewOpenAddress);
      this.maskOfferCarriers(shipment);
      if (shipment.carrier) {
        this.maskCarrierDirectContact(shipment.carrier);
      }

      return this.attachShipmentConverterSummary(
        this.exposeShipmentPhotos(this.flattenExtraServices(shipment, requestingUserId), isAssigned),
      );
    }

    throw new ForbiddenError('Bu gÃ¶nderiye eriÅŸim yetkiniz yok.');
  }

  async updateShipment(customerId: string, shipmentId: string, payload: UpdateShipmentPayload): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findByIdAndCustomerId(shipmentId, customerId);
    if (!shipment) {
      throw new NotFoundError('TaÅŸÄ±ma talebi bulunamadÄ±.');
    }

    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new ValidationError('Sadece bekleyen taÅŸÄ±ma talepleri gÃ¼ncellenebilir.');
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

    const hasExtraServicesField = Object.prototype.hasOwnProperty.call(payload, 'extraServices');
    const updateResult = await AppDataSource.manager.transaction(async (manager) => {
      const lockedShipment = await manager
        .createQueryBuilder(Shipment, 'shipment')
        .setLock('pessimistic_write')
        .where('shipment.id = :shipmentId', { shipmentId })
        .andWhere('shipment.customerId = :customerId', { customerId })
        .getOne();
      if (!lockedShipment) {
        throw new NotFoundError('Taşıma talebi bulunamadı.');
      }
      if (lockedShipment.status !== ShipmentStatus.PENDING) {
        throw new ValidationError('Sadece bekleyen taşıma talepleri güncellenebilir.');
      }

      const shipmentWithExtraServices = await manager.getRepository(Shipment).findOne({
        where: { id: shipmentId, customerId },
        relations: ['extraServices', 'customExtraServices'],
      });
      if (!shipmentWithExtraServices) {
        throw new NotFoundError('Taşıma talebi bulunamadı.');
      }

      const normalizedShipmentCategory = (payload.shipmentCategory as ShipmentCategory | undefined)
        ?? shipmentWithExtraServices.shipmentCategory
        ?? inferShipmentCategoryFromTransportType(payload.transportType)
        ?? null;
      const isLegacyStorageTarget = normalizedShipmentCategory === ShipmentCategory.STORAGE;
      const extraServiceLoadType = isLegacyStorageTarget
        ? ExtraServiceLoadType.STORAGE
        : this.resolveExtraServiceLoadType(
            normalizedShipmentCategory,
            payload.transportType,
            payload.loadType,
          );
      const supportsCurrentCatalogSelection = normalizedShipmentCategory === ShipmentCategory.HOME_MOVE
        || normalizedShipmentCategory === ShipmentCategory.OFFICE_MOVE
        || normalizedShipmentCategory === ShipmentCategory.PARTIAL_ITEM;
      const categoryChanged = normalizedShipmentCategory !== shipmentWithExtraServices.shipmentCategory;
      const shouldReconcileExtraServices = hasExtraServicesField
        || (categoryChanged && (supportsCurrentCatalogSelection || isLegacyStorageTarget));
      const requestedExtraServices = hasExtraServicesField
        ? payload.extraServices
        : shipmentWithExtraServices.extraServices.map((service) => service.id);
      const validatedExtraServices = shouldReconcileExtraServices
        ? await this.resolveValidatedExtraServices(requestedExtraServices, extraServiceLoadType, manager)
        : undefined;

      await manager.getRepository(Shipment).update(shipmentId, {
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
        dateFlexibility: payload.dateFlexibility ? this.normalizeDateFlexibility(payload.dateFlexibility) : undefined,
        weight: payload.weight,
        estimatedWeight: payload.estimatedWeight,
        shipmentDate: payload.shipmentDate ? new Date(payload.shipmentDate) : undefined,
        price: payload.price,
        vehicleTypePreferenceId: payload.vehicleTypePreferenceId,
        photoUrls: payload.photoUrls !== undefined ? this.normalizeShipmentPhotoUrls(payload.photoUrls) : undefined,
      });

      if (shouldReconcileExtraServices) {
        await this.applyShipmentExtraServices(
          shipmentId,
          requestedExtraServices,
          extraServiceLoadType,
          manager,
          validatedExtraServices,
        );
      }

      const updatedShipment = await manager.getRepository(Shipment).findOne({
        where: { id: shipmentId, customerId },
        relations: ['extraServices', 'customExtraServices'],
      });
      if (!updatedShipment) {
        throw new ValidationError('Taşıma talebi güncellenemedi.');
      }

      return { updatedShipment, extraServiceLoadType };
    });
    const { updatedShipment, extraServiceLoadType } = updateResult;

    if (payload.customExtraServices !== undefined || payload.customExtraServiceIds !== undefined) {
      (updatedShipment as any).customExtraServices = await this.applyShipmentCustomExtraServices(
        shipmentId,
        payload.customExtraServices,
        payload.customExtraServiceIds,
        extraServiceLoadType,
      );
      this.flattenExtraServices(updatedShipment as Shipment);
    }

    return this.exposeShipmentPhotos(this.flattenExtraServices(updatedShipment), true);
  }

  async cancel(customerId: string, shipmentId: string, reason?: string, note?: string): Promise<Shipment> {
    const fullReason = note ? `${reason} (${note})` : reason;

    const { cancelledShipment, originalShipment, notifyCarrierId, shouldCreateCooldown } =
      await AppDataSource.manager.transaction(async (manager) => {
        const shipment = await manager
          .createQueryBuilder(Shipment, 'shipment')
          .setLock('pessimistic_write')
          .select([
            'shipment.id',
            'shipment.customerId',
            'shipment.carrierId',
            'shipment.status',
            'shipment.cancellationReason',
            'shipment.matchedAt',
            'shipment.createdAt',
            'shipment.updatedAt',
          ])
          .where('shipment.id = :shipmentId', { shipmentId })
          .andWhere('shipment.customerId = :customerId', { customerId })
          .getOne();

        if (!shipment) {
          throw new NotFoundError('Taşıma talebi bulunamadı.');
        }

        this.ensureStatusTransition(shipment.status, ShipmentStatus.CANCELLED);

        const originalShipment = { ...shipment } as Shipment;
        const shouldCreateCooldown = this.platformPolicy.shouldCreateCancellationCooldown(originalShipment, fullReason);
        const notifyCarrierId = shipment.status === ShipmentStatus.MATCHED ? shipment.carrierId : null;

        if (shipment.status === ShipmentStatus.MATCHED && shipment.carrierId) {
          await manager
            .createQueryBuilder()
            .update(Offer)
            .set({ status: OfferStatus.CANCELLED })
            .where('shipmentId = :shipmentId', { shipmentId: shipment.id })
            .andWhere('status = :accepted', { accepted: OfferStatus.ACCEPTED })
            .execute();

          await manager
            .createQueryBuilder()
            .update(Carrier)
            .set({
              cancelledShipments: () => 'cancelledShipments + 1',
              acceptedOffers: () => 'GREATEST(acceptedOffers - 1, 0)',
            })
            .where('id = :carrierId', { carrierId: shipment.carrierId })
            .execute();

          await manager
            .createQueryBuilder()
            .update(Carrier)
            .set({
              successRate: () => 'CASE WHEN acceptedOffers > 0 THEN ROUND((completedShipments / acceptedOffers) * 100, 2) ELSE 0 END',
            })
            .where('id = :carrierId', { carrierId: shipment.carrierId })
            .execute();
        }

        // If IN_TRANSIT cancellation is allowed in the future, decrement carrier_stats.activeJobs here.
        shipment.status = ShipmentStatus.CANCELLED;
        shipment.cancellationReason = fullReason || null;
        await manager.update(Shipment, { id: shipmentId }, {
          status: ShipmentStatus.CANCELLED,
          cancellationReason: fullReason || null,
        });

        return {
          cancelledShipment: shipment,
          originalShipment,
          notifyCarrierId,
          shouldCreateCooldown,
        };
      });

    if (notifyCarrierId) {
      this.notificationService.createNotification(
        notifyCarrierId,
        'carrier',
        'SHIPMENT_CANCELLED',
        'Taşıma İptal Edildi',
        `Kabul ettiğiniz taşıma müşteri tarafından iptal edildi.${fullReason ? ` Sebep: ${fullReason}` : ''}`,
        shipmentId
      ).catch(() => { });
    }

    if (shouldCreateCooldown) {
      await this.platformPolicy.createCancellationCooldown(originalShipment, fullReason).catch(() => { });
    }

    return cancelledShipment;
  }
  async startShipmentByCarrier(carrierId: string, shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('TaÅŸÄ±ma talebi bulunamadÄ±.');
    }

    if (shipment.carrierId !== carrierId) {
      throw new ForbiddenError('Bu taÅŸÄ±ma talebini baÅŸlatma yetkiniz yok.');
    }

    this.ensureStatusTransition(shipment.status, ShipmentStatus.IN_TRANSIT);

    const transitioned = await this.shipmentRepository.transitionStatusIfCurrent(
      shipmentId,
      shipment.status,
      ShipmentStatus.IN_TRANSIT
    );

    if (!transitioned) {
      throw new ValidationError('TaÅŸÄ±ma durumu deÄŸiÅŸtirilemedi. LÃ¼tfen tekrar deneyin.');
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
    } catch { /* bildirim hatasÄ± taÅŸÄ±mayÄ± etkilemesin */ }

    return updatedShipment;
  }

  async completeShipmentByCarrier(carrierId: string, shipmentId: string): Promise<Shipment> {
    const updatedShipment = await AppDataSource.manager.transaction(async (manager) => {
      const shipment = await manager
        .createQueryBuilder(Shipment, 'shipment')
        .setLock('pessimistic_write')
        .select([
          'shipment.id',
          'shipment.customerId',
          'shipment.carrierId',
          'shipment.status',
          'shipment.price',
        ])
        .where('shipment.id = :shipmentId', { shipmentId })
        .getOne();
      if (!shipment) {
        throw new NotFoundError('TaÅŸÄ±ma talebi bulunamadÄ±.');
      }

      if (shipment.carrierId !== carrierId) {
        throw new ForbiddenError('Bu taÅŸÄ±ma talebini tamamlama yetkiniz yok.');
      }

      this.ensureStatusTransition(shipment.status, ShipmentStatus.COMPLETED);

      shipment.status = ShipmentStatus.COMPLETED;
      await manager.update(Shipment, { id: shipmentId }, { status: ShipmentStatus.COMPLETED });
      const savedShipment = shipment;

      await manager
        .createQueryBuilder()
        .update(Carrier)
        .set({ completedShipments: () => 'completedShipments + 1' })
        .where('id = :carrierId', { carrierId })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Carrier)
        .set({
          successRate: () => 'CASE WHEN acceptedOffers > 0 THEN ROUND((completedShipments / acceptedOffers) * 100, 2) ELSE 0 END',
        })
        .where('id = :carrierId', { carrierId })
        .execute();

      await manager
        .createQueryBuilder()
        .insert()
        .into(CarrierStats)
        .values({ carrierId })
        .orIgnore()
        .execute();

      await manager
        .createQueryBuilder()
        .update(CarrierStats)
        .set({
          totalJobs: () => 'GREATEST(totalJobs + 1, 0)',
          activeJobs: () => 'GREATEST(activeJobs - 1, 0)',
        })
        .where('carrierId = :carrierId', { carrierId })
        .execute();

      const updatedShipment = savedShipment;
      if (updatedShipment.price && Number(updatedShipment.price) > 0) {
        const gross = Number(updatedShipment.price);
        const { netAmount } = await this.platformPolicy.computeCommission(gross, manager);

        const log = manager.create(CarrierEarningsLog, {
          carrierId,
          shipmentId,
          amount: netAmount,
        });
        await manager.save(CarrierEarningsLog, log);

        await manager
          .createQueryBuilder()
          .update(CarrierStats)
          .set({ totalEarnings: () => `totalEarnings + (${netAmount})` })
          .where('carrierId = :carrierId', { carrierId })
          .execute();
      }

      return updatedShipment;
    });

    // CustomerCarrierRelation gÃ¼ncelle
    if (updatedShipment.carrierId && updatedShipment.customerId) {
      try {
        await CustomerCarrierRelationRepository.upsertRelation(
          updatedShipment.customerId,
          updatedShipment.carrierId,
          shipmentId
        );
      } catch { /* relation hatasÄ± taÅŸÄ±mayÄ± etkilemesin */ }
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
    } catch { /* bildirim hatasÄ± taÅŸÄ±mayÄ± etkilemesin */ }

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
      .leftJoinAndSelect('shipment.extraServices', 'extraServices')
      .leftJoinAndSelect('shipment.customExtraServices', 'customExtraServices');

    if (origin) qb.andWhere('(shipment.originCity LIKE :origin OR shipment.originDistrict LIKE :origin)', { origin: `%${origin}%` });
    if (destination) qb.andWhere('(shipment.destinationCity LIKE :destination OR shipment.destinationDistrict LIKE :destination)', { destination: `%${destination}%` });
    if (status) qb.andWhere('shipment.status = :status', { status });
    if (loadType) qb.andWhere('shipment.loadDetails LIKE :loadType', { loadType: `%${loadType}%` });

    qb.orderBy('shipment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [shipments, total] = await qb.getManyAndCount();

    // ANTI-DISINTERMEDIATION: Arama sonuÃ§larÄ±nda PII maskeleme
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

}
