import { ReviewRepository } from '../../../infrastructure/repositories/ReviewRepository';

export interface CarrierReviewResponse {
  id: string;
  carrierId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export class CarrierReviewService {
  private reviewRepository = new ReviewRepository();

  async getReviewsByCarrierId(carrierId: string): Promise<CarrierReviewResponse[]> {
    const reviews = await this.reviewRepository.findByCarrierWithCustomer(carrierId);

    return reviews.map(review => ({
      id: review.id,
      carrierId: review.carrierId,
      customerId: review.customerId,
      customerFirstName: review.customer?.firstName || '',
      customerLastName: review.customer?.lastName || '',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));
  }
}
