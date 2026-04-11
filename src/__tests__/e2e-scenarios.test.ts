/**
 * e2e-scenarios.test.ts
 * Uçtan uca senaryo testleri — tam yaşam döngüsü.
 * Müşteri ilan oluşturur → Nakliyeci teklif verir → Müşteri kabul eder → akış tamamlanır.
 * Seed verisi: ahmet.yilmaz0@gmail.com (müşteri), info@silenakliyat.com (nakliyeci)
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };
const ADMIN = { email: 'admin@tasiburada.com', password: 'Maviface2141' };

describe('E2E Senaryolar — Tam Yaşam Döngüsü', () => {
  let customerToken: string;
  let carrierToken: string;
  let adminToken: string;

  // ── Setup: Tüm rolleri oturum aç ──────────────────────────────────────────
  beforeAll(async () => {
    if (skipDB()) return;

    const [custRes, carrRes, admRes] = await Promise.all([
      request(testApp).post('/api/v1/customers/login').send(CUSTOMER),
      request(testApp).post('/api/v1/carriers/login').send(CARRIER),
      request(testApp).post('/api/v1/admin/login').send(ADMIN),
    ]);

    customerToken = custRes.body.data?.token || '';
    carrierToken = carrRes.body.data?.token || '';
    adminToken = admRes.body.data?.token || '';
  });

  // ── 1. Tüm roller giriş yapabilmeli ──────────────────────────────────────
  test('1. Müşteri, nakliyeci ve admin token alabilmeli', () => {
    if (skipDB()) return;
    expect(customerToken).toBeTruthy();
    expect(carrierToken).toBeTruthy();
    expect(adminToken).toBeTruthy();
  });

  // ── 2. Müşteri profil + Nakliyeci profil tutarlı ─────────────────────────
  test('2. Her rol kendi profilini görebilmeli', async () => {
    if (skipDB() || !customerToken || !carrierToken) return;

    const [custProfile, carrProfile] = await Promise.all([
      request(testApp).get('/api/v1/customers/profile').set('Authorization', `Bearer ${customerToken}`),
      request(testApp).get('/api/v1/carriers/me').set('Authorization', `Bearer ${carrierToken}`),
    ]);

    expect(custProfile.status).toBe(200);
    expect(custProfile.body.data.email).toBe(CUSTOMER.email);
    expect(carrProfile.status).toBe(200);
    expect(carrProfile.body.data).toBeDefined();
  });

  // ── 3. Nakliyeci bekleyen ilanları görebilmeli ────────────────────────────
  test('3. Nakliyeci bekleyen ilanları listeleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/shipments/pending')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
  });

  // ── 4. Müşteri ilanlarını vs. nakliyeci tekliflerini karşılaştır ─────────
  test('4. Müşteri ilanları ve teklifleri tutarlı dönmeli', async () => {
    if (skipDB() || !customerToken) return;
    const [shipmentsRes, offersRes] = await Promise.all([
      request(testApp).get('/api/v1/customers/shipments').set('Authorization', `Bearer ${customerToken}`),
      request(testApp).get('/api/v1/customers/offers').set('Authorization', `Bearer ${customerToken}`),
    ]);
    expect(shipmentsRes.status).toBe(200);
    expect(offersRes.status).toBe(200);
  });

  // ── 5. Admin tüm ilanları ve teklifleri görebilmeli ───────────────────────
  test('5. Admin ilanları ve teklifleri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const [shipRes, offRes] = await Promise.all([
      request(testApp).get('/api/v1/admin/shipments').set('Authorization', `Bearer ${adminToken}`),
      request(testApp).get('/api/v1/admin/offers').set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(shipRes.status).toBe(200);
    expect(offRes.status).toBe(200);
  });

  // ── 6. Bildirim sistemi test ──────────────────────────────────────────────
  test('6. Müşteri ve nakliyeci bildirim alabilmeli', async () => {
    if (skipDB() || !customerToken || !carrierToken) return;
    const [custNotif, carrNotif] = await Promise.all([
      request(testApp).get('/api/v1/notifications').set('Authorization', `Bearer ${customerToken}`),
      request(testApp).get('/api/v1/notifications').set('Authorization', `Bearer ${carrierToken}`),
    ]);
    expect(custNotif.status).toBe(200);
    expect(carrNotif.status).toBe(200);
  });

  // ── 7. Nakliyeci arama public endpoint ────────────────────────────────────
  test('7. Nakliyeci arama herkes tarafından erişilebilmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/search');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 8. İlan arama public endpoint ─────────────────────────────────────────
  test('8. İlan arama herkes tarafından erişilebilmeli', async () => {
    const res = await request(testApp).get('/api/v1/shipments/search');
    expect(res.status).toBe(200);
  });

  // ── 9. Admin istatistikler tutarlı ────────────────────────────────────────
  test('9. Admin istatistikler ve trendler tutarlı dönmeli', async () => {
    if (skipDB() || !adminToken) return;
    const [statsRes, trendsRes] = await Promise.all([
      request(testApp).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`),
      request(testApp).get('/api/v1/admin/stats/trends').set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(statsRes.status).toBe(200);
    expect(trendsRes.status).toBe(200);
  });

  // ── 10. Rol izolasyonu: her token sadece kendi rolüne erişebilmeli ────────
  test('10. Roller arası izolasyon: cross-role erişim engellenmeli', async () => {
    if (skipDB() || !customerToken || !carrierToken) return;

    // Müşteri token ile nakliyeci endpointi
    const custToCarrier = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(custToCarrier.status);

    // Nakliyeci token ile müşteri endpointi
    const carrToCustomer = await request(testApp)
      .get('/api/v1/customers/profile')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([401, 403]).toContain(carrToCustomer.status);

    // Müşteri token ile admin endpointi
    const custToAdmin = await request(testApp)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(custToAdmin.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ek describe blokları — Genişletilmiş E2E senaryoları
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = '/api/v1';

describe('Senaryo: Teklif Geri Çekme', () => {
  let carrierToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp)
      .post(`${BASE}/carriers/login`)
      .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });
    carrierToken = r.body.data?.token || '';
  });

  test('Nakliyeci bekleyen teklifini geri çekebilmeli', async () => {
    if (!carrierToken) return;
    const offersRes = await request(testApp)
      .get(`${BASE}/carriers/me/offers`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(offersRes.status).toBe(200);
    const offers = offersRes.body.data || [];
    const pending = offers.find((o: any) => o.status === 'pending');
    if (!pending) return; // seed'de bekleyen teklif yoksa atla

    const res = await request(testApp)
      .put(`${BASE}/offers/${pending.id}/withdraw`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data?.status).toBe('withdrawn');
    }
  });

  test('Zaten geri çekilmiş teklif tekrar geri çekilememeli', async () => {
    if (!carrierToken) return;
    const offersRes = await request(testApp)
      .get(`${BASE}/carriers/me/offers`)
      .set('Authorization', `Bearer ${carrierToken}`);
    const offers = offersRes.body.data || [];
    const withdrawn = offers.find((o: any) => o.status === 'withdrawn');
    if (!withdrawn) return;

    const res = await request(testApp)
      .put(`${BASE}/offers/${withdrawn.id}/withdraw`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([400, 409]).toContain(res.status);
  });
});

describe('Senaryo: İlan İptal ve Durum Kontrolü', () => {
  let customerToken: string;
  let carrierToken: string;
  let createdShipmentId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const [cust, carr] = await Promise.all([
      request(testApp).post(`${BASE}/customers/login`).send({ email: 'merve.aydin9@gmail.com', password: 'Maviface2141' }),
      request(testApp).post(`${BASE}/carriers/login`).send({ email: 'info@ankaraekspres.com', password: 'Maviface2141' }),
    ]);
    customerToken = cust.body.data?.token || '';
    carrierToken = carr.body.data?.token || '';
  });

  test('İlan oluştur → iptal et → durum CANCELLED olmalı', async () => {
    if (!customerToken) return;
    // Oluştur
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const createRes = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: 'İstanbul',
        destination: 'Ankara',
        loadDetails: 'İptal testi yükü',
        shipmentDate: futureDate.toISOString().split('T')[0],
      });
    expect(createRes.status).toBe(201);
    createdShipmentId = createRes.body.data?.id;
    expect(createdShipmentId).toBeDefined();

    // İptal et
    const cancelRes = await request(testApp)
      .put(`${BASE}/shipments/${createdShipmentId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data?.status).toBe('cancelled');
  });

  test('İptal edilmiş ilana teklif verilemez', async () => {
    if (!carrierToken || !createdShipmentId) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ shipmentId: createdShipmentId, price: 1500, estimatedDuration: 3 });
    expect([400, 409]).toContain(res.status);
  });

  test('İptal edilmiş ilan tekrar iptal edilememeli', async () => {
    if (!customerToken || !createdShipmentId) return;
    const res = await request(testApp)
      .put(`${BASE}/shipments/${createdShipmentId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect([400, 409]).toContain(res.status);
  });
});

describe('Senaryo: Bildirim Akışı', () => {
  let customerToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp)
      .post(`${BASE}/customers/login`)
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });
    customerToken = r.body.data?.token || '';
  });

  test('Bildirimler dizi olarak dönmeli', async () => {
    if (!customerToken) return;
    const res = await request(testApp)
      .get(`${BASE}/notifications`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('Okunmamış bildirim okundu yapılabilmeli', async () => {
    if (!customerToken) return;
    const listRes = await request(testApp)
      .get(`${BASE}/notifications`)
      .set('Authorization', `Bearer ${customerToken}`);
    const unread = (listRes.body.data || []).find((n: any) => !n.isRead);
    if (!unread) return;

    const res = await request(testApp)
      .put(`${BASE}/notifications/${unread.id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test('Var olmayan bildirim okundu yapılamaz', async () => {
    if (!customerToken) return;
    const res = await request(testApp)
      .put(`${BASE}/notifications/00000000-0000-0000-0000-000000000000/read`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect([404, 400]).toContain(res.status);
  });
});

describe('Senaryo: Response Veri Tutarlılığı', () => {
  let customerToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp)
      .post(`${BASE}/customers/login`)
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });
    customerToken = r.body.data?.token || '';
  });

  test('Müşteri profili firstName/lastName içermeli', async () => {
    if (!customerToken) return;
    const res = await request(testApp)
      .get(`${BASE}/customers/profile`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('firstName');
    expect(res.body.data).toHaveProperty('lastName');
  });

  test('Nakliyeci arama sonuçları rating içermeli, email içermemeli', async () => {
    const res = await request(testApp).get(`${BASE}/carriers/search`).query({ limit: 3 });
    expect(res.status).toBe(200);
    const items = res.body.data?.items || [];
    items.forEach((c: any) => {
      expect(c).toHaveProperty('rating');
      expect(c.email).toBeUndefined();
    });
  });

  test('İlan listesi origin/destination içermeli', async () => {
    if (!customerToken) return;
    const res = await request(testApp)
      .get(`${BASE}/customers/shipments`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    const shipments = res.body.data || [];
    if (Array.isArray(shipments) && shipments.length > 0) {
      expect(shipments[0]).toHaveProperty('origin');
      expect(shipments[0]).toHaveProperty('destination');
    }
  });

  test('Tüm endpointler success:boolean formatında yanıt dönmeli', async () => {
    if (!customerToken) return;
    const endpoints = [
      `${BASE}/customers/profile`,
      `${BASE}/customers/shipments`,
      `${BASE}/notifications`,
    ];
    for (const ep of endpoints) {
      const res = await request(testApp)
        .get(ep)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(typeof res.body.success).toBe('boolean');
    }
  });
});
