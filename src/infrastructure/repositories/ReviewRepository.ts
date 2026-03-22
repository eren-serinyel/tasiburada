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

  async existsByShipmentAndCustomer(shipmentId: string, customerId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        shipmentId,
        customerId
      }
    });

    return count > 0;
  }

  async findByShipmentWithCustomer(shipmentId: string): Promise<Review[]> {
    return await this.repository
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.customer', 'customer')
      .where('review.shipmentId = :shipmentId', { shipmentId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  async findByCustomerWithShipment(customerId: string): Promise<Review[]> {
    return await this.repository
      .createQueryBuilder('review')
      .innerJoinAndSelect('review.shipment', 'shipment')
      .where('review.customerId = :customerId', { customerId })
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  async getCarrierAverageRating(carrierId: string): Promise<number> {
    const raw = await this.repository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .where('review.carrierId = :carrierId', { carrierId })
      .getRawOne<{ avgRating: string | null }>();

    return Number(raw?.avgRating || 0);
  }
}
