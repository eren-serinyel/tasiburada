/**
 * carrier-flow.test.ts
 * Nakliyeci uçtan uca akış testleri (API / Integration)
 *
 * Gereksinim: MySQL bağlantısı (globalSetup tarafından sağlanır).
 * DB yoksa testler otomatik olarak atlanır.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Nakliyeci Akışı — Uçtan Uca', () => {
  let carrierToken: string;
  let carrierId: string;
  const testEmail = `carrier_${Date.now()}@test.com`;

  // ── 1. Nakliyeci kaydı ────────────────────────────────────────────────────
  test('1. Nakliyeci kayıt olabilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/carriers/register')
      .send({
        companyName: 'Test Nakliyat AŞ',
        taxNumber: `${Date.now()}`.slice(-10),
        contactName: 'Ali Veli',
        phone: '05321234567',
        email: testEmail,
        password: 'Test1234!',
        activityCity: 'İstanbul',
        foundedYear: 2015,
        vehicleTypeIds: [],
      });

    expect([200, 201]).toContain(res.status);
    const token = res.body.token || res.body.data?.token;
    if (token) carrierToken = token;
    const id = res.body.carrier?.id || res.body.data?.carrier?.id || res.body.id;
    if (id) carrierId = id;
  });

  // ── 2. Nakliyeci girişi ───────────────────────────────────────────────────
  test('2. Nakliyeci giriş yapabilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send({ email: testEmail, password: 'Test1234!' });

    expect([200, 201]).toContain(res.status);
    const token = res.body.token || res.body.data?.token;
    if (token) carrierToken = token;
    const id = res.body.carrier?.id || res.body.data?.id;
    if (id) carrierId = id;
  });

  // ── 3. Profil görüntüleme ─────────────────────────────────────────────────
  test('3. Nakliyeci kendi profilini görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── 4. Bekleyen ilanlar listesi ───────────────────────────────────────────
  test('4. Carrier token ile bekleyen ilanları görebilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .get('/api/v1/shipments/pending')
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(Array.isArray(data) || Array.isArray(data.shipments)).toBe(true);
  });

  // ── 5. 0 TL teklif validasyonu ────────────────────────────────────────────
  test('5. Sıfır TL teklif backend tarafından reddedilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        shipmentId: '00000000-0000-0000-0000-000000000000',
        price: 0,
        message: 'Geçersiz teklif',
      });

    // price=0 → 400 Bad Request beklenir
    expect([400, 422]).toContain(res.status);
  });

  // ── 6. Kazanç geçmişi ─────────────────────────────────────────────────────
  test('6. Kazanç geçmişi endpoint çalışmalı', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .get('/api/v1/carriers/me/earnings-history')
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(200);
  });

  // ── 7. Araç bilgileri güncelleme (company-info endpoint) ──────────────────
  test('7. Araç bilgileri company-info endpoint\'i üzerinden kaydedilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/company-info')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        vehicleBrand: 'Mercedes',
        vehicleModel: 'Sprinter',
        vehicleYear: 2020,
        vehicleCapacityM3: 15,
      });

    expect([200, 201]).toContain(res.status);
  });

  // ── 8. Faaliyet bilgileri güncelleme ──────────────────────────────────────
  test('8. Nakliyeci faaliyet bilgilerini güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        city: 'İstanbul',
        district: 'Kadıköy',
        serviceAreas: ['Anadolu Yakası'],
        availableDates: ['2026-05-01', '2026-05-02'],
      });

    expect([200, 201]).toContain(res.status);
  });

  // ── 9. Token olmadan nakliyeci profili erişim engeli ──────────────────────
  test('9. Token olmadan /carriers/me erişilememeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/carriers/me');

    expect(res.status).toBe(401);
  });

  // ── 10. Müşteri token ile nakliyeci istatistikleri erişim engeli ──────────
  test('10. Token olmadan teklif oluşturulamamalı', async () => {
    const res = await request(testApp)
      .post('/api/v1/offers')
      .send({ shipmentId: 1, price: 1000 });

    expect(res.status).toBe(401);
  });
});
