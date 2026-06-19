/**
 * payment-flow.test.ts
 * Payment Phase 0 integration tests.
 * Seed verisi: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Payment, PaymentStatus } from '../domain/entities/Payment';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';
import { Carrier } from '../domain/entities/Carrier';
import { PlatformSetting } from '../domain/entities/PlatformSetting';
import { PlatformPolicyService } from '../application/services/PlatformPolicyService';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const SECOND_CUSTOMER = { email: 'ayse.kaya1@gmail.com', password: 'Maviface2141' };
const ADMIN    = { email: 'admin@tasiburada.com',      password: 'Maviface2141' };

describe('Payment Akışı', () => {
  let customerToken: string;
  let secondCustomerToken: string;
  let carrierToken: string;
  let adminToken: string;
  let acceptedOffer: Offer | null = null;
  let nonAcceptedOffer: Offer | null = null;

  const platformPolicy = new PlatformPolicyService();
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

    if (acceptedOffer?.carrierId) {
      const carrier = await AppDataSource.getRepository(Carrier).findOne({
        where: { id: acceptedOffer.carrierId },
      });
      if (carrier?.email) {
        const carrierLogin = await request(testApp)
          .post('/api/v1/carriers/login')
          .send({ email: carrier.email, password: 'Maviface2141' });
        if (carrierLogin.status === 200) carrierToken = carrierLogin.body.data?.token;
      }
    }
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

    const commission = await platformPolicy.computeCommission(Number(acceptedOffer.price));
    expect(Number(payment.platformFee)).toBe(commission.commissionAmount);
    expect(Number(payment.carrierAmount)).toBe(commission.netAmount);
    expect(payment.currency).toBe('TRY');
  });

  test('7b. ödeme komisyonu DB platform ayarı ve min komisyon ile hesaplanmalı', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;

    const settingRepo = AppDataSource.getRepository(PlatformSetting);
    const commissionSetting = await settingRepo.findOne({ where: { key: 'platform_commission' } });
    const minSetting = await settingRepo.findOne({ where: { key: 'min_commission_amount' } });
    const previousEnv = process.env.PLATFORM_COMMISSION_RATE;
    const gross = Number(acceptedOffer.price);
    const forcedMinCommission = round2(gross / 2);

    try {
      process.env.PLATFORM_COMMISSION_RATE = '0.99';
      await settingRepo.update({ key: 'platform_commission' }, { value: '1' });
      await settingRepo.update({ key: 'min_commission_amount' }, { value: String(forcedMinCommission) });

      const res = await request(testApp)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          offerId: acceptedOffer.id,
          method: 'credit_card',
          note: 'db-min-commission-contract',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.platformFee)).toBe(forcedMinCommission);
      expect(Number(res.body.data.carrierAmount)).toBe(round2(gross - forcedMinCommission));
    } finally {
      await AppDataSource.getRepository(Payment).delete({ offerId: acceptedOffer.id });
      if (commissionSetting) {
        await settingRepo.update({ key: 'platform_commission' }, { value: commissionSetting.value });
      }
      if (minSetting) {
        await settingRepo.update({ key: 'min_commission_amount' }, { value: minSetting.value });
      }
      if (previousEnv === undefined) {
        delete process.env.PLATFORM_COMMISSION_RATE;
      } else {
        process.env.PLATFORM_COMMISSION_RATE = previousEnv;
      }
    }
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

  test('13b. Nakliyeci odeme listesinde musteri hassas verisi donmemeli', async () => {
    if (skipDB() || !customerToken || !carrierToken || !acceptedOffer) return;

    const create = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'carrier-payment-pii-contract' });
    expect(create.status).toBe(201);

    const res = await request(testApp)
      .get('/api/v1/payments/carrier/my')
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const payment = res.body.data.find((item: any) => item.id === create.body.data.id);
    expect(payment).toBeDefined();
    expect(payment.customer).toBeDefined();
    expect(Object.keys(payment.customer).sort()).toEqual(['firstName', 'lastName']);
    expect(payment.customer.lastName).toContain('***');
    expect(payment.customer.passwordHash).toBeUndefined();
    expect(payment.customer.resetToken).toBeUndefined();
    expect(payment.customer.resetTokenExpiry).toBeUndefined();
    expect(payment.customer.verificationToken).toBeUndefined();
    expect(payment.customer.email).toBeUndefined();
    expect(payment.customer.phone).toBeUndefined();
  });

  test('14. Tamamlanmamis tasima icin payment release 409 donmeli', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;

    const create = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'CREDIT_CARD', note: 'release-before-complete' });
    expect(create.status).toBe(201);

    const release = await request(testApp)
      .post(`/api/v1/payments/${create.body.data.id}/confirm-release`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(release.status).toBe(409);
    expect(release.body.success).toBe(false);
  });

  test('15. Tamamlanan tasima icin musteri payment release edebilmeli', async () => {
    if (skipDB() || !customerToken || !acceptedOffer) return;

    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const shipment = await shipmentRepo.findOne({ where: { id: acceptedOffer.shipmentId } });
    if (!shipment) return;

    const originalStatus = shipment.status;

    try {
      const create = await request(testApp)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ offerId: acceptedOffer.id, method: 'CREDIT_CARD', note: 'release-after-complete' });
      expect(create.status).toBe(201);
      expect(create.body.data.status).toBe(PaymentStatus.PENDING);

      shipment.status = ShipmentStatus.COMPLETED;
      await shipmentRepo.save(shipment);

      const release = await request(testApp)
        .post(`/api/v1/payments/${create.body.data.id}/confirm-release`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(release.status).toBe(200);
      expect(release.body.success).toBe(true);
      expect(release.body.data.status).toBe(PaymentStatus.COMPLETED);
      expect(release.body.data.completedAt).toBeTruthy();

      const persisted = await paymentRepo.findOne({ where: { id: create.body.data.id } });
      expect(persisted?.status).toBe(PaymentStatus.COMPLETED);
      expect(persisted?.completedAt).toBeTruthy();
    } finally {
      shipment.status = originalStatus;
      await shipmentRepo.save(shipment);
    }
  });

  test('16. Baska musteri payment release edememeli', async () => {
    if (skipDB() || !customerToken || !secondCustomerToken || !acceptedOffer) return;

    const create = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ offerId: acceptedOffer.id, method: 'credit_card', note: 'release-ownership' });
    expect(create.status).toBe(201);

    const release = await request(testApp)
      .post(`/api/v1/payments/${create.body.data.id}/confirm-release`)
      .set('Authorization', `Bearer ${secondCustomerToken}`);

    expect(release.status).toBe(403);
    expect(release.body.success).toBe(false);
  });
});
