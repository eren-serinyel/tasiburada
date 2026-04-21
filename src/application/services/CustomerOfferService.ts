import { In } from 'typeorm';
import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CustomerPreference, DefaultOfferSort } from '../../domain/entities/CustomerPreference';
import { CarrierDocument, CarrierDocumentType } from '../../domain/entities/CarrierDocument';
import { CarrierVehicle } from '../../domain/entities/CarrierVehicle';
import { Review } from '../../domain/entities/Review';

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

  async getMyOffers(customerId: string): Promise<any[]> {
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

    let rawOffers = await this.offerRepository.findByCustomerShipments(customerId) || [];
    const insights = await this.getCarrierInsights(rawOffers.map(offer => offer.carrierId));

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

        decoratedOffers.push({
          ...offer,
          carrier,
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
