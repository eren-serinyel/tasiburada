import request from 'supertest';
import { testApp } from './helpers/testApp';
import { restoreSilenCarrierBaseline } from './setup/seedContract';

const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

describe('Carrier activity service areas requirement', () => {
  let token = '';

  beforeAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    const res = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    token = res.body.data?.token || '';
  });

  test('rejects activity update without service areas', async () => {
    if (process.env.SKIP_DB_TESTS === 'true' || !token) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Antalya', district: 'Konyaalti', serviceAreas: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('accepts activity update with at least one service area', async () => {
    if (process.env.SKIP_DB_TESTS === 'true' || !token) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send({
        city: 'Antalya',
        district: 'Konyaalti',
        address: 'Konyaalti Depo Bolgesi',
        serviceAreas: ['Antalya', 'Mersin', 'Mugla'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.serviceAreas).toEqual(['Antalya', 'Mersin', 'Mugla']);
  });

  afterAll(async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;
    await restoreSilenCarrierBaseline();
  });
});
