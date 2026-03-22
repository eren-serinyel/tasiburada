import { BaseRepository } from './BaseRepository';
import { Review } from '../../domain/entities/Review';

export class ReviewRepository extends BaseRepository<Review> {
  constructor() {
    super(Review);
  }

  async findByCarrierWithCustomer(carrierId: string): Promise<Review[]> {
    return await this.repository
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.customer', 'customer')
      .where('review.carrierId = :carrierId', { carrierId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }
}
