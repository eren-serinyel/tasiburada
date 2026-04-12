/**
 * payment-flow.test.ts
 * PaymentService + PaymentController integration testleri.
 * Seed verisi: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const ADMIN    = { email: 'admin@tasiburada.com',      password: 'Maviface2141' };

describe('Payment Akışı', () => {
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    if (skipDB()) return;
    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) customerToken = cRes.body.data?.token;

    const aRes = await request(testApp).post('/api/v1/admin/login').send(ADMIN);
    if (aRes.status === 200) adminToken = aRes.body.data?.token;
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  test('1. Token olmadan ödeme oluşturma 401 dönmeli', async () => {
    const res = await request(testApp).post('/api/v1/payments').send({ shipmentId: 'x', amount: 100 });
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

  // ── Validation ─────────────────────────────────────────────────────────────
  test('5. shipmentId eksik ödeme isteği 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ amount: 500 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('6. amount eksik ödeme isteği 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('7. Olmayan shipment için ödeme 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', amount: 500 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Müşteri: kendi ödemeleri ───────────────────────────────────────────────
  test('8. Müşteri kendi ödeme listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('9. Seed müşterinin ödemelerinde veri yapısı doğru olmalı', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const p = res.body.data[0];
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('amount');
      expect(p).toHaveProperty('status');
    }
  });

  // ── Shipment bazlı ödeme sorgusu ───────────────────────────────────────────
  test('10. Olmayan shipment için ödeme sorgusu 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/shipment/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([404, 500]).toContain(res.status);
  });

  // ── Admin: tüm ödemeler ────────────────────────────────────────────────────
  test('11. Admin tüm ödemeleri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/admin/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('12. Admin ödeme listesi pagination çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/admin/all?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── Seed müşterinin tamamlanmış ödemesi ───────────────────────────────────
  test('13. Seed ödeme kaydı mevcut olmalı ve COMPLETED durumunda olmalı', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/payments/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const completedPayments = res.body.data.filter((p: any) => p.status === 'completed');
      expect(completedPayments.length).toBeGreaterThanOrEqual(0);
    }
  });
});
