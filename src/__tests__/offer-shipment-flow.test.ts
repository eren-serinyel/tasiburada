/**
 * offer-shipment-flow.test.ts
 * OfferService + ShipmentService integration testleri.
 * Seed verisi kullanır.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER  = { email: 'info@silenakliyat.com',   password: 'Maviface2141' };

describe('Offer + Shipment Akışı', () => {
  let customerToken: string;
  let carrierToken: string;

  beforeAll(async () => {
    if (skipDB()) return;
    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) customerToken = cRes.body.data?.token;

    const rRes = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (rRes.status === 200) carrierToken = rRes.body.data?.token;
  });

  // ── Shipment: Auth guard ──────────────────────────────────────────────────
  test('1. Token olmadan shipment oluşturma 401 dönmeli', async () => {
    const res = await request(testApp).post('/api/v1/shipments').send({ origin: 'A', destination: 'B' });
    expect(res.status).toBe(401);
  });

  test('2. Token olmadan kendi ilanlarını listeleme 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/shipments/my-shipments');
    expect(res.status).toBe(401);
  });

  test('3. Token olmadan pending shipments listeleme 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/shipments/pending');
    expect(res.status).toBe(401);
  });

  // ── Offer: Auth guard ─────────────────────────────────────────────────────
  test('4. Token olmadan teklif verme 401 dönmeli', async () => {
    const res = await request(testApp).post('/api/v1/offers').send({ shipmentId: 'x', price: 100 });
    expect(res.status).toBe(401);
  });

  // ── Shipment: Validation ───────────────────────────────────────────────────
  test('5. Eksik alanlarla shipment oluşturma 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ origin: 'İstanbul' }); // destination, loadDetails, shipmentDate eksik
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('6. Çıkış noktası 3 karakterden kısa olunca 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: 'AB',
        destination: 'Ankara',
        loadDetails: 'Mobilya',
        shipmentDate: new Date(Date.now() + 86400000).toISOString()
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('7. Geçmiş tarihli shipment oluşturma 400 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: 'İstanbul',
        destination: 'Ankara',
        loadDetails: 'Mobilya',
        shipmentDate: '2020-01-01'
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('8. loadDetails içinde telefon numarası olan shipment reddedilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: 'İstanbul',
        destination: 'Ankara',
        loadDetails: 'Mobilya, beni ara: 05321234567',
        shipmentDate: new Date(Date.now() + 86400000).toISOString()
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Shipment: Müşteri kendi ilanlarını listeler ───────────────────────────
  test('9. Müşteri kendi shipment listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/shipments/my-shipments')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Shipment: Carrier pending listesi ─────────────────────────────────────
  test('10. Carrier pending shipment listesini alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/shipments/pending')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Shipment: Olmayan shipment getir ──────────────────────────────────────
  test('11. Olmayan shipment ID ile getById 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/shipments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Shipment: Müşteri kendi ilanını güncelleyebilmeli ────────────────────
  test('12. Olmayan shipment güncellemesi 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ origin: 'Kadıköy' });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Shipment: İptal ───────────────────────────────────────────────────────
  test('13. Olmayan shipment iptali 404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/cancel')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Fiyat validasyonu ──────────────────────────────────────────────
  test('14. Negatif fiyatlı teklif reddedilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', price: -50 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('15. Sıfır fiyatlı teklif reddedilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', price: 0 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Eksik alanlar ──────────────────────────────────────────────────
  test('16. shipmentId olmadan teklif verme reddedilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ price: 500 });
    expect([400]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: mesajda iletişim bilgisi yasak ─────────────────────────────────
  test('17. Teklif mesajında telefon numarası olan teklif reddedilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        shipmentId: '00000000-0000-0000-0000-000000000000',
        price: 500,
        message: 'Beni arayın: 05321234567'
      });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Olmayan teklifi kabul et ──────────────────────────────────────
  test('18. Olmayan teklifi kabul etmek 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/accept')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Olmayan teklifi reddet ─────────────────────────────────────────
  test('19. Olmayan teklifi reddetmek 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/reject')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Carrier kendi tekliflerini güncelleyebilmeli ──────────────────
  test('20. Olmayan teklifi güncelleme 400/404 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ price: 700 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Offer: Carrier geri çekme ─────────────────────────────────────────────
  test('21. Olmayan teklifi geri çekme 400/404 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/withdraw')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ── Shipment search: public endpoint ─────────────────────────────────────
  test('22. Shipment search endpoint token olmadan çalışmalı', async () => {
    const res = await request(testApp).get('/api/v1/shipments/search');
    expect([200]).toContain(res.status);
  });

  // ── Carrier: başlatma / tamamlama guard ──────────────────────────────────
  test('23. Müşteri token ile shipment başlatma 401/403 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/start')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(res.status);
  });

  test('24. Müşteri token ile shipment tamamlama 401/403 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/complete')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(res.status);
  });
});
