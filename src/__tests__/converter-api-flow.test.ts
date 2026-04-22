/**
 * converter-api-flow.test.ts
 * Converter API akışı — seed verisi kullanır.
 * Customer seed: ahmet.yilmaz0@gmail.com / Maviface2141
 * Carrier seed:  info@silenakliyat.com / Maviface2141
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const BASE = '/api/v1/converter';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

const VALID_ESTIMATE_PAYLOAD = {
  moveType: 'household',
  propertyType: '2+1',
  items: [
    { itemCode: 'sofa_3_seat', quantity: 1 },
    { itemCode: 'bed_double', quantity: 1 },
    { itemCode: 'washing_machine', quantity: 1 },
    { itemCode: 'box_medium', quantity: 12 },
  ],
  originFloor: 3,
  destinationFloor: 2,
  buildingElevator: true,
  externalLift: false,
  specialItems: ['large_tv'],
};

describe('Converter API Flow', () => {
  let customerToken = '';
  let carrierToken = '';
  let emptySessionId = '';
  let estimatedSessionId = '';

  beforeAll(async () => {
    if (skipDB()) return;

    const [customerLogin, carrierLogin] = await Promise.all([
      request(testApp).post('/api/v1/customers/login').send(CUSTOMER),
      request(testApp).post('/api/v1/carriers/login').send(CARRIER),
    ]);

    customerToken = customerLogin.body.data?.token || '';
    carrierToken = carrierLogin.body.data?.token || '';
  });

  test('1. Auth olmadan session create engellenmeli', async () => {
    const res = await request(testApp)
      .post(`${BASE}/sessions`)
      .send({ flowType: 'household' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('2. Auth ile session create başarılı olmalı', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .post(`${BASE}/sessions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ flowType: 'household' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeTruthy();
    expect(res.body.data.status).toBe('draft');
    emptySessionId = res.body.data.sessionId;
  });

  test('3. Estimate öncesi result endpoint answer/result null dönebilmeli', async () => {
    if (skipDB() || !emptySessionId) return;

    const res = await request(testApp)
      .get(`${BASE}/sessions/${emptySessionId}/result`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.sessionId).toBe(emptySessionId);
    expect(res.body.data.session.status).toBe('draft');
    expect(res.body.data.answer).toBeNull();
    expect(res.body.data.result).toBeNull();
  });

  test('4. Geçersiz estimate payload validationdan düşmeli', async () => {
    if (skipDB() || !emptySessionId) return;

    const res = await request(testApp)
      .post(`${BASE}/sessions/${emptySessionId}/estimate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        moveType: 'household',
        propertyType: '2+1',
        items: [{ itemCode: 'sofa_3_seat', quantity: -1 }],
        originFloor: 2,
        destinationFloor: 1,
        buildingElevator: true,
        externalLift: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('5. Estimate başarılı olmalı ve sonuç persist edilmeli', async () => {
    if (skipDB()) return;

    const sessionRes = await request(testApp)
      .post(`${BASE}/sessions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ flowType: 'household' });

    estimatedSessionId = sessionRes.body.data?.sessionId || '';

    const res = await request(testApp)
      .post(`${BASE}/sessions/${estimatedSessionId}/estimate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(VALID_ESTIMATE_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estimatedVolumeMin).toBeGreaterThan(0);
    expect(res.body.data.estimatedVolumeMax).toBeGreaterThanOrEqual(res.body.data.estimatedVolumeMin);
    expect(res.body.data.recommendedVehicle).toBeTruthy();
    expect(['high', 'medium', 'low']).toContain(res.body.data.confidence);
  });

  test('6. Estimate sonrası result okunabilmeli', async () => {
    if (skipDB() || !estimatedSessionId) return;

    const res = await request(testApp)
      .get(`${BASE}/sessions/${estimatedSessionId}/result`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.status).toBe('estimated');
    expect(res.body.data.answer).toBeDefined();
    expect(res.body.data.answer.moveType).toBe('household');
    expect(res.body.data.result).toBeDefined();
    expect(res.body.data.result.estimatedVolumeMin).toBeGreaterThan(0);
    expect(res.body.data.result.estimatedVolumeMax).toBeGreaterThanOrEqual(res.body.data.result.estimatedVolumeMin);
    expect(res.body.data.result.status).toBe('estimated');
  });

  test('7. Başka kullanıcının session sonucu okunamamalı', async () => {
    if (skipDB() || !estimatedSessionId) return;

    const res = await request(testApp)
      .get(`${BASE}/sessions/${estimatedSessionId}/result`)
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('8. Olmayan session doğru hata dönmeli', async () => {
    if (skipDB()) return;

    const res = await request(testApp)
      .get(`${BASE}/sessions/00000000-0000-0000-0000-000000000000/result`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
