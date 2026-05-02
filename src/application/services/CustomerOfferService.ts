import { In } from 'typeorm';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CustomerPreference, DefaultOfferSort } from '../../domain/entities/CustomerPreference';
import { CarrierDocument, CarrierDocumentType } from '../../domain/entities/CarrierDocument';
import { CarrierVehicle } from '../../domain/entities/CarrierVehicle';
import { Review } from '../../domain/entities/Review';
import { CarrierExtraServiceCapability } from '../../domain/entities/CarrierExtraServiceCapability';
import { CarrierLoadTypeCapability } from '../../domain/entities/CarrierLoadTypeCapability';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceLoadType';
import { getCarrierEligibility } from './carrier/carrierEligibility';
import { inferExtraServiceLoadTypeFromShipmentCategory } from './extra-services/extraServiceApplicability';
import { analyzeContactInfo } from '../../utils/security';

interface ExtraServiceCompatibility {
  requestedCount: number;
  matchedCount: number;
  missing: string[];
  isFullyCompatible: boolean;
}

interface MatchDetails {
  loadTypeCompatible: boolean;
  loadType: ExtraServiceLoadType | null;
  extraServicesCovered: number;
  extraServicesTotal: number;
  missingExtraServices: string[];
}

interface CarrierMatchResult {
  extraServiceCompatibility: ExtraServiceCompatibility;
  matchScore: number;
  matchDetails: MatchDetails;
}

interface CalculateOfferMatchScoreInput {
  carrierHasAnyCapability: boolean;
  loadType: ExtraServiceLoadType | null;
  carrierLoadTypes: Set<ExtraServiceLoadType>;
  requestedExtraServices: string[];
  carrierExtraServices: Set<string>;
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

export function calculateOfferMatchScore(input: CalculateOfferMatchScoreInput): CarrierMatchResult {
  const {
    carrierHasAnyCapability,
    loadType,
    carrierLoadTypes,
    requestedExtraServices,
    carrierExtraServices,
  } = input;

  const uniqueRequested = Array.from(new Set(requestedExtraServices.filter(Boolean)));
  if (!carrierHasAnyCapability) {
    return {
      extraServiceCompatibility: {
        requestedCount: uniqueRequested.length,
        matchedCount: 0,
        missing: uniqueRequested,
        isFullyCompatible: uniqueRequested.length === 0,
      },
      matchScore: 0,
      matchDetails: {
        loadTypeCompatible: false,
        loadType,
        extraServicesCovered: 0,
        extraServicesTotal: uniqueRequested.length,
        missingExtraServices: uniqueRequested,
      },
    };
  }

  const loadTypeCompatible = Boolean(loadType && carrierLoadTypes.has(loadType));
  const missingExtraServices = uniqueRequested.filter((name) => !carrierExtraServices.has(name));
  const extraServicesCovered = uniqueRequested.length - missingExtraServices.length;
  const extraServiceMatch = uniqueRequested.length === 0 ? 1 : extraServicesCovered / uniqueRequested.length;
  const loadTypeMatch = loadTypeCompatible ? 1 : 0;

  return {
    extraServiceCompatibility: {
      requestedCount: uniqueRequested.length,
      matchedCount: extraServicesCovered,
      missing: missingExtraServices,
      isFullyCompatible: missingExtraServices.length === 0,
    },
    matchScore: Math.round((loadTypeMatch * 0.6 + extraServiceMatch * 0.4) * 100),
    matchDetails: {
      loadTypeCompatible,
      loadType,
      extraServicesCovered,
      extraServicesTotal: uniqueRequested.length,
      missingExtraServices,
    },
  };
}

export class CustomerOfferService {
  private offerRepository = new OfferRepository();

  async getMyOffers(customerId: string, shipmentId?: string, useCustomerPreferenceSort = false): Promise<any[]> {
    let preferVerified = false;
    let defaultSort: DefaultOfferSort | null = null;
    try {
      const prefRepo = AppDataSource.getRepository(CustomerPreference);
      const preference = await prefRepo.findOne({ where: { customerId } });
      preferVerified = preference?.preferVerifiedCarriers ?? false;
      defaultSort = useCustomerPreferenceSort
        ? (preference?.defaultOfferSort as DefaultOfferSort) ?? DefaultOfferSort.PRICE_ASC
        : null;
    } catch {
      preferVerified = false;
      defaultSort = null;
    }

    let rawOffers = await this.offerRepository.findByCustomerShipments(customerId, shipmentId) || [];
    const insights = await this.getCarrierInsights(rawOffers.map(offer => offer.carrierId));
    const matchByOfferId = await this.getOfferMatchResults(rawOffers);

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
        const match = matchByOfferId.get(offer.id) ?? calculateOfferMatchScore({
          carrierHasAnyCapability: false,
          loadType: inferExtraServiceLoadTypeFromShipmentCategory((offer as any).shipment?.shipmentCategory),
          carrierLoadTypes: new Set<ExtraServiceLoadType>(),
          requestedExtraServices: [],
          carrierExtraServices: new Set<string>(),
        });
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
          extraServiceCompatibility: match.extraServiceCompatibility,
          matchScore: match.matchScore,
          matchDetails: match.matchDetails,
          capacityFit,
        });
      });
    });

    if (defaultSort) {
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
          decoratedOffers.sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0) || Number(a.price) - Number(b.price));
          break;
      }
    } else {
      decoratedOffers.sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0) || Number(a.price) - Number(b.price));
    }

    return decoratedOffers;
  }

  async getOffersByCustomerId(customerId: string): Promise<any[]> {
    return this.getMyOffers(customerId);
  }

  private async getOfferMatchResults(offers: Offer[]): Promise<Map<string, CarrierMatchResult>> {
    const map = new Map<string, CarrierMatchResult>();
    if (!offers.length) return map;

    const carrierIds = Array.from(new Set(offers.map((offer) => offer.carrierId).filter(Boolean)));
    const [loadTypeCapabilities, extraServiceCapabilities] = await Promise.all([
      AppDataSource.getRepository(CarrierLoadTypeCapability).find({
        where: { carrierId: In(carrierIds), isActive: true },
      }),
      AppDataSource.getRepository(CarrierExtraServiceCapability).find({
        where: { carrierId: In(carrierIds), isActive: true },
        relations: ['extraService'],
      }),
    ]);

    const loadTypeMap = new Map<string, Set<ExtraServiceLoadType>>();
    loadTypeCapabilities.forEach((capability) => {
      if (!loadTypeMap.has(capability.carrierId)) loadTypeMap.set(capability.carrierId, new Set<ExtraServiceLoadType>());
      loadTypeMap.get(capability.carrierId)!.add(capability.loadType);
    });

    const extraServiceMap = new Map<string, Set<string>>();
    extraServiceCapabilities.forEach((capability) => {
      const key = `${capability.carrierId}:${capability.loadType}`;
      if (!extraServiceMap.has(key)) extraServiceMap.set(key, new Set<string>());
      extraServiceMap.get(key)!.add(capability.extraService?.name || capability.extraServiceId);

      const fallbackKey = `${capability.carrierId}:ALL`;
      if (!extraServiceMap.has(fallbackKey)) extraServiceMap.set(fallbackKey, new Set<string>());
      extraServiceMap.get(fallbackKey)!.add(capability.extraService?.name || capability.extraServiceId);
    });

    offers.forEach((offer) => {
      const shipment = (offer as any).shipment;
      const requestedNames: string[] = Array.isArray(shipment?.extraServices)
        ? shipment.extraServices
            .map((service: any) => service?.name || service?.id)
            .filter(Boolean)
        : [];

      const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment?.shipmentCategory);
      const scopedKey = `${offer.carrierId}:${loadType ?? 'ALL'}`;
      const fallbackKey = `${offer.carrierId}:ALL`;
      const carrierExtraServices = extraServiceMap.get(scopedKey) ?? extraServiceMap.get(fallbackKey) ?? new Set<string>();
      const carrierLoadTypes = loadTypeMap.get(offer.carrierId) ?? new Set<ExtraServiceLoadType>();
      const carrierHasAnyCapability = carrierLoadTypes.size > 0 || Array.from(extraServiceMap.keys()).some((key) => key.startsWith(`${offer.carrierId}:`));

      map.set(offer.id, calculateOfferMatchScore({
        carrierHasAnyCapability,
        loadType,
        carrierLoadTypes,
        requestedExtraServices: requestedNames,
        carrierExtraServices,
      }));
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
