import request from 'supertest';
import { In } from 'typeorm';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierAvailableDate } from '../domain/entities/CarrierAvailableDate';
import { CarrierVehicleType } from '../domain/entities/CarrierVehicleType';
import { VehicleType } from '../domain/entities/VehicleType';

describe('Carrier availability origin filter', () => {
  const createdCarrierIds: string[] = [];
  const createdVehicleTypeIds: string[] = [];

  afterEach(async () => {
    if (process.env.SKIP_DB_TESTS === 'true' || !AppDataSource.isInitialized || createdCarrierIds.length === 0) {
      createdCarrierIds.length = 0;
      return;
    }

    await AppDataSource.getRepository(CarrierAvailableDate).delete({ carrierId: In(createdCarrierIds) } as any);
    await AppDataSource.getRepository(CarrierVehicleType).delete({ carrierId: In(createdCarrierIds) } as any);
    await AppDataSource.getRepository(CarrierActivity).delete({ carrierId: In(createdCarrierIds) } as any);
    await AppDataSource.getRepository(Carrier).delete({ id: In(createdCarrierIds) } as any);
    if (createdVehicleTypeIds.length) {
      await AppDataSource.getRepository(VehicleType).delete({ id: In(createdVehicleTypeIds) } as any);
    }
    createdCarrierIds.length = 0;
    createdVehicleTypeIds.length = 0;
  });

  const getVehicleType = async (): Promise<VehicleType> => {
    const repo = AppDataSource.getRepository(VehicleType);
    const existing = await repo.findOne({ where: { name: 'Kamyon' } });
    if (existing) return existing;

    const created = await repo.save({
      name: `Kamyon Test ${Date.now()}`,
      defaultCapacityKg: 15000,
      defaultCapacityM3: 45,
      capacityKg: 15000,
      status: 'ACTIVE',
      sortOrder: 999,
    });
    createdVehicleTypeIds.push(created.id);
    return created;
  };

  const createApprovedCarrier = async (
    label: string,
    city: string,
    serviceAreas: string[],
    availableDates: string[],
    availability: { start: string; end: string } = { start: '08:00', end: '17:00' },
    capacityKg?: number,
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

    if (capacityKg !== undefined) {
      const vehicleType = await getVehicleType();
      await AppDataSource.getRepository(CarrierVehicleType).save({
        carrierId: carrier.id,
        vehicleTypeId: vehicleType.id,
        capacityKg,
      });
    }

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

  test('capacityCheckKg returns a soft capacityAdequate badge without filtering carriers', async () => {
    if (process.env.SKIP_DB_TESTS === 'true') return;

    const date = '2035-02-20';
    const city = `CapacityCity-${Date.now()}`;
    const lowCapacityCarrier = await createApprovedCarrier('Capacity Low', city, [city], [date], { start: '08:00', end: '17:00' }, 5000);
    const highCapacityCarrier = await createApprovedCarrier('Capacity High', city, [city], [date], { start: '08:00', end: '17:00' }, 30000);

    const softRes = await request(testApp)
      .get('/api/v1/carriers/search')
      .query({ availableDate: date, serviceCity: city, capacityCheckKg: 23750, limit: 50 });
    expect(softRes.status).toBe(200);

    const softItems = softRes.body.data.items || [];
    const lowSoft = softItems.find((item: any) => item.id === lowCapacityCarrier.id);
    const highSoft = softItems.find((item: any) => item.id === highCapacityCarrier.id);
    expect(lowSoft).toBeTruthy();
    expect(highSoft).toBeTruthy();
    expect(lowSoft.capacityAdequate).toBe(false);
    expect(highSoft.capacityAdequate).toBe(true);

    const strictRes = await request(testApp)
      .get('/api/v1/carriers/search')
      .query({ availableDate: date, serviceCity: city, minCapacityKg: 23750, limit: 50 });
    expect(strictRes.status).toBe(200);

    const strictIds = (strictRes.body.data.items || []).map((item: any) => item.id);
    expect(strictIds).not.toContain(lowCapacityCarrier.id);
    expect(strictIds).toContain(highCapacityCarrier.id);

    console.log('[capacity-soft-badge]', {
      capacityCheckKg: 23750,
      soft: {
        total: softRes.body.data.total,
        lowCarrierListed: Boolean(lowSoft),
        lowCapacityAdequate: lowSoft.capacityAdequate,
        highCarrierListed: Boolean(highSoft),
        highCapacityAdequate: highSoft.capacityAdequate,
      },
      strict: {
        total: strictRes.body.data.total,
        lowCarrierListed: strictIds.includes(lowCapacityCarrier.id),
        highCarrierListed: strictIds.includes(highCapacityCarrier.id),
      },
    });
  });
});
