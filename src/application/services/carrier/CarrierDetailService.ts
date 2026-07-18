import { CarrierDetailRepository } from '../../../infrastructure/repositories/CarrierDetailRepository';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceLoadType';
import {
  PublicCarrierDto,
  toPublicCarrierDto,
} from '../../dto/carrier/CarrierResponseProjection';

export class CarrierDetailService {
  private carrierDetailRepository = new CarrierDetailRepository();

  async getCarrierDetail(
    carrierId: string,
    loadType?: ExtraServiceLoadType | null,
    viewerCustomerId?: string,
  ): Promise<PublicCarrierDto | null> {
    if (!carrierId) {
      throw new Error('Nakliyeci kimliği zorunludur.');
    }

    const projection = await this.carrierDetailRepository
      .getCarrierDetailProjection(carrierId, loadType);
    if (!projection) return null;

    const recentReviews = projection.recentReviews.map(({
      customerId,
      ...review
    }) => ({
      ...review,
      ...(viewerCustomerId
        ? { isOwnReview: customerId === viewerCustomerId }
        : {}),
    }));

    return toPublicCarrierDto({
      carrier: projection.carrier,
      reviewCount: projection.reviewCount,
      vehicles: projection.vehicles,
      services: projection.services,
      recentReviews,
      startingPrice: projection.startingPrice,
    });
  }
}
