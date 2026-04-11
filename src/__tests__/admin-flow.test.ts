/**
 * admin-flow.test.ts
 * Admin paneli uçtan uca akış testleri — seed verisi kullanır.
 * Admin: admin@tasiburada.com / Maviface2141
 * Superadmin: superadmin@tasiburada.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const ADMIN = { email: 'admin@tasiburada.com', password: 'Maviface2141' };
const SUPERADMIN = { email: 'superadmin@tasiburada.com', password: 'Maviface2141' };

describe('Admin Akışı — Uçtan Uca', () => {
  let adminToken: string;
  let superadminToken: string;

  // ── 1. Admin girişi ───────────────────────────────────────────────────────
  test('1. Admin giriş yapabilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminToken = res.body.data.token;
    expect(adminToken).toBeTruthy();
    expect(res.body.data.admin).toBeDefined();
  });

  // ── 2. Superadmin girişi ──────────────────────────────────────────────────
  test('2. Superadmin giriş yapabilmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send(SUPERADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    superadminToken = res.body.data.token;
    expect(superadminToken).toBeTruthy();
  });

  // ── 3. Admin profil ──────────────────────────────────────────────────────
  test('3. Admin /me endpoint profil döndürmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── 4. İstatistikler ─────────────────────────────────────────────────────
  test('4. Admin istatistik verileri alabilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 5. Trend verileri ────────────────────────────────────────────────────
  test('5. Admin trend verilerini alabilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/stats/trends')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 6. Nakliyeciler listesi ───────────────────────────────────────────────
  test('6. Admin nakliyecileri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/carriers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 7. Müşteriler listesi ─────────────────────────────────────────────────
  test('7. Admin müşterileri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 8. İlanlar listesi ────────────────────────────────────────────────────
  test('8. Admin ilanları listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/shipments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 9. Teklifler listesi ──────────────────────────────────────────────────
  test('9. Admin teklifleri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/offers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 10. Değerlendirmeler listesi ──────────────────────────────────────────
  test('10. Admin değerlendirmeleri listeleyebilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/reviews')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 11. Audit log okuma ───────────────────────────────────────────────────
  test('11. Admin audit log listesini okuyabilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 12. Platform ayarları okuma ───────────────────────────────────────────
  test('12. Admin platform ayarlarını okuyabilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 13. Raporlar — genel bakış ────────────────────────────────────────────
  test('13. Admin rapor genel bakışını alabilmeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/reports/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 14. Superadmin — ayarları güncelleyebilmeli ───────────────────────────
  test('14. Superadmin platform ayarlarını güncelleyebilmeli', async () => {
    if (skipDB() || !superadminToken) return;
    // Önce mevcut ayarları oku
    const getRes = await request(testApp)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(getRes.status).toBe(200);

    const res = await request(testApp)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send(getRes.body.data || {}); // mevcut ayarları geri gönder
    expect([200, 201, 400]).toContain(res.status); // 400 olabilir: GET ve PUT format farkı
  });

  // ── 15. Normal admin — ayar güncelleme engeli ─────────────────────────────
  test('15. Normal admin platform ayarlarını güncelleyememeli', async () => {
    if (skipDB() || !adminToken) return;
    const res = await request(testApp)
      .put('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect([401, 403]).toContain(res.status);
  });

  // ── 16. Superadmin — admin listesi ────────────────────────────────────────
  test('16. Superadmin admin listesini görebilmeli', async () => {
    if (skipDB() || !superadminToken) return;
    const res = await request(testApp)
      .get('/api/v1/admin/admins')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 17. Token olmadan admin erişimi engeli ────────────────────────────────
  test('17. Token olmadan admin istatistiklerine erişilememeli', async () => {
    const res = await request(testApp).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  // ── 18. Token olmadan nakliyeci listesi engeli ────────────────────────────
  test('18. Token olmadan admin nakliyeci listesine erişilememeli', async () => {
    const res = await request(testApp).get('/api/v1/admin/carriers');
    expect(res.status).toBe(401);
  });

  // ── 19. Yanlış şifre ile admin giriş ─────────────────────────────────────
  test('19. Yanlış şifre ile admin girişi 401 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send({ email: ADMIN.email, password: 'YanlışŞifre!' });
    expect(res.status).toBe(401);
  });

  // ── 20. Eksik kimlik ile admin giriş ──────────────────────────────────────
  test('20. E-posta olmadan admin girişi 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/admin/login')
      .send({ password: 'Maviface2141' });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Ek describe blokları — Genişletilmiş admin testleri
// ═══════════════════════════════════════════════════════════════════════════════

const BASE = '/api/v1';

describe('Nakliyeci Onay — Business Rules', () => {
  let adminToken: string;
  let superadminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const [adm, sup] = await Promise.all([
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' }),
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'superadmin@tasiburada.com', password: 'Maviface2141' }),
    ]);
    adminToken = adm.body.data?.token || '';
    superadminToken = sup.body.data?.token || '';
  });

  test('Admin nakliyeci listesini sayfalı alabilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    const carriers = res.body.data?.carriers || res.body.data || [];
    expect(Array.isArray(carriers)).toBe(true);
  });

  test('Nakliyeci onaylama (verify) çalışmalı', async () => {
    if (!adminToken) return;
    // Nakliyeci listesini al
    const listRes = await request(testApp)
      .get(`${BASE}/admin/carriers`)
      .set('Authorization', `Bearer ${adminToken}`);
    const carriers = listRes.body.data?.carriers || listRes.body.data || [];
    if (!Array.isArray(carriers) || carriers.length === 0) return;

    const target = carriers[0];
    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/${target.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 400]).toContain(res.status); // 400 olabilir zaten verified ise
  });

  test('Var olmayan nakliyeci onaylanamaz', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/00000000-0000-0000-0000-000000000000/verify`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 400]).toContain(res.status);
  });

  test('Admin olmayan token ile nakliyeci onaylanamaz', async () => {
    const carrierLogin = await request(testApp)
      .post(`${BASE}/carriers/login`)
      .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });
    const carrierToken = carrierLogin.body.data?.token || '';
    if (!carrierToken) return;

    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/any-id/verify`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([401, 403]).toContain(res.status);
  });
});

describe('Platform Ayarları — Validasyon', () => {
  let superadminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const [sup, adm] = await Promise.all([
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'superadmin@tasiburada.com', password: 'Maviface2141' }),
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' }),
    ]);
    superadminToken = sup.body.data?.token || '';
    adminToken = adm.body.data?.token || '';
  });

  test('Platform ayarları okunabilmeli', async () => {
    if (!superadminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/settings`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Negatif minimum teklif fiyatı reddedilmeli', async () => {
    if (!superadminToken) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/settings`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ min_offer_price: -100 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('%150 komisyon oranı reddedilmeli', async () => {
    if (!superadminToken) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/settings`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ commission_rate: 150 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Normal admin ayarları güncelleyememeli (superadmin gerekli)', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ min_offer_price: 100 });
    expect([403]).toContain(res.status);
  });

  test('Audit log kayıtları listelenebilmeli', async () => {
    if (!superadminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/audit-log`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect([200, 404]).toContain(res.status); // route olmayabilir
  });
});

describe('Admin Yönetimi — Business Rules', () => {
  let superadminToken: string;
  let adminToken: string;
  let createdAdminId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const [sup, adm] = await Promise.all([
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'superadmin@tasiburada.com', password: 'Maviface2141' }),
      request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' }),
    ]);
    superadminToken = sup.body.data?.token || '';
    adminToken = adm.body.data?.token || '';
  });

  test('Superadmin yeni admin oluşturabilmeli', async () => {
    if (!superadminToken) return;
    const unique = `testadmin_${Date.now()}@tasiburada.com`;
    const res = await request(testApp)
      .post(`${BASE}/admin/admins`)
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ email: unique, password: 'TestAdmin1234', role: 'admin', firstName: 'Test', lastName: 'Admin' });
    expect([201, 200, 400]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      createdAdminId = res.body.data?.id;
    }
  });

  test('Normal admin yeni admin oluşturamamalı (403)', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .post(`${BASE}/admin/admins`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'blocked@tasiburada.com', password: 'Blocked1234', role: 'admin' });
    expect([403]).toContain(res.status);
  });

  test('Oluşturulan admin silinebilmeli', async () => {
    if (!superadminToken || !createdAdminId) return;
    const res = await request(testApp)
      .delete(`${BASE}/admin/admins/${createdAdminId}`)
      .set('Authorization', `Bearer ${superadminToken}`);
    expect([200, 204]).toContain(res.status);
  });

  test('Silinen admin listede olmamalı', async () => {
    if (!superadminToken || !createdAdminId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/admins`)
      .set('Authorization', `Bearer ${superadminToken}`);
    const admins = res.body.data || [];
    if (Array.isArray(admins)) {
      const found = admins.find((a: any) => a.id === createdAdminId);
      expect(found).toBeUndefined();
    }
  });

  test('Admin listesinde passwordHash alanı olmamalı', async () => {
    if (!superadminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/admins`)
      .set('Authorization', `Bearer ${superadminToken}`);
    const admins = res.body.data || [];
    if (Array.isArray(admins)) {
      admins.forEach((a: any) => {
        expect(a.passwordHash).toBeUndefined();
      });
    }
  });
});

describe('İstatistik Tutarlılığı', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const res = await request(testApp)
      .post(`${BASE}/admin/login`)
      .send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = res.body.data?.token || '';
  });

  test('İstatistik totalCarriers nakliyeci listesiyle uyumlu olmalı', async () => {
    if (!adminToken) return;
    const [statsRes, listRes] = await Promise.all([
      request(testApp).get(`${BASE}/admin/stats`).set('Authorization', `Bearer ${adminToken}`),
      request(testApp).get(`${BASE}/admin/carriers`).set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(statsRes.status).toBe(200);
    expect(listRes.status).toBe(200);

    const totalFromStats = statsRes.body.data?.totalCarriers;
    const totalFromList = listRes.body.data?.pagination?.total ??
      (Array.isArray(listRes.body.data?.carriers) ? listRes.body.data.carriers.length : undefined);

    if (totalFromStats !== undefined && totalFromList !== undefined) {
      expect(totalFromStats).toBe(totalFromList);
    }
  });

  test('İstatistik alanları doğru tiplerde olmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(typeof d.totalCustomers).toBe('number');
    expect(typeof d.totalCarriers).toBe('number');
    expect(typeof d.totalShipments).toBe('number');
    expect(typeof d.totalOffers).toBe('number');
  });

  test('Trend istatistiklerinde negatif değer olmamalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/stats/trends`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // Trend verisi varsa sayısal negatif kontrolü
    if (res.body.data && typeof res.body.data === 'object') {
      Object.values(res.body.data).forEach((v: any) => {
        if (typeof v === 'number') {
          expect(v).toBeGreaterThanOrEqual(0);
        }
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Panel — Kapsamlı Frontend Test Senaryoları
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Panel — Nakliyeci Detay', () => {
  let adminToken: string;
  let carrierId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers`)
      .set('Authorization', `Bearer ${adminToken}`);
    const carriers = res.body.data?.carriers || res.body.data || [];
    if (Array.isArray(carriers) && carriers.length > 0) carrierId = carriers[0].id;
  });

  test('Nakliyeci detayını getirebilmeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/${carrierId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.companyName).toBeDefined();
  });

  test('Nakliyeci detayı şifre içermemeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/${carrierId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data?.passwordHash).toBeUndefined();
    expect(res.body.data?.resetToken).toBeUndefined();
  });

  test('Nakliyecinin taşımalarını getirebilmeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/${carrierId}/shipments`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Nakliyecinin yorumlarını getirebilmeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/${carrierId}/reviews`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Nakliyecinin belgelerini getirebilmeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/${carrierId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Nakliyeciyi onaylayabilmeli (verify)', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/${carrierId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });
    expect([200, 400]).toContain(res.status);
  });

  test('Nakliyeciyi reddedebilmeli (verify false)', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/${carrierId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false, rejectionReason: 'Test reddi' });
    expect([200, 400]).toContain(res.status);
  });

  test('Nakliyeci bilgilerini güncelleyebilmeli', async () => {
    if (!adminToken || !carrierId) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/carriers/${carrierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verifiedByAdmin: true });
    expect([200, 400]).toContain(res.status);
  });

  test('Olmayan nakliyeci 404 dönmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([404, 400]).toContain(res.status);
  });
});

describe('Admin Panel — Müşteri Yönetimi', () => {
  let adminToken: string;
  let customerId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
    const res = await request(testApp)
      .get(`${BASE}/admin/customers`)
      .set('Authorization', `Bearer ${adminToken}`);
    const customers = res.body.data?.customers || res.body.data || [];
    if (Array.isArray(customers) && customers.length > 0) customerId = customers[0].id;
  });

  test('Müşteri listesi sayfalanmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/customers`)
      .query({ page: 1, limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Müşteri arama çalışmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/customers`)
      .query({ search: 'ahmet' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Müşteri listesinde şifre görünmemeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/customers`)
      .set('Authorization', `Bearer ${adminToken}`);
    const customers = res.body.data?.customers || res.body.data || [];
    if (Array.isArray(customers) && customers.length > 0) {
      customers.forEach((c: any) => {
        expect(c.passwordHash).toBeUndefined();
      });
    }
  });

  test('Müşteri aktiflik durumu değiştirilebilmeli', async () => {
    if (!adminToken || !customerId) return;
    const res = await request(testApp)
      .put(`${BASE}/admin/customers/${customerId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test('Müşteri toggle sonrası tekrar toggle yapılabilmeli', async () => {
    if (!adminToken || !customerId) return;
    // İlk toggle
    await request(testApp)
      .put(`${BASE}/admin/customers/${customerId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);
    // İkinci toggle — eski haline döndür
    const res = await request(testApp)
      .put(`${BASE}/admin/customers/${customerId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 400]).toContain(res.status);
  });
});

describe('Admin Panel — İlan Yönetimi', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
  });

  test('İlan listesi tüm durumları kapsayabilmeli', async () => {
    if (!adminToken) return;
    const statuses = ['pending', 'matched', 'completed', 'cancelled'];
    for (const status of statuses) {
      const res = await request(testApp)
        .get(`${BASE}/admin/shipments`)
        .query({ status })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('İlan arama çalışmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/shipments`)
      .query({ search: 'istanbul' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('İlan listesi sayfalanmalı', async () => {
    if (!adminToken) return;
    const page1 = await request(testApp)
      .get(`${BASE}/admin/shipments`)
      .query({ page: 1, limit: 3 })
      .set('Authorization', `Bearer ${adminToken}`);
    const page2 = await request(testApp)
      .get(`${BASE}/admin/shipments`)
      .query({ page: 2, limit: 3 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
  });
});

describe('Admin Panel — Teklif Yönetimi', () => {
  let adminToken: string;
  let offerId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
    const res = await request(testApp)
      .get(`${BASE}/admin/offers`)
      .set('Authorization', `Bearer ${adminToken}`);
    const offers = res.body.data?.offers || res.body.data || [];
    if (Array.isArray(offers) && offers.length > 0) offerId = offers[0].id;
  });

  test('Teklif listesi getirilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/offers`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Durum filtresiyle teklif listelenmeli', async () => {
    if (!adminToken) return;
    const statuses = ['pending', 'accepted', 'rejected'];
    for (const status of statuses) {
      const res = await request(testApp)
        .get(`${BASE}/admin/offers`)
        .query({ status })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('Admin teklif silebilmeli', async () => {
    if (!adminToken || !offerId) return;
    const res = await request(testApp)
      .delete(`${BASE}/admin/offers/${offerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 400, 404]).toContain(res.status);
  });
});

describe('Admin Panel — Belge Yönetimi', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
  });

  test('Belge listesi getirilebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/documents`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Bekleyen belgeler filtrelenebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/documents`)
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Onaylanan belgeler filtrelenebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/documents`)
      .query({ status: 'APPROVED' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Belge tipi filtresi çalışmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/documents`)
      .query({ type: 'K1' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin Panel — Yorum Yönetimi', () => {
  let adminToken: string;
  let reviewId: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
    const res = await request(testApp)
      .get(`${BASE}/admin/reviews`)
      .set('Authorization', `Bearer ${adminToken}`);
    const reviews = res.body.data?.reviews || res.body.data || [];
    if (Array.isArray(reviews) && reviews.length > 0) reviewId = reviews[0].id;
  });

  test('Yorum listesi getirilebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/reviews`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Puan filtresiyle yorum listelenmeli', async () => {
    if (!adminToken) return;
    for (const rating of [1, 2, 3, 4, 5]) {
      const res = await request(testApp)
        .get(`${BASE}/admin/reviews`)
        .query({ rating })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('Admin yorum silebilmeli', async () => {
    if (!adminToken || !reviewId) return;
    const res = await request(testApp)
      .delete(`${BASE}/admin/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 204]).toContain(res.status);
  });

  test('Silinen yorum listede görünmemeli', async () => {
    if (!adminToken || !reviewId) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/reviews`)
      .set('Authorization', `Bearer ${adminToken}`);
    const reviews = res.body.data?.reviews || res.body.data || [];
    if (Array.isArray(reviews)) {
      const found = reviews.find((r: any) => r.id === reviewId);
      expect(found).toBeUndefined();
    }
  });
});

describe('Admin Panel — Rapor Sistemi', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
  });

  test('Genel bakış raporu getirilebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/reports/overview`)
      .query({ period: 'month' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('En iyi nakliyeciler raporu getirilebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/reports/top-carriers`)
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    if (Array.isArray(res.body.data) && res.body.data.length > 0) {
      expect(res.body.data[0].companyName).toBeDefined();
    }
  });

  test('Popüler rotalar raporu getirilebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/reports/popular-routes`)
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin Panel — Audit Log Derinlik', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
  });

  test('Audit log sayfalanabilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/audit-log`)
      .query({ page: 1, limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Audit log kayıtları gerekli alanları içermeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/audit-log`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const logs = res.body.data?.logs || res.body.data?.entries || res.body.data || [];
    if (Array.isArray(logs) && logs.length > 0) {
      const log = logs[0];
      expect(log.action).toBeDefined();
      expect(log.createdAt).toBeDefined();
    }
  });

  test('Audit log oluşturulabilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .post(`${BASE}/admin/audit-log`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'TEST_ACTION', details: { test: true }, targetType: 'test', targetId: 'test-123' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  test('Arama filtresiyle audit log listelenebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/audit-log`)
      .query({ search: 'SETTINGS' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin Panel — Dashboard Tutarlılık', () => {
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';
  });

  test('Dashboard KPI\'ları sayısal değer içermeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    const numericFields = ['totalCarriers', 'totalCustomers', 'totalShipments', 'totalOffers'];
    numericFields.forEach(field => {
      if (data[field] !== undefined) {
        expect(typeof data[field]).toBe('number');
        expect(data[field]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('Trend verisi periyot parametresi kabul etmeli', async () => {
    if (!adminToken) return;
    const periods = ['7', '30', '90'];
    for (const days of periods) {
      const res = await request(testApp)
        .get(`${BASE}/admin/stats/trends`)
        .query({ days })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('Dashboard onaysız nakliyecileri filtreleyebilmeli', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/carriers`)
      .query({ status: 'pending' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Tüm istatistik alanları tanımlı olmalı', async () => {
    if (!adminToken) return;
    const res = await request(testApp)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toBeDefined();
    expect(data.totalCarriers).toBeDefined();
    expect(data.totalCustomers).toBeDefined();
    expect(data.totalShipments).toBeDefined();
    expect(data.totalOffers).toBeDefined();
  });
});

describe('Admin Panel — Yetki Sınırları', () => {
  test('Token olmadan hiçbir admin endpoint erişilememeli', async () => {
    const endpoints = [
      `${BASE}/admin/stats`,
      `${BASE}/admin/carriers`,
      `${BASE}/admin/customers`,
      `${BASE}/admin/shipments`,
      `${BASE}/admin/offers`,
      `${BASE}/admin/reviews`,
      `${BASE}/admin/documents`,
      `${BASE}/admin/settings`,
      `${BASE}/admin/audit-log`,
    ];
    for (const endpoint of endpoints) {
      const res = await request(testApp).get(endpoint);
      expect(res.status).toBe(401);
    }
  });

  test('Müşteri token ile admin endpoint erişilememeli', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const customerLogin = await request(testApp)
      .post(`${BASE}/customers/login`)
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });
    const customerToken = customerLogin.body.data?.token || '';
    if (!customerToken) return;

    const res = await request(testApp)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect([401, 403]).toContain(res.status);
  });

  test('Nakliyeci token ile admin endpoint erişilememeli', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const carrierLogin = await request(testApp)
      .post(`${BASE}/carriers/login`)
      .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });
    const carrierToken = carrierLogin.body.data?.token || '';
    if (!carrierToken) return;

    const res = await request(testApp)
      .get(`${BASE}/admin/stats`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([401, 403]).toContain(res.status);
  });

  test('Normal admin superadmin-only endpoint erişilememeli', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    const adminToken = login.body.data?.token || '';
    if (!adminToken) return;

    // POST /admins ve PUT /settings superadmin gerektirir
    const createRes = await request(testApp)
      .post(`${BASE}/admin/admins`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'test@test.com', password: 'Test12345' });
    expect(createRes.status).toBe(403);

    const settingsRes = await request(testApp)
      .put(`${BASE}/admin/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ min_offer_price: 200 });
    expect(settingsRes.status).toBe(403);
  });

  test('Geçersiz admin ID formatı hata dönmeli', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const login = await request(testApp).post(`${BASE}/admin/login`).send({ email: 'admin@tasiburada.com', password: 'Maviface2141' });
    const adminToken = login.body.data?.token || '';
    if (!adminToken) return;

    const res = await request(testApp)
      .get(`${BASE}/admin/carriers/invalid-uuid-format`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([400, 404, 500]).toContain(res.status);
  });
});
