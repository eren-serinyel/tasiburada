import request from 'supertest';
import { In } from 'typeorm';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierAvailableDate } from '../domain/entities/CarrierAvailableDate';

describe('Carrier availability origin filter', () => {
  const createdCarrierIds: string[] = [];

  afterEach(async () => {
    if (process.env.SKIP_DB_TESTS === 'true' || !AppDataSource.isInitialized || createdCarrierIds.length === 0) {
      createdCarrierIds.length = 0;
      return;
    }

    await AppDataSource.getRepository(CarrierAvailableDate).delete({ carrierId: In(createdCarrierIds) } as any);
    await AppDataSource.getRepository(CarrierActivity).delete({ carrierId: In(createdCarrierIds) } as any);
    await AppDataSource.getRepository(Carrier).delete({ id: In(createdCarrierIds) } as any);
    createdCarrierIds.length = 0;
  });

  const createApprovedCarrier = async (
    label: string,
    city: string,
    serviceAreas: string[],
    availableDates: string[],
    availability: { start: string; end: string } = { start: '08:00', end: '17:00' },
  ): Promise<Carrier> => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const carrier = await AppDataSource.getRepository(Carrier).save({
      companyName: `Route Test ${label}`,
      taxNumber: unique.slice(0, 32),
      contactName: 'Route Test',
      phone: `5${Math.random().toString().slice(2, 11)}`.slice(0, 10),
      email: `route-test-${unique}@example.com`,
      passwordHash: 'test-hash',
      foundedYear: 2018,
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
      pendingApproval: false,
      rating: 4.8,
      completedShipments: 12,
    });

    await AppDataSource.getRepository(CarrierActivity).save({
      carrierId: carrier.id,
      city,
      district: 'Merkez',
      address: `${city} depo`,
      serviceAreasJson: serviceAreas,
      defaultAvailabilityStart: availability.start,
      defaultAvailabilityEnd: availability.end,
      availableDates: JSON.stringify(availableDates),
    });

    await AppDataSource.getRepository(CarrierAvailableDate).save(
      availableDates.map(date => ({
        carrierId: carrier.id,
        date,
        startTime: null,
        endTime: null,
      })),
    );

    createdCarrierIds.push(carrier.id);
    return carrier;
  };

  test('availability summary and carrier search use the same origin city filter', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const date = '2035-01-15';
    const sakaryaCarrier = await createApprovedCarrier('Sakarya', 'Sakarya', ['Sakarya', 'Kocaeli'], [date]);
    const mersinCarrier = await createApprovedCarrier('Mersin', 'Mersin', ['Mersin', 'Adana'], [date]);
    await createApprovedCarrier('Sakarya Unavailable', 'Sakarya', ['Sakarya', 'Kocaeli'], ['2035-01-16']);

    const sakaryaSummary = await request(testApp)
      .get('/api/v1/carriers/availability-summary')
      .query({ date, serviceCity: 'Sakarya' });
    const sakaryaSearch = await request(testApp)
      .get('/api/v1/carriers/search')
      .query({ availableDate: date, serviceCity: 'Sakarya', limit: 50 });

    expect(sakaryaSummary.status).toBe(200);
    expect(sakaryaSearch.status).toBe(200);
    expect(sakaryaSummary.body.data.available).toBe(sakaryaSearch.body.data.total);

    const sakaryaIds = (sakaryaSearch.body.data.items || []).map((item: any) => item.id);
    expect(sakaryaIds).toContain(sakaryaCarrier.id);
    expect(sakaryaIds).not.toContain(mersinCarrier.id);

    const mersinSummary = await request(testApp)
      .get('/api/v1/carriers/availability-summary')
      .query({ date, serviceCity: 'Mersin' });
    const mersinSearch = await request(testApp)
      .get('/api/v1/carriers/search')
      .query({ availableDate: date, serviceCity: 'Mersin', limit: 50 });

    expect(mersinSummary.status).toBe(200);
    expect(mersinSearch.status).toBe(200);
    expect(mersinSummary.body.data.available).toBe(mersinSearch.body.data.total);

    const mersinIds = (mersinSearch.body.data.items || []).map((item: any) => item.id);
    expect(mersinIds).toContain(mersinCarrier.id);
    expect(mersinIds).not.toContain(sakaryaCarrier.id);
  });

  test('carrier search filters by customer time preference against date-based availability', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const date = '2026-07-07';
    const city = `TimeCity-${Date.now()}`;
    const morningCarrier = await createApprovedCarrier('Time Morning', city, [city], [date]);
    const eveningCarrier = await createApprovedCarrier('Time Evening', city, [city], [date], { start: '17:00', end: '00:00' });

    const searchIds = async (timePreference: string) => {
      const res = await request(testApp)
        .get('/api/v1/carriers/search')
        .query({ availableDate: date, serviceCity: city, timePreference, limit: 50 });
      expect(res.status).toBe(200);
      return (res.body.data.items || []).map((item: any) => item.id);
    };

    await expect(searchIds('belirli:14:00')).resolves.toContain(morningCarrier.id);
    await expect(searchIds('belirli:14:00')).resolves.not.toContain(eveningCarrier.id);
    await expect(searchIds('aksam')).resolves.not.toContain(morningCarrier.id);
    await expect(searchIds('aksam')).resolves.toContain(eveningCarrier.id);
    await expect(searchIds('sabah')).resolves.toContain(morningCarrier.id);
    await expect(searchIds('sabah')).resolves.not.toContain(eveningCarrier.id);
    await expect(searchIds('farketmez')).resolves.toEqual(expect.arrayContaining([morningCarrier.id, eveningCarrier.id]));
  });
});
