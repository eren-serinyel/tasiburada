/**
 * customer-flow.test.ts
 * Müşteri uçtan uca akış testleri — seed verisi kullanır.
 * Seed hesap: ahmet.yilmaz0@gmail.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };

describe('Müşteri Akışı — Uçtan Uca', () => {
  let customerToken: string;

  // ── 1. Giriş ──────────────────────────────────────────────────────────────
  test('1. Seed müşteri giriş yapabilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/customers/login')
      .send(CUSTOMER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    customerToken = res.body.data.token;
    expect(customerToken).toBeTruthy();
    expect(res.body.data.customer).toBeDefined();
    expect(res.body.data.customer.email).toBe(CUSTOMER.email);
  });

  // ── 2. Profil görüntüleme ──────────────────────────────────────────────────
  test('2. Müşteri profil bilgisini çekebilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/profile')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(CUSTOMER.email);
  });

  // ── 3. Adres listesi ─────────────────────────────────────────────────────
  test('3. Müşteri adres listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── 4. İlanlarını listeleme ────────────────────────────────────────────────
  test('4. Müşteri kendi taşıma ilanlarını görebilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/shipments')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 5. Teklifleri listeleme ────────────────────────────────────────────────
  test('5. Müşteri aldığı teklifleri görebilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/offers')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 6. Favori nakliyeciler ─────────────────────────────────────────────────
  test('6. Müşteri favori nakliyeci listesini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/me/favorites')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 7. Bildirimler ────────────────────────────────────────────────────────
  test('7. Müşteri bildirimlerini alabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 8. Okunmamış bildirim sayısı ──────────────────────────────────────────
  test('8. Okunmamış bildirim sayısı alınabilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 9. Token olmadan profil erişimi engeli ────────────────────────────────
  test('9. Token olmadan profil erişilememeli', async () => {
    const res = await request(testApp).get('/api/v1/customers/profile');
    expect(res.status).toBe(401);
  });

  // ── 10. Token olmadan ilan oluşturma engeli ───────────────────────────────
  test('10. Token olmadan ilan oluşturulamamalı', async () => {
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .send({ origin: 'Test', destination: 'Test' });
    expect(res.status).toBe(401);
  });

  // ── 11. Var olan e-posta ile tekrar kayıt engeli ──────────────────────────
  test('11. Mevcut e-posta ile tekrar kayıt reddedilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/customers/register')
      .send({
        firstName: 'Tekrar', lastName: 'Deneme',
        email: CUSTOMER.email, phone: '05001112233',
        city: 'İstanbul', password: 'Maviface2141',
      });
    expect(res.status).toBe(400);
  });

  // ── 12. Yanlış şifre ile giriş ───────────────────────────────────────────
  test('12. Yanlış şifre ile giriş reddedilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: CUSTOMER.email, password: 'YanlışŞifre99!' });
    expect(res.status).toBe(401);
  });

  // ── 13. Nakliyeci gibi giriş 403 ─────────────────────────────────────────
  test('13. Müşteri e-postası ile nakliyeci girişi 403 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send(CUSTOMER);
    expect(res.status).toBe(403);
  });

  // ── 14. Zorunlu alan eksik validasyonu ────────────────────────────────────
  test('14. Zorunlu alan eksik olduğunda kayıt reddedilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/customers/register')
      .send({
        lastName: 'User',
        email: `missing_${Date.now()}@example.com`,
        phone: '05551112233', city: 'Ankara', password: 'Maviface2141',
      });
    expect(res.status).toBe(400);
  });

  // ── 15. Önceki nakliyeciler ───────────────────────────────────────────────
  test('15. Müşteri daha önce çalıştığı nakliyecileri görebilmeli', async () => {
    if (skipDB() || !customerToken) return;
    const res = await request(testApp)
      .get('/api/v1/customers/me/previous-carriers')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ek describe blokları — Genişletilmiş müşteri testleri
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = '/api/v1';

describe('İlan Oluşturma — Validasyon', () => {
  let token: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';
  });

  test('Geçmiş tarihli ilan reddedilmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: 'İstanbul, Kadıköy', destination: 'Ankara, Çankaya',
        shipmentDate: '2020-01-01', loadDetails: 'Ev Eşyası', weight: 500,
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Çıkış ve varış aynı şehir olabilmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: 'İstanbul, Kadıköy', destination: 'İstanbul, Beşiktaş',
        shipmentDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        loadDetails: 'Parça Eşya', weight: 100,
      });
    expect([201, 400]).toContain(res.status);
  });

  test('origin eksik olduğunda 400 dönmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ destination: 'Ankara, Çankaya', shipmentDate: new Date(Date.now() + 5 * 86400000).toISOString(), loadDetails: 'Test', weight: 100 });
    expect(res.status).toBe(400);
  });

  test('destination eksik olduğunda 400 dönmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'İstanbul, Kadıköy', shipmentDate: new Date(Date.now() + 5 * 86400000).toISOString(), loadDetails: 'Test', weight: 100 });
    expect(res.status).toBe(400);
  });

  test('loadDetails eksik olduğunda 400 dönmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'İstanbul, Kadıköy', destination: 'Ankara, Çankaya', shipmentDate: new Date(Date.now() + 5 * 86400000).toISOString(), weight: 100 });
    expect(res.status).toBe(400);
  });

  test('shipmentDate eksik olduğunda 400 dönmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'İstanbul, Kadıköy', destination: 'Ankara, Çankaya', loadDetails: 'Test', weight: 100 });
    expect(res.status).toBe(400);
  });

  test('Çok kısa origin reddedilmeli (min 3 karakter)', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/shipments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ origin: 'AB', destination: 'Ankara, Çankaya', shipmentDate: new Date(Date.now() + 5 * 86400000).toISOString(), loadDetails: 'Test', weight: 100 });
    expect(res.status).toBe(400);
  });
});

describe('Teklif Yönetimi — Business Rules', () => {
  let token: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';
  });

  test('Kabul edilmiş teklif tekrar kabul edilememeli', async () => {
    if (!token) return;
    const offers = await request(testApp)
      .get(`${BASE}/customers/offers`)
      .set('Authorization', `Bearer ${token}`);
    const data = offers.body.data || [];
    const accepted = data.find((o: any) => o.status?.toLowerCase() === 'accepted');
    if (!accepted) return;

    const res = await request(testApp)
      .put(`${BASE}/offers/${accepted.id}/accept`)
      .set('Authorization', `Bearer ${token}`);
    expect([400, 409, 422]).toContain(res.status);
  });

  test('Reddedilmiş teklif kabul edilememeli', async () => {
    if (!token) return;
    const offers = await request(testApp)
      .get(`${BASE}/customers/offers`)
      .set('Authorization', `Bearer ${token}`);
    const data = offers.body.data || [];
    const rejected = data.find((o: any) => o.status?.toLowerCase() === 'rejected');
    if (!rejected) return;

    const res = await request(testApp)
      .put(`${BASE}/offers/${rejected.id}/accept`)
      .set('Authorization', `Bearer ${token}`);
    expect([400, 409, 422]).toContain(res.status);
  });

  test('Var olmayan teklif kabul edilememeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .put(`${BASE}/offers/00000000-0000-0000-0000-000000000000/accept`)
      .set('Authorization', `Bearer ${token}`);
    expect([400, 404]).toContain(res.status);
  });
});

describe('Favori Nakliyeciler — Business Rules', () => {
  let token: string;
  let carrierId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';

    const search = await request(testApp).get(`${BASE}/carriers/search`).query({ page: 1, limit: 1 });
    const items = search.body.data?.items || [];
    if (items.length > 0) carrierId = items[0].id;
  });

  test('Nakliyeciyi favoriye ekleyebilmeli', async () => {
    if (!token || !carrierId) return;
    const res = await request(testApp)
      .post(`${BASE}/customers/me/favorites/${carrierId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.data).toHaveProperty('added');
  });

  test('Aynı nakliyeciyi tekrar toggle edince çıkarmalı/eklemeli', async () => {
    if (!token || !carrierId) return;
    const res = await request(testApp)
      .post(`${BASE}/customers/me/favorites/${carrierId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 201]).toContain(res.status);
    expect(typeof res.body.data?.added).toBe('boolean');
  });

  test('Olmayan nakliyeciyi favoriye ekleme denemesi', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/customers/me/favorites/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400, 404, 500]).toContain(res.status);
  });

  test('Favori ID listesi alınabilmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .get(`${BASE}/customers/me/favorites/ids`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Adres Defteri — Business Rules', () => {
  let token: string;
  let addressId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';
  });

  test('Adres ekleyebilmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/customers/me/addresses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Test Ofis', addressLine1: 'Test Bulvarı No:42', city: 'İstanbul', district: 'Şişli', isDefault: false });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    addressId = res.body.data?.id;
  });

  test('Adresi varsayılan yapabilmeli', async () => {
    if (!token || !addressId) return;
    const res = await request(testApp)
      .put(`${BASE}/customers/me/addresses/${addressId}/default`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('addressLine1 eksik adres eklenememeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .post(`${BASE}/customers/me/addresses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Eksik', city: 'İstanbul', district: 'Merkez' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Adresi silebilmeli', async () => {
    if (!token || !addressId) return;
    const res = await request(testApp)
      .delete(`${BASE}/customers/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('Silinmiş adresi tekrar silmek hata dönmeli', async () => {
    if (!token || !addressId) return;
    const res = await request(testApp)
      .delete(`${BASE}/customers/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([400, 404]).toContain(res.status);
  });
});

describe('Ödeme Geçmişi', () => {
  let token: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';
  });

  test('Ödeme geçmişi success:true ve array dönmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .get(`${BASE}/payments/my`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('Token olmadan ödeme geçmişi 401 dönmeli', async () => {
    const res = await request(testApp).get(`${BASE}/payments/my`);
    expect(res.status).toBe(401);
  });
});

describe('Profil Güncelleme', () => {
  let token: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const r = await request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER);
    token = r.body.data?.token || '';
  });

  test('Profil güncellenebilmeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .put(`${BASE}/customers/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Ahmet', lastName: 'Yılmaz' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Profil response hassas alan içermemeli', async () => {
    if (!token) return;
    const res = await request(testApp)
      .get(`${BASE}/customers/profile`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.resetToken).toBeUndefined();
  });
});
