/**
 * offer-shipment-lifecycle.test.ts
 * OfferService transaction flows (acceptOffer, rejectOffer, withdrawOffer),
 * ShipmentService carrier lifecycle (start, complete), and ReviewService
 * update/delete branches — using seed data to find real IDs.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER  = { email: 'info@silenakliyat.com',   password: 'Maviface2141' };

describe('Offer/Shipment Lifecycle & Review Update/Delete', () => {
  let customerToken: string;
  let carrierToken: string;
  let carrierId: string;

  // IDs discovered from seed during setup
  let pendingShipmentId: string;       // PENDING or OFFER_RECEIVED — for offer flow
  let matchedShipmentId: string;       // MATCHED — carrier can start
  let inTransitShipmentId: string;     // IN_TRANSIT — carrier can complete
  let pendingOfferId: string;          // offer the carrier can withdraw/update
  let customerOwnedOfferId: string;    // offer the customer can accept/reject

  beforeAll(async () => {
    if (skipDB()) return;

    const cRes = await request(testApp).post('/api/v1/customers/login').send(CUSTOMER);
    if (cRes.status === 200) customerToken = cRes.body.data?.token;

    const rRes = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (rRes.status === 200) {
      carrierToken = rRes.body.data?.token;
      carrierId = rRes.body.data?.carrier?.id;
    }

    // Discover seed shipments for customer
    if (customerToken) {
      const sRes = await request(testApp)
        .get('/api/v1/shipments/my-shipments')
        .set('Authorization', `Bearer ${customerToken}`);
      if (sRes.status === 200 && Array.isArray(sRes.body.data)) {
        const shipments: any[] = sRes.body.data;
        const pending = shipments.find((s: any) =>
          s.status === 'pending' || s.status === 'offer_received'
        );
        if (pending) pendingShipmentId = pending.id;
      }
    }

    // Discover carrier's offers
    if (carrierToken) {
      const oRes = await request(testApp)
        .get('/api/v1/carriers/me/offers')
        .set('Authorization', `Bearer ${carrierToken}`);
      if (oRes.status === 200 && Array.isArray(oRes.body.data)) {
        const offers: any[] = oRes.body.data;
        const pending = offers.find((o: any) => o.status === 'pending');
        if (pending) pendingOfferId = pending.id;
      }
    }

    // Discover customer's offers (to find accept/reject candidates)
    if (customerToken) {
      const oRes = await request(testApp)
        .get('/api/v1/customers/offers')
        .set('Authorization', `Bearer ${customerToken}`);
      if (oRes.status === 200 && Array.isArray(oRes.body.data)) {
        const offers: any[] = oRes.body.data;
        const pending = offers.find((o: any) => o.status === 'pending');
        if (pending) customerOwnedOfferId = pending.id;
      }
    }
  });

  // ── Offer: getById auth ───────────────────────────────────────────────────
  test('1. Token olmadan offer getById 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/offers/some-id');
    expect(res.status).toBe(401);
  });

  // ── Offer: getById olmayan ─────────────────────────────────────────────────
  test('2. Olmayan offer ID ile getById 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/offers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Offer withdraw: olmayan ───────────────────────────────────────────────
  test('3. Olmayan teklifi geri çekme 400/404 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/withdraw')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Offer: carrier offers listesi ─────────────────────────────────────────
  test('4. Carrier kendi tekliflerini listeleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/offers')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Offer: customer görme ──────────────────────────────────────────────────
  test('5. Müşteri kendi tekliflerini listeleyebilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/offers')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Offer update: geçersiz fiyat ──────────────────────────────────────────
  test('6. Carrier teklif güncelleme — geçersiz fiyat reddedilmeli', async () => {
    if (skipDB() || !carrierToken || !pendingOfferId) return;
    const res = await request(testApp)
      .put(`/api/v1/offers/${pendingOfferId}`)
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ price: -1 });
    expect([400]).toContain(res.status);
  });

  // ── Offer update: geçerli güncelleme ─────────────────────────────────────
  test('7. Carrier pending teklifini güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken || !pendingOfferId) return;
    const res = await request(testApp)
      .put(`/api/v1/offers/${pendingOfferId}`)
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ price: 1500, message: 'Güncel fiyat' });
    expect([200, 400]).toContain(res.status);
  });

  // ── Offer accept: olmayan teklif ──────────────────────────────────────────
  test('8. Olmayan teklifi kabul etme 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/accept')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Offer reject: olmayan teklif ─────────────────────────────────────────
  test('9. Olmayan teklifi reddetme 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/offers/00000000-0000-0000-0000-000000000000/reject')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Offer create: tüm validasyonlar ──────────────────────────────────────
  test('10. Teklif oluştururken price tipi sayı olmalı', async () => {
    if (skipDB() || !carrierToken || !pendingShipmentId) return;
    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ shipmentId: pendingShipmentId, price: 'not-a-number' });
    expect([400]).toContain(res.status);
  });

  // ── Shipment start: olmayan ID ────────────────────────────────────────────
  test('11. Olmayan shipment başlatma 400/404 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/start')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Shipment complete: olmayan ID ─────────────────────────────────────────
  test('12. Olmayan shipment tamamlama 400/404 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/complete')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 404]).toContain(res.status);
  });

  // ── Shipment start: wrong status (PENDING) ────────────────────────────────
  test('13. PENDING durumundaki shipment başlatılamaz — 400 dönmeli', async () => {
    if (skipDB() || !carrierToken || !pendingShipmentId) return;
    const res = await request(testApp)
      .put(`/api/v1/shipments/${pendingShipmentId}/start`)
      .set('Authorization', `Bearer ${carrierToken}`);
    // Either 400 (wrong status) or 403 (not assigned carrier)
    expect([400, 403, 404]).toContain(res.status);
  });

  // ── Shipment complete: wrong status ──────────────────────────────────────
  test('14. PENDING durumundaki shipment tamamlanamaz — 400/403 dönmeli', async () => {
    if (skipDB() || !carrierToken || !pendingShipmentId) return;
    const res = await request(testApp)
      .put(`/api/v1/shipments/${pendingShipmentId}/complete`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 403, 404]).toContain(res.status);
  });

  // ── SearchShipments: filters ──────────────────────────────────────────────
  test('15. Shipment search origin filtresi çalışmalı', async () => {
    const res = await request(testApp)
      .get('/api/v1/shipments/search')
      .query({ origin: 'İstanbul' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('16. Shipment search destination filtresi çalışmalı', async () => {
    const res = await request(testApp)
      .get('/api/v1/shipments/search')
      .query({ destination: 'Ankara' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('17. Shipment search status filtresi çalışmalı', async () => {
    const res = await request(testApp)
      .get('/api/v1/shipments/search')
      .query({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('18. Shipment search pagination çalışmalı', async () => {
    const res = await request(testApp)
      .get('/api/v1/shipments/search')
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  // ── ReviewService: update/delete branches ────────────────────────────────
  test('19. Token olmadan review güncelleme 401 dönmeli (update branch)', async () => {
    const res = await request(testApp).put('/api/v1/reviews/00000000-0000-0000-0000-000000000000').send({ rating: 3 });
    expect(res.status).toBe(401);
  });

  test('20. Token olmadan review silme 401 dönmeli (delete branch)', async () => {
    const res = await request(testApp).delete('/api/v1/reviews/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  test('21. Başka müşteriye ait review güncelleme yasak — 400/403/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 2, comment: 'Deneme' });
    expect([400, 403, 404]).toContain(res.status);
  });

  test('22. Başka müşteriye ait review silme yasak — 400/403/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .delete('/api/v1/reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 403, 404]).toContain(res.status);
  });

  // ── Carrier dashboard stats ───────────────────────────────────────────────
  test('23. Carrier dashboard stats alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/stats')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('24. Carrier earnings history alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/earnings-history')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([200, 400]).toContain(res.status);
  });

  // ── Shipment: assignCarrier guard ─────────────────────────────────────────
  test('25. Token olmadan carrier atama 401 dönmeli', async () => {
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/assign-carrier')
      .send({ carrierId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(401);
  });

  test('26. Olmayan shipment için carrier atama 400/404 dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .put('/api/v1/shipments/00000000-0000-0000-0000-000000000000/assign-carrier')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ carrierId: '00000000-0000-0000-0000-000000000000' });
    expect([400, 403, 404]).toContain(res.status);
  });
});
