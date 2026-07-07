import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import {
  CarrierAvailableDate,
  isValidCarrierAvailableDateTimeRange,
} from '../domain/entities/CarrierAvailableDate';
import { CarrierAvailableDateRepository } from '../infrastructure/repositories/CarrierAvailableDateRepository';
import { testApp } from './helpers/testApp';

const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };
const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('carrier available dates', () => {
  let token = '';
  let carrierId = '';
  let originalActivity: CarrierActivity | null = null;
  let originalAvailableDates: CarrierAvailableDate[] = [];

  beforeAll(async () => {
    if (skipDB()) return;

    const res = await request(testApp).post('/api/v1/carriers/login').send(CARRIER);
    token = res.body.data?.token ?? '';
    carrierId = res.body.data?.carrier?.id ?? '';

    if (carrierId) {
      originalActivity = await AppDataSource.getRepository(CarrierActivity).findOne({
        where: { carrierId },
      });
      originalAvailableDates = await AppDataSource.getRepository(CarrierAvailableDate).find({
        where: { carrierId },
      });
    }
  });

  test('validates midnight end as end of day', () => {
    expect(isValidCarrierAvailableDateTimeRange({ startTime: '09:00', endTime: '12:00' })).toBe(true);
    expect(isValidCarrierAvailableDateTimeRange({ startTime: '17:00', endTime: '00:00' })).toBe(true);
    expect(isValidCarrierAvailableDateTimeRange({ startTime: '12:00', endTime: '12:00' })).toBe(false);
    expect(isValidCarrierAvailableDateTimeRange({ startTime: '18:00', endTime: '09:00' })).toBe(false);
    expect(isValidCarrierAvailableDateTimeRange({ startTime: '09:00', endTime: null })).toBe(false);
  });

  test('repository creates and finds date-based availability rows', async () => {
    if (skipDB() || !carrierId) return;

    const repo = new CarrierAvailableDateRepository();
    const date = '2026-09-15';

    await AppDataSource.getRepository(CarrierAvailableDate).delete({ carrierId, date });

    const created = await repo.create({
      carrierId,
      date,
      startTime: '10:00',
      endTime: '12:00',
    });

    const byCarrier = await repo.findByCarrierId(carrierId);
    const byDate = await repo.findByCarrierIdAndDate(carrierId, date);

    expect(byCarrier.some((row) => row.id === created.id)).toBe(true);
    expect(byDate?.startTime).toBe('10:00:00');
    expect(await repo.delete(created.id)).toBe(true);
  });

  test('activity endpoint persists default hours and date overrides', async () => {
    if (skipDB() || !token) return;

    const payload = {
      city: 'Antalya',
      district: 'Konyaalti',
      address: 'Konyaalti Depo Bolgesi',
      serviceAreas: ['Antalya'],
      defaultAvailabilityStart: '08:00',
      defaultAvailabilityEnd: '17:00',
      availableDates: [
        { date: '2026-08-01' },
        { date: '2026-08-02', startTime: '09:00', endTime: '12:00' },
        { date: '2026-08-03', startTime: '17:00', endTime: '00:00' },
      ],
    };

    const saveRes = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.defaultAvailabilityStart).toBe('08:00:00');
    expect(saveRes.body.data.defaultAvailabilityEnd).toBe('17:00:00');
    expect(saveRes.body.data.availableDates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(saveRes.body.data.availableDateOverrides).toEqual([
      { date: '2026-08-01', startTime: null, endTime: null },
      { date: '2026-08-02', startTime: '09:00:00', endTime: '12:00:00' },
      { date: '2026-08-03', startTime: '17:00:00', endTime: '00:00:00' },
    ]);

    const getRes = await request(testApp)
      .get('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.defaultAvailabilityStart).toBe('08:00:00');
    expect(getRes.body.data.availableDateOverrides).toEqual(saveRes.body.data.availableDateOverrides);
  });

  test('activity endpoint rejects invalid override range', async () => {
    if (skipDB() || !token) return;

    const res = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send({
        city: 'Antalya',
        district: 'Konyaalti',
        serviceAreas: ['Antalya'],
        defaultAvailabilityStart: '08:00',
        defaultAvailabilityEnd: '17:00',
        availableDates: [{ date: '2026-08-04', startTime: '12:00', endTime: '09:00' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  afterAll(async () => {
    if (skipDB() || !carrierId) return;

    const activityRepo = AppDataSource.getRepository(CarrierActivity);
    const availableDateRepo = AppDataSource.getRepository(CarrierAvailableDate);

    await availableDateRepo.delete({ carrierId });
    if (originalAvailableDates.length) {
      await availableDateRepo.save(originalAvailableDates);
    }

    if (originalActivity) {
      await activityRepo.save(originalActivity);
    }
  });
});
