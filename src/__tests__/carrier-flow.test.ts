/**
 * carrier-flow.test.ts
 * Nakliyeci uçtan uca akış testleri — seed verisi kullanır.
 * Seed hesap: info@silenakliyat.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

describe('Nakliyeci Akışı — Uçtan Uca', () => {
  let carrierToken: string;

  // ── 1. Nakliyeci girişi ───────────────────────────────────────────────────
  test('1. Seed nakliyeci giriş yapabilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send(CARRIER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    carrierToken = res.body.data.token;
    expect(carrierToken).toBeTruthy();
    expect(res.body.data.carrier).toBeDefined();
    expect(res.body.data.carrier.email).toBe(CARRIER.email);
  });

  // ── 2. Profil görüntüleme ─────────────────────────────────────────────────
  test('2. Nakliyeci kendi profilini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── 3. Profil durumu ──────────────────────────────────────────────────────
  test('3. Nakliyeci profil durumunu kontrol edebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 4. İstatistikler ─────────────────────────────────────────────────────
  test('4. Nakliyeci istatistiklerini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/stats')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 5. Bekleyen ilanlar listesi ───────────────────────────────────────────
  test('5. Nakliyeci bekleyen ilanları görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/shipments/pending')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
  });

  // ── 6. Tekliflerini listeleme ─────────────────────────────────────────────
  test('6. Nakliyeci kendi tekliflerini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/offers')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 7. Kazanç geçmişi ─────────────────────────────────────────────────────
  test('7. Kazanç geçmişi endpoint çalışmalı', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/earnings-history')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 8. Faaliyet bilgileri ─────────────────────────────────────────────────
  test('8. Nakliyeci faaliyet bilgilerini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 9. Davetler ───────────────────────────────────────────────────────────
  test('9. Nakliyeci davetlerini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/invites')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 10. Değerlendirmeler ──────────────────────────────────────────────────
  test('10. Nakliyeci kendi değerlendirmelerini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/reviews')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 11. Nakliyeci arama (public) ──────────────────────────────────────────
  test('11. Nakliyeci arama endpoint erişilebilmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/search');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 12. Müsaitlik özeti (public) ──────────────────────────────────────────
  test('12. Müsaitlik özeti endpoint erişilebilmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/availability-summary');
    expect([200, 400]).toContain(res.status); // 400 if required query params missing
  });

  // ── 13. Token olmadan profil erişim engeli ────────────────────────────────
  test('13. Token olmadan /carriers/me erişilememeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/me');
    expect(res.status).toBe(401);
  });

  // ── 14. Token olmadan teklif oluşturma engeli ─────────────────────────────
  test('14. Token olmadan teklif oluşturulamamalı', async () => {
    const res = await request(testApp)
      .post('/api/v1/offers')
      .send({ shipmentId: 1, price: 1000 });
    expect(res.status).toBe(401);
  });

  // ── 15. Müşteri eposta ile nakliyeci girişi 403 ───────────────────────────
  test('15. Müşteri e-postası ile nakliyeci girişi 403 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ek describe blokları — Genişletilmiş nakliyeci testleri
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = '/api/v1';

describe('Teklif Verme — Validasyon', () => {
  let token: string;
  let pendingShipmentId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/carriers/login`).send(CARRIER);
    token = r.body.data?.token || '';

    const res = await request(testApp)
      .get(`${BASE}/shipments/pending`)
      .set('Authorization', `Bearer ${token}`);
    const data = res.body.data || [];
    if (Array.isArray(data) && data.length > 0) pendingShipmentId = data[0].id;
  });

  test('0 fiyatla teklif reddedilmeli', async () => {
    if (!token || !pendingShipmentId) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId: pendingShipmentId, price: 0, estimatedDuration: 4 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Negatif fiyatla teklif reddedilmeli', async () => {
    if (!token || !pendingShipmentId) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId: pendingShipmentId, price: -500, estimatedDuration: 4 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Var olmayan ilana teklif verilemez', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId: '00000000-0000-0000-0000-000000000000', price: 1000, estimatedDuration: 4 });
    expect([400, 404]).toContain(res.status);
  });

  test('shipmentId olmadan teklif verilemez', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 1000 });
    expect([400, 422]).toContain(res.status);
  });

  test('price string olarak gönderilince hata dönmeli', async () => {
    if (!token || !pendingShipmentId) return;
    const res = await request(testApp)
      .post(`${BASE}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentId: pendingShipmentId, price: 'bin-lira' });
    expect([400, 422]).toContain(res.status);
  });
});

describe('Profil — Response Güvenlik Kontrolü', () => {
  let token: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/carriers/login`).send(CARRIER);
    token = r.body.data?.token || '';
  });

  test('Carrier /me hassas alanlar içermemeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .get(`${BASE}/carriers/me`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const data = res.body.data || {};
    expect(data.passwordHash).toBeUndefined();
    expect(data.resetToken).toBeUndefined();
    expect(data.verificationToken).toBeUndefined();
  });

  test('Carrier login response hassas alanlar içermemeli', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const res = await request(testApp).post(`${BASE}/carriers/login`).send(CARRIER);
    expect(res.status).toBe(200);
    const carrier = res.body.data?.carrier || {};
    expect(carrier.passwordHash).toBeUndefined();
  });
});

describe('Nakliyeci Arama — Filtreler', () => {
  test('Şehire göre filtreleyebilmeli', async () => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ serviceCity: 'İstanbul' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Minimum puana göre filtreleyebilmeli', async () => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ minRating: 4 });
    expect(res.status).toBe(200);
  });

  test('Sadece onaylı nakliyecileri filtreleyebilmeli', async () => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ isVerified: true });
    expect(res.status).toBe(200);
  });

  test('Sayfalama çalışmalı', async () => {
    const [page1, page2] = await Promise.all([
      request(testApp).get(`${BASE}/carriers/search`).query({ offset: 0, limit: 3 }),
      request(testApp).get(`${BASE}/carriers/search`).query({ offset: 3, limit: 3 }),
    ]);
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const items1 = page1.body.data?.items || [];
    const items2 = page2.body.data?.items || [];
    if (items1.length > 0 && items2.length > 0) {
      // Offset farklı olduğundan farklı sonuçlar gelmeli (yeterli kayıt varsa)
      const ids1 = items1.map((i: any) => i.id);
      const ids2 = items2.map((i: any) => i.id);
      const overlap = ids1.filter((id: string) => ids2.includes(id));
      expect(overlap.length).toBeLessThan(items1.length);
    }
  });

  test('Arama sonuçlarında email gizlenmeli', async () => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ limit: 5 });
    expect(res.status).toBe(200);
    const items = res.body.data?.items || [];
    items.forEach((c: any) => {
      expect(c.email).toBeUndefined();
      expect(c.passwordHash).toBeUndefined();
      expect(c.companyName).toBeDefined();
    });
  });

  test('Arama sonuçlarında rating alanı olmalı', async () => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ limit: 5 });
    const items = res.body.data?.items || [];
    if (items.length > 0) {
      expect(items[0]).toHaveProperty('rating');
    }
  });
});

describe('Nakliyeci Detay — Public', () => {
  let carrierId: string;

  beforeAll(async () => {
    const res = await request(testApp).get(`${BASE}/carriers/search`).query({ limit: 1 });
    const items = res.body.data?.items || [];
    if (items.length > 0) carrierId = items[0].id;
  });

  test('Nakliyeci detay sayfası public erişilebilmeli', async () => {
    if (!carrierId) return;
    const res = await request(testApp).get(`${BASE}/carriers/${carrierId}/detail`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Var olmayan nakliyeci detayı 404 dönmeli', async () => {
    const res = await request(testApp).get(`${BASE}/carriers/00000000-0000-0000-0000-000000000000/detail`);
    expect([404, 400]).toContain(res.status);
  });

  test('Nakliyeciye ait değerlendirmeler public görüntülenebilmeli', async () => {
    if (!carrierId) return;
    const res = await request(testApp).get(`${BASE}/reviews/carrier/${carrierId}`);
    expect(res.status).toBe(200);
  });
});
