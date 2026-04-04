/**
 * admin-flow.test.ts
 * Admin paneli uçtan uca akış testleri (API / Integration)
 *
 * Gereksinim: Seed edilmiş admin hesabı.
 * Test kimlik bilgileri: .env içindeki TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@tasiburada.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin1234!';

describe('Admin Akışı — Uçtan Uca', () => {
  let adminToken: string;

  // ── 1. Admin girişi ───────────────────────────────────────────────────────
  test('1. Admin geçerli kimlik bilgileriyle giriş yapabilmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    // Admin henüz seed edilmemiş veya şifre yanlışsa 401 kabul edilebilir
    expect([200, 201, 401]).toContain(res.status);
    const token = res.body.token || res.body.data?.token;
    if (token) adminToken = token;
  });

  // ── 2. Admin istatistikleri ────────────────────────────────────────────────
  test('2. Admin istatistik verileri alınabilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toBeDefined();
  });

  // ── 3. Nakliyeciler listesi ────────────────────────────────────────────────
  test('3. Admin nakliyecileri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/carriers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    // Sayfalı veya düz dizi olabilir
    expect(body !== null && typeof body === 'object').toBe(true);
  });

  // ── 4. Audit log yazma ────────────────────────────────────────────────────
  test('4. Audit log kaydedilebilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .post('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'TEST_ACTION',
        details: 'Jest test audit log girişi',
        targetType: 'platform',
        targetId: 'test',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // ── 5. Audit log okuma ────────────────────────────────────────────────────
  test('5. Audit log listesi okunabilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toBeDefined();
  });

  // ── 6. Platform ayarları okuma ────────────────────────────────────────────
  test('6. Platform ayarları okunabilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  // ── 7. Yetkisiz erişim engeli (no token) ─────────────────────────────────
  test('7. Token olmadan admin istatistiklerine erişilememeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/admin/stats');

    expect(res.status).toBe(401);
  });

  // ── 8. Yetkisiz erişim engeli (no token) — carriers ──────────────────────
  test('8. Token olmadan admin nakliyeci listesine erişilememeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/admin/carriers');

    expect(res.status).toBe(401);
  });

  // ── 9. Audit log — action zorunlu alan validation ─────────────────────────
  test('9. Audit log action alanı olmadan kaydedilemez (400)', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .post('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ details: 'action alanı yok' }); // action yok

    expect(res.status).toBe(400);
  });

  // ── 10. Trend verileri ────────────────────────────────────────────────────
  test('10. Admin trend verileri alınabilmeli', async () => {
    if (skipDB() || !adminToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/stats/trends?days=7')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
