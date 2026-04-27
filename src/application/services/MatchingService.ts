import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { inferExtraServiceLoadTypeFromShipmentCategory } from './extra-services/extraServiceApplicability';
import { Shipment } from '../../domain/entities/Shipment';
import { AppDataSource } from '../../infrastructure/database/data-source';

const SCOPE_INTRA_CITY = 'Şehir İçi';
const SCOPE_INTERCITY = 'Şehirler Arası';
const TURKEY_TIME_ZONE = 'Europe/Istanbul';

type MatchFailureReason =
  | 'carrier_not_found'
  | 'carrier_inactive'
  | 'carrier_unverified'
  | 'carrier_not_approved'
  | 'scope_mismatch'
  | 'city_mismatch'
  | 'load_type_mismatch'
  | 'extra_service_mismatch'
  | 'vehicle_type_mismatch'
  | 'availability_mismatch';

export class MatchingService {
  async getCarrierForMatching(carrierId: string): Promise<Carrier | null> {
    return AppDataSource.getRepository(Carrier).findOne({
      where: { id: carrierId },
      relations: [
        'activity',
        'scopeLinks',
        'scopeLinks.scope',
        'loadTypeCapabilities',
        'extraServiceCapabilities',
        'vehicleTypeLinks',
        'vehicleTypeLinks.vehicleType',
      ],
    });
  }

  isShipmentMatchingCarrier(shipment: Shipment, carrier: Carrier | null): boolean {
    const failureReason = this.getMismatchReason(shipment, carrier);
    if (failureReason) {
      this.logMismatch(shipment?.id, carrier?.id, failureReason);
      return false;
    }
    return true;
  }

  async getMatchingCarrierCount(shipmentId: string): Promise<number> {
    const shipment = await AppDataSource.getRepository(Shipment).findOne({
      where: { id: shipmentId },
      relations: ['extraServices'],
    });
    if (!shipment) return 0;

    const carriers = await AppDataSource.getRepository(Carrier).find({
      where: { isActive: true },
      relations: [
        'activity',
        'scopeLinks',
        'scopeLinks.scope',
        'loadTypeCapabilities',
        'extraServiceCapabilities',
        'vehicleTypeLinks',
        'vehicleTypeLinks.vehicleType',
      ],
    });

    return carriers.filter(carrier => this.isShipmentMatchingCarrier(shipment, carrier)).length;
  }

  private getMismatchReason(shipment: Shipment, carrier: Carrier | null): MatchFailureReason | null {
    if (!carrier) return 'carrier_not_found';
    if (!carrier.isActive) return 'carrier_inactive';
    if (!carrier.verifiedByAdmin) return 'carrier_unverified';
    // Legacy fallback: if approvalState is absent, preserve previous behavior.
    if (carrier.approvalState && carrier.approvalState !== CarrierApprovalState.APPROVED) return 'carrier_not_approved';
    if (!this.hasMatchingScope(shipment, carrier)) return 'scope_mismatch';
    if (!this.hasMatchingCity(shipment, carrier)) return 'city_mismatch';
    if (!this.hasMatchingLoadTypeCapability(shipment, carrier)) return 'load_type_mismatch';
    if (!this.hasMatchingExtraServices(shipment, carrier)) return 'extra_service_mismatch';
    if (!this.hasMatchingVehicleType(shipment, carrier)) return 'vehicle_type_mismatch';
    if (!this.isCarrierAvailableForShipmentDate(shipment, carrier)) return 'availability_mismatch';
    return null;
  }

  private hasMatchingScope(shipment: Shipment, carrier: Carrier): boolean {
    const requiredScope = this.getRequiredScopeName(shipment);
    const carrierScopeNames = carrier.scopeLinks
      ?.map(link => link.scope?.name)
      .filter(Boolean) ?? [];

    return carrierScopeNames.includes(requiredScope);
  }

  private getRequiredScopeName(shipment: Shipment): string {
    const originCity = this.normalizeCity(shipment.originCity);
    const destinationCity = this.normalizeCity(shipment.destinationCity);

    if (!originCity || !destinationCity) {
      return SCOPE_INTERCITY;
    }

    if (originCity === destinationCity) {
      return SCOPE_INTRA_CITY;
    }

    return SCOPE_INTERCITY;
  }

  private hasMatchingVehicleType(shipment: Shipment, carrier: Carrier): boolean {
    if (!shipment.vehicleTypePreferenceId) return true;

    return Boolean(
      carrier.vehicleTypeLinks?.some(link => link.vehicleTypeId === shipment.vehicleTypePreferenceId)
    );
  }

  private hasMatchingLoadTypeCapability(shipment: Shipment, carrier: Carrier): boolean {
    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);
    if (!loadType) {
      // LoadType inferredilemediginde mevcut davranisi koru.
      return true;
    }

    return Boolean(
      carrier.loadTypeCapabilities?.some(capability => capability.loadType === loadType && capability.isActive)
    );
  }

  private hasMatchingExtraServices(shipment: Shipment, carrier: Carrier): boolean {
    const requestedExtraServices = Array.isArray((shipment as any).extraServices)
      ? (shipment as any).extraServices
      : [];

    if (requestedExtraServices.length === 0) {
      return true;
    }

    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);
    if (!loadType) {
      // LoadType inferredilemediginde mevcut davranisi koru.
      return true;
    }

    const requestedExtraServiceIds = requestedExtraServices
      .map((service: any) => service?.id)
      .filter((id: any) => Boolean(id));

    if (requestedExtraServiceIds.length === 0) {
      return true;
    }

    const activeCapabilityIds = new Set(
      (carrier.extraServiceCapabilities ?? [])
        .filter((capability: any) => capability?.isActive && capability?.loadType === loadType)
        .map((capability: any) => capability?.extraServiceId)
        .filter((id: any) => Boolean(id))
    );

    // getCarrierForMatching ve getMatchingCarrierCount, extraServiceCapabilities relation'ini yukleyerek
    // bu kontrolun ek DB sorgusu olmadan guvenli calismasini saglar.
    return requestedExtraServiceIds.every((id: string) => activeCapabilityIds.has(id));
  }

  private hasMatchingCity(shipment: Shipment, carrier: Carrier): boolean {
    const requiredScope = this.getRequiredScopeName(shipment);
    if (requiredScope !== SCOPE_INTRA_CITY) {
      return true;
    }

    const carrierCity = this.normalizeCity(carrier.activityCity);
    const shipmentOriginCity = this.normalizeCity(shipment.originCity);

    // Sehir verisi eksikse hard fail yapma; mevcut davranisi koru.
    if (!carrierCity || !shipmentOriginCity) {
      return true;
    }

    return carrierCity === shipmentOriginCity;
  }

  private isCarrierAvailableForShipmentDate(shipment: Shipment, carrier: Carrier): boolean {
    const rawAvailableDates = carrier.activity?.availableDates;
    const availableDates = this.parseAvailableDates(rawAvailableDates);

    if (availableDates.length === 0) {
      return true;
    }

    return availableDates.includes(this.toDateOnly(shipment.shipmentDate));
  }

  private parseAvailableDates(value?: string | string[] | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => String(item)).filter(Boolean);
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private toDateOnly(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: TURKEY_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private normalizeCity(value?: string | null): string {
    const normalized = (value ?? '').trim().toLocaleLowerCase('tr-TR');

    return normalized
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
  }

  private logMismatch(shipmentId: string | undefined, carrierId: string | undefined, reason: MatchFailureReason): void {
    if (process.env.MATCHING_DEBUG !== 'true') return;
    console.debug('[MatchingService] shipment hidden', { shipmentId, carrierId, reason });
  }
}
