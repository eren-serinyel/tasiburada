import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { CustomerPreference, DefaultOfferSort } from '../../domain/entities/CustomerPreference';

export class CustomerOfferService {
  private offerRepository = new OfferRepository();

  async getMyOffers(customerId: string): Promise<any[]> {
    let preferVerified = false;
    let defaultSort = DefaultOfferSort.PRICE_ASC;
    try {
      const prefRepo = AppDataSource.getRepository(CustomerPreference);
      const preference = await prefRepo.findOne({ where: { customerId } });
      preferVerified = preference?.preferVerifiedCarriers ?? false;
      defaultSort = (preference?.defaultOfferSort as DefaultOfferSort) ?? DefaultOfferSort.PRICE_ASC;
    } catch (e) {
      preferVerified = false;
      defaultSort = DefaultOfferSort.PRICE_ASC;
    }

    let rawOffers = await this.offerRepository.findByCustomerShipments(customerId) || [];

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
        
        const both = isLowestPrice && isHighestRating;
        const decorated = {
          ...offer,
          isLowestPrice,
          isHighestRating,
          isRecommended: both || isLowestPrice
        };
        decoratedOffers.push(decorated);
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
}
