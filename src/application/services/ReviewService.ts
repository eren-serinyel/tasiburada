import { Review } from '../../domain/entities/Review';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { ReviewRepository } from '../../infrastructure/repositories/ReviewRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';

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

interface CreateReviewPayload {
  shipmentId: string;
  rating: number;
  comment?: string;
}

export interface ShipmentReviewResponse {
  id: string;
  shipmentId: string;
  carrierId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface CustomerReviewResponse {
  id: string;
  shipmentId: string;
  carrierId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export class ReviewService {
  private reviewRepository = new ReviewRepository();
  private shipmentRepository = new ShipmentRepository();
  private carrierRepository = new CarrierRepository();

  private ensureValidRating(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ValidationError('rating 1-5 arasinda integer olmalidir.');
    }

    return value;
  }

  async createReview(customerId: string, payload: CreateReviewPayload): Promise<Review> {
    if (!payload.shipmentId) {
      throw new ValidationError('shipmentId zorunludur.');
    }

    const rating = this.ensureValidRating(Number(payload.rating));

    const shipment = await this.shipmentRepository.findById(payload.shipmentId);
    if (!shipment) {
      throw new NotFoundError('Tasima talebi bulunamadi.');
    }

    if (shipment.customerId !== customerId) {
      throw new ForbiddenError('Bu tasimaya yorum yapma yetkiniz yok.');
    }

    if (shipment.status !== ShipmentStatus.COMPLETED) {
      throw new ValidationError('Sadece tamamlanan tasimalara yorum yapilabilir.');
    }

    if (!shipment.carrierId) {
      throw new NotFoundError('Bu tasima icin atanan nakliyeci bulunamadi.');
    }

    const alreadyReviewed = await this.reviewRepository.existsByShipmentAndCustomer(payload.shipmentId, customerId);
    if (alreadyReviewed) {
      throw new ConflictError('Ayni tasimaya iki kez yorum yapamazsiniz.');
    }

    const review = await this.reviewRepository.create({
      shipmentId: payload.shipmentId,
      carrierId: shipment.carrierId,
      customerId,
      rating,
      comment: payload.comment?.trim() || undefined
    });

    const averageRating = await this.reviewRepository.getCarrierAverageRating(shipment.carrierId);
    await this.carrierRepository.updateRating(shipment.carrierId, Number(averageRating.toFixed(2)));

    const saved = await this.reviewRepository.findById(review.id);
    if (!saved) {
      throw new NotFoundError('Yorum kaydedildi ancak getirilemedi.');
    }

    return saved;
  }

  async getShipmentReviews(shipmentId: string): Promise<ShipmentReviewResponse[]> {
    const reviews = await this.reviewRepository.findByShipmentWithCustomer(shipmentId);

    return reviews.map(review => ({
      id: review.id,
      shipmentId: review.shipmentId,
      carrierId: review.carrierId,
      customerId: review.customerId,
      customerFirstName: review.customer?.firstName || '',
      customerLastName: review.customer?.lastName || '',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));
  }

  async getCustomerReviews(customerId: string): Promise<CustomerReviewResponse[]> {
    const reviews = await this.reviewRepository.findByCustomerWithShipment(customerId);

    return reviews.map(review => ({
      id: review.id,
      shipmentId: review.shipmentId,
      carrierId: review.carrierId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));
  }

  async createReviewByCarrierId(
    customerId: string,
    carrierId: string,
    ratingInput: number,
    comment: string
  ): Promise<Review> {
    const rating = this.ensureValidRating(Number(ratingInput));

    const shipment = await this.shipmentRepository.findCompletedByCustomerAndCarrier(customerId, carrierId);
    if (!shipment) {
      throw new ValidationError('Bu nakliyeciyle tamamlanmış bir taşımanız bulunamadı. Yorum yapabilmek için bir taşımanın tamamlanmış olması gerekir.');
    }

    const alreadyReviewed = await this.reviewRepository.existsByShipmentAndCustomer(shipment.id, customerId);
    if (alreadyReviewed) {
      throw new ConflictError('Bu nakliyeciye zaten yorum yaptınız.');
    }

    const review = await this.reviewRepository.create({
      shipmentId: shipment.id,
      carrierId,
      customerId,
      rating,
      comment: comment?.trim() || undefined
    });

    const averageRating = await this.reviewRepository.getCarrierAverageRating(carrierId);
    await this.carrierRepository.updateRating(carrierId, Number(averageRating.toFixed(2)));

    const saved = await this.reviewRepository.findById(review.id);
    if (!saved) throw new NotFoundError('Yorum kaydedildi ancak getirilemedi.');

    return saved;
  }

  async getCarrierReviews(carrierId: string): Promise<CarrierReviewResponse[]> {
    const reviews = await this.reviewRepository.findByCarrierWithCustomer(carrierId);
    return reviews.map(review => ({
      id: review.id,
      carrierId: review.carrierId,
      customerId: review.customerId,
      customerFirstName: (review.customer as any)?.firstName || '',
      customerLastName: (review.customer as any)?.lastName || '',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));
  }
}
