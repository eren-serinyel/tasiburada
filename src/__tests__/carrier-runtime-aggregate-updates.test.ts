import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { In } from 'typeorm';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier } from '../domain/entities/Carrier';
import { Customer } from '../domain/entities/Customer';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Review } from '../domain/entities/Review';
import { CarrierStats } from '../domain/entities/CarrierStats';
import { CarrierEarningsLog } from '../domain/entities/CarrierEarningsLog';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

type CarrierAggregateSnapshot = Pick<
  Carrier,
  'rating' | 'completedShipments' | 'acceptedOffers' | 'successRate'
>;

describe('Carrier runtime aggregate updates', () => {
  let customerToken = '';
  let carrierToken = '';
  let customerId = '';
  let carrierId = '';
  let originalCarrierSnapshot: CarrierAggregateSnapshot | null = null;
  let originalStats: CarrierStats | null = null;
  let hadStats = false;

  const createdShipmentIds: string[] = [];
  const createdOfferIds: string[] = [];
  const createdReviewIds: string[] = [];

  const carrierRepo = () => AppDataSource.getRepository(Carrier);
  const shipmentRepo = () => AppDataSource.getRepository(Shipment);
  const offerRepo = () => AppDataSource.getRepository(Offer);
  const reviewRepo = () => AppDataSource.getRepository(Review);

  const getCarrierAggregates = async (): Promise<CarrierAggregateSnapshot> => {
    const carrier = await carrierRepo().findOneByOrFail({ id: carrierId });
    return {
      rating: Number(carrier.rating),
      completedShipments: Number(carrier.completedShipments),
      acceptedOffers: Number(carrier.acceptedOffers),
      successRate: Number(carrier.successRate),
    };
  };

  const createShipment = async (status: ShipmentStatus, overrides: Partial<Shipment> = {}) => {
    const shipment = shipmentRepo().create({
      id: randomUUID(),
      customerId,
      carrierId: status === ShipmentStatus.PENDING ? null : carrierId,
      status,
      shipmentCategory: ShipmentCategory.HOME_MOVE,
      originCity: 'Istanbul',
      originDistrict: 'Kadikoy',
      destinationCity: 'Ankara',
      destinationDistrict: 'Cankaya',
      loadDetails: 'Carrier aggregate runtime test',
      shipmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      matchedAt: status === ShipmentStatus.PENDING ? null : new Date(),
      weight: 100,
      estimatedWeight: 100,
      price: null,
      photoUrls: [],
      contactPhone: null,
      ...overrides,
    });

    await shipmentRepo().save(shipment);
    createdShipmentIds.push(shipment.id);
    return shipment;
  };

  beforeAll(async () => {
    if (skipDB()) return;

    const customerLogin = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    expect(customerLogin.status).toBe(200);
    customerToken = customerLogin.body.data?.token;
    customerId = customerLogin.body.data?.customer?.id;

    const carrierLogin = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    expect(carrierLogin.status).toBe(200);
    carrierToken = carrierLogin.body.data?.token;
    carrierId = carrierLogin.body.data?.carrier?.id;

    originalCarrierSnapshot = await getCarrierAggregates();
    originalStats = await AppDataSource.getRepository(CarrierStats).findOne({ where: { carrierId } });
    hadStats = Boolean(originalStats);
  });

  afterAll(async () => {
    if (skipDB() || !carrierId) return;

    if (createdReviewIds.length) {
      await reviewRepo().delete({ id: In(createdReviewIds) });
    }
    if (createdOfferIds.length) {
      await offerRepo().delete({ id: In(createdOfferIds) });
    }
    if (createdShipmentIds.length) {
      await AppDataSource.getRepository(CarrierEarningsLog).delete({ shipmentId: In(createdShipmentIds) });
      await shipmentRepo().delete({ id: In(createdShipmentIds) });
    }

    if (originalCarrierSnapshot) {
      await carrierRepo().update({ id: carrierId }, originalCarrierSnapshot);
    }

    const statsRepo = AppDataSource.getRepository(CarrierStats);
    if (hadStats && originalStats) {
      await statsRepo.update(
        { carrierId },
        {
          totalEarnings: originalStats.totalEarnings,
          totalJobs: originalStats.totalJobs,
          activeJobs: originalStats.activeJobs,
          averageRating: originalStats.averageRating,
          totalReviews: originalStats.totalReviews,
        },
      );
    } else {
      await statsRepo.delete({ carrierId });
    }
  });

  test('new review recomputes Carrier.rating from persisted reviews', async () => {
    if (skipDB()) return;

    const before = await getCarrierAggregates();
    const shipment = await createShipment(ShipmentStatus.COMPLETED, {
      shipmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const response = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shipmentId: shipment.id,
        rating: 1,
        comment: 'Aggregate runtime test yorumu.',
      });

    expect(response.status).toBe(201);
    createdReviewIds.push(response.body.data.id);

    const after = await getCarrierAggregates();
    const [{ avgRating }] = await AppDataSource.query(
      'SELECT COALESCE(AVG(rating), 0) AS avgRating FROM reviews WHERE carrierId = ?',
      [carrierId],
    );
    const expectedRating = Number(avgRating);

    expect(after.rating).toBeCloseTo(expectedRating, 5);
    expect(after.rating).not.toBe(before.rating);

    console.log('[carrier-runtime-aggregate] review', { before, after, expectedRating });
  });

  test('accepted offer atomically increments Carrier.acceptedOffers and recomputes successRate', async () => {
    if (skipDB()) return;

    const before = await getCarrierAggregates();
    const shipment = await createShipment(ShipmentStatus.PENDING);
    const offer = offerRepo().create({
      id: randomUUID(),
      shipmentId: shipment.id,
      carrierId,
      price: 2500,
      message: 'Carrier aggregate runtime test teklifi.',
      estimatedDuration: 2,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: OfferStatus.PENDING,
      hasSuspiciousContent: false,
    });
    await offerRepo().save(offer);
    createdOfferIds.push(offer.id);

    const response = await request(testApp)
      .put(`/api/v1/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);

    const after = await getCarrierAggregates();
    const expectedAcceptedOffers = before.acceptedOffers + 1;
    const expectedSuccessRate = expectedAcceptedOffers > 0
      ? Math.round((before.completedShipments / expectedAcceptedOffers) * 100 * 100) / 100
      : 0;

    expect(after.acceptedOffers).toBe(expectedAcceptedOffers);
    expect(after.successRate).toBeCloseTo(expectedSuccessRate, 2);

    console.log('[carrier-runtime-aggregate] offer.accept', { before, after, expectedSuccessRate });
  });

  test('completed shipment atomically increments Carrier.completedShipments and recomputes successRate', async () => {
    if (skipDB()) return;

    const before = await getCarrierAggregates();
    const shipment = await createShipment(ShipmentStatus.IN_TRANSIT, {
      price: null,
      matchedAt: new Date(),
    });

    const response = await request(testApp)
      .put(`/api/v1/shipments/${shipment.id}/complete`)
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(response.status).toBe(200);

    const after = await getCarrierAggregates();
    const expectedCompletedShipments = before.completedShipments + 1;
    const expectedSuccessRate = before.acceptedOffers > 0
      ? Math.round((expectedCompletedShipments / before.acceptedOffers) * 100 * 100) / 100
      : 0;

    expect(after.completedShipments).toBe(expectedCompletedShipments);
    expect(after.successRate).toBeCloseTo(expectedSuccessRate, 2);

    console.log('[carrier-runtime-aggregate] shipment.complete', { before, after, expectedSuccessRate });
  });
});
