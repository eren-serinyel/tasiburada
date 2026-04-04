/**
 * customer-flow.test.ts
 * Müşteri uçtan uca akış testleri (API / Integration)
 *
 * Gereksinim: MySQL bağlantısı (globalSetup tarafından sağlanır).
 * DB yoksa testler otomatik olarak atlanır.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Müşteri Akışı — Uçtan Uca', () => {
  let customerToken: string;
  const testEmail = `test_cust_${Date.now()}@example.com`;
  const testPhone = `053${String(Date.now()).slice(-8)}`.slice(0, 11);

  // ── 1. Kayıt ──────────────────────────────────────────────────────────────
  test('1. Müşteri kayıt olabilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/customers/register')
      .send({
        firstName: 'Test',
        lastName: 'Kullanici',
        email: testEmail,
        phone: testPhone,
        city: 'İstanbul',
        district: 'Kadıköy',
        addressLine1: 'Test Mah. Test Cad. No:1',
        password: 'Test1234',
      });

    expect([200, 201]).toContain(res.status);
    const token = res.body.token || res.body.data?.token;
    if (token) customerToken = token;
  });

  // ── 2. Giriş ──────────────────────────────────────────────────────────────
  test('2. Müşteri giriş yapabilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: testEmail, password: 'Test1234' });

    expect([200, 201]).toContain(res.status);
    const token = res.body.token || res.body.data?.token;
    if (token) customerToken = token;
  });

  // ── 3. Zorunlu alan eksik validasyonu ─────────────────────────────────────────────
  test('3. Zorunlu alan eksik olduğunda kayıt reddedilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/customers/register')
      .send({
        // firstName alanı kasitılı gönderilmedi
        lastName: 'User',
        email: `missing_${Date.now()}@example.com`,
        phone: `055${String(Date.now()).slice(-8)}`.slice(0, 11),
        city: 'Ankara',
        district: 'Çankaya',
        addressLine1: 'Test Mah. No:1',
        password: 'Test1234',
      });

    expect(res.status).toBe(400);
  });

  // ── 4. Profil görüntüleme ──────────────────────────────────────────────────
  test('4. Profil bilgisi çekilebilmeli', async () => {
    if (skipDB() || !customerToken) return;

    const res = await request(testApp)
      .get('/api/v1/customers/profile')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const profile = res.body.data || res.body;
    expect(profile.email || profile.user?.email).toBeDefined();
  });

  // ── 5. İlan oluşturma ──────────────────────────────────────────────────────
  test('5. Token ile taşıma ilanı oluşturulabilmeli', async () => {
    if (skipDB() || !customerToken) return;

    const res = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: 'İstanbul, Kadıköy',
        destination: 'Ankara, Çankaya',
        shipmentDate: new Date(Date.now() + 86400000).toISOString(),
        transportType: 'Kapalı Kasa',
        loadDetails: 'Mobilya',
        weight: 500,
        placeType: 'Ev',
        floor: 2,
        hasElevator: false,
        insuranceType: 'Yok',
        timePreference: 'Sabah',
        extraServices: [],
      });

    expect([200, 201]).toContain(res.status);
    const shipment = res.body.data || res.body;
    expect(shipment.id || shipment.shipmentId).toBeDefined();
  });

  // ── 6. İlanlarını listeleme ────────────────────────────────────────────────
  test('6. Müşteri kendi ilanlarını görebilmeli', async () => {
    if (skipDB() || !customerToken) return;

    const res = await request(testApp)
      .get('/api/v1/customers/shipments')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(Array.isArray(body) || Array.isArray(body.shipments)).toBe(true);
  });

  // ── 7. Token olmadan ilan oluşturma engeli ─────────────────────────────────
  test('7. Token olmadan ilan oluşturulamamalı', async () => {
    const res = await request(testApp)
      .post('/api/v1/shipments')
      .send({ origin: 'Test', destination: 'Test' });

    expect(res.status).toBe(401);
  });

  // ── 8. Token olmadan profil erişimi engeli ─────────────────────────────────
  test('8. Token olmadan profil erişilememeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/customers/profile');

    expect(res.status).toBe(401);
  });

  // ── 9. Var olan e-posta ile tekrar kayıt engeli ────────────────────────────
  test('9. Aynı e-posta ile tekrar kayıt reddedilmeli', async () => {
    if (skipDB() || !customerToken) return;

    const res = await request(testApp)
      .post('/api/v1/customers/register')
      .send({
        firstName: 'Tekrar',
        lastName: 'Kullanici',
        email: testEmail, // zaten kayıtlı
        phone: `056${String(Date.now()).slice(-8)}`.slice(0, 11),
        city: 'İzmir',
        district: 'Konak',
        addressLine1: 'Test Mah. No:5',
        password: 'Test1234',
      });

    expect(res.status).toBe(400);
  });

  // ── 10. Geçersiz kimlik ile giriş ─────────────────────────────────────────
  test('10. Yanlış şifre ile giriş reddedilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: testEmail, password: 'YanlisŞifre99' });

    expect(res.status).toBe(401);
  });
});
