/**
 * admin-contact-filter-logs.test.ts
 * ContactFilterLog admin görünürlük endpoint testleri.
 * GET /api/v1/admin/contact-filter-logs — sadece okuma yetkisi, ham metin asla açıklanmaz.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const ADMIN = { email: 'admin@tasiburada.com', password: 'Maviface2141' };
const CUSTOMER = { email: 'ahmet.acar34@gmail.com', password: 'Maviface2141' };

describe('Admin — Kaçak İletişim Logları (ContactFilterLogs)', () => {
  let adminToken: string;

  // ── Admin girişi ─────────────────────────────────────────────────────────
  test('1. Admin token alabilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminToken = res.body.data?.token;
    expect(adminToken).toBeTruthy();
  });

  // ── Yetkili erişim ───────────────────────────────────────────────────────
  test('2. Admin kaçak iletişim loglarını listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    expect(Array.isArray(data.data)).toBe(true);
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('severity');
      expect(data.data[0]).toHaveProperty('riskScore');
      expect(data.data[0]).toHaveProperty('reviewStatus');
    }
  });

  // ── Ham metin asla açıklanmaz ────────────────────────────────────────────
  test('3. Yanıtta ham metin alanı (textHash) olmamalı, sadece textHashPreview', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entries: Record<string, unknown>[] = res.body.data?.data ?? [];
    for (const entry of entries) {
      // Ham hash ASLA tam olarak dönmemeli
      expect(entry).not.toHaveProperty('textHash');
      // textHashPreview varsa 12 karakter + elipsis olmalı
      if (entry.textHashPreview !== undefined) {
        expect(typeof entry.textHashPreview).toBe('string');
        const preview = entry.textHashPreview as string;
        // Son karakter ellipsis, önceki 12 karakter hex
        expect(preview.length).toBeLessThanOrEqual(13); // 12 hex + '…' (1 unicode char)
        if (preview.length > 0) {
          expect(preview.endsWith('…')).toBe(true);
        }
      }
    }
  });

  // ── Sayfalama parametreleri ──────────────────────────────────────────────
  test('4. Sayfalama parametreleri doğru çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.page).toBe(1);
    expect(data.limit).toBe(5);
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  // ── Surface filtresi ─────────────────────────────────────────────────────
  test('5. Surface filtresi çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?surface=offer_message')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entries: Record<string, unknown>[] = res.body.data?.data ?? [];
    for (const entry of entries) {
      expect(entry.surface).toBe('offer_message');
    }
  });

  // ── Action filtresi ──────────────────────────────────────────────────────
  test('6. Action filtresi çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?action=blocked')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entries: Record<string, unknown>[] = res.body.data?.data ?? [];
    for (const entry of entries) {
      expect(entry.action).toBe('blocked');
    }
  });

  // ── Severity filtresi ────────────────────────────────────────────────────
  test('6.1 Severity filtresi çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?severity=high')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entries: Record<string, unknown>[] = res.body.data?.data ?? [];
    for (const entry of entries) {
      expect(entry.severity).toBe('high');
    }
  });

  // ── Review status filtresi ───────────────────────────────────────────────
  test('6.2 ReviewStatus filtresi çalışmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?reviewStatus=unreviewed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entries: Record<string, unknown>[] = res.body.data?.data ?? [];
    for (const entry of entries) {
      expect(entry.reviewStatus).toBe('unreviewed');
    }
  });

  // ── Yetkisiz erişim — müşteri tokeni ────────────────────────────────────
  test('7. Müşteri tokeni ile erişim reddedilmeli (403)', async () => {
    if (skipDB()) return;
    const loginRes = await request(testApp)
      .post('/api/v1/auth/login')
      .send(CUSTOMER);
    if (loginRes.status !== 200) return; // seed yok — atla
    const customerToken = loginRes.body.data?.token;
    if (!customerToken) return;

    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(res.status);
  });

  // ── Kimlik doğrulamasız erişim ───────────────────────────────────────────
  test('8. Token olmadan erişim reddedilmeli (401)', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs');
    expect([401, 403]).toContain(res.status);
  });

  // ── Limit güvenlik sınırı ────────────────────────────────────────────────
  test('9. Limit 100 ile sınırlandırılmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs?limit=9999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.limit).toBeLessThanOrEqual(100);
  });
});
