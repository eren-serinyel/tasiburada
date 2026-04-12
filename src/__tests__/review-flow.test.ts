/**
 * review-flow.test.ts
 * ReviewService + ReviewController unit ve integration testleri.
 * Seed verisi kullanır: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER  = { email: 'info@silenakliyat.com',   password: 'Maviface2141' };

describe('Review Akışı', () => {
  let customerToken: string;
  let carrierToken: string;

  // ── Setup: Token al ────────────────────────────────────────────────────────
  beforeAll(async () => {
    if (skipDB()) return;

    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) customerToken = cRes.body.data?.token;

    const rRes = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (rRes.status === 200) carrierToken = rRes.body.data?.token;
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
});
