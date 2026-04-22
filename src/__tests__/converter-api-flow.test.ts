/**
 * converter-api-flow.test.ts
 * Converter API akışı — seed verisi kullanır.
 * Customer seed: ahmet.yilmaz0@gmail.com / Maviface2141
 * Carrier seed:  info@silenakliyat.com / Maviface2141
 */
import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Shipment, ShipmentStatus } from '../domain/entities';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const BASE = '/api/v1/converter';
const SHIPMENT_BASE = '/api/v1/shipments';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const SECOND_CUSTOMER = { email: 'ayse.kaya1@gmail.com', password: 'Maviface2141' };
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
  let secondCustomerToken = '';
  let carrierToken = '';
  let emptySessionId = '';
  let estimatedSessionId = '';
  let ownShipmentId = '';
  let foreignShipmentId = '';

  const createShipmentPayload = (suffix: string) => ({
    origin: `Istanbul, Kadikoy ${suffix}`,
    destination: `Ankara, Cankaya ${suffix}`,
    originCity: 'Istanbul',
    originDistrict: `Kadikoy ${suffix}`,
    originAddressText: `Istanbul Kadikoy tasima adresi ${suffix}`,
    destinationCity: 'Ankara',
    destinationDistrict: `Cankaya ${suffix}`,
    destinationAddressText: `Ankara Cankaya tasima adresi ${suffix}`,
    loadDetails: 'Koltuk, beyaz esya ve koliler tasinacak.',
    shipmentDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    weight: 250,
  });

  beforeAll(async () => {
    if (skipDB()) return;

    const [customerLogin, secondCustomerLogin, carrierLogin] = await Promise.all([
      request(testApp).post('/api/v1/customers/login').send(CUSTOMER),
      request(testApp).post('/api/v1/customers/login').send(SECOND_CUSTOMER),
      request(testApp).post('/api/v1/carriers/login').send(CARRIER),
    ]);

    customerToken = customerLogin.body.data?.token || '';
    secondCustomerToken = secondCustomerLogin.body.data?.token || '';
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

  test('3.1 Estimate öncesi shipment GET converter alanını null dönebilmeli', async () => {
    if (skipDB()) return;

    const shipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(createShipmentPayload(`pre-apply-${Date.now()}`));

    expect(shipmentRes.status).toBe(201);
    const shipmentId = shipmentRes.body.data?.id;
    expect(shipmentId).toBeTruthy();

    const getRes = await request(testApp)
      .get(`${SHIPMENT_BASE}/${shipmentId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.converter).toBeNull();
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

  test('9. Estimate sonucu own shipmenta apply edilebilmeli ve persist edilmeli', async () => {
    if (skipDB() || !estimatedSessionId) return;

    const shipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(createShipmentPayload(`own-${Date.now()}`));

    expect(shipmentRes.status).toBe(201);
    ownShipmentId = shipmentRes.body.data?.id || '';
    expect(ownShipmentId).toBeTruthy();

    const applyRes = await request(testApp)
      .post(`${BASE}/sessions/${estimatedSessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: ownShipmentId });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.success).toBe(true);
    expect(applyRes.body.data.applied).toBe(true);
    expect(applyRes.body.data.idempotent).toBe(false);
    expect(applyRes.body.data.shipmentId).toBe(ownShipmentId);
    expect(applyRes.body.data.sessionId).toBe(estimatedSessionId);
    expect(applyRes.body.data.updatedFields).toContain('converterSessionId');
    expect(applyRes.body.data.updatedFields).toContain('converterAppliedAt');
    expect(applyRes.body.data.skippedFields).toContain('loadDetails');

    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const shipment = await shipmentRepo.findOne({ where: { id: ownShipmentId } });
    expect(shipment).toBeTruthy();
    expect(shipment?.converterSessionId).toBe(estimatedSessionId);
    expect(shipment?.converterAppliedAt).toBeTruthy();
    expect(shipment?.converterLastAppliedBy).toBeTruthy();
    expect(shipment?.converterEstimatedVolumeMin).toBeGreaterThan(0);
    expect(shipment?.converterEstimatedVolumeMax).toBeGreaterThanOrEqual(shipment?.converterEstimatedVolumeMin ?? 0);
    expect(shipment?.converterRecommendedVehicleCode).toBeTruthy();

    const getRes = await request(testApp)
      .get(`${SHIPMENT_BASE}/${ownShipmentId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.converter).toBeTruthy();
    expect(getRes.body.data.converter.converterSessionId).toBe(estimatedSessionId);
    expect(getRes.body.data.converter.converterAppliedAt).toBeTruthy();
    expect(getRes.body.data.converter.converterEstimatedVolumeMin).toBeGreaterThan(0);
    expect(getRes.body.data.converter.converterEstimatedVolumeMax).toBeGreaterThanOrEqual(getRes.body.data.converter.converterEstimatedVolumeMin);
    expect(getRes.body.data.converter.converterRecommendedVehicleCode).toBeTruthy();
    expect(getRes.body.data.converter).toHaveProperty('converterLastAppliedBy');
    expect(getRes.body.data).not.toHaveProperty('converterSpecialItemsJson');
  });

  test('10. Ayni shipmenta ikinci apply guvenli no-op donmeli', async () => {
    if (skipDB() || !estimatedSessionId || !ownShipmentId) return;

    const res = await request(testApp)
      .post(`${BASE}/sessions/${estimatedSessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: ownShipmentId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applied).toBe(true);
    expect(res.body.data.idempotent).toBe(true);
    expect(res.body.data.updatedFields).toEqual([]);
    expect(Array.isArray(res.body.data.skippedFields)).toBe(true);
    expect(res.body.data.skippedFields).toContain('converterSessionId');
  });

  test('10.1 Ayni session baska own shipmente apply edilememeli', async () => {
    if (skipDB() || !estimatedSessionId) return;

    const secondOwnShipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(createShipmentPayload(`own-second-${Date.now()}`));

    expect(secondOwnShipmentRes.status).toBe(201);
    const secondOwnShipmentId = secondOwnShipmentRes.body.data?.id || '';
    expect(secondOwnShipmentId).toBeTruthy();

    const res = await request(testApp)
      .post(`${BASE}/sessions/${estimatedSessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: secondOwnShipmentId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('10.2 Estimate olmadan apply engellenmeli', async () => {
    if (skipDB()) return;

    const draftSessionRes = await request(testApp)
      .post(`${BASE}/sessions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ flowType: 'household' });

    expect(draftSessionRes.status).toBe(201);
    const draftSessionId = draftSessionRes.body.data?.sessionId || '';
    expect(draftSessionId).toBeTruthy();

    const shipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(createShipmentPayload(`no-result-${Date.now()}`));

    expect(shipmentRes.status).toBe(201);
    const shipmentId = shipmentRes.body.data?.id || '';
    expect(shipmentId).toBeTruthy();

    const res = await request(testApp)
      .post(`${BASE}/sessions/${draftSessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('10.3 Editlenemez shipment durumunda apply engellenmeli', async () => {
    if (skipDB()) return;

    const sessionRes = await request(testApp)
      .post(`${BASE}/sessions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ flowType: 'household' });

    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data?.sessionId || '';
    expect(sessionId).toBeTruthy();

    const estimateRes = await request(testApp)
      .post(`${BASE}/sessions/${sessionId}/estimate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(VALID_ESTIMATE_PAYLOAD);

    expect(estimateRes.status).toBe(200);

    const shipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(createShipmentPayload(`locked-${Date.now()}`));

    expect(shipmentRes.status).toBe(201);
    const lockedShipmentId = shipmentRes.body.data?.id || '';
    expect(lockedShipmentId).toBeTruthy();

    const shipmentRepo = AppDataSource.getRepository(Shipment);
    await shipmentRepo.update({ id: lockedShipmentId }, { status: ShipmentStatus.MATCHED });

    const res = await request(testApp)
      .post(`${BASE}/sessions/${sessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: lockedShipmentId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('11. Baska kullanicinin shipmentina apply edilememeli', async () => {
    if (skipDB() || !estimatedSessionId) return;

    const shipmentRes = await request(testApp)
      .post(SHIPMENT_BASE)
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .send(createShipmentPayload(`foreign-${Date.now()}`));

    expect(shipmentRes.status).toBe(201);
    foreignShipmentId = shipmentRes.body.data?.id || '';
    expect(foreignShipmentId).toBeTruthy();

    const res = await request(testApp)
      .post(`${BASE}/sessions/${estimatedSessionId}/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: foreignShipmentId });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('12. Olmayan session apply icin 404 donmeli', async () => {
    if (skipDB() || !ownShipmentId) return;

    const res = await request(testApp)
      .post(`${BASE}/sessions/00000000-0000-0000-0000-000000000000/apply-to-shipment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shipmentId: ownShipmentId });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
