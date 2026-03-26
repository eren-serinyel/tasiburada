import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer } from '../../domain/entities/Offer';

export class CustomerOfferService {
  private offerRepository = new OfferRepository();

  async getMyOffers(customerId: string): Promise<Offer[]> {
    return this.offerRepository.findByCustomerShipments(customerId);
  }

  async getOffersByCustomerId(customerId: string): Promise<Offer[]> {
    return this.getMyOffers(customerId);
  }
}
