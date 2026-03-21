import { BaseRepository } from './BaseRepository';
import { Offer } from '../../domain/entities/Offer';

export class OfferRepository extends BaseRepository<Offer> {
  constructor() {
    super(Offer);
  }
}
