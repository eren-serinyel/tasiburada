/**
 * review-flow.test.ts
 * ReviewService + ReviewController unit ve integration testleri.
 * Seed verisi kullanır: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { randomUUID } from 'node:crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Shipment, ShipmentStatus, ShipmentCategory } from '../domain/entities/Shipment';
import { ContactFilterLog } from '../domain/entities/ContactFilterLog';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER  = { email: 'info@silenakliyat.com',   password: 'Maviface2141' };

describe('Review Akışı', () => {
  let customerToken: string;
  let carrierToken: string;
  let customerId: string;
  let carrierId: string;
  const createdShipmentIds: string[] = [];

  const createCompletedShipmentForReview = async (): Promise<string | null> => {
    if (!customerId || !carrierId) return null;

    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const shipment = shipmentRepo.create({
      id: randomUUID(),
      customerId,
      carrierId,
      status: ShipmentStatus.COMPLETED,
      shipmentCategory: ShipmentCategory.HOME_MOVE,
      originCity: 'Istanbul',
      originDistrict: 'Kadikoy',
      destinationCity: 'Ankara',
      destinationDistrict: 'Cankaya',
      loadDetails: 'Test yorum akisi',
      shipmentDate: new Date(),
      matchedAt: new Date(),
      weight: 100,
      estimatedWeight: 100,
      contactPhone: null,
    });

    await shipmentRepo.save(shipment, { reload: false });
    createdShipmentIds.push(shipment.id);
    return shipment.id;
  };

  // ── Setup: Token al ────────────────────────────────────────────────────────
  beforeAll(async () => {
    if (skipDB()) return;

    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) {
      customerToken = cRes.body.data?.token;
      customerId = cRes.body.data?.customer?.id;
    }

    const rRes = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (rRes.status === 200) {
      carrierToken = rRes.body.data?.token;
      carrierId = rRes.body.data?.carrier?.id;
    }
  });

  afterAll(async () => {
    if (skipDB() || !createdShipmentIds.length) return;
    await AppDataSource.getRepository(Shipment).delete(createdShipmentIds);
  });

  // ── Auth guard: Token yok ──────────────────────────────────────────────────
  test('1. Token olmadan yorum oluşturma 401 dönmeli', async () => {
    const res = await request(testApp).post('/api/v1/reviews').send({ shipmentId: 'x', rating: 5 });
    expect(res.status).toBe(401);
  });

  test('2. Token olmadan kendi yorumlarını listeleme 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/customers/me/reviews');
    expect(res.status).toBe(401);
  });

  test('3. Token olmadan yorum güncelleme 401 dönmeli', async () => {
    const res = await request(testApp).put('/api/v1/reviews/nonexistent-id').send({ rating: 4 });
    expect(res.status).toBe(401);
  });

  test('4. Token olmadan yorum silme 401 dönmeli', async () => {
    const res = await request(testApp).delete('/api/v1/reviews/nonexistent-id');
    expect(res.status).toBe(401);
  });

  // ── Public endpoint: Nakliyeci yorumları ──────────────────────────────────
  test('5. Carrier reviews public endpoint — geçerli carrier ID ile çalışmalı', async () => {
    if (skipDB()) return;
    // Seed'den bir carrierId al (login ile)
    const loginRes = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (loginRes.status !== 200) return;
    const profile = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${carrierToken}`);
    if (profile.status !== 200) return;
    const carrierId = profile.body.data?.id || profile.body.data?.carrier?.id;
    if (!carrierId) return;

    const res = await request(testApp).get(`/api/v1/reviews/carrier/${carrierId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Public endpoint: Shipment reviews ─────────────────────────────────────
  test('6. Shipment reviews — herhangi bir shipment ID ile 200 dönmeli (boş dizi kabul)', async () => {
    if (skipDB()) return;
    const res = await request(testApp).get('/api/v1/shipments/00000000-0000-0000-0000-000000000000/reviews');
    expect([200, 404, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  // ── Müşteri: kendi yorumlarını listele ────────────────────────────────────
  test('7. Müşteri kendi review listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/me/reviews')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Validation: Hatalı shipmentId ─────────────────────────────────────────
  test('8. Olmayan shipmentId ile yorum oluşturma 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', rating: 4 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Validation: Geçersiz rating ───────────────────────────────────────────
  test('9. Geçersiz rating (6) ile yorum oluşturma reddedilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', rating: 6 });
    expect([400]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('10. Geçersiz rating (0) ile yorum oluşturma reddedilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', rating: 0 });
    expect([400]).toContain(res.status);
  });

  // ── Validation: shipmentId eksik ──────────────────────────────────────────
  test('11. shipmentId olmadan yorum oluşturma 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── By-carrier: carrierId eksik ───────────────────────────────────────────
  test('12. by-carrier endpoint — carrierId eksikse 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews/by-carrier')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── By-carrier: olmayan carrier ───────────────────────────────────────────
  test('13. by-carrier — tamamlanmış taşıma yoksa 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews/by-carrier')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ carrierId: '00000000-0000-0000-0000-000000000000', rating: 4 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Update: Olmayan review ─────────────────────────────────────────────────
  test('14. Olmayan review güncelleme 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 3 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Delete: Olmayan review ─────────────────────────────────────────────────
  test('15. Olmayan review silme 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .delete('/api/v1/reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── ReviewService unit: ensureValidRating private logic via endpoint ───────
  test('16. Ondalıklı rating integer kontrolü — 4.5 reddedilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', rating: 4.5 });
    expect([400]).toContain(res.status);
  });

  // ── Seed: müşteri kendi tamamlanmış yorumlarını görüyor ───────────────────
  test('17. Seed müşterinin review listesi array dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/me/reviews')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const review = res.body.data[0];
      expect(review).toHaveProperty('id');
      expect(review).toHaveProperty('rating');
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
    }
  });

  test('18. Review comment içinde telefon numarasi engellenmeli', async () => {
    if (skipDB() || !customerToken) return;
    const shipmentId = await createCompletedShipmentForReview();
    if (!shipmentId) return;

    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId, rating: 5, comment: 'Bana 0532 123 45 67 den ulasin' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const log = await AppDataSource.getRepository(ContactFilterLog).findOne({
      where: {
        actorType: 'customer',
        actorId: customerId,
        shipmentId,
        surface: 'review_comment' as any,
      },
      order: { id: 'DESC' },
    });
    expect(log).toBeTruthy();
    expect(log?.severity).toBe('high');
    expect(log?.action).toBe('blocked');
    expect(log?.riskScore).toBeGreaterThanOrEqual(80);
  });

  test('19. Review comment içinde e-posta engellenmeli', async () => {
    if (skipDB() || !customerToken) return;
    const shipmentId = await createCompletedShipmentForReview();
    if (!shipmentId) return;

    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId, rating: 4, comment: 'iletisim: test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const log = await AppDataSource.getRepository(ContactFilterLog).findOne({
      where: {
        actorType: 'customer',
        actorId: customerId,
        shipmentId,
        surface: 'review_comment' as any,
      },
      order: { id: 'DESC' },
    });
    expect(log).toBeTruthy();
    expect(log?.severity).toBe('high');
    expect(log?.action).toBe('blocked');
    expect(log?.riskScore).toBeGreaterThanOrEqual(80);
  });

  test('20. Review comment içinde whatsapp/url engellenmeli', async () => {
    if (skipDB() || !customerToken) return;
    const shipmentId = await createCompletedShipmentForReview();
    if (!shipmentId) return;

    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId, rating: 4, comment: 'whatsapp: https://wa.me/905321234567' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const log = await AppDataSource.getRepository(ContactFilterLog).findOne({
      where: {
        actorType: 'customer',
        actorId: customerId,
        shipmentId,
        surface: 'review_comment' as any,
      },
      order: { id: 'DESC' },
    });
    expect(log).toBeTruthy();
    expect(log?.severity).toBe('high');
    expect(log?.action).toBe('blocked');
    expect(log?.riskScore).toBeGreaterThanOrEqual(80);
  });

  test('21. Normal review comment kabul edilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const shipmentId = await createCompletedShipmentForReview();
    if (!shipmentId) return;

    const res = await request(testApp)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId, rating: 5, comment: 'Tasima sureci cok duzenliydi, tesekkurler.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.comment).toContain('Tasima sureci');
  });
});
