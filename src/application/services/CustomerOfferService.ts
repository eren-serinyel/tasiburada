import { OfferRepository } from '../../infrastructure/repositories/OfferRepository';
import { Offer } from '../../domain/entities/Offer';

export class CustomerOfferService {
  private offerRepository = new OfferRepository();

  async getOffersByCustomerId(customerId: string): Promise<Offer[]> {
    return await this.offerRepository.findByCustomerShipments(customerId);
  }
}
