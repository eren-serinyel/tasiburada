/**
 * payment-flow.test.ts
 * Payment Phase 0 integration tests.
 * Seed verisi: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Payment } from '../domain/entities/Payment';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const SECOND_CUSTOMER = { email: 'ayse.kaya1@gmail.com', password: 'Maviface2141' };
const ADMIN    = { email: 'admin@tasiburada.com',      password: 'Maviface2141' };

describe('Payment Akışı', () => {
  let customerToken: string;
  let secondCustomerToken: string;
  let adminToken: string;
  let acceptedOffer: Offer | null = null;
  let nonAcceptedOffer: Offer | null = null;

  const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE || 0.1);
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const discoverOffers = async () => {
    const customerLogin = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (customerLogin.status !== 200) return;
    const customerId = customerLogin.body.data?.customer?.id;

    if (!customerId) return;

    acceptedOffer = await AppDataSource.getRepository(Offer)
      .createQueryBuilder('offer')
      .innerJoinAndSelect('offer.shipment', 'shipment')
      .where('shipment.customerId = :customerId', { customerId })
      .andWhere('offer.status = :status', { status: OfferStatus.ACCEPTED })
      .andWhere('shipment.status = :shipmentStatus', { shipmentStatus: 'matched' })
      .orderBy('offer.offeredAt', 'DESC')
      .getOne();

    if (!acceptedOffer) {
      const candidate = await AppDataSource.getRepository(Offer)
        .createQueryBuilder('offer')
        .innerJoinAndSelect('offer.shipment', 'shipment')
        .where('shipment.customerId = :customerId', { customerId })
        .andWhere('offer.status = :status', { status: OfferStatus.PENDING })
        .andWhere('shipment.status IN (:...statuses)', { statuses: ['pending', 'offer_received'] })
        .orderBy('offer.offeredAt', 'DESC')
        .getOne();

      if (candidate && customerToken) {
        await request(testApp)
          .put(`/api/v1/offers/${candidate.id}/accept`)
          .set('Authorization', `Bearer ${customerToken}`);
      }

      acceptedOffer = await AppDataSource.getRepository(Offer)
        .createQueryBuilder('offer')
        .innerJoinAndSelect('offer.shipment', 'shipment')
        .where('shipment.customerId = :customerId', { customerId })
        .andWhere('offer.status = :status', { status: OfferStatus.ACCEPTED })
        .andWhere('shipment.status = :shipmentStatus', { shipmentStatus: 'matched' })
        .orderBy('offer.offeredAt', 'DESC')
        .getOne();
    }

    nonAcceptedOffer = await AppDataSource.getRepository(Offer)
      .createQueryBuilder('offer')
      .innerJoinAndSelect('offer.shipment', 'shipment')
      .where('shipment.customerId = :customerId', { customerId })
      .andWhere('offer.status != :status', { status: OfferStatus.ACCEPTED })
      .orderBy('offer.offeredAt', 'DESC')
      .getOne();
  };

  beforeAll(async () => {
    if (skipDB()) return;
    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) customerToken = cRes.body.data?.token;

    const c2Res = await request(testApp).post('/api/v1/customers/login').send(SECOND_CUSTOMER);
    if (c2Res.status === 200) secondCustomerToken = c2Res.body.data?.token;

    const aRes = await request(testApp).post('/api/v1/admin/login').send(ADMIN);
    if (aRes.status === 200) adminToken = aRes.body.data?.token;

    await discoverOffers();
  });

  beforeEach(async () => {
    if (skipDB()) return;
    if (!acceptedOffer) return;
    await AppDataSource.getRepository(Payment).delete({ offerId: acceptedOffer.id });
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  test('1. Token olmadan ödeme oluşturma 401 dönmeli', async () => {
    const res = await request(testApp).post('/api/v1/payments').send({ offerId: 'x' });
    expect(res.status).toBe(401);
  });

  test('2. Token olmadan kendi ödemelerini listeleme 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/payments/my');
    expect(res.status).toBe(401);
  });

  test('3. Token olmadan shipment ödemesi sorgulama 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/payments/shipment/some-id');
    expect(res.status).toBe(401);
  });

  test('4. Müşteri token ile admin/all endpoint 401/403 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/admin/all')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(res.status);
  });

  // ── Validation / Contract ──────────────────────────────────────────────────
  test('5. offerId eksik ödeme isteği 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: 'legacy-id', amount: 500 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('6. olmayan offer için ödeme isteği 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('7. accepted offer sahibi customer create eder -> 201', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        offerId: acceptedOffer.id,
        amount: 1,
        method: 'credit_card',
        note: 'phase0-create-success',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const payment = res.body.data;
    expect(payment.status).toBe('pending');
    expect(payment.completedAt ?? null).toBeNull();
    expect(Number(payment.amount)).toBe(Number(acceptedOffer.price));
    expect(payment.carrierId).toBe(acceptedOffer.carrierId);

    const expectedPlatformFee = round2(Number(acceptedOffer.price) * commissionRate);
    const expectedCarrierAmount = round2(Number(acceptedOffer.price) - expectedPlatformFee);
    expect(Number(payment.platformFee)).toBe(expectedPlatformFee);
    expect(Number(payment.carrierAmount)).toBe(expectedCarrierAmount);
    expect(payment.currency).toBe('TRY');
  });

  test('8. başka customer accepted offer ile create -> 403', async () => {
    if (skipDB() || !secondCustomerToken || !acceptedOffer) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'phase0-ownership' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('9. offer ACCEPTED değilse 409 dönmeli', async () => {
    if (skipDB() || !customerToken || !nonAcceptedOffer) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: nonAcceptedOffer.id, method: 'credit_card', note: 'phase0-non-accepted' });
    expect(res.status).toBe(409);
  });

  test('10. shipment MATCHED değilse 409 dönmeli', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;

    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const shipment = await shipmentRepo.findOne({ where: { id: acceptedOffer.shipmentId } });
    if (!shipment) return;
    const originalStatus = shipment.status;

    shipment.status = ShipmentStatus.PENDING;
    await shipmentRepo.save(shipment);

    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'phase0-shipment-status' });

    expect(res.status).toBe(409);

    shipment.status = originalStatus;
    await shipmentRepo.save(shipment);
  });

  test('11. aynı accepted offer için ikinci active payment 409 döner', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;

    const first = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'phase0-dup-1' });
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'phase0-dup-2' });
    expect(second.status).toBe(409);
  });

  // ── Read endpoints smoke ───────────────────────────────────────────────────
  test('12. Müşteri kendi ödeme listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('13. Admin tüm ödemeleri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/admin/all?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
