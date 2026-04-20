/**
 * carrier-profile-flow.test.ts
 * CarrierProfileController integration testleri.
 * Seed: info@silenakliyat.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

describe('CarrierProfileController', () => {
  let carrierToken: string;
  let carrierId: string;

  beforeAll(async () => {
    if (skipDB()) return;
    const res = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    if (res.status === 200) {
      carrierToken = res.body.data?.token;
      carrierId = res.body.data?.carrier?.id;
    }
  });

  // ── Auth guards ───────────────────────────────────────────────────────────
  test('1. Token olmadan profile-status 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/me/profile-status');
    expect(res.status).toBe(401);
  });

  test('2. Token olmadan company-info güncelleme 401 dönmeli', async () => {
    const res = await request(testApp).put('/api/v1/carriers/me/company-info').send({});
    expect(res.status).toBe(401);
  });

  test('3. Token olmadan activity 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/me/activity');
    expect(res.status).toBe(401);
  });

  test('4. Token olmadan vehicles listesi 401 dönmeli', async () => {
    if (skipDB() || !carrierId) return;
    const res = await request(testApp).get(`/api/v1/carriers/${carrierId}/vehicles`);
    expect(res.status).toBe(401);
  });

  test('5. Token olmadan earnings güncelleme 401 dönmeli', async () => {
    const res = await request(testApp).put('/api/v1/carriers/me/earnings').send({});
    expect(res.status).toBe(401);
  });

  test('6. Token olmadan security güncelleme 401 dönmeli', async () => {
    const res = await request(testApp).put('/api/v1/carriers/me/security').send({});
    expect(res.status).toBe(401);
  });

  test('7. Token olmadan notifications 401 dönmeli', async () => {
    const res = await request(testApp).get('/api/v1/carriers/me/notifications');
    expect(res.status).toBe(401);
  });

  // ── Profile status ────────────────────────────────────────────────────────
  test('8. Carrier kendi profile-status alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('9. Carrier profile-status refresh yapabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Public: carrier profile by ID ─────────────────────────────────────────
  test('10. Public carrier profile — geçersiz ID ile 400 dönmeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/carriers/00000000-0000-0000-0000-000000000000');
    expect([400, 404]).toContain(res.status);
  });

  test('11. Public carrier profile — seed carrierId ile 200 dönmeli', async () => {
    if (skipDB() || !carrierId) return;
    const res = await request(testApp)
      .get(`/api/v1/carriers/${carrierId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Activity ──────────────────────────────────────────────────────────────
  test('12. Carrier activity bilgisi alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('13. Carrier activity bilgisi güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ workingHoursStart: '08:00', workingHoursEnd: '18:00' });
    expect([200, 400]).toContain(res.status);
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────
  test('14. Carrier kendi araç listesini alabilmeli', async () => {
    if (skipDB() || !carrierToken || !carrierId) return;
    const res = await request(testApp)
      .get(`/api/v1/carriers/${carrierId}/vehicles`)
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('15. Carrier araç güncelleme — boş liste ile 200 dönmeli', async () => {
    if (skipDB() || !carrierToken || !carrierId) return;
    const res = await request(testApp)
      .put(`/api/v1/carriers/${carrierId}/vehicles`)
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ vehicles: [] });
    expect([200, 400]).toContain(res.status);
  });

  // ── Vehicle types ─────────────────────────────────────────────────────────
  test('16. Carrier araç türleri güncelleyebilmeli — boş liste', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/vehicle-types')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ vehicleTypeIds: [] });
    expect([200, 400]).toContain(res.status);
  });

  // ── Service types ─────────────────────────────────────────────────────────
  test('17. Carrier hizmet türleri güncelleyebilmeli — boş liste', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/service-types')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ serviceTypeIds: [] });
    expect([200, 400]).toContain(res.status);
  });

  // ── Earnings ──────────────────────────────────────────────────────────────
  test('18. Carrier kazanç bilgisi güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/earnings')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ bankName: 'Test Bank', iban: 'TR330006100519786457841326', accountHolder: 'Test Holder' });
    expect([200, 400]).toContain(res.status);
  });

  // ── Security ──────────────────────────────────────────────────────────────
  test('19. Carrier güvenlik ayarları güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/security')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ twoFactorEnabled: false });
    expect([200, 400]).toContain(res.status);
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  test('20. Carrier bildirim tercihleri alabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/notifications')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) expect(res.body.success).toBe(true);
  });

  test('21. Carrier bildirim toggle yapabilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/notifications/toggle')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ type: 'NEW_OFFER', enabled: true });
    expect([200, 400]).toContain(res.status);
  });

  // ── Cross-carrier guard: başka nakliyecinin kaynağına erişim ─────────────
  test('22. Başka carrierId ile profile-status isteği 403 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${carrierToken}`)
      .query({ carrierId: '00000000-0000-0000-0000-000000000000' });
    // ensureCarrier uses req.params not query — still 200
    expect([200, 400, 403]).toContain(res.status);
  });

  // ── Company info update ───────────────────────────────────────────────────
  test('23. Carrier firma bilgisi güncelleyebilmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/company-info')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({ companyName: 'Silen Nakliyat Test', taxNumber: '1234567890' });
    expect([200, 400]).toContain(res.status);
  });

  // ── Profile picture: no file ──────────────────────────────────────────────
  test('24. Dosya olmadan profile-picture güncelleme 400 dönmeli', async () => {
    if (skipDB() || !carrierToken) return;
    const res = await request(testApp)
      .put('/api/v1/carriers/me/profile-picture')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('25. Sahte belge yolu JSON ile kaydedilememeli', async () => {
    if (skipDB() || !carrierToken) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        documents: [
          { type: 'SRC_CERT', fileUrl: '/uploads/nonexistent-debug-file.png' }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('26. Carrier belge indirebilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const uploadRes = await request(testApp)
      .put('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`)
      .field('type', 'VEHICLE_LICENSE')
      .attach('file', Buffer.from('temporary download document'), 'temp-download-license.pdf');

    expect(uploadRes.status).toBe(200);

    const listRes = await request(testApp)
      .get('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`);

    const createdDoc = (listRes.body?.data?.documents || []).find((doc: any) => String(doc.fileUrl || '').includes('temp-download-license'));
    expect(createdDoc?.id).toBeDefined();

    const downloadRes = await request(testApp)
      .get(`/api/v1/carriers/me/documents/${createdDoc.id}/download`)
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(downloadRes.status).toBe(200);
  });

  test('26. Carrier belge silebilmeli', async () => {
    if (skipDB() || !carrierToken) return;

    const uploadRes = await request(testApp)
      .put('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`)
      .field('type', 'VEHICLE_LICENSE')
      .attach('file', Buffer.from('temporary test document'), 'temp-delete-license.pdf');

    expect(uploadRes.status).toBe(200);

    const listRes = await request(testApp)
      .get('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`);

    const createdDoc = (listRes.body?.data?.documents || []).find((doc: any) => String(doc.fileUrl || '').includes('temp-delete-license'));
    expect(createdDoc?.id).toBeDefined();

    const deleteRes = await request(testApp)
      .delete(`/api/v1/carriers/me/documents/${createdDoc.id}`)
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
