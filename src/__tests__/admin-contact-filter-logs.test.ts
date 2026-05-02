/**
 * admin-contact-filter-logs.test.ts
 * ContactFilterLog admin görünürlük endpoint testleri.
 * GET /api/v1/admin/contact-filter-logs — sadece okuma yetkisi, ham metin asla açıklanmaz.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import {
  ContactFilterAction,
  ContactFilterLog,
  ContactFilterReviewStatus,
  ContactFilterSeverity,
  ContactFilterSurface,
} from '../domain/entities/ContactFilterLog';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const ADMIN = { email: 'admin@tasiburada.com', password: 'Maviface2141' };
const CUSTOMER = { email: 'ahmet.acar34@gmail.com', password: 'Maviface2141' };

describe('Admin — Kaçak İletişim Logları (ContactFilterLogs)', () => {
  let adminToken: string;
  const seededLogIds: number[] = [];
  let seededRangeFrom = '';
  let seededRangeTo = '';
  let seededRepeatedActorId = '';
  let seededSecondActorId = '';

  beforeAll(async () => {
    if (skipDB()) return;

    const start = new Date();
    seededRepeatedActorId = randomUUID();
    seededSecondActorId = randomUUID();

    const repo = AppDataSource.getRepository(ContactFilterLog);
    const seeded = await repo.save([
      repo.create({
        actorType: 'admin',
        actorId: seededRepeatedActorId,
        surface: ContactFilterSurface.OFFER_MESSAGE,
        shipmentId: randomUUID(),
        offerId: randomUUID(),
        entityType: 'offer_message',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.HIGH,
        riskScore: 90,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: ['phone'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, '0').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '1').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
      repo.create({
        actorType: 'admin',
        actorId: seededRepeatedActorId,
        surface: ContactFilterSurface.OFFER_MESSAGE,
        shipmentId: randomUUID(),
        offerId: randomUUID(),
        entityType: 'offer_message',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.HIGH,
        riskScore: 85,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: ['email'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, '2').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '3').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
      repo.create({
        actorType: 'admin',
        actorId: seededRepeatedActorId,
        surface: ContactFilterSurface.SHIPMENT_NOTE,
        shipmentId: randomUUID(),
        offerId: null,
        entityType: 'shipment_note',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.HIGH,
        riskScore: 82,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: ['url'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, '4').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '5').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
      repo.create({
        actorType: 'admin',
        actorId: seededSecondActorId,
        surface: ContactFilterSurface.SHIPMENT_NOTE,
        shipmentId: randomUUID(),
        offerId: null,
        entityType: 'shipment_note',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.MEDIUM,
        riskScore: 60,
        reviewStatus: ContactFilterReviewStatus.CONFIRMED,
        matchedRules: ['direct_contact_keyword'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, '6').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '7').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
      repo.create({
        actorType: 'system',
        actorId: randomUUID(),
        surface: ContactFilterSurface.PLATFORM_MESSAGE,
        shipmentId: null,
        offerId: null,
        entityType: 'platform_message',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.HIGH,
        riskScore: 88,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: ['phone'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, '8').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '9').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
      repo.create({
        actorType: 'admin',
        actorId: null,
        surface: ContactFilterSurface.PLATFORM_MESSAGE,
        shipmentId: null,
        offerId: null,
        entityType: 'platform_message',
        entityId: randomUUID(),
        action: ContactFilterAction.BLOCKED,
        severity: ContactFilterSeverity.HIGH,
        riskScore: 89,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: ['phone'],
        textHash: randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64),
        normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, 'b').slice(0, 64),
        metadataJson: { source: 'stats-test' },
        createdAt: new Date(),
      }),
    ]);

    seededLogIds.push(...seeded.map((item) => item.id));
    const end = new Date();
    const rangeFrom = new Date(start);
    rangeFrom.setMinutes(rangeFrom.getMinutes() - 1);
    const rangeTo = new Date(end);
    rangeTo.setMinutes(rangeTo.getMinutes() + 1);
    seededRangeFrom = rangeFrom.toISOString();
    seededRangeTo = rangeTo.toISOString();
  });

  afterAll(async () => {
    if (skipDB() || seededLogIds.length === 0) return;
    await AppDataSource.getRepository(ContactFilterLog).delete(seededLogIds);
  });

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

  test('10. Stats endpoint payload alanlarını dönmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get(`/api/v1/admin/contact-filter-logs/stats?dateFrom=${encodeURIComponent(seededRangeFrom)}&dateTo=${encodeURIComponent(seededRangeTo)}&actorType=admin`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('todayBlockedCount');
    expect(res.body.data).toHaveProperty('highRiskCount');
    expect(res.body.data).toHaveProperty('repeatedViolatorCount');
    expect(res.body.data).toHaveProperty('unreviewedCount');
    expect(res.body.data).toHaveProperty('topSurfaces');
    expect(res.body.data).toHaveProperty('actionDistribution');
    expect(res.body.data).toHaveProperty('severityDistribution');
    expect(res.body.data.window.dateFrom).toBeTruthy();
    expect(res.body.data.window.dateTo).toBeTruthy();
  });

  test('11. Stats endpoint top surfaces sıralı ve limitli dönmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get(`/api/v1/admin/contact-filter-logs/stats?dateFrom=${encodeURIComponent(seededRangeFrom)}&dateTo=${encodeURIComponent(seededRangeTo)}&actorType=admin`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const topSurfaces = res.body.data?.topSurfaces ?? [];
    expect(topSurfaces.length).toBeLessThanOrEqual(5);
    if (topSurfaces.length > 1) {
      expect(Number(topSurfaces[0].count)).toBeGreaterThanOrEqual(Number(topSurfaces[1].count));
    }
  });

  test('12. Stats endpoint repeated/highRisk/unreviewed metriklerini doğru hesaplamalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get(`/api/v1/admin/contact-filter-logs/stats?dateFrom=${encodeURIComponent(seededRangeFrom)}&dateTo=${encodeURIComponent(seededRangeTo)}&actorType=admin`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const data = res.body.data;
    expect(data.repeatedViolatorCount).toBeGreaterThanOrEqual(1);
    expect(data.highRiskCount).toBeGreaterThanOrEqual(3);
    expect(data.unreviewedCount).toBeGreaterThanOrEqual(3);
    expect(data).not.toHaveProperty('textHash');
    expect(data).not.toHaveProperty('rawText');
  });

  test('13. Stats endpoint invalid date query için 400 dönmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs/stats?dateFrom=not-a-date')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('14. Stats endpoint auth guard çalışmalı', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/admin/contact-filter-logs/stats');
    expect([401, 403]).toContain(res.status);
  });

  test('15. Stats endpoint action=flagged iken repeatedViolatorCount sıfır olmalı', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get(`/api/v1/admin/contact-filter-logs/stats?dateFrom=${encodeURIComponent(seededRangeFrom)}&dateTo=${encodeURIComponent(seededRangeTo)}&actorType=admin&action=flagged`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.repeatedViolatorCount).toBe(0);
  });
});
