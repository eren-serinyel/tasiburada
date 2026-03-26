import { BaseRepository } from './BaseRepository';
import { Offer } from '../../domain/entities/Offer';
import { OfferStatus } from '../../domain/entities/Offer';

const SAFE_CARRIER_SELECT = [
  'carrier.id',
  'carrier.companyName',
  'carrier.contactName',
  'carrier.phone',
  'carrier.email',
  'carrier.pictureUrl',
  'carrier.rating',
  'carrier.completedShipments',
  'carrier.profileCompletion',
  'carrier.isActive'
];

export class OfferRepository extends BaseRepository<Offer> {
  constructor() {
    super(Offer);
  }

  async findByCustomerShipments(customerId: string): Promise<Offer[]> {
    return await this.repository
      .createQueryBuilder('offer')
      .innerJoinAndSelect('offer.shipment', 'shipment')
      .leftJoinAndSelect('offer.carrier', 'carrier')
      .select([
        'offer.id',
        'offer.shipmentId',
        'offer.carrierId',
        'offer.price',
        'offer.message',
        'offer.estimatedDuration',
        'offer.status',
        'offer.offeredAt',
        'shipment.id',
        'shipment.customerId',
        'shipment.carrierId',
        'shipment.status',
        'shipment.price',
        'shipment.origin',
        'shipment.destination',
        'shipment.loadDetails',
        'shipment.weight',
        'shipment.shipmentDate',
        'shipment.createdAt',
        'shipment.updatedAt',
        ...SAFE_CARRIER_SELECT
      ])
      .where('shipment.customerId = :customerId', { customerId })
      .orderBy('offer.offeredAt', 'DESC')
      .getMany();
  }

  async findByCarrierId(carrierId: string): Promise<Offer[]> {
    return await this.repository.find({
      where: { carrierId },
      relations: ['shipment'],
      order: { offeredAt: 'DESC' }
    });
  }

  async findByIdWithShipmentAndCarrier(offerId: string): Promise<Offer | null> {
    return await this.repository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.shipment', 'shipment')
      .leftJoinAndSelect('offer.carrier', 'carrier')
      .select([
        'offer.id',
        'offer.shipmentId',
        'offer.carrierId',
        'offer.price',
        'offer.message',
        'offer.estimatedDuration',
        'offer.status',
        'offer.offeredAt',
        'shipment.id',
        'shipment.customerId',
        'shipment.carrierId',
        'shipment.status',
        'shipment.price',
        'shipment.origin',
        'shipment.destination',
        'shipment.loadDetails',
        'shipment.weight',
        'shipment.shipmentDate',
        'shipment.createdAt',
        'shipment.updatedAt',
        ...SAFE_CARRIER_SELECT
      ])
      .where('offer.id = :offerId', { offerId })
      .getOne();
  }

  async existsByShipmentAndCarrier(shipmentId: string, carrierId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        shipmentId,
        carrierId
      }
    });

    return count > 0;
  }

  async rejectOtherPendingOffers(shipmentId: string, acceptedOfferId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.REJECTED })
      .where('shipmentId = :shipmentId', { shipmentId })
      .andWhere('id != :acceptedOfferId', { acceptedOfferId })
      .andWhere('status = :pendingStatus', { pendingStatus: OfferStatus.PENDING })
      .execute();
  }

  async findAcceptedByShipmentId(shipmentId: string): Promise<Offer | null> {
    return await this.repository.findOne({
      where: {
        shipmentId,
        status: OfferStatus.ACCEPTED
      }
    });
  }
}
