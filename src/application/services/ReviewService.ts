import { Review } from '../../domain/entities/Review';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { ReviewRepository } from '../../infrastructure/repositories/ReviewRepository';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { ContactFilterSurface } from '../../domain/entities/ContactFilterLog';
import { ContactSafetyService } from './contact-safety/ContactSafetyService';
import { NotificationService } from './NotificationService';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Customer } from '../../domain/entities/Customer';

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
  private contactSafetyService = new ContactSafetyService();

  private async sanitizeReviewComment(
    comment: string | null | undefined,
    context: { customerId: string; shipmentId: string },
  ): Promise<string | undefined> {
    const normalized = comment?.trim();
    if (!normalized) return undefined;

    const result = await this.contactSafetyService.enforce({
      actorType: 'customer',
      actorId: context.customerId,
      surface: ContactFilterSurface.REVIEW_COMMENT,
      entityType: 'review',
      entityId: context.shipmentId,
      shipmentId: context.shipmentId,
      text: normalized,
      policy: 'block',
      metadata: {
        source: 'review_service',
      },
    });

    if (result.isViolation && result.action === 'blocked') {
      throw new ValidationError(result.userMessage);
    }

    return normalized;
  }

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
      comment: await this.sanitizeReviewComment(payload.comment, {
        customerId,
        shipmentId: payload.shipmentId,
      })
    });

    await this.carrierRepository.updateRating(shipment.carrierId);

    try {
      const customer = await AppDataSource.getRepository(Customer).findOne({ where: { id: customerId } });
      const customerName = [customer?.firstName, customer?.lastName?.charAt(0)].filter(Boolean).join(' ') || 'Müşteri';
      const notificationService = new NotificationService();
      await notificationService.createFromEvent('carrier.review_received', {
        recipientUserId: shipment.carrierId,
        entityId: review.id,
        reviewId: review.id,
        shipmentId: payload.shipmentId,
        rating,
        customerName,
      });
    } catch {
      // best-effort
    }

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
      comment: await this.sanitizeReviewComment(comment, {
        customerId,
        shipmentId: shipment.id,
      })
    });

    await this.carrierRepository.updateRating(carrierId);

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

  async updateReview(
    reviewId: string,
    customerId: string,
    data: { rating?: number; comment?: string }
  ): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Yorum bulunamadı.');
    if (review.customerId !== customerId) throw new ForbiddenError('Bu yorumu düzenleme yetkiniz yok.');

    const updateData: Partial<Review> = {};
    if (data.rating !== undefined) updateData.rating = this.ensureValidRating(data.rating);
    if (data.comment !== undefined) {
      updateData.comment = await this.sanitizeReviewComment(data.comment, {
        customerId,
        shipmentId: review.shipmentId,
      });
    }

    const updated = await this.reviewRepository.update(reviewId, updateData as any);
    if (!updated) throw new NotFoundError('Yorum güncellenemedi.');
    return updated;
  }

  async deleteReview(reviewId: string, customerId: string): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Yorum bulunamadı.');
    if (review.customerId !== customerId) throw new ForbiddenError('Bu yorumu silme yetkiniz yok.');

    const carrierId = review.carrierId;
    await this.reviewRepository.delete(reviewId);

    await this.carrierRepository.updateRating(carrierId);
  }
}
