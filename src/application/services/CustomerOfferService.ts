import { In } from 'typeorm';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CustomerPreference, DefaultOfferSort } from '../../domain/entities/CustomerPreference';
import { CarrierDocument, CarrierDocumentType } from '../../domain/entities/CarrierDocument';
import { CarrierVehicle } from '../../domain/entities/CarrierVehicle';
import { Review } from '../../domain/entities/Review';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { getCarrierEligibility } from './carrier/carrierEligibility';
import { inferExtraServiceLoadTypeFromShipmentCategory } from './extra-services/extraServiceApplicability';
import { analyzeContactInfo } from '../../utils/security';

interface ExtraServiceCompatibility {
  requestedCount: number;
  matchedCount: number;
  missing: string[];
  isFullyCompatible: boolean;
}

interface CapacityFit {
  status: 'fit' | 'uncertain' | 'low_possible';
  shipmentWeightKg: number | null;
  shipmentVolumeM3: number | null;
  vehicleCapacityKg: number | null;
  vehicleCapacityM3: number | null;
}

interface CarrierOfferInsights {
  ratingCount: number;
  hasInsurance: boolean;
  latestReview: { comment: string; rating: number } | null;
  primaryVehicle: {
    vehicleType: string | null;
    vehicleBrand: string | null;
    vehicleModel: string | null;
    vehicleCapacityKg: number | null;
    vehicleCapacityM3: number | null;
  };
}

export class CustomerOfferService {
  private offerRepository = new OfferRepository();

  async getMyOffers(customerId: string, shipmentId?: string): Promise<any[]> {
    let preferVerified = false;
    let defaultSort = DefaultOfferSort.RATING_DESC;
    try {
      const prefRepo = AppDataSource.getRepository(CustomerPreference);
      const preference = await prefRepo.findOne({ where: { customerId } });
      preferVerified = preference?.preferVerifiedCarriers ?? false;
      defaultSort = (preference?.defaultOfferSort as DefaultOfferSort) ?? DefaultOfferSort.RATING_DESC;
    } catch {
      preferVerified = false;
      defaultSort = DefaultOfferSort.RATING_DESC;
    }

    let rawOffers = await this.offerRepository.findByCustomerShipments(customerId, shipmentId) || [];
    const insights = await this.getCarrierInsights(rawOffers.map(offer => offer.carrierId));
    const compatibilityByOfferId = await this.getExtraServiceCompatibility(rawOffers);

    if (preferVerified) {
      rawOffers = rawOffers.filter(offer => offer.carrier?.verifiedByAdmin === true);
    }

    const shipmentGroups: Record<string, Offer[]> = {};
    rawOffers.forEach(offer => {
      if (!shipmentGroups[offer.shipmentId]) {
        shipmentGroups[offer.shipmentId] = [];
      }
      shipmentGroups[offer.shipmentId].push(offer);
    });

    const decoratedOffers: any[] = [];

    Object.keys(shipmentGroups).forEach(shipmentId => {
      const group = shipmentGroups[shipmentId];
      const pendingOffers = group.filter(o => o.status === OfferStatus.PENDING);

      let minPrice = Infinity;
      let maxRating = -1;

      pendingOffers.forEach(o => {
        const price = Number(o.price);
        if (price < minPrice) minPrice = price;

        const rating = o.carrier?.rating || 0;
        if (rating > maxRating) maxRating = rating;
      });

      group.forEach(offer => {
        const isPending = offer.status === OfferStatus.PENDING;
        const isLowestPrice = isPending && Number(offer.price) === minPrice;
        const isHighestRating = isPending && (offer.carrier?.rating || 0) === maxRating && maxRating > 0;
        const carrierInsights = insights.get(offer.carrierId) ?? this.emptyCarrierInsights();
        const isVerified = Boolean(offer.carrier?.verifiedByAdmin);
        const carrierEligibility = getCarrierEligibility(offer.carrier ?? null);
        const compatibility = compatibilityByOfferId.get(offer.id) ?? {
          requestedCount: 0,
          matchedCount: 0,
          missing: [],
          isFullyCompatible: true,
        };
        const capacityFit = this.getCapacityFit(offer, carrierInsights);

        const carrier = offer.carrier
          ? {
              id: offer.carrier.id,
              displayName: this.buildCarrierDisplayName(offer.carrier.companyName, offer.carrier.contactName),
              companyName: offer.carrier.companyName,
              contactName: offer.carrier.contactName,
              pictureUrl: offer.carrier.pictureUrl,
              rating: Number(offer.carrier.rating || 0),
              ratingCount: carrierInsights.ratingCount,
              completedShipments: Number(offer.carrier.completedShipments || 0),
              isVerified,
              isActive: Boolean(offer.carrier.isActive),
              verifiedByAdmin: Boolean(offer.carrier.verifiedByAdmin),
              approvalState: offer.carrier.approvalState,
              hasInsurance: carrierInsights.hasInsurance,
              activityCity: offer.carrier.activityCity,
              averageResponseTimeMin: this.estimateResponseTimeMin(offer.carrier.totalOffers, offer.carrier.completedShipments),
              localnessLabel: this.buildLocalnessLabel((offer.shipment as any)?.originCity, offer.carrier.activityCity),
              latestReview: carrierInsights.latestReview,
              latestPositiveReview: carrierInsights.latestReview && carrierInsights.latestReview.rating >= 4
                ? carrierInsights.latestReview
                : null,
              ...carrierInsights.primaryVehicle,
            }
          : null;

        const sanitizedOfferMessage = this.redactContactText(offer.message);
        const sanitizedLatestReview = carrier?.latestReview
          ? {
              ...carrier.latestReview,
              comment: this.redactContactText(carrier.latestReview.comment) ?? '',
            }
          : null;
        const sanitizedLatestPositiveReview = carrier?.latestPositiveReview
          ? {
              ...carrier.latestPositiveReview,
              comment: this.redactContactText(carrier.latestPositiveReview.comment) ?? '',
            }
          : null;

        if (carrier) {
          carrier.latestReview = sanitizedLatestReview;
          carrier.latestPositiveReview = sanitizedLatestPositiveReview;
        }

        decoratedOffers.push({
          ...offer,
          message: sanitizedOfferMessage,
          carrier,
          carrierEligibility,
          currency: 'TRY',
          createdAt: offer.offeredAt,
          trustSignals: {
            isVerified,
            hasInsurance: carrierInsights.hasInsurance,
            completedShipments: Number(offer.carrier?.completedShipments || 0),
            ratingCount: carrierInsights.ratingCount,
          },
          isLowestPrice,
          isHighestRating,
          isRecommended: (isLowestPrice && isHighestRating) || isHighestRating || (isLowestPrice && isVerified),
          extraServiceCompatibility: compatibility,
          capacityFit,
        });
      });
    });

    switch (defaultSort) {
      case DefaultOfferSort.PRICE_ASC:
        decoratedOffers.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case DefaultOfferSort.RATING_DESC:
        decoratedOffers.sort((a, b) => (b.carrier?.rating || 0) - (a.carrier?.rating || 0));
        break;
      case DefaultOfferSort.BALANCED:
        decoratedOffers.sort((a, b) => {
          const ratingDiff = (b.carrier?.rating || 0) - (a.carrier?.rating || 0);
          return ratingDiff !== 0 ? ratingDiff : Number(a.price) - Number(b.price);
        });
        break;
      default:
        decoratedOffers.sort((a, b) => new Date(b.offeredAt).getTime() - new Date(a.offeredAt).getTime());
        break;
    }

    return decoratedOffers;
  }

  async getOffersByCustomerId(customerId: string): Promise<any[]> {
    return this.getMyOffers(customerId);
  }

  private async getExtraServiceCompatibility(offers: Offer[]): Promise<Map<string, ExtraServiceCompatibility>> {
    const map = new Map<string, ExtraServiceCompatibility>();
    if (!offers.length) return map;

    const carrierIds = Array.from(new Set(offers.map((offer) => offer.carrierId).filter(Boolean)));
    const capabilities = await AppDataSource.getRepository(CarrierExtraServiceCapability).find({
      where: { carrierId: In(carrierIds), isActive: true },
      relations: ['extraService'],
    });

    const capabilityMap = new Map<string, Set<string>>();
    capabilities.forEach((capability) => {
      const key = `${capability.carrierId}:${capability.loadType}`;
      if (!capabilityMap.has(key)) capabilityMap.set(key, new Set<string>());
      capabilityMap.get(key)!.add(capability.extraService?.name || capability.extraServiceId);

      const fallbackKey = `${capability.carrierId}:ALL`;
      if (!capabilityMap.has(fallbackKey)) capabilityMap.set(fallbackKey, new Set<string>());
      capabilityMap.get(fallbackKey)!.add(capability.extraService?.name || capability.extraServiceId);
    });

    offers.forEach((offer) => {
      const shipment = (offer as any).shipment;
      const requestedNames: string[] = Array.isArray(shipment?.extraServices)
        ? shipment.extraServices
            .map((service: any) => service?.name || service?.id)
            .filter(Boolean)
        : [];

      if (!requestedNames.length) {
        map.set(offer.id, {
          requestedCount: 0,
          matchedCount: 0,
          missing: [],
          isFullyCompatible: true,
        });
        return;
      }

      const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment?.shipmentCategory);
      const scopedKey = `${offer.carrierId}:${loadType ?? 'ALL'}`;
      const fallbackKey = `${offer.carrierId}:ALL`;
      const carrierCapabilities = capabilityMap.get(scopedKey) ?? capabilityMap.get(fallbackKey) ?? new Set<string>();

      const missing = requestedNames.filter((name) => !carrierCapabilities.has(name));
      const matchedCount = requestedNames.length - missing.length;
      map.set(offer.id, {
        requestedCount: requestedNames.length,
        matchedCount,
        missing,
        isFullyCompatible: missing.length === 0,
      });
    });

    return map;
  }

  private getCapacityFit(offer: Offer, insights: CarrierOfferInsights): CapacityFit {
    const shipment = (offer as any).shipment;
    const shipmentWeight = shipment?.estimatedWeight != null
      ? Number(shipment.estimatedWeight)
      : shipment?.weight != null
        ? Number(shipment.weight)
        : null;
    const shipmentVolume = shipment?.converterEstimatedVolumeMax != null
      ? Number(shipment.converterEstimatedVolumeMax)
      : null;
    const vehicleCapacityKg = insights.primaryVehicle.vehicleCapacityKg ?? null;
    const vehicleCapacityM3 = insights.primaryVehicle.vehicleCapacityM3 ?? null;

    if (shipmentWeight && shipmentWeight > 0 && vehicleCapacityKg && vehicleCapacityKg > 0) {
      return {
        status: vehicleCapacityKg >= shipmentWeight ? 'fit' : 'low_possible',
        shipmentWeightKg: shipmentWeight,
        shipmentVolumeM3: shipmentVolume,
        vehicleCapacityKg,
        vehicleCapacityM3,
      };
    }

    if (shipmentVolume && shipmentVolume > 0 && vehicleCapacityM3 && vehicleCapacityM3 > 0) {
      return {
        status: vehicleCapacityM3 >= shipmentVolume ? 'fit' : 'low_possible',
        shipmentWeightKg: shipmentWeight,
        shipmentVolumeM3: shipmentVolume,
        vehicleCapacityKg,
        vehicleCapacityM3,
      };
    }

    return {
      status: 'uncertain',
      shipmentWeightKg: shipmentWeight,
      shipmentVolumeM3: shipmentVolume,
      vehicleCapacityKg,
      vehicleCapacityM3,
    };
  }

  private redactContactText(text?: string | null): string | undefined {
    if (!text?.trim()) return undefined;
    const analysis = analyzeContactInfo(text);
    if (!analysis.hasContactInfo) return text;
    return 'Icerik guvenlik nedeniyle gizlendi.';
  }

  private async getCarrierInsights(carrierIds: string[]): Promise<Map<string, CarrierOfferInsights>> {
    const uniqueIds = Array.from(new Set(carrierIds.filter(Boolean)));
    const result = new Map<string, CarrierOfferInsights>();
    uniqueIds.forEach(id => result.set(id, this.emptyCarrierInsights()));
    if (!uniqueIds.length) return result;

    const [documents, vehicles, reviews] = await Promise.all([
      AppDataSource.getRepository(CarrierDocument).find({
        where: { carrierId: In(uniqueIds), isApproved: true },
      }),
      AppDataSource.getRepository(CarrierVehicle).find({
        where: { carrierId: In(uniqueIds), isActive: true },
        relations: ['vehicleType'],
      }),
      AppDataSource.getRepository(Review).find({
        where: { carrierId: In(uniqueIds) },
        order: { createdAt: 'DESC' },
      }),
    ]);

    documents.forEach(document => {
      const current = result.get(document.carrierId) ?? this.emptyCarrierInsights();
      if (document.type === CarrierDocumentType.INSURANCE_POLICY) {
        current.hasInsurance = true;
      }
      result.set(document.carrierId, current);
    });

    vehicles.forEach(vehicle => {
      const current = result.get(vehicle.carrierId) ?? this.emptyCarrierInsights();
      const currentCapacity = current.primaryVehicle.vehicleCapacityKg ?? -1;
      if (Number(vehicle.capacityKg || 0) >= currentCapacity) {
        current.primaryVehicle = {
          vehicleType: vehicle.vehicleType?.name ?? null,
          vehicleBrand: vehicle.brand ?? null,
          vehicleModel: vehicle.model ?? null,
          vehicleCapacityKg: Number(vehicle.capacityKg || 0) || null,
          vehicleCapacityM3: vehicle.capacityM3 == null ? null : Number(vehicle.capacityM3),
        };
      }
      result.set(vehicle.carrierId, current);
    });

    reviews.forEach(review => {
      const current = result.get(review.carrierId) ?? this.emptyCarrierInsights();
      current.ratingCount += 1;
      if (!current.latestReview && review.comment?.trim()) {
        current.latestReview = {
          comment: review.comment.trim(),
          rating: review.rating,
        };
      }
      result.set(review.carrierId, current);
    });

    return result;
  }

  private emptyCarrierInsights(): CarrierOfferInsights {
    return {
      ratingCount: 0,
      hasInsurance: false,
      latestReview: null,
      primaryVehicle: {
        vehicleType: null,
        vehicleBrand: null,
        vehicleModel: null,
        vehicleCapacityKg: null,
        vehicleCapacityM3: null,
      },
    };
  }

  private buildCarrierDisplayName(companyName?: string | null, contactName?: string | null): string {
    if (companyName?.trim()) return companyName.trim();
    if (!contactName?.trim()) return 'Nakliyeci';

    const [firstName, lastName] = contactName.trim().split(/\s+/);
    return lastName ? `${firstName} ${lastName.charAt(0).toUpperCase()}.` : firstName;
  }

  private estimateResponseTimeMin(totalOffers?: number, completedShipments?: number): number | null {
    const offers = Number(totalOffers || 0);
    const completed = Number(completedShipments || 0);
    if (offers < 5) return null;
    if (completed >= 50) return 45;
    if (completed >= 15) return 90;
    return 180;
  }

  private buildLocalnessLabel(originCity?: string | null, activityCity?: string | null): string | null {
    if (!originCity || !activityCity) return null;
    return originCity.toLocaleLowerCase('tr-TR') === activityCity.toLocaleLowerCase('tr-TR')
      ? 'Ayni sehirde'
      : `${activityCity} merkezli`;
  }
}
